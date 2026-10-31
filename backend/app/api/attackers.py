from fastapi import APIRouter, HTTPException
from sqlalchemy import select, func

from ..db import SessionLocal, IncidentRow, EventRow, AttackerRow

router = APIRouter(tags=["Attackers"])

@router.get("/api/v1/attackers")
def list_attackers():
    with SessionLocal() as db:
        incidents = db.query(IncidentRow).all()
        # Aggregate by src_ip
        attackers = {}
        for inc in incidents:
            ip = inc.src_ip
            body = inc.body or {}
            profile = body.get("profile", {})
            timeline = body.get("timeline", [])
            
            if ip not in attackers:
                attackers[ip] = {
                    "id": ip,
                    "source_ip": ip,
                    "display_identity": ip,
                    "first_seen": inc.first_seen,
                    "last_seen": inc.last_seen,
                    "total_events": len(timeline),
                    "total_incidents": 1,
                    "sensors_touched": list(profile.get("sensors", [])),
                    "risk_level": inc.severity,
                    "verdict": inc.verdict,
                    "cadence": profile.get("cadence", "unknown"),
                    "country": body.get("country", "XX"),
                    "asn": body.get("asn", "Unknown")
                }
            else:
                attackers[ip]["total_incidents"] += 1
                attackers[ip]["total_events"] += len(timeline)
                if inc.last_seen > attackers[ip]["last_seen"]:
                    attackers[ip]["last_seen"] = inc.last_seen
                    attackers[ip]["risk_level"] = inc.severity
        return list(attackers.values())

@router.get("/api/v1/attackers/{attacker_id}")
def get_attacker(attacker_id: str):
    with SessionLocal() as db:
        # Check if there is an incident for this IP
        inc = db.query(IncidentRow).filter(IncidentRow.src_ip == attacker_id).first()
        if not inc:
            raise HTTPException(status_code=404, detail="Attacker not found")
        
        body = inc.body or {}
        profile = body.get("profile", {})
        timeline = body.get("timeline", [])
        
        return {
            "id": attacker_id,
            "source_ip": attacker_id,
            "display_identity": attacker_id,
            "first_seen": inc.first_seen,
            "last_seen": inc.last_seen,
            "total_events": len(timeline),
            "total_incidents": 1,
            "observed_sensors": list(profile.get("sensors", [])),
            "observed_usernames": list(profile.get("creds_tried", [])),
            "fingerprint": {
                "ssh_client": profile.get("ssh_client"),
                "hassh": profile.get("hassh")
            },
            "risk_level": inc.severity,
            "verdict": inc.verdict,
            "cadence": profile.get("cadence", "unknown"),
            "country": body.get("country", "XX"),
            "asn": body.get("asn", "Unknown")
        }

@router.get("/api/v1/attackers/{attacker_id}/timeline")
def get_attacker_timeline(attacker_id: str):
    with SessionLocal() as db:
        inc = db.query(IncidentRow).filter(IncidentRow.src_ip == attacker_id).first()
        if not inc:
            raise HTTPException(status_code=404, detail="Attacker not found")
        return (inc.body or {}).get("timeline", [])

@router.get("/api/v1/attackers/{attacker_id}/incidents")
def get_attacker_incidents(attacker_id: str):
    with SessionLocal() as db:
        rows = db.query(IncidentRow).filter(IncidentRow.src_ip == attacker_id).all()
        return [{"id": r.id, "severity": r.severity, "score": r.score, "status": r.status} for r in rows]
