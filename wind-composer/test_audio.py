"""Automated tests for Phase 4 audio engine."""

from __future__ import annotations

import tempfile
from pathlib import Path

import numpy as np

from audio.cinematic_engine import CinematicSynthEngine, ENGINE_VERSION
from audio.deterministic import render_scenario, RENDER_SCENARIOS
from audio.envelopes import ADSREnvelope
from audio.filters import OnePoleFilter
from audio.limiter import SafetyLimiter
from audio.orchestration import Orchestrator
from audio.preset_manager import PresetManager
from audio.voice import VoiceAllocator
from composition_engine import CompositionContext, CompositionEngine, CompositionPlan, MusicalState
from config import SAMPLE_RATE, ScaleName
from scale_engine import ScaleEngine


def test_voice_allocation() -> None:
    presets = PresetManager()
    alloc = VoiceAllocator(8)
    p = presets.get("Warm Horizon")
    for midi in [48, 52, 55, 60, 64, 67]:
        alloc.allocate(midi, 0.5, p)
    assert alloc.active_count() == 6


def test_voice_stealing() -> None:
    presets = PresetManager()
    alloc = VoiceAllocator(4)
    p = presets.get("Soft Pulse")
    p.layer = "lead"
    for i in range(8):
        alloc.allocate(60 + i, 0.4, p)
    assert alloc.active_count() <= 4


def test_envelope_completion() -> None:
    env = ADSREnvelope(0.01, 0.05, 0.5, 0.1)
    env.trigger(1.0)
    block = env.process_block(4096)
    assert block.max() > 0
    env.release()
    tail = env.process_block(SAMPLE_RATE)
    assert tail[-1] < 0.01


def test_filter_smoothing() -> None:
    filt = OnePoleFilter("low", 800.0)
    raw = np.random.randn(512) * 0.1
    out1 = filt.process(raw)
    filt.set_cutoff(4000.0)
    out2 = filt.process(raw)
    assert np.isfinite(out1).all()
    assert np.isfinite(out2).all()


def test_delay_feedback_safety() -> None:
    from audio.delay import StereoDelay
    delay = StereoDelay()
    delay.set_feedback(0.95)
    left = np.ones(2048) * 0.5
    for _ in range(20):
        dl, dr = delay.process(left, left)
        assert np.max(np.abs(dl)) < 2.0


def test_reverb_stability() -> None:
    from audio.reverb import StereoReverb
    rev = StereoReverb("Soft Hall")
    noise = np.random.randn(4096) * 0.2
    for _ in range(10):
        rl, rr = rev.process(noise, noise)
        assert np.isfinite(rl).all()
        assert np.max(np.abs(rl)) < 3.0


def test_limiter_ceiling() -> None:
    lim = SafetyLimiter(0.9)
    left = np.ones(1024) * 2.0
    right = np.ones(1024) * 2.0
    ol, or_ = lim.process(left, right)
    assert np.max(np.abs(ol)) <= 0.91
    assert lim.active


def test_nan_protection() -> None:
    lim = SafetyLimiter(0.92)
    left = np.array([np.nan, np.inf, -np.inf, 0.5])
    right = left.copy()
    ol, or_ = lim.process(left, right)
    assert np.isfinite(ol).all()
    assert np.isfinite(or_).all()


def test_preset_loading_and_fallback() -> None:
    pm = PresetManager()
    p = pm.get("Warm Horizon")
    assert p.name == "Warm Horizon"
    unknown = pm.get("Nonexistent Preset XYZ")
    assert unknown.name in pm.list_names()


def test_state_orchestration_mapping() -> None:
    presets = PresetManager()
    orch = Orchestrator(presets)
    se = ScaleEngine("C", ScaleName.MINOR)
    comp = CompositionEngine(se)
    ctx = CompositionContext(raw_energy=0.5, sample_position=SAMPLE_RATE * 8, tempo_min=40, tempo_max=72)
    plan = comp.tick(ctx)
    plan.musical_state = MusicalState.STORM
    targets = orch.map_plan(plan)
    assert "percussion" in targets.active_layers or targets.layer_gains.get("noise_atmo", 0) > 0
    still_plan = CompositionPlan(
        energy_curve=0.1,
        musical_state=MusicalState.STILLNESS,
        mood="Peaceful",
        tempo_bpm=50,
    )
    still_targets = orch.map_plan(still_plan)
    assert "main_pad" in still_targets.active_layers


def test_cinematic_render_finite() -> None:
    engine = CinematicSynthEngine()
    engine.note_on("main_pad", 60, 0.5, "Warm Horizon")
    out = engine.render(2048)
    assert out.shape == (2048, 2)
    assert np.isfinite(out).all()


def test_deterministic_render() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        p1 = render_scenario("stillness", seed=99, duration_sec=2.0, output_dir=Path(tmp))
        p2 = render_scenario("stillness", seed=99, duration_sec=2.0, output_dir=Path(tmp))
        assert p1.exists()
        data1 = Path(p1).read_bytes()
        data2 = Path(p2).read_bytes()
        assert data1 == data2


def test_recording_metadata_fields() -> None:
    from recording import RecordingMetadata
    meta = RecordingMetadata(
        soundscape_preset="Natural Ambient",
        active_instrument_presets=["Warm Horizon"],
        reverb_profile="Soft Hall",
        quality_level="Standard",
        peak_level=0.5,
        engine_version=ENGINE_VERSION,
    )
    d = meta.to_dict()
    assert d["engine_version"] == ENGINE_VERSION
    assert "Warm Horizon" in d["active_instrument_presets"]


def test_engine_version() -> None:
    assert ENGINE_VERSION.startswith("4.")


if __name__ == "__main__":
    test_voice_allocation()
    test_voice_stealing()
    test_envelope_completion()
    test_filter_smoothing()
    test_delay_feedback_safety()
    test_reverb_stability()
    test_limiter_ceiling()
    test_nan_protection()
    test_preset_loading_and_fallback()
    test_state_orchestration_mapping()
    test_cinematic_render_finite()
    test_deterministic_render()
    test_recording_metadata_fields()
    test_engine_version()
    print("Audio tests passed")
