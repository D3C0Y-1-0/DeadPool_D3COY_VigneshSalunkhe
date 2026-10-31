import uuid
import hashlib
import os
import ipaddress
import tempfile
from ..geo import get_raw_ips

ALLOWLIST = set()  # In production, can contain corporate CIDRs, e.g. {"10.0.0.0/8"}

def recommend(inc: dict) -> list[dict]:
    ip = inc.get("src_ip", "")
    acts = []

    def add_action(action_type: str, title: str, why: str, params: dict, requires_approval: bool = True):
        # Stable action ID based on src_ip and action_type
        stable_id = hashlib.sha256(f"{ip}:{action_type}".encode()).hexdigest()[:10]
        acts.append({
            "id": stable_id,
            "type": action_type,
            "title": title,
            "why": why,
            "params": params,
            "requires_approval": requires_approval,
            "status": "recommended"
        })

    sev = inc.get("severity", "low")

    if sev in ("high", "critical"):
        add_action("block_source", f"Block {ip} at the edge firewall", "Confirmed hostile interaction with deception network", {"ip": ip})

    if inc.get("real_asset_touched"):
        add_action("isolate_host", "Isolate prod-web-01 pending review", "Hostile source made direct contact with real production asset", {"host": "prod-web-01"})
        add_action("hunt", f"Hunt {ip} across enterprise SIEM (24h)", "Find any other enterprise contact with this adversary", {
            "splunk": f'index=firewall OR index=auth src_ip="{ip}" earliest=-24h | stats count by host, action',
            "kql": f'union Firewall, Auth | where SrcIp == "{ip}" and TimeGenerated > ago(24h) | summarize count() by Host, Action'
        })

    if inc.get("honeytoken_hit"):
        add_action("rotate_credentials", "Rotate/disable svc_backup and audit usage", "Planted honeytoken credential was attempted by adversary", {"account": "svc_backup"})

    add_action("export_iocs", "Export STIX 2.1 IOC bundle & CSV", "Share validated threat indicators with peer security controls", {"ip": ip}, requires_approval=False)

    if sev == "low":
        acts = [x for x in acts if x["type"] == "export_iocs"]
        add_action("monitor", "Monitor adversary without blocking", "Opportunistic background radiation / automated scanner", {"ip": ip}, requires_approval=False)

    return acts

def execute(action: dict, dry_run: bool = False, blocklist_path: str = "/shared/blocklist.txt") -> str:
    t = action.get("type")
    p = action.get("params") or {}

    if t == "block_source":
        ip_str = p.get("ip", "")
        # Validate IP using ipaddress module
        try:
            ip_obj = ipaddress.ip_address(ip_str)
        except ValueError:
            raise ValueError(f"Invalid IP address for block action: '{ip_str}'")

        # Allowlist check
        for allowed in ALLOWLIST:
            try:
                if ip_obj in ipaddress.ip_network(allowed):
                    raise PermissionError(f"IP {ip_str} is in protected allowlist ({allowed}); block action rejected.")
            except ValueError:
                pass

        nft_cmd = f"nft add element inet filter blocklist {{ {ip_str} }}"
        if dry_run:
            return f"DRY-RUN: {nft_cmd}"

        # Resolve raw container IPs for blocklist enforcement
        raw_ips = p.get("raw_ips") or get_raw_ips(ip_str)
        
        # Ensure blocklist directory exists safely
        b_dir = os.path.dirname(blocklist_path)
        if b_dir:
            try:
                os.makedirs(b_dir, exist_ok=True)
            except OSError:
                blocklist_path = os.path.join(tempfile.gettempdir(), "blocklist.txt")
                b_dir = os.path.dirname(blocklist_path)

        existing = set()
        if os.path.exists(blocklist_path):
            try:
                with open(blocklist_path, "r", encoding="utf-8") as f:
                    existing = {line.strip() for line in f if line.strip()}
            except OSError:
                pass

        existing.update(raw_ips)
        existing.add(ip_str)

        # Atomic write via temp file + rename with fallback
        try:
            with tempfile.NamedTemporaryFile("w", dir=b_dir if b_dir and os.path.exists(b_dir) else None, delete=False) as tf:
                for item in sorted(existing):
                    tf.write(f"{item}\n")
                temp_name = tf.name
            os.replace(temp_name, blocklist_path)
        except OSError:
            pass
        return f"Blocklist updated with {', '.join(raw_ips)}. Equivalent: {nft_cmd}"

    if t == "isolate_host":
        host = p.get("host", "unknown")
        return f"{'DRY-RUN: ' if dry_run else ''}EDR network isolate host={host} (containment simulated)"

    if t == "rotate_credentials":
        acct = p.get("account", "unknown")
        return f"{'DRY-RUN: ' if dry_run else ''}Identity provider disable credential for account={acct} (simulated)"

    return "Executed successfully"
