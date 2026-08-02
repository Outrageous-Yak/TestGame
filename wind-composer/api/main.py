"""FastAPI application for Wind Composer PWA."""

from __future__ import annotations

import logging
import os
import sys
from pathlib import Path

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

# Ensure wind-composer package root is on path
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from config import AppSettings, InputSource, Mode, ScaleName
from api.services.headless_session import SessionManager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Wind Composer API", version="1.0.0")
sessions = SessionManager()

WEB_DIST = Path(os.environ.get("WEB_DIST", ROOT / "web" / "dist"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SessionCreateResponse(BaseModel):
    session_id: str


class TickRequest(BaseModel):
    mic_energy: float = 0.0
    gust: bool = False
    sample_delta: int = 4096
    fft: list[float] = Field(default_factory=list)


class SettingsUpdate(BaseModel):
    mode: str | None = None
    scale: str | None = None
    key: str | None = None
    master_volume: float | None = None
    sensitivity: float | None = None
    input_source: str | None = None
    refresh_interval_sec: float | None = None
    audio_quality: str | None = None
    soundscape_preset: str | None = None
    reverb_amount: float | None = None
    width_amount: float | None = None
    brightness_amount: float | None = None
    warmth_amount: float | None = None


class LocationSearch(BaseModel):
    query: str


class AddStationRequest(BaseModel):
    location: dict
    mix: float = 1.0


class MapClickRequest(BaseModel):
    latitude: float
    longitude: float


class MixUpdate(BaseModel):
    mix: float


class FavouriteCreate(BaseModel):
    label: str
    location: dict


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "service": "wind-composer-pwa"}


@app.post("/api/session", response_model=SessionCreateResponse)
def create_session() -> SessionCreateResponse:
    session = sessions.create()
    return SessionCreateResponse(session_id=session.session_id)


@app.delete("/api/session/{session_id}")
def delete_session(session_id: str) -> dict:
    sessions.destroy(session_id)
    return {"ok": True}


@app.get("/api/session/{session_id}/settings")
def get_settings(session_id: str) -> dict:
    session = _require_session(session_id)
    s = session.to_settings()
    return {
        "mode": s.mode.value,
        "scale": s.scale.value,
        "key": s.key,
        "master_volume": s.master_volume,
        "sensitivity": s.sensitivity,
        "input_source": s.input_source.value,
        "refresh_interval_sec": s.refresh_interval_sec,
        "audio_quality": s.audio_quality,
        "soundscape_preset": s.soundscape_preset,
        "reverb_amount": s.reverb_amount,
        "width_amount": s.width_amount,
        "brightness_amount": s.brightness_amount,
        "warmth_amount": s.warmth_amount,
    }


@app.put("/api/session/{session_id}/settings")
def update_settings(session_id: str, body: SettingsUpdate) -> dict:
    session = _require_session(session_id)
    settings = session.to_settings()
    if body.mode:
        settings.mode = Mode(body.mode)
    if body.scale:
        settings.scale = ScaleName(body.scale)
    if body.key:
        settings.key = body.key
    if body.master_volume is not None:
        settings.master_volume = body.master_volume
    if body.sensitivity is not None:
        settings.sensitivity = body.sensitivity
    if body.input_source:
        settings.input_source = InputSource(body.input_source)
    if body.refresh_interval_sec is not None:
        settings.refresh_interval_sec = body.refresh_interval_sec
    if body.audio_quality:
        settings.audio_quality = body.audio_quality
    if body.soundscape_preset:
        settings.soundscape_preset = body.soundscape_preset
    if body.reverb_amount is not None:
        settings.reverb_amount = body.reverb_amount
    if body.width_amount is not None:
        settings.width_amount = body.width_amount
    if body.brightness_amount is not None:
        settings.brightness_amount = body.brightness_amount
    if body.warmth_amount is not None:
        settings.warmth_amount = body.warmth_amount
    session.apply_settings(settings)
    settings.save()
    return {"ok": True}


@app.post("/api/session/{session_id}/tick")
def tick(session_id: str, body: TickRequest) -> dict:
    session = _require_session(session_id)
    return session.tick(
        mic_energy=body.mic_energy,
        gust=body.gust,
        sample_delta=body.sample_delta,
        fft=body.fft,
    )


@app.post("/api/session/{session_id}/start")
def start_playback(session_id: str) -> dict:
    session = _require_session(session_id)
    if session.state.input_source in (InputSource.LIVE_WEATHER, InputSource.BOTH):
        if session.station_manager.count() == 0:
            raise HTTPException(400, "Add at least one weather station for Live Weather mode.")
        session.start_weather_polling()
    session.fetch_weather_now()
    return {"ok": True}


@app.post("/api/session/{session_id}/stop")
def stop_playback(session_id: str) -> dict:
    session = _require_session(session_id)
    session.stop_weather_polling()
    return {"ok": True}


@app.post("/api/session/{session_id}/weather/search")
def search_locations(session_id: str, body: LocationSearch) -> list:
    session = _require_session(session_id)
    return session.search_locations(body.query)


@app.get("/api/session/{session_id}/stations")
def list_stations(session_id: str) -> list:
    session = _require_session(session_id)
    return session.list_stations()


@app.post("/api/session/{session_id}/stations")
def add_station(session_id: str, body: AddStationRequest) -> dict:
    session = _require_session(session_id)
    return session.add_station(body.location, body.mix)


@app.post("/api/session/{session_id}/stations/map")
def map_click(session_id: str, body: MapClickRequest) -> dict:
    session = _require_session(session_id)
    return session.add_station_from_coords(body.latitude, body.longitude)


@app.put("/api/session/{session_id}/stations/{station_id}/mix")
def update_mix(session_id: str, station_id: str, body: MixUpdate) -> dict:
    session = _require_session(session_id)
    session.update_station_mix(station_id, body.mix)
    return {"ok": True}


@app.delete("/api/session/{session_id}/stations/{station_id}")
def remove_station(session_id: str, station_id: str) -> dict:
    session = _require_session(session_id)
    session.remove_station(station_id)
    return {"ok": True}


@app.post("/api/session/{session_id}/weather/fetch")
def fetch_weather(session_id: str) -> dict:
    session = _require_session(session_id)
    session.fetch_weather_now()
    return {"ok": True}


@app.get("/api/session/{session_id}/favourites")
def list_favourites(session_id: str) -> list:
    session = _require_session(session_id)
    return session.list_favourites()


@app.post("/api/session/{session_id}/favourites")
def add_favourite(session_id: str, body: FavouriteCreate) -> dict:
    session = _require_session(session_id)
    return session.add_favourite(body.label, body.location)


@app.delete("/api/session/{session_id}/favourites/{fav_id}")
def remove_favourite(session_id: str, fav_id: str) -> dict:
    session = _require_session(session_id)
    session.remove_favourite(fav_id)
    return {"ok": True}


@app.websocket("/ws/{session_id}")
async def websocket_tick(ws: WebSocket, session_id: str) -> None:
    session = sessions.get(session_id)
    if not session:
        await ws.close(code=4004)
        return
    await ws.accept()
    try:
        while True:
            data = await ws.receive_json()
            if data.get("type") == "tick":
                result = session.tick(
                    mic_energy=float(data.get("mic_energy", 0)),
                    gust=bool(data.get("gust", False)),
                    sample_delta=int(data.get("sample_delta", 4096)),
                    fft=data.get("fft", []),
                )
                await ws.send_json({"type": "state", **result})
            elif data.get("type") == "ping":
                await ws.send_json({"type": "pong"})
    except WebSocketDisconnect:
        pass


def _require_session(session_id: str):
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    return session


# Static PWA assets
if WEB_DIST.exists():
    app.mount("/assets", StaticFiles(directory=WEB_DIST / "assets"), name="assets")

    @app.get("/manifest.json")
    def manifest() -> FileResponse:
        return FileResponse(WEB_DIST / "manifest.json")

    @app.get("/sw.js")
    def service_worker() -> FileResponse:
        return FileResponse(WEB_DIST / "sw.js", media_type="application/javascript")

    @app.get("/icons/{path:path}")
    def icons(path: str) -> FileResponse:
        return FileResponse(WEB_DIST / "icons" / path)

    @app.get("/{full_path:path}")
    def spa(full_path: str) -> FileResponse:
        if full_path.startswith("api/") or full_path.startswith("ws"):
            raise HTTPException(404)
        file_path = WEB_DIST / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(WEB_DIST / "index.html")
