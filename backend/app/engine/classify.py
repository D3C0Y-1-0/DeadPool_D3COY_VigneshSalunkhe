import re
import yaml
import pathlib

MAP_PATH = pathlib.Path(__file__).with_name("attack_map.yaml")
with open(MAP_PATH, "r", encoding="utf-8") as f:
    MAP = yaml.safe_load(f)

TECH = MAP["techniques"]
ORDER = MAP["stage_order"]
RULES = MAP["rules"]

# Validate at import time that every technique referenced in rules exists in techniques table
for r in RULES:
    for t_id in r.get("techniques", []):
        if t_id not in TECH:
            raise ValueError(f"Rule '{r.get('id')}' references unknown technique ID '{t_id}'")

# Precompile regexes
COMPILED_RULES = []
for r in RULES:
    rule_dict = dict(r)
    when = dict(r["when"])
    if "regex" in when:
        when["_re"] = re.compile(when["regex"], re.I)
    rule_dict["_when"] = when
    COMPILED_RULES.append(rule_dict)

def _match(when: dict, ev: dict) -> bool:
    for k, v in when.items():
        if k == "_re" or k == "regex":
            cmd = ev.get("cmd") or ""
            # Guard against huge input regex dos
            if len(cmd) > 2000:
                cmd = cmd[:2000]
            if not when["_re"].search(cmd):
                return False
        elif k == "flag_any":
            ev_flags = set(ev.get("flags") or [])
            if not (set(v) & ev_flags):
                return False
        elif ev.get(k) != v:
            return False
    return True

def classify(ev: dict) -> dict:
    ev_copy = dict(ev)
    techs = set()
    stage = None
    cat = None
    flags = list(ev_copy.get("flags") or [])

    for r in COMPILED_RULES:
        if _match(r["_when"], ev_copy):
            techs.update(r.get("techniques", []))
            r_stage = r.get("stage")
            r_cat = r.get("category")
            if r_stage:
                if stage is None or ORDER.index(r_stage) >= ORDER.index(stage):
                    stage, cat = r_stage, r_cat
            if r.get("flag") and r["flag"] not in flags:
                flags.append(r["flag"])

    if ev_copy.get("honeytoken_id") and "honeytoken" not in flags:
        flags.append("honeytoken")

    ev_copy.update(
        techniques=sorted(techs),
        stage=stage,
        category=cat,
        flags=sorted(set(flags))
    )
    return ev_copy
