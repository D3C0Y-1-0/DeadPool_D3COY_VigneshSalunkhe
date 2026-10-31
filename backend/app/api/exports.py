import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse, PlainTextResponse
from sqlalchemy import select

from ..db import SessionLocal, IncidentRow, EventRow
from ..engine.stix import bundle, csv_iocs

router = APIRouter(tags=["Exports"])

@router.get("/api/v1/exports/incidents/{iid}/stix")
@router.get("/api/incidents/{iid}/export/stix")
def export_stix(iid: str):
    with SessionLocal() as db:
        r = db.get(IncidentRow, iid)
        if not r:
            raise HTTPException(status_code=404, detail="Incident not found")
        return JSONResponse(content=bundle(r.body or {}))

@router.get("/api/v1/exports/incidents/{iid}/csv")
@router.get("/api/incidents/{iid}/export/csv")
def export_csv(iid: str):
    with SessionLocal() as db:
        r = db.get(IncidentRow, iid)
        if not r:
            raise HTTPException(status_code=404, detail="Incident not found")
        return PlainTextResponse(content=csv_iocs(r.body or {}), media_type="text/csv")

@router.get("/api/v1/exports/iocs")
def export_all_iocs():
    with SessionLocal() as db:
        iocs = []
        for r in db.query(IncidentRow).all():
            iocs.append({"type": "ipv4", "value": r.src_ip, "incident": r.id, "severity": r.severity})
            for f in (r.body or {}).get("files", []):
                if f.get("sha256"):
                    iocs.append({"type": "sha256", "value": f["sha256"], "incident": r.id, "name": f.get("name")})
        return iocs

@router.get("/api/v1/exports/ecs.ndjson")
@router.get("/api/export/ecs.ndjson")
def export_ecs():
    def ecs_format(e: dict) -> dict:
        return {
            "@timestamp": e.get("ts"),
            "event": {
                "id": e.get("id"),
                "action": e.get("action"),
                "outcome": e.get("outcome"),
                "category": [e.get("category", "threat")]
            },
            "source": {
                "ip": e.get("src_ip")
            },
            "destination": {
                "service": e.get("dst_service"),
                "port": e.get("dst_port")
            },
            "service": {
                "name": e.get("sensor")
            },
            "tags": e.get("flags", [])
        }

    with SessionLocal() as db:
        rows = db.query(EventRow).order_by(EventRow.ts.asc()).all()
        lines = [json.dumps(ecs_format(r.data)) for r in rows if r.data]
        return PlainTextResponse(content="\n".join(lines), media_type="application/x-ndjson")
