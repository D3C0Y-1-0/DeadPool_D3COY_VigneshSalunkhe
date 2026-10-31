from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Body
from sqlalchemy import select

from ..db import SessionLocal, IncidentRow, EventRow

router = APIRouter(tags=["Incidents"])

@router.get("/api/v1/incidents")
@router.get("/api/incidents")
def list_incidents(
    severity: Optional[str] = None,
    status: Optional[str] = None,
    verdict: Optional[str] = None
):
    with SessionLocal() as db:
        stmt = select(IncidentRow)
        if severity:
            stmt = stmt.where(IncidentRow.severity == severity)
        if status:
            stmt = stmt.where(IncidentRow.status == status)
        if verdict:
            stmt = stmt.where(IncidentRow.verdict == verdict)
        
        stmt = stmt.order_by(IncidentRow.last_seen.desc())
        rows = db.execute(stmt).scalars().all()
        
        # Summary list
        return [
            {
                "id": r.id,
                "src_ip": r.src_ip,
                "first_seen": r.first_seen,
                "last_seen": r.last_seen,
                "score": r.score,
                "severity": r.severity,
                "verdict": r.verdict,
                "stage": r.stage,
                "status": r.status,
                "real_asset_touched": r.real_asset_touched,
                "honeytoken_hit": r.honeytoken_hit,
                "event_count": len((r.body or {}).get("timeline", [])),
                "actions": (r.body or {}).get("actions", []),
                "country": (r.body or {}).get("country", "XX"),
                "asn": (r.body or {}).get("asn", "Unknown")
            }
            for r in rows
        ]

@router.get("/api/v1/incidents/{iid}")
@router.get("/api/incidents/{iid}")
def get_incident(iid: str):
    with SessionLocal() as db:
        r = db.get(IncidentRow, iid)
        if not r:
            raise HTTPException(status_code=404, detail="Incident not found")
        data = dict(r.body or {})
        data["status"] = r.status
        data["severity"] = r.severity
        data["score"] = r.score
        return data

@router.patch("/api/v1/incidents/{iid}/status")
def update_incident_status(iid: str, payload: dict = Body(...)):
    new_status = payload.get("status")
    allowed = {"open", "investigating", "contained", "resolved", "false_positive"}
    if new_status not in allowed:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {allowed}")
    
    with SessionLocal() as db:
        r = db.get(IncidentRow, iid)
        if not r:
            raise HTTPException(status_code=404, detail="Incident not found")
        
        r.status = new_status
        body = dict(r.body or {})
        body["status"] = new_status
        r.body = body
        db.commit()
        return {"id": iid, "status": new_status}

@router.get("/api/v1/incidents/{iid}/timeline")
def get_incident_timeline(iid: str):
    with SessionLocal() as db:
        r = db.get(IncidentRow, iid)
        if not r:
            raise HTTPException(status_code=404, detail="Incident not found")
        return (r.body or {}).get("timeline", [])

@router.get("/api/v1/incidents/{iid}/techniques")
def get_incident_techniques(iid: str):
    with SessionLocal() as db:
        r = db.get(IncidentRow, iid)
        if not r:
            raise HTTPException(status_code=404, detail="Incident not found")
        return (r.body or {}).get("techniques", [])

@router.get("/api/v1/incidents/{iid}/risk")
def get_incident_risk(iid: str):
    with SessionLocal() as db:
        r = db.get(IncidentRow, iid)
        if not r:
            raise HTTPException(status_code=404, detail="Incident not found")
        return {
            "score": r.score,
            "severity": r.severity,
            "confidence": 100,
            "factors": (r.body or {}).get("factors", []),
            "cadence": (r.body or {}).get("profile", {}).get("cadence", "unknown")
        }
