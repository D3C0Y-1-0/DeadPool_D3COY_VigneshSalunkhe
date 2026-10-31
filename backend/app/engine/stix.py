import uuid
import datetime as dt

def _now():
    return dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")

def bundle(inc: dict) -> dict:
    ts = _now()
    objs = []
    
    src_ip = inc.get("src_ip", "0.0.0.0")
    narrative = inc.get("narrative", "Deception-detected adversary activity")

    # Attacker IP Indicator
    ip_id = f"indicator--{uuid.uuid4()}"
    objs.append({
        "type": "indicator",
        "spec_version": "2.1",
        "id": ip_id,
        "created": ts,
        "modified": ts,
        "name": f"Adversary IP {src_ip}",
        "description": narrative,
        "pattern": f"[ipv4-addr:value = '{src_ip}']",
        "pattern_type": "stix",
        "valid_from": ts,
        "indicator_types": ["malicious-activity"]
    })

    # File Hash Indicators
    files = inc.get("files") or []
    for f in files:
        sha256 = f.get("sha256")
        fname = f.get("name", "unknown_file")
        if sha256:
            f_id = f"indicator--{uuid.uuid4()}"
            objs.append({
                "type": "indicator",
                "spec_version": "2.1",
                "id": f_id,
                "created": ts,
                "modified": ts,
                "name": f"Malicious Artifact {fname}",
                "description": f"File observed during honeypot collection: {fname}",
                "pattern": f"[file:hashes.'SHA-256' = '{sha256}']",
                "pattern_type": "stix",
                "valid_from": ts,
                "indicator_types": ["malicious-activity"]
            })

    # MITRE ATT&CK Pattern Objects
    techniques = inc.get("techniques") or []
    for t in techniques:
        t_id = t.get("id")
        t_name = t.get("name", t_id)
        if t_id:
            ext_url = f"https://attack.mitre.org/techniques/{t_id.replace('.', '/')}/"
            objs.append({
                "type": "attack-pattern",
                "spec_version": "2.1",
                "id": f"attack-pattern--{uuid.uuid4()}",
                "created": ts,
                "modified": ts,
                "name": t_name,
                "external_references": [{
                    "source_name": "mitre-attack",
                    "external_id": t_id,
                    "url": ext_url
                }]
            })

    return {
        "type": "bundle",
        "id": f"bundle--{uuid.uuid4()}",
        "objects": objs
    }

def csv_iocs(inc: dict) -> str:
    lines = ["type,value,context"]
    src_ip = inc.get("src_ip", "")
    lines.append(f"ipv4,{src_ip},Adversary Source IP")
    for f in (inc.get("files") or []):
        sha = f.get("sha256")
        if sha:
            lines.append(f"sha256,{sha},Decoy Artifact: {f.get('name')}")
    return "\n".join(lines) + "\n"
