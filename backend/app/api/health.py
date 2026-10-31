import os
import datetime as dt
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy import select, func

from ..db import SessionLocal, EventRow

router = APIRouter(tags=["Health"])

SENSORS = [
    {"name": "cowrie", "asset": "db-prod-02", "port": 2222, "zone": "deception"},
    {"name": "portal", "asset": "customer-portal", "port": 8080, "zone": "deception"},
    {"name": "tripwire", "asset": "tripwire-01", "port": 2323, "zone": "deception"},
    {"name": "opencanary", "asset": "fileserv-01", "port": 3306, "zone": "deception"},
    {"name": "prod", "asset": "prod-web-01", "port": 80, "zone": "production"}
]

@router.get("/health")
@router.get("/api/v1/health")
def health():
    try:
        with SessionLocal() as db:
            db.execute(select(1)).first()
        return {
            "status": "ok",
            "mode": "enforce",
            "db": "connected",
            "utc": dt.datetime.now(dt.timezone.utc).isoformat(),
            "simulation": True
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "mode": "enforce", "detail": str(e)})

@router.get("/api/v1/health/ready")
def readiness():
    try:
        with SessionLocal() as db:
            db.execute(select(1)).first()
        return {"ready": True}
    except Exception:
        raise HTTPException(status_code=503, detail="Database not ready")

@router.get("/api/v1/health/sensors")
def sensor_health():
    with SessionLocal() as db:
        results = []
        for s in SENSORS:
            name = s["name"]
            row = (
                db.query(EventRow)
                .filter(EventRow.source == name)
                .order_by(EventRow.ts.desc())
                .first()
            )
            count = db.query(func.count(EventRow.id)).filter(EventRow.source == name).scalar() or 0
            results.append({
                "sensor": name,
                "asset": s["asset"],
                "zone": s["zone"],
                "status": "online",
                "last_event": row.ts if row else None,
                "total_events": count
            })
        return results
