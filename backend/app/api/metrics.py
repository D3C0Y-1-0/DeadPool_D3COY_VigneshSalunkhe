import datetime as dt
from fastapi import APIRouter
from sqlalchemy import func

from ..db import SessionLocal, EventRow, IncidentRow, ActionRow

router = APIRouter(tags=["Metrics"])

@router.get("/api/v1/metrics/overview")
@router.get("/api/stats")
def get_metrics_overview():
    with SessionLocal() as db:
        ev_count = db.query(func.count(EventRow.id)).scalar() or 0
        incidents_all = db.query(IncidentRow).all()
        crit = [i for i in incidents_all if i.severity == "critical" and i.status == "open"]
        noise = [i for i in incidents_all if i.verdict == "opportunistic"]
        contained = [i for i in incidents_all if i.status == "contained"]
        
        suppressed_pct = round(100.0 * (1.0 - (len(incidents_all) / ev_count)), 1) if ev_count > 0 else 0.0

        return {
            "raw_events": ev_count,
            "incidents": len(incidents_all),
            "critical_open": len(crit),
            "opportunistic": len(noise),
            "contained": len(contained),
            "noise_suppressed_pct": suppressed_pct
        }

@router.get("/api/v1/metrics/timeline")
def get_metrics_timeline():
    with SessionLocal() as db:
        # Group events by minute
        rows = (
            db.query(func.substr(EventRow.ts, 1, 16).label("minute"), func.count(EventRow.id))
            .group_by("minute")
            .order_by("minute")
            .limit(60)
            .all()
        )
        return [{"time": m, "count": c} for m, c in rows]

@router.get("/api/v1/metrics/sensors")
def get_metrics_sensors():
    with SessionLocal() as db:
        rows = (
            db.query(EventRow.source, func.count(EventRow.id))
            .group_by(EventRow.source)
            .all()
        )
        return [{"sensor": s, "count": c} for s, c in rows]

@router.get("/api/v1/metrics/severity")
def get_metrics_severity():
    with SessionLocal() as db:
        rows = (
            db.query(IncidentRow.severity, func.count(IncidentRow.id))
            .group_by(IncidentRow.severity)
            .all()
        )
        return {s or "unknown": c for s, c in rows}
