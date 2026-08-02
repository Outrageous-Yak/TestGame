"""JSON serialization for composition and weather models."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from composition_engine import CompositionPlan, MusicalState
from chord_engine import ChordState
from melody_engine import MelodyNote
from audio.orchestration import OrchestrationTargets


def chord_to_dict(chord: Optional[ChordState]) -> Optional[Dict[str, Any]]:
    if chord is None:
        return None
    return {
        "name": chord.name,
        "tones": chord.tones,
        "root_midi": chord.root_midi,
        "degree_index": chord.degree_index,
    }


def melody_note_to_dict(note: MelodyNote) -> Dict[str, Any]:
    return {
        "midi": note.midi,
        "velocity": note.velocity,
        "duration_sec": note.duration_sec,
    }


def plan_to_dict(plan: CompositionPlan) -> Dict[str, Any]:
    return {
        "energy_curve": plan.energy_curve,
        "mood": plan.mood,
        "musical_state": plan.musical_state.value,
        "tempo_bpm": plan.tempo_bpm,
        "chord": chord_to_dict(plan.chord),
        "chord_style": plan.chord_style.value,
        "melody_notes": [melody_note_to_dict(n) for n in plan.melody_notes],
        "melody_activity": plan.melody_activity,
        "rhythm_mode": plan.rhythm_mode.value,
        "rhythm_events": [
            {"layer": e.layer, "strength": e.strength, "is_pulse": e.is_pulse}
            for e in plan.rhythm_events
        ],
        "pad_gain": plan.pad_gain,
        "bass_gain": plan.bass_gain,
        "lead_gain": plan.lead_gain,
        "atmosphere_gain": plan.atmosphere_gain,
        "reverb_amount": plan.reverb_amount,
        "stereo_pan": plan.stereo_pan,
        "brightness": plan.brightness,
        "bass_mult": plan.bass_mult,
        "percussion": plan.percussion,
        "gust_accent": plan.gust_accent,
        "rare_event": plan.rare_event.value if plan.rare_event else None,
        "phrase_number": plan.phrase_number,
        "phrase_length_bars": plan.phrase_length_bars,
        "pedal_midi": plan.pedal_midi,
    }


def targets_to_dict(t: OrchestrationTargets) -> Dict[str, Any]:
    return {
        "layer_gains": dict(t.layer_gains),
        "layer_presets": dict(t.layer_presets),
        "active_layers": sorted(t.active_layers),
        "reverb_wet": t.reverb_wet,
        "delay_wet": t.delay_wet,
        "width": t.width,
        "brightness": t.brightness,
        "warmth": t.warmth,
        "stereo_pan": t.stereo_pan,
        "reverb_profile": t.reverb_profile,
        "delay_division": t.delay_division,
        "trigger_impact": t.trigger_impact.value if t.trigger_impact else None,
    }


def geo_to_dict(loc) -> Dict[str, Any]:
    return {
        "id": loc.id,
        "name": loc.name,
        "country": loc.country,
        "latitude": loc.latitude,
        "longitude": loc.longitude,
        "elevation_m": loc.elevation_m,
        "timezone": loc.timezone,
        "feature_code": loc.feature_code,
        "label": loc.label(),
    }


def weather_to_dict(w) -> Optional[Dict[str, Any]]:
    if w is None:
        return None
    return {
        "wind_speed_kmh": w.wind_speed_kmh,
        "wind_gust_kmh": w.wind_gust_kmh,
        "wind_direction_deg": w.wind_direction_deg,
        "temperature_c": w.temperature_c,
        "humidity_pct": w.humidity_pct,
        "pressure_hpa": w.pressure_hpa,
        "cloud_cover_pct": w.cloud_cover_pct,
        "precipitation_mm": w.precipitation_mm,
        "snowfall_mm": w.snowfall_mm,
        "weather_code": w.weather_code,
        "condition": w.condition,
        "timestamp": w.timestamp.isoformat() if w.timestamp else None,
        "source": w.source,
        "is_live": w.is_live,
    }


def station_to_dict(active) -> Dict[str, Any]:
    s = active.station
    return {
        "id": s.location.id,
        "display_name": s.display_name,
        "location": geo_to_dict(s.location),
        "mix": active.mix,
        "enabled": active.enabled,
        "weather": weather_to_dict(active.weather),
    }
