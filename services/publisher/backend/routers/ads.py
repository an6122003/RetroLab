from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict
import json
import os
from ..auth import require_admin

router = APIRouter(prefix="/api/ads", tags=["ads"])

ADS_CONFIG_FILE = os.getenv(
    "ADS_CONFIG_FILE",
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data", "ads_config.json")
)


class AdSlot(BaseModel):
    enabled: bool = True
    type: str = "placeholder"  # "affiliate", "network", "placeholder"
    size: str = "leaderboard"  # "leaderboard", "banner", "rectangle", "sidebar"
    imageUrl: Optional[str] = None
    clickUrl: Optional[str] = None
    alt: Optional[str] = None
    code: Optional[str] = None


class AdsConfig(BaseModel):
    slots: Dict[str, AdSlot] = {}
    globalHeadScripts: Optional[str] = None  # Global ad network scripts (e.g. AdSense loader)


def _read_config() -> dict:
    if not os.path.exists(ADS_CONFIG_FILE):
        return {"slots": {}, "globalHeadScripts": None}
    try:
        with open(ADS_CONFIG_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return {"slots": {}, "globalHeadScripts": None}


def _write_config(data: dict):
    os.makedirs(os.path.dirname(ADS_CONFIG_FILE), exist_ok=True)
    with open(ADS_CONFIG_FILE, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


@router.get("/")
def get_ads_config():
    """Public endpoint — the website needs to fetch ad config without auth."""
    return _read_config()


@router.get("/{slot_id}")
def get_slot(slot_id: str):
    """Get a single ad slot config."""
    config = _read_config()
    slot = config.get("slots", {}).get(slot_id)
    if not slot:
        return {"enabled": True, "type": "placeholder", "size": "leaderboard"}
    return slot


@router.put("/", dependencies=[Depends(require_admin)])
def update_ads_config(config: AdsConfig):
    """Replace entire ads config."""
    data = config.dict()
    # Convert AdSlot models to dicts
    data["slots"] = {k: v.dict() if hasattr(v, 'dict') else v for k, v in data["slots"].items()}
    _write_config(data)
    return {"status": "ok"}


@router.put("/{slot_id}", dependencies=[Depends(require_admin)])
def update_slot(slot_id: str, slot: AdSlot):
    """Update a single ad slot."""
    config = _read_config()
    if "slots" not in config:
        config["slots"] = {}
    config["slots"][slot_id] = slot.dict()
    _write_config(config)
    return {"status": "ok", "slot_id": slot_id}


@router.delete("/{slot_id}", dependencies=[Depends(require_admin)])
def delete_slot(slot_id: str):
    """Delete an ad slot."""
    config = _read_config()
    if slot_id not in config.get("slots", {}):
        raise HTTPException(status_code=404, detail="Slot not found")
    del config["slots"][slot_id]
    _write_config(config)
    return {"status": "ok"}


@router.put("/global-scripts", dependencies=[Depends(require_admin)])
def update_global_scripts(body: dict):
    """Update global head scripts (ad network loaders)."""
    config = _read_config()
    config["globalHeadScripts"] = body.get("code", None)
    _write_config(config)
    return {"status": "ok"}
