from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from ..db import SessionLocal, IncidentRow
from ..engine.classify import TECH

router = APIRouter(tags=["ATT&CK"])

@router.get("/api/v1/techniques")
@router.get("/api/v1/techniques/matrix")
@router.get("/api/attack-matrix")
def get_attack_matrix():
    with SessionLocal() as db:
        hits = {}
        for r in db.query(IncidentRow).all():
            for t in (r.body or {}).get("techniques", []):
                t_id = t["id"]
                if t_id not in hits:
                    hits[t_id] = {**t, "count": 0}
                hits[t_id]["count"] += 1
        return list(hits.values())

@router.get("/api/v1/techniques/{technique_id}")
def get_technique(technique_id: str):
    # Lookup in TECH catalog from attack_map.yaml
    tech = TECH.get(technique_id)
    if not tech:
        # Check by ID prefix/match
        match = next((v for k, v in TECH.items() if v.get("id") == technique_id), None)
        if match:
            tech = match
    if not tech:
        raise HTTPException(status_code=404, detail="Technique not found in ATT&CK map")
    return tech
