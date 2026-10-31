from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select

from ..db import SessionLocal, EventRow

router = APIRouter(tags=["Events"])

@router.get("/api/v1/events")
@router.get("/api/events")
def get_events(
    limit: int = Query(default=100, ge=1, le=2000),
    offset: int = Query(default=0, ge=0),
    sensor: Optional[str] = None,
    source_ip: Optional[str] = None,
    action: Optional[str] = None,
    zone: Optional[str] = None
):
    with SessionLocal() as db:
        stmt = select(EventRow)
        if sensor:
            stmt = stmt.where(EventRow.source == sensor)
        if source_ip:
            stmt = stmt.where(EventRow.src_ip == source_ip)
        if action:
            stmt = stmt.where(EventRow.action == action)
        if zone:
            stmt = stmt.where(EventRow.zone == zone)
        
        stmt = stmt.order_by(EventRow.ts.desc()).offset(offset).limit(limit)
        rows = db.execute(stmt).scalars().all()
        return [r.data for r in rows]

@router.get("/api/v1/events/recent")
def get_recent_events(limit: int = Query(default=50, ge=1, le=500)):
    with SessionLocal() as db:
        stmt = select(EventRow).order_by(EventRow.ts.desc()).limit(limit)
        rows = db.execute(stmt).scalars().all()
        return [r.data for r in rows]

@router.get("/api/v1/events/{event_id}")
def get_event_by_id(event_id: str):
    with SessionLocal() as db:
        ev = db.get(EventRow, event_id)
        if not ev:
            # Check by event_id alias
            ev = db.query(EventRow).filter(EventRow.event_id == event_id).first()
        if not ev:
            raise HTTPException(status_code=404, detail="Event not found")
        return ev.data
