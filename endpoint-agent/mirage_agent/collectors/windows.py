import logging
import subprocess
import xml.etree.ElementTree as ET
from typing import Protocol

try:
    import win32evtlog
except ImportError:
    win32evtlog = None

from ..normalizer import WINDOWS_EVENTS, normalize_windows_event

LOG = logging.getLogger(__name__)
WINDOWS_NAMESPACE = {"e": "http://schemas.microsoft.com/win/2004/08/events/event"}


class CursorStore(Protocol):
    def get_cursor(self, source: str) -> str | None: ...

    def commit_collection(self, events: list[dict], cursors: dict[str, str]) -> int: ...


def collect(queue: CursorStore) -> list[dict]:
    sec_key = "windows-sec-cursor"
    sys_key = "windows-sys-cursor"
    sec_cursor = queue.get_cursor(sec_key) or queue.get_cursor("windows-security-event-record")
    sys_cursor = queue.get_cursor(sys_key)

    records, new_sec_cursor, new_sys_cursor = _collect_powershell(sec_cursor, sys_cursor)

    normalized = [
        event
        for record in sorted(records, key=lambda item: int(item.get("record_id", 0)))
        if (event := normalize_windows_event(record)) is not None
    ]

    cursors_to_update: dict[str, str] = {}
    if new_sec_cursor and new_sec_cursor != sec_cursor:
        cursors_to_update[sec_key] = new_sec_cursor
    if new_sys_cursor and new_sys_cursor != sys_cursor:
        cursors_to_update[sys_key] = new_sys_cursor

    if normalized or cursors_to_update:
        queue.commit_collection(normalized, cursors_to_update)

    return normalized


def _collect_powershell(
    sec_cursor: str | None, sys_cursor: str | None
) -> tuple[list[dict], str | None, str | None]:
    """
    Robust Windows EventLog collector:
    - Queries Security log (IDs 4624, 4625, 4720, etc.) if running elevated.
    - Queries System log (IDs 7045 - Service Created, 7040, 1074, 6008, 104) which is
      readable without Administrator rights on all Windows editions.
    """
    sec_ids = "4624,4625,4634,4648,4672,4688,4720,4726"
    sys_ids = "7045,7040,1074,6008,104,41"

    ps_cmd = (
        f"$sec = Get-WinEvent -FilterHashtable @{{LogName='Security'; Id={sec_ids}}} -MaxEvents 25 -ErrorAction SilentlyContinue; "
        f"$sys = Get-WinEvent -FilterHashtable @{{LogName='System'; Id={sys_ids}}} -MaxEvents 25 -ErrorAction SilentlyContinue; "
        f"$all = @($sec) + @($sys); "
        f"if ($all) {{ foreach ($e in $all) {{ if ($e) {{ $e.ToXml() }} }} }}"
    )

    records: list[dict] = []
    latest_sec = int(sec_cursor) if sec_cursor and sec_cursor.isdigit() else None
    latest_sys = int(sys_cursor) if sys_cursor and sys_cursor.isdigit() else None

    try:
        proc = subprocess.run(
            ["powershell", "-NoProfile", "-NonInteractive", "-Command", ps_cmd],
            capture_output=True,
            text=True,
            timeout=15,
        )
        if proc.returncode == 0 and proc.stdout.strip():
            raw_output = proc.stdout
            xml_chunks = raw_output.split("<Event xmlns=")
            for chunk in xml_chunks:
                if not chunk.strip():
                    continue
                xml_str = "<Event xmlns=" + chunk
                parsed = _parse_event_xml(xml_str)
                if not parsed:
                    continue

                channel = parsed.get("channel", "Security")
                rec_id = parsed["record_id"]

                if channel == "Security":
                    if sec_cursor and sec_cursor.isdigit() and rec_id <= int(sec_cursor):
                        continue
                    if latest_sec is None or rec_id > latest_sec:
                        latest_sec = rec_id
                else:
                    if sys_cursor and sys_cursor.isdigit() and rec_id <= int(sys_cursor):
                        continue
                    if latest_sys is None or rec_id > latest_sys:
                        latest_sys = rec_id

                records.append(parsed)
    except Exception as error:
        LOG.error("PowerShell event collection error: %s", error)

    new_sec = str(latest_sec) if latest_sec is not None else sec_cursor
    new_sys = str(latest_sys) if latest_sys is not None else sys_cursor
    return records, new_sec, new_sys


def _parse_event_xml(value: str) -> dict | None:
    try:
        root = ET.fromstring(value)
    except ET.ParseError:
        return None

    system = root.find("e:System", WINDOWS_NAMESPACE)
    if system is None:
        return None
    event_id_node = system.find("e:EventID", WINDOWS_NAMESPACE)
    record_id_node = system.find("e:EventRecordID", WINDOWS_NAMESPACE)
    time_node = system.find("e:TimeCreated", WINDOWS_NAMESPACE)
    if event_id_node is None or record_id_node is None or time_node is None:
        return None

    try:
        event_id = int(event_id_node.text or "")
        record_id = int(record_id_node.text or "")
    except ValueError:
        return None
    if event_id not in WINDOWS_EVENTS:
        return None

    channel_node = system.find("e:Channel", WINDOWS_NAMESPACE)
    channel = channel_node.text if channel_node is not None else "Security"
    provider = system.find("e:Provider", WINDOWS_NAMESPACE)
    computer = system.findtext("e:Computer", default="", namespaces=WINDOWS_NAMESPACE)

    event_data: dict[str, str] = {}
    for node in root.findall(".//e:Data", WINDOWS_NAMESPACE) + root.findall(".//e:EventData/e:Data", WINDOWS_NAMESPACE):
        name = node.attrib.get("Name")
        if name and node.text is not None:
            event_data[name] = node.text[:512]

    return {
        "event_id": event_id,
        "record_id": record_id,
        "channel": channel,
        "timestamp": time_node.attrib.get("SystemTime", ""),
        "provider": provider.attrib.get("Name", "") if provider is not None else "",
        "computer": computer,
        "data": event_data,
    }
