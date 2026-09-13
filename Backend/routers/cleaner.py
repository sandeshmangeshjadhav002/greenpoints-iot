"""
Cleaner router — bin monitoring + task system.

CLEANER permissions:
  • Login (auth router)
  • View full / critical dustbins
  • Receive cleaning tasks (assigned or open)
  • Mark dustbin as cleaned
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException

from database import get_admin_client
from routers.auth import require_role
from schemas import TokenData
from services.sensor_service import api_bin

router = APIRouter(prefix="/api/cleaner", tags=["cleaner"])

_cleaner_or_admin = require_role("cleaner", "admin")


# ── Bin views ─────────────────────────────────────────────────────────────────

@router.get("/bins/full")
def bins_needing_collection(threshold: float = 75.0, current: TokenData = Depends(_cleaner_or_admin)):
    admin = get_admin_client()
    r = admin.table("smart_bins").select("*").gte("fill_level", threshold).order("fill_level", desc=True).execute()
    return {"success": True, "data": [api_bin(row) for row in r.data]}


@router.get("/bins/critical")
def critical_bins(current: TokenData = Depends(_cleaner_or_admin)):
    admin = get_admin_client()
    r = admin.table("smart_bins").select("*").eq("health", "critical").order("fill_level", desc=True).execute()
    return {"success": True, "data": [api_bin(row) for row in r.data]}


@router.get("/stats")
def cleaner_stats(current: TokenData = Depends(_cleaner_or_admin)):
    admin = get_admin_client()
    bins = admin.table("smart_bins").select("id, fill_level, health, sensor_status").execute().data
    tasks = admin.table("cleaning_tasks").select("id, status").eq("assigned_to", current.sub).execute().data
    return {"success": True, "data": {
        "total_bins":    len(bins),
        "critical_bins": sum(1 for b in bins if b.get("health") == "critical"),
        "near_full_bins":sum(1 for b in bins if float(b.get("fill_level") or 0) >= 75),
        "online_bins":   sum(1 for b in bins if b.get("sensor_status") == "online"),
        "open_tasks":    sum(1 for t in tasks if t.get("status") in ("open","in_progress")),
        "done_tasks":    sum(1 for t in tasks if t.get("status") == "done"),
    }}


@router.post("/bins/{code}/collected")
def mark_bin_collected(code: str, payload: dict | None = None, current: TokenData = Depends(_cleaner_or_admin)):
    admin = get_admin_client()
    r = admin.table("smart_bins").select("*").eq("code", code).limit(1).execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Unknown bin")
    bin_row = r.data[0]
    now = datetime.now(timezone.utc).isoformat()
    admin.table("smart_bins").update({"fill_level": 0.0, "health": "good", "last_seen_at": now}).eq("id", bin_row["id"]).execute()
    admin.table("bin_telemetry").insert({
        "bin_id": bin_row["id"], "fill_level": 0.0,
        "battery": float(bin_row.get("battery") or 0),
        "sensor_status": bin_row.get("sensor_status") or "online",
        "wifi_status": bin_row.get("wifi_status") or "connected",
        "recorded_at": now,
    }).execute()
    # Auto-close any open task for this bin
    admin.table("cleaning_tasks").update({
        "status": "done", "completed_at": now,
        "updated_at": now,
    }).eq("bin_id", bin_row["id"]).in_("status", ["open", "in_progress"]).execute()
    return {"success": True, "data": {
        "bin_code": code, "fill_level": 0.0,
        "collected_by": current.sub, "collected_at": now,
        "notes": (payload or {}).get("notes") or "",
    }}


# ── Task system ───────────────────────────────────────────────────────────────

def _fmt_task(row: dict) -> dict:
    bin_row = row.get("smart_bins") or {}
    def _ts(ts):
        if not ts: return None
        try:
            return datetime.fromisoformat(str(ts).replace("Z","+00:00")).astimezone().strftime("%d %b, %I:%M %p")
        except Exception: return str(ts)
    return {
        "id":           str(row["id"]),
        "bin_code":     bin_row.get("code") or "",
        "bin_location": bin_row.get("location") or "",
        "fill_level":   float(bin_row.get("fill_level") or 0),
        "health":       bin_row.get("health") or "good",
        "waste_type":   bin_row.get("waste_type") or "",
        "status":       row.get("status") or "open",
        "priority":     row.get("priority") or "normal",
        "notes":        row.get("notes"),
        "assigned_to":  str(row.get("assigned_to") or ""),
        "created_at":   _ts(row.get("created_at")),
        "completed_at": _ts(row.get("completed_at")),
    }


@router.get("/tasks")
def my_tasks(current: TokenData = Depends(_cleaner_or_admin)):
    """All open + in-progress tasks assigned to this cleaner, plus unassigned open tasks."""
    admin = get_admin_client()
    # Tasks assigned to me (any status)
    mine = (admin.table("cleaning_tasks")
            .select("*, smart_bins(code, location, fill_level, health, waste_type)")
            .eq("assigned_to", current.sub)
            .order("created_at", desc=True).limit(50).execute())
    # Unassigned open tasks anyone can pick up
    unassigned = (admin.table("cleaning_tasks")
                  .select("*, smart_bins(code, location, fill_level, health, waste_type)")
                  .is_("assigned_to", "null")
                  .eq("status", "open")
                  .order("created_at", desc=True).limit(20).execute())
    return {"success": True, "data": {
        "my_tasks":         [_fmt_task(r) for r in mine.data],
        "available_tasks":  [_fmt_task(r) for r in unassigned.data],
    }}


@router.post("/tasks/{task_id}/accept")
def accept_task(task_id: str, current: TokenData = Depends(_cleaner_or_admin)):
    """Claim an unassigned task."""
    admin = get_admin_client()
    r = admin.table("cleaning_tasks").select("*").eq("id", task_id).limit(1).execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Task not found")
    task = r.data[0]
    if task.get("assigned_to") and str(task["assigned_to"]) != current.sub:
        raise HTTPException(status_code=409, detail="Task already claimed by another cleaner")
    now = datetime.now(timezone.utc).isoformat()
    admin.table("cleaning_tasks").update({
        "assigned_to": current.sub, "status": "in_progress", "updated_at": now,
    }).eq("id", task_id).execute()
    return {"success": True, "data": {"task_id": task_id, "status": "in_progress"}}


@router.post("/tasks/{task_id}/complete")
def complete_task(task_id: str, payload: dict | None = None, current: TokenData = Depends(_cleaner_or_admin)):
    """Mark a task as done and empty the bin."""
    admin = get_admin_client()
    r = admin.table("cleaning_tasks").select("*, smart_bins(code)").eq("id", task_id).limit(1).execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Task not found")
    task = r.data[0]
    if task.get("assigned_to") and str(task["assigned_to"]) != current.sub and current.role != "admin":
        raise HTTPException(status_code=403, detail="Not your task")
    now = datetime.now(timezone.utc).isoformat()
    notes = (payload or {}).get("notes") or ""
    admin.table("cleaning_tasks").update({
        "status": "done", "completed_at": now, "updated_at": now, "notes": notes,
    }).eq("id", task_id).execute()
    # Empty the bin
    bin_code = (task.get("smart_bins") or {}).get("code")
    if bin_code:
        admin.table("smart_bins").update({"fill_level": 0.0, "health": "good", "last_seen_at": now}).eq("code", bin_code).execute()
    return {"success": True, "data": {"task_id": task_id, "status": "done"}}
