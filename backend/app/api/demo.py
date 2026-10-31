import os
import json
import uuid
from fastapi import APIRouter, HTTPException, Body

from ..db import SessionLocal, EventRow, IncidentRow, ActionRow, AuditLogRow, IncidentEventRow
from ..collector import reset_scan_detector

router = APIRouter(tags=["Demo Control"])

_sim_cmd_dir = os.environ.get("SIM_CMD_DIR", "/sim_cmd")
_blocklist_path = os.environ.get("BLOCKLIST_PATH", "/shared/blocklist.txt")

@router.get("/api/v1/demo/status")
def demo_status():
    cmd_file = os.path.join(_sim_cmd_dir, "trigger.json")
    last_trigger = None
    if os.path.exists(cmd_file):
        try:
            with open(cmd_file, "r", encoding="utf-8") as f:
                last_trigger = json.load(f)
        except Exception:
            pass
    return {
        "active_scenario": last_trigger.get("scenario") if last_trigger else None,
        "last_trigger_id": last_trigger.get("id") if last_trigger else None,
        "sim_ready": True
    }

@router.post("/api/v1/demo/reset")
@router.post("/api/demo/reset")
def demo_reset():
    with SessionLocal() as db:
        db.query(EventRow).delete()
        db.query(IncidentRow).delete()
        db.query(ActionRow).delete()
        db.query(IncidentEventRow).delete()
        db.query(AuditLogRow).delete()
        db.commit()

    reset_scan_detector()

    if os.path.exists(_blocklist_path):
        with open(_blocklist_path, "w", encoding="utf-8") as f:
            f.write("")

    return {"ok": True, "detail": "MIRAGE demo environment reset to pristine state"}

@router.post("/api/v1/demo/run")
def demo_run_v1(payload: dict = Body(...)):
    scenario = payload.get("scenario")
    return trigger_scenario(scenario)

@router.post("/api/demo/{scenario}")
def demo_trigger_legacy(scenario: str):
    return trigger_scenario(scenario)

def trigger_scenario(scenario: str):
    if scenario not in ("targeted", "noise"):
        raise HTTPException(status_code=400, detail="Invalid scenario. Choose 'targeted' or 'noise'")
    
    os.makedirs(_sim_cmd_dir, exist_ok=True)
    cmd_file = os.path.join(_sim_cmd_dir, "trigger.json")
    trigger_id = uuid.uuid4().hex
    with open(cmd_file, "w", encoding="utf-8") as f:
        json.dump({"scenario": scenario, "id": trigger_id}, f)

    return {"ok": True, "scenario": scenario, "id": trigger_id, "status": "triggered"}
