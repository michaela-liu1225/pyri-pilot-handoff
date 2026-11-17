"""Standalone hiring starter inspired by Pyri's API style; no production code or credentials."""

import base64
import csv
import hashlib
import hmac
import json
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field, field_validator

import briefings
import storage

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
LOGGER = logging.getLogger("uvicorn.error")
Mode = Literal["normal", "stale", "unavailable"]


def read_json(relative: str) -> Any:
    return json.loads((DATA / relative).read_text(encoding="utf-8"))


def read_csv(relative: str) -> list[dict[str, str]]:
    with (DATA / relative).open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


# Load packaged fixtures once. Feed endpoints do no network fetches.
SITES = {site["id"]: site for site in read_json("sites.json")}
SCENARIO = read_json("caldor/scenario.json")
PINE = read_json("pine_ridge.json")
UPPER_FEEDS = {"reports": read_json("caldor/field_reports.json"),
               "assessments": read_csv("caldor/exercise_assessments.csv"),
               "weather": read_csv("caldor/historical/airport_observations.csv"),
               "satellite_optical": read_csv("multisource/sentinel2_optical_samples.csv"),
               "satellite_thermal": read_csv("multisource/landsat8_thermal_samples.csv"),
               "sensors": read_csv("multisource/point_sensor_observations.csv"),
               "thermal_detections": read_csv("multisource/viirs_like_detections.csv")}
UPPER_CONTEXT = {name: read_json("caldor/" + filename) for name, filename in {
    "aois": "aois.geojson", "assets": "assets.geojson", "routes": "access_routes.geojson",
    "plans": "response_plans.json", "timber_units": "timber_units.geojson", "signals": "exercise_signals.geojson"}.items()}
UPPER_CONTEXT["point_sensors"] = read_json("multisource/point_sensors.geojson")
UPPER_CONTEXT["satellite_provenance"] = read_json("multisource/provenance.json")


def site_for(site_id: str) -> dict[str, Any]:
    if site_id not in SITES:
        raise HTTPException(404, "Site not found")
    return SITES[site_id]


def snapshot_for(snapshot_id: str) -> dict[str, Any]:
    match = next((item for item in SCENARIO["snapshots"] if item["id"] == snapshot_id), None)
    if match is None:
        raise HTTPException(400, "Unknown snapshot")
    return match


class HandoffInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    snapshot_id: str
    operator_note: str = Field(min_length=1, max_length=2000)
    evidence_snapshot: dict[str, Any]

    @field_validator("operator_note")
    @classmethod
    def note_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Write a handoff note")
        return value.strip()

    @field_validator("evidence_snapshot")
    @classmethod
    def bounded_snapshot(cls, value: dict[str, Any]) -> dict[str, Any]:
        if not value or len(json.dumps(value)) > 64000:
            raise ValueError("Provide a non-empty evidence snapshot below 64 KB")
        return value


def create_app(database: Path | None = None, password_hash: str | None = None) -> FastAPI:
    db_path = database or Path(os.getenv("HANDOFF_DB", str(ROOT / "runtime/handoffs.sqlite3")))
    required_hash = password_hash if password_hash is not None else os.getenv("DEMO_PASSWORD_SHA256", "")
    if required_hash and (len(required_hash) != 64 or any(c not in "0123456789abcdef" for c in required_hash)):
        raise ValueError("DEMO_PASSWORD_SHA256 must be a lowercase SHA-256 hash")

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        await storage.initialize(db_path)
        yield

    api = FastAPI(title="Pilot site challenge", version="1.2", lifespan=lifespan)
    api.mount("/static", StaticFiles(directory=ROOT / "static"), name="static")

    @api.middleware("http")
    async def demo_access(request: Request, call_next):
        if required_hash and request.url.path != "/healthz":
            try:
                scheme, encoded = request.headers.get("authorization", "").split(" ", 1)
                user, password = base64.b64decode(encoded, validate=True).decode("utf-8").split(":", 1)
                allowed = scheme.lower() == "basic" and user == "reviewer" and hmac.compare_digest(hashlib.sha256(password.encode()).hexdigest(), required_hash)
            except (ValueError, UnicodeError):
                allowed = False
            if not allowed:
                return JSONResponse({"detail": "Demo login required"}, 401, headers={"WWW-Authenticate": 'Basic realm="Pilot demo", charset="UTF-8"'})
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Cache-Control"] = "no-store"
        if response.status_code >= 400:
            LOGGER.warning("request_failed method=%s path=%s status=%s", request.method, request.url.path, response.status_code)
        return response

    @api.get("/healthz")
    async def health() -> dict[str, str]:
        # Reach storage as well as the HTTP process; no private content is returned.
        await storage.list_for_site(db_path, "__health__")
        return {"status": "ok", "version": "1.2"}

    @api.get("/", include_in_schema=False)
    async def index():
        return FileResponse(ROOT / "index.html")

    @api.get("/api/scenario")
    async def scenario():
        return SCENARIO

    @api.get("/api/sites")
    async def sites():
        return list(SITES.values())

    @api.get("/api/sites/{site_id}/context")
    async def context(site_id: str):
        site = site_for(site_id)
        return {"site": site, "context": UPPER_CONTEXT if site_id == "upper-alder" else PINE}

    @api.get("/api/sites/{site_id}/feeds/{feed}")
    async def feed_data(site_id: str, feed: Literal["reports", "assessments", "weather", "satellite_optical", "satellite_thermal", "sensors", "thermal_detections"], mode: Mode = "normal"):
        site_for(site_id)
        if mode != "normal" and feed != "weather":
            raise HTTPException(400, "Failure controls apply to the optional weather feed only")
        if mode == "unavailable":
            raise HTTPException(503, "Exercise weather feed unavailable; current conditions unknown")
        records = UPPER_FEEDS[feed] if site_id == "upper-alder" else PINE.get(feed, [])
        if mode == "stale":
            records = records[:1]
        return {"site_id": site_id, "feed": feed, "mode": mode, "records": records,
                "note": "Raw replay archive: filter available_at against the selected scenario cutoff. observed_at alone is not enough."}

    @api.get("/api/sites/{site_id}/briefing")
    async def briefing(site_id: str, snapshot: str = "briefing", weather_mode: Mode = "normal"):
        site = site_for(site_id)
        cutoff = snapshot_for(snapshot)
        result = (briefings.pine_ridge_briefing(cutoff, PINE, weather_mode) if site_id == "pine-ridge"
                  else briefings.reserve_briefing(site, cutoff, UPPER_FEEDS, UPPER_CONTEXT, weather_mode))
        LOGGER.info("briefing_ready site=%s snapshot=%s weather=%s evidence_count=%s",
                    site_id, snapshot, result["weather"].get("state", weather_mode), len(result["evidence"]))
        return result

    @api.post("/api/sites/{site_id}/handoffs", status_code=201)
    async def save_handoff(site_id: str, item: HandoffInput):
        site_for(site_id)
        cutoff = snapshot_for(item.snapshot_id)
        if item.evidence_snapshot.get("site_id") != site_id:
            raise HTTPException(422, "Evidence snapshot must identify this site")
        if item.evidence_snapshot.get("snapshot", {}).get("id") != item.snapshot_id:
            raise HTTPException(422, "Evidence snapshot and selected cutoff must match")
        document = {"id": uuid4().hex[:12], "site_id": site_id, "created_at": datetime.now(timezone.utc).isoformat(),
                    "scenario_as_of": cutoff["as_of"], **item.model_dump()}
        await storage.save(db_path, document)
        return document

    @api.get("/api/sites/{site_id}/handoffs")
    async def handoffs(site_id: str):
        site_for(site_id)
        return await storage.list_for_site(db_path, site_id)

    @api.get("/api/sites/{site_id}/handoffs/{handoff_id}")
    async def handoff(site_id: str, handoff_id: str):
        site_for(site_id)
        document = await storage.get(db_path, site_id, handoff_id)
        if document is None:
            raise HTTPException(404, "Handoff not found for this site")
        return document

    return api


app = create_app()
