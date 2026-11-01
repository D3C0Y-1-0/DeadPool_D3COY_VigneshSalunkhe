import asyncio
import json
import uuid
import os
import datetime as dt
from collections import defaultdict
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from .db import (
    SessionLocal, EventRow, IncidentRow, ActionRow,
    IncidentEventRow, AttackerRow, AuditLogRow, init_db
)
from .schema import NormalizedEvent
from . import collector
from .middleware import AgentEventBodyLimit
from .engine.classify import classify
from .engine.evaluate import evaluate
from .engine.respond import recommend
from .geo import geo

from .api import (
    health, metrics, events, incidents,
    attackers, techniques, actions, exports, demo, agents
)

app = FastAPI(
    title="MIRAGE SOC API",
    version="1.0.0",
    description="Deception-Driven Threat Detection & Active Containment SOC Platform"
)

# CORS enabled for hackathon lab dashboard frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(AgentEventBodyLimit, max_bytes=512 * 1024)

clients: set[WebSocket] = set()
_ip_locks: dict[str, asyncio.Lock] = defaultdict(asyncio.Lock)
_sim_cmd_dir = os.environ.get("SIM_CMD_DIR", "/sim_cmd")
_blocklist_path = os.environ.get("BLOCKLIST_PATH", "/shared/blocklist.txt")

# Include all modular routers (providing /api/v1/* and legacy /api/* aliases)
app.include_router(health.router)
app.include_router(metrics.router)
app.include_router(events.router)
app.include_router(incidents.router)
app.include_router(attackers.router)
app.include_router(techniques.router)
app.include_router(actions.router)
app.include_router(exports.router)
app.include_router(demo.router)
app.include_router(agents.router)

async def broadcast(kind: str, payload: dict):
    dead = []
    message = json.dumps({"kind": kind, "data": payload})
    for c in list(clients):
        try:
            await c.send_text(message)
        except Exception:
            dead.append(c)
    for c in dead:
        clients.discard(c)

def recent_events(db, ip: str, minutes: int = 30) -> list[dict]:
    cutoff = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(minutes=minutes)).strftime("%Y-%m-%dT%H:%M:%S")
    stmt = (
        select(EventRow)
        .where(EventRow.src_ip == ip, EventRow.ts >= cutoff)
        .order_by(EventRow.ts)
    )
    rows = db.execute(stmt).scalars().all()
    return [r.data for r in rows]

async def on_event(ev: dict):
    # 1. Classify with ATT&CK rules
    ev = classify(ev)
    src_ip = ev.get("src_ip", "0.0.0.0")

    # 2. Persist event
    with SessionLocal() as db:
        existing = db.get(EventRow, ev["id"])
        if existing:
            existing.ts = ev["ts"]
            existing.data = ev
            existing.action = ev["action"]
            existing.event_type = ev["action"]
            existing.cmd = ev.get("cmd")
            existing.command = ev.get("cmd")
            existing.user = ev.get("user")
            existing.username = ev.get("user")
        else:
            db.add(EventRow(
                id=ev["id"],
                event_id=ev["id"],
                ts=ev["ts"],
                source=ev["source"],
                sensor=ev.get("sensor"),
                zone=ev.get("zone", "deception"),
                src_ip=src_ip,
                session_id=ev.get("session_id"),
                action=ev["action"],
                event_type=ev["action"],
                outcome=ev["outcome"],
                dst_service=ev.get("dst_service"),
                dst_port=ev.get("dst_port"),
                destination_asset=ev.get("sensor"),
                destination_port=ev.get("dst_port"),
                user=ev.get("user"),
                username=ev.get("user"),
                cmd=ev.get("cmd"),
                command=ev.get("cmd"),
                data=ev,
                raw_event=ev.get("raw")
            ))
        db.commit()

    # 3. Live WebSocket broadcast of the event
    await broadcast("event", ev)

    # 4. Skip incident evaluation for internal benign production traffic (10.x)
    is_benign_prod = (ev.get("zone") == "production" and src_ip.startswith("10."))
    if is_benign_prod:
        return

    # 5. Guard incident evaluation per IP with asyncio lock
    async with _ip_locks[src_ip]:
        with SessionLocal() as db:
            events_pool = recent_events(db, src_ip, minutes=30)
            inc = evaluate(src_ip, events_pool)
            if not inc:
                return

            c_code, asn_name = geo(src_ip)
            inc["country"] = c_code
            inc["asn"] = asn_name
            iid = f"INC-{src_ip}"
            inc["id"] = iid

            row = db.get(IncidentRow, iid)
            old_status = row.status if row else "open"
            inc["status"] = old_status

            # Retain approved/executed actions and merge new recommendations on escalation
            existing_actions = (row.body or {}).get("actions") if row else None
            if not row or not existing_actions:
                inc["actions"] = recommend(inc)
            else:
                new_recs = recommend(inc)
                existing_by_type = {a["type"]: a for a in existing_actions}
                final_actions = []
                for act in new_recs:
                    t = act["type"]
                    if t in existing_by_type:
                        if existing_by_type[t].get("status") in ("approved", "executed", "applied"):
                            final_actions.append(existing_by_type[t])
                        else:
                            final_actions.append(act)
                    else:
                        final_actions.append(act)
                if inc.get("severity") in ("medium", "high", "critical"):
                    final_actions = [a for a in final_actions if a["type"] != "monitor"]
                inc["actions"] = final_actions

            if not row:
                row = IncidentRow(id=iid, incident_key=iid, src_ip=src_ip)
                db.add(row)

            row.title = f"{inc['severity'].upper()} threat from {src_ip}"
            row.description = inc.get("narrative")
            row.first_seen = inc["first_seen"]
            row.last_seen = inc["last_seen"]
            row.score = inc["score"]
            row.risk_score = inc["score"]
            row.severity = inc["severity"]
            row.verdict = inc["verdict"]
            row.stage = inc["stage"]
            row.status = old_status
            row.real_asset_touched = inc["real_asset_touched"]
            row.honeytoken_hit = inc["honeytoken_hit"]
            row.event_count = len(inc.get("timeline", []))
            row.body = inc

            # Update Attacker profile
            att = db.get(AttackerRow, src_ip)
            if not att:
                att = AttackerRow(
                    id=src_ip,
                    source_ip=src_ip,
                    display_identity=src_ip,
                    first_seen=inc["first_seen"],
                    last_seen=inc["last_seen"],
                    total_events=len(inc.get("timeline", [])),
                    total_incidents=1,
                    risk_level=inc["severity"]
                )
                db.add(att)
            else:
                att.last_seen = inc["last_seen"]
                att.risk_level = inc["severity"]
                att.total_events = len(inc.get("timeline", []))

            db.commit()

        # Broadcast updated incident
        await broadcast("incident", inc)

@app.on_event("startup")
async def startup_event():
    init_db()
    # Ensure command and shared dirs exist
    os.makedirs(_sim_cmd_dir, exist_ok=True)
    b_dir = os.path.dirname(_blocklist_path)
    if b_dir:
        os.makedirs(b_dir, exist_ok=True)
    asyncio.create_task(collector.start(on_event))

@app.websocket("/ws/live")
async def websocket_endpoint(w: WebSocket):
    await w.accept()
    clients.add(w)
    try:
        while True:
            # Keepalive receiver
            await w.receive_text()
    except WebSocketDisconnect:
        clients.discard(w)
    except Exception:
        clients.discard(w)

@app.post("/api/_seed")
async def seed_events(events: list[dict]):
    """Debug / fallback route for seeding golden events into the pipeline."""
    for ev in events:
        await on_event(ev)
    return {"ok": True, "count": len(events)}
