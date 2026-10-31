import os
import uuid
import datetime as dt
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Body
from sqlalchemy import select

from ..db import SessionLocal, IncidentRow, ActionRow, AuditLogRow
from ..engine.respond import execute
from ..geo import get_raw_ips

router = APIRouter(tags=["Response"])

_blocklist_path = os.environ.get("BLOCKLIST_PATH", "/shared/blocklist.txt")

def _record_audit(db, actor: str, action: str, target: str, before: dict, after: dict, correlation_id: str):
    db.add(AuditLogRow(
        id=uuid.uuid4().hex[:12],
        actor=actor,
        action=action,
        target=target,
        before_state=before,
        after_state=after,
        timestamp=dt.datetime.now(dt.timezone.utc).isoformat(),
        correlation_id=correlation_id
    ))
    db.commit()

@router.get("/api/v1/actions")
def list_actions():
    with SessionLocal() as db:
        rows = db.query(ActionRow).order_by(ActionRow.created_at.desc()).all()
        return [
            {
                "id": r.id,
                "incident_id": r.incident_id,
                "type": r.type,
                "status": r.status,
                "params": r.params,
                "result": r.result,
                "created_at": r.created_at
            }
            for r in rows
        ]

@router.get("/api/v1/actions/{action_id}")
def get_action(action_id: str):
    with SessionLocal() as db:
        r = db.get(ActionRow, action_id)
        if not r:
            raise HTTPException(status_code=404, detail="Action not found")
        return {
            "id": r.id,
            "incident_id": r.incident_id,
            "type": r.type,
            "status": r.status,
            "params": r.params,
            "result": r.result,
            "created_at": r.created_at
        }

@router.post("/api/v1/actions/{action_id}/approve")
def approve_action_v1(action_id: str):
    return handle_action_execution(aid=action_id, mode="approve")

@router.post("/api/v1/actions/{action_id}/reject")
def reject_action_v1(action_id: str):
    with SessionLocal() as db:
        # Locate incident containing this action
        for inc_row in db.query(IncidentRow).all():
            body = dict(inc_row.body or {})
            actions = body.get("actions", [])
            for a in actions:
                if a.get("id") == action_id:
                    a["status"] = "rejected"
                    inc_row.body = body
                    _record_audit(db, "analyst", "action_rejected", a.get("type"), {"status": "recommended"}, {"status": "rejected"}, inc_row.id)
                    db.commit()
                    return {"id": action_id, "status": "rejected"}
        raise HTTPException(status_code=404, detail="Action not found")

@router.post("/api/incidents/{iid}/actions/{aid}")
@router.post("/api/v1/incidents/{iid}/actions/{aid}")
def handle_action_execution(iid: Optional[str] = None, aid: str = "", mode: str = "approve"):
    if mode not in ("approve", "dry_run"):
        raise HTTPException(status_code=400, detail="Mode must be 'approve' or 'dry_run'")

    with SessionLocal() as db:
        inc_row = None
        if iid:
            inc_row = db.get(IncidentRow, iid)
        else:
            # Find incident by action ID
            for r in db.query(IncidentRow).all():
                if any(a.get("id") == aid for a in (r.body or {}).get("actions", [])):
                    inc_row = r
                    iid = r.id
                    break

        if not inc_row:
            raise HTTPException(status_code=404, detail="Incident or action not found")

        body = dict(inc_row.body or {})
        actions = body.get("actions", [])
        action_match = next((a for a in actions if a["id"] == aid), None)
        if not action_match:
            raise HTTPException(status_code=404, detail="Action not found on this incident")

        # Supply raw IPs for block enforcement
        if action_match["type"] == "block_source":
            action_match["params"]["raw_ips"] = get_raw_ips(inc_row.src_ip)

        before_status = action_match.get("status")

        try:
            result_str = execute(action_match, dry_run=(mode == "dry_run"), blocklist_path=_blocklist_path)
            action_match["result"] = result_str
            action_match["status"] = "dry_run" if mode == "dry_run" else "executed"

            if mode == "approve" and action_match["type"] == "block_source":
                inc_row.status = "contained"
                body["status"] = "contained"

            # Record in actions table safely (update if existing or insert)
            existing_act = db.get(ActionRow, aid)
            if existing_act:
                existing_act.status = action_match["status"]
                existing_act.result = result_str
                existing_act.params = action_match["params"]
            else:
                db.add(ActionRow(
                    id=aid,
                    incident_id=iid,
                    type=action_match["type"],
                    params=action_match["params"],
                    status=action_match["status"],
                    result=result_str
                ))

            # Record in audit log
            _record_audit(
                db,
                actor="analyst",
                action=f"action_{mode}",
                target=action_match["type"],
                before={"status": before_status},
                after={"status": action_match["status"], "result": result_str},
                correlation_id=iid
            )

            inc_row.body = body
            db.commit()

        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

        return action_match
