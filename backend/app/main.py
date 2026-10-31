import asyncio
import json
import uuid
import os
import datetime as dt
from collections import defaultdict
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from sqlalchemy import select, func

from .db import SessionLocal, EventRow, IncidentRow, ActionRow, init_db
from .schema import NormalizedEvent
from . import collector
from .engine.classify import classify
from .engine.evaluate import evaluate
from .engine.respond import recommend, execute
from .engine.stix import bundle, csv_iocs
from .geo import geo, ALIAS, get_raw_ips

app = FastAPI(title="MIRAGE SOC API", version="1.0.0")

# CORS enabled for hackathon lab dashboard frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

clients: set[WebSocket] = set()
_ip_locks: dict[str, asyncio.Lock] = defaultdict(asyncio.Lock)
_sim_cmd_dir = os.environ.get("SIM_CMD_DIR", "/sim_cmd")
_blocklist_path = os.environ.get("BLOCKLIST_PATH", "/shared/blocklist.txt")

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
        db.add(EventRow(
            id=ev["id"],
            ts=ev["ts"],
            source=ev["source"],
            zone=ev["zone"],
            src_ip=src_ip,
            session_id=ev.get("session_id"),
            action=ev["action"],
            outcome=ev["outcome"],
            data=ev
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
                row = IncidentRow(id=iid, src_ip=src_ip)
                db.add(row)

            row.first_seen = inc["first_seen"]
            row.last_seen = inc["last_seen"]
            row.score = inc["score"]
            row.severity = inc["severity"]
            row.verdict = inc["verdict"]
            row.stage = inc["stage"]
            row.status = old_status
            row.real_asset_touched = inc["real_asset_touched"]
            row.honeytoken_hit = inc["honeytoken_hit"]
            row.body = inc
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

@app.get("/health")
def health():
    try:
        with SessionLocal() as db:
            db.execute(select(1)).first()
        return {"status": "ok", "db": "connected", "utc": dt.datetime.now(dt.timezone.utc).isoformat()}
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "detail": str(e)})

@app.get("/api/stats")
def stats():
    with SessionLocal() as db:
        ev_count = db.query(EventRow).count()
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

@app.get("/api/events")
def get_events(limit: int = Query(default=200, le=2000)):
    with SessionLocal() as db:
        rows = db.query(EventRow).order_by(EventRow.ts.desc()).limit(limit).all()
        return [r.data for r in rows]

@app.get("/api/incidents")
def get_incidents():
    order_map = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    with SessionLocal() as db:
        rows = db.query(IncidentRow).all()
        sorted_rows = sorted(rows, key=lambda r: (order_map.get(r.severity, 4), -r.score))
        return [
            {
                "id": r.id,
                "src_ip": r.src_ip,
                "severity": r.severity,
                "score": r.score,
                "verdict": r.verdict,
                "stage": r.stage,
                "status": r.status,
                "first_seen": r.first_seen,
                "last_seen": r.last_seen,
                "real_asset_touched": r.real_asset_touched,
                "honeytoken_hit": r.honeytoken_hit,
                "country": (r.body or {}).get("country", "XX"),
                "asn": (r.body or {}).get("asn", "Unknown")
            }
            for r in sorted_rows
        ]

@app.get("/api/incidents/{iid}")
def get_incident(iid: str):
    with SessionLocal() as db:
        r = db.get(IncidentRow, iid)
        if not r:
            raise HTTPException(status_code=404, detail=f"Incident {iid} not found")
        data = dict(r.body or {})
        data["status"] = r.status
        return data

@app.post("/api/incidents/{iid}/actions/{aid}")
async def handle_action(iid: str, aid: str, mode: str = "approve"):
    if mode not in ("approve", "dry_run"):
        raise HTTPException(status_code=400, detail="Mode must be 'approve' or 'dry_run'")

    with SessionLocal() as db:
        r = db.get(IncidentRow, iid)
        if not r:
            raise HTTPException(status_code=404, detail="Incident not found")

        body = dict(r.body or {})
        actions = body.get("actions", [])
        action_match = next((a for a in actions if a["id"] == aid), None)
        if not action_match:
            raise HTTPException(status_code=404, detail="Action not found on this incident")

        # Supply raw IPs for block enforcement
        if action_match["type"] == "block_source":
            action_match["params"]["raw_ips"] = get_raw_ips(r.src_ip)

        try:
            result_str = execute(action_match, dry_run=(mode == "dry_run"), blocklist_path=_blocklist_path)
            action_match["result"] = result_str
            action_match["status"] = "dry_run" if mode == "dry_run" else "executed"

            if mode == "approve" and action_match["type"] == "block_source":
                r.status = "contained"
                body["status"] = "contained"

            # Record action in audit log
            db.add(ActionRow(
                id=uuid.uuid4().hex[:12],
                incident_id=iid,
                type=action_match["type"],
                params=action_match["params"],
                status=action_match["status"],
                result=result_str
            ))

            r.body = body
            db.commit()

        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    await broadcast("incident", body | {"status": r.status})
    return action_match

@app.get("/api/incidents/{iid}/export/stix")
def export_stix(iid: str):
    with SessionLocal() as db:
        r = db.get(IncidentRow, iid)
        if not r:
            raise HTTPException(status_code=404, detail="Incident not found")
        return JSONResponse(content=bundle(r.body or {}))

@app.get("/api/incidents/{iid}/export/csv")
def export_csv(iid: str):
    with SessionLocal() as db:
        r = db.get(IncidentRow, iid)
        if not r:
            raise HTTPException(status_code=404, detail="Incident not found")
        return PlainTextResponse(content=csv_iocs(r.body or {}), media_type="text/csv")

@app.get("/api/attack-matrix")
def attack_matrix():
    with SessionLocal() as db:
        hits = {}
        for r in db.query(IncidentRow).all():
            for t in (r.body or {}).get("techniques", []):
                t_id = t["id"]
                if t_id not in hits:
                    hits[t_id] = {**t, "count": 0}
                hits[t_id]["count"] += 1
        return list(hits.values())

@app.get("/api/export/ecs.ndjson")
def export_ecs():
    def ecs_format(e: dict) -> dict:
        return {
            "@timestamp": e.get("ts"),
            "source": {"ip": e.get("src_ip")},
            "event": {
                "action": e.get("action"),
                "outcome": e.get("outcome"),
                "category": e.get("category")
            },
            "user": {"name": e.get("user")},
            "process": {"command_line": e.get("cmd")},
            "file": {"hash": {"sha256": (e.get("file") or {}).get("sha256")}},
            "host": {"name": e.get("sensor")},
            "threat": {"technique": {"id": e.get("techniques", [])}},
            "labels": {"zone": e.get("zone"), "flags": e.get("flags", [])}
        }

    with SessionLocal() as db:
        events = db.query(EventRow).order_by(EventRow.ts).all()
        lines = "\n".join(json.dumps(ecs_format(r.data)) for r in events)
        return PlainTextResponse(lines, media_type="application/x-ndjson")

# NOTE: /api/demo/reset MUST be declared before /api/demo/{scenario} to prevent router collision
@app.post("/api/demo/reset")
async def demo_reset():
    with SessionLocal() as db:
        db.query(EventRow).delete()
        db.query(IncidentRow).delete()
        db.query(ActionRow).delete()
        db.commit()

    collector.reset_scan_detector()

    if os.path.exists(_blocklist_path):
        with open(_blocklist_path, "w", encoding="utf-8") as f:
            f.write("")

    await broadcast("reset", {"ok": True})
    return {"ok": True, "detail": "MIRAGE demo environment reset to pristine state"}

@app.post("/api/demo/{scenario}")
def demo_trigger(scenario: str):
    if scenario not in ("targeted", "noise"):
        raise HTTPException(status_code=400, detail="Invalid scenario. Choose 'targeted' or 'noise'")
    
    os.makedirs(_sim_cmd_dir, exist_ok=True)
    cmd_file = os.path.join(_sim_cmd_dir, "trigger.json")
    with open(cmd_file, "w", encoding="utf-8") as f:
        json.dump({"scenario": scenario, "id": uuid.uuid4().hex}, f)

    return {"ok": True, "scenario": scenario, "status": "triggered"}

@app.post("/api/_seed")
async def seed_events(events: list[dict]):
    """Debug / fallback route for seeding golden events into the pipeline."""
    for ev in events:
        await on_event(ev)
    return {"ok": True, "count": len(events)}
