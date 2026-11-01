import hashlib
import ipaddress
import re
import uuid
from datetime import datetime, timezone
from typing import Any


_IP = re.compile(r"(?<![\w.])(?:\d{1,3}\.){3}\d{1,3}(?![\w.])")
_SENSITIVE = re.compile(r"(password|passwd|secret|token|credential|private.?key)", re.I)
_SSH_FAILED = re.compile(r"\b(failed|invalid user|authentication failure)\b", re.I)
_SSH_SUCCESS = re.compile(r"\b(accepted|authenticated)\b", re.I)
_SUDO = re.compile(r"\bsudo(?:\[.*?\])?:", re.I)
_PRIVILEGE = re.compile(r"\b(sudo|su:|session opened for user root)\b", re.I)

WINDOWS_EVENTS = {
    4624: ("windows_logon_success", "info", "Successful Windows logon"),
    4625: ("windows_logon_failure", "medium", "Failed Windows logon"),
    4634: ("windows_logoff", "info", "Windows session ended"),
    4648: ("windows_explicit_credentials", "medium", "Explicit credentials were used"),
    4672: ("windows_special_privileges", "high", "Special privileges assigned"),
    4688: ("windows_process_created", "low", "Process creation audited"),
    4720: ("windows_account_created", "high", "Windows account created"),
    4726: ("windows_account_deleted", "medium", "Windows account deleted"),
    # Windows System Log Events (available without Administrator rights)
    7045: ("windows_service_installed", "high", "A service was installed in the system"),
    7040: ("windows_service_changed", "low", "Service start type changed"),
    1074: ("windows_system_shutdown", "medium", "System shutdown or restart initiated"),
    6008: ("windows_unexpected_shutdown", "medium", "Previous system shutdown was unexpected"),
    104: ("windows_log_cleared", "high", "System event log was cleared"),
    41: ("windows_kernel_power", "medium", "System rebooted without cleanly shutting down"),
    # Windows Defender Operational Events
    1116: ("defender_malware_detected", "critical", "Windows Defender detected malware"),
    1117: ("defender_malware_blocked", "high", "Windows Defender took remediation action"),
    5001: ("defender_protection_disabled", "critical", "Windows Defender Real-time Protection disabled"),
}


def _event_id(source: str, record_id: str | int | None, content: str) -> str:
    stable_source = str(record_id) if record_id is not None else hashlib.sha256(content.encode("utf-8")).hexdigest()
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"mirage:{source}:{stable_source}"))


def _timestamp(value: str | datetime) -> str:
    timestamp = datetime.fromisoformat(value.replace("Z", "+00:00")) if isinstance(value, str) else value
    if timestamp.tzinfo is None or timestamp.utcoffset() is None:
        raise ValueError("event timestamps must include a timezone")
    return timestamp.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def _source_ip(message: str) -> str | None:
    for candidate in _IP.findall(message):
        try:
            return str(ipaddress.ip_address(candidate))
        except ValueError:
            continue
    return None


def _safe_fields(fields: dict[str, Any]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in list(fields.items())[:50]:
        if _SENSITIVE.search(str(key)):
            continue
        if isinstance(value, (str, int, float, bool)) or value is None:
            result[str(key)[:96]] = str(value)[:512] if isinstance(value, str) else value
    return result


def normalize_windows_event(record: dict[str, Any]) -> dict[str, Any] | None:
    event_number = int(record.get("event_id", 0))
    mapping = WINDOWS_EVENTS.get(event_number)
    if mapping is None:
        return None

    fields = _safe_fields(record.get("data") or {})
    source_ip = fields.get("IpAddress") or fields.get("SourceNetworkAddress")
    try:
        source_ip = str(ipaddress.ip_address(str(source_ip))) if source_ip and source_ip != "-" else None
    except ValueError:
        source_ip = None

    event_type, severity, label = mapping
    if event_number == 7045 and fields.get("ServiceName"):
        label = f"New Windows service installed: {fields.get('ServiceName')} ({fields.get('ImagePath', '')[:60]})"
    elif event_number == 7040 and fields.get("ServiceName"):
        label = f"Windows service start type modified: {fields.get('ServiceName')}"
    elif event_number == 4625 and fields.get("TargetUserName"):
        label = f"Failed logon for user '{fields.get('TargetUserName')}' from {fields.get('WorkstationName') or fields.get('IpAddress') or 'workstation'}"
    elif event_number == 4624 and fields.get("TargetUserName"):
        label = f"Successful logon for user '{fields.get('TargetUserName')}'"
    elif event_number == 4720 and fields.get("TargetUserName"):
        label = f"Windows account created: {fields.get('TargetUserName')}"
    return {
        "eventId": _event_id("windows-security", record.get("record_id"), str(record)),
        "timestamp": _timestamp(record["timestamp"]),
        "source": "windows-security",
        "eventType": event_type,
        "severity": severity,
        "message": label,
        "sourceIp": source_ip,
        "raw": {
            "eventId": event_number,
            "recordId": record.get("record_id"),
            "provider": str(record.get("provider", ""))[:128],
            "computer": str(record.get("computer", ""))[:255],
            "eventData": fields,
        },
    }


def normalize_linux_log(
    source: str,
    timestamp: str,
    message: str,
    record_id: str | int | None = None,
) -> dict[str, Any] | None:
    lowered = message.lower()
    if _SSH_FAILED.search(message):
        event_type, severity, label = "ssh_login_failed", "medium", "Failed SSH authentication"
    elif _SSH_SUCCESS.search(message) and ("ssh" in source.lower() or "sshd" in lowered):
        event_type, severity, label = "ssh_login_success", "high", "Successful SSH authentication"
    elif _SUDO.search(message) or _PRIVILEGE.search(message):
        event_type, severity, label = "privileged_command", "medium", "Privileged command or session observed"
    else:
        return None

    sudo_user = re.search(r"\bsudo(?:\[.*?\])?:\s*([A-Za-z0-9_.-]{1,64})\s*:", message, re.I)
    ssh_user = re.search(r"\bfor\s+(?:invalid user\s+)?([A-Za-z0-9_.-]{1,64})", message, re.I)
    user = (sudo_user or ssh_user).group(1) if (sudo_user or ssh_user) else None
    safe_message = label + (f" for account {user}" if user else "")
    safe_source = source.strip().lower()[:64] or "linux-auth"
    return {
        "eventId": _event_id(safe_source, record_id, message),
        "timestamp": _timestamp(timestamp),
        "source": safe_source,
        "eventType": event_type,
        "severity": severity,
        "message": safe_message,
        "sourceIp": _source_ip(message),
        "raw": {"recordId": str(record_id)[:128] if record_id is not None else None},
    }
