ALIAS = {
    "172.28.0.50": "203.0.113.50",
    "172.29.0.50": "203.0.113.50"
}

GEO = {
    "203.0.113.50": ("RU", "AS64500 ExampleNet"),
}

NOISE_COUNTRIES = [
    ("CN", "AS64501 ChinaNet"),
    ("BR", "AS64502 Telemar"),
    ("US", "AS64503 CloudNet"),
    ("IN", "AS64504 Bharti"),
    ("VN", "AS64505 VNPT"),
    ("DE", "AS64506 Hetzner")
]

def display_ip(raw: str) -> str:
    if raw in ALIAS:
        return ALIAS[raw]
    if raw.startswith("172.28.0."):
        last_octet = raw.split(".")[-1]
        if last_octet.isdigit() and int(last_octet) >= 100:
            return f"198.51.100.{int(last_octet) - 99}"
    return raw

def geo(ip: str) -> tuple[str, str]:
    if ip in GEO:
        return GEO[ip]
    parts = ip.split(".")
    n = int(parts[-1]) if parts[-1].isdigit() else 0
    return NOISE_COUNTRIES[n % len(NOISE_COUNTRIES)]

def get_raw_ips(display_ip_val: str) -> list[str]:
    """Returns all container raw IPs associated with a given display IP."""
    raws = [k for k, v in ALIAS.items() if v == display_ip_val]
    if not raws and display_ip_val.startswith("198.51.100."):
        last = int(display_ip_val.split(".")[-1])
        raws.append(f"172.28.0.{last + 99}")
    if not raws:
        raws.append(display_ip_val)
    return raws
