"""Cinematic polyphonic synthesis engine."""

from __future__ import annotations

import logging
import time
from typing import Dict, List, Optional

import numpy as np

from audio.audio_mixer import AudioMixer, LAYER_IDS
from audio.chorus import ChorusProcessor
from audio.delay import StereoDelay
from audio.limiter import SafetyLimiter
from audio.modulation import LFO, SmoothRandom
from audio.orchestration import OrchestrationTargets, Orchestrator
from audio.preset_manager import PresetManager
from audio.reverb import StereoReverb
from audio.saturation import soft_saturate
from audio.smoothing import ParamSmoother
from audio.voice import VoiceAllocator
from config import SAMPLE_RATE
from utils import clamp, midi_to_freq

logger = logging.getLogger(__name__)

ENGINE_VERSION = "4.0.0"

QUALITY_PRESETS = {
    "Low": {"voices": 16, "unison": 2},
    "Standard": {"voices": 28, "unison": 3},
    "High": {"voices": 32, "unison": 4},
}


class CinematicSynthEngine:
    """Rich layered engine interpreting orchestration targets."""

    def __init__(self) -> None:
        self.quality = "Standard"
        self._voice_count = 28
        self.voices = VoiceAllocator(32)
        self.mixer = AudioMixer()
        self.presets = PresetManager()
        self.orchestrator = Orchestrator(self.presets)
        self.reverb = StereoReverb("Soft Hall")
        self.delay = StereoDelay()
        self.chorus = ChorusProcessor(0.1)
        self.limiter = SafetyLimiter(0.92)
        self._lfo = LFO(0.07, "sine")
        self._drift = SmoothRandom(0.04)
        self._sustain_notes: Dict[str, int] = {}
        self._targets: Optional[OrchestrationTargets] = None
        self._tempo_bpm = 60.0
        self._sample_pos = 0
        self._render_load = 0.0
        self._overload_count = 0
        self._active_preset_names: List[str] = []
        self._brightness = ParamSmoother(0.5, 0.2)
        self._warmth = ParamSmoother(0.5, 0.2)
        self._width = ParamSmoother(0.35, 0.2)
        self._master = ParamSmoother(0.75, 0.1)
        self._atmo_phase = 0.0
        self._atmo_rng = np.random.default_rng(99)
        self.use_cinematic = True

    def set_quality(self, level: str) -> None:
        if level in QUALITY_PRESETS:
            self.quality = level
            self._voice_count = QUALITY_PRESETS[level]["voices"]
            self.voices = VoiceAllocator(self._voice_count)

    def set_soundscape(self, name: str) -> None:
        self.orchestrator.soundscape = name

    def set_master_gain(self, g: float) -> None:
        self._master.set_target(clamp(g))

    def set_user_tweaks(self, reverb: float, width: float, brightness: float, warmth: float) -> None:
        self._width.set_target(clamp(width))
        self._brightness.set_target(clamp(brightness))
        self._warmth.set_target(clamp(warmth))
        if self._targets:
            self._targets.reverb_wet = clamp(reverb)

    def apply_orchestration(self, targets: OrchestrationTargets, tempo_bpm: float) -> None:
        self._targets = targets
        self._tempo_bpm = tempo_bpm
        self.delay.set_tempo(tempo_bpm)
        self.delay.set_division(targets.delay_division)
        self.reverb.set_profile(targets.reverb_profile)
        self.reverb.set_wet(targets.reverb_wet)
        self.delay.set_wet(targets.delay_wet)

        for layer, gain in targets.layer_gains.items():
            preset_name = targets.layer_presets.get(layer, "")
            preset = self.presets.get(preset_name) if preset_name else self.presets.get("Warm Horizon")
            pan = targets.stereo_pan if layer not in ("sub_bass", "soft_bass", "percussion") else 0.0
            self.mixer.set_layer(
                layer, gain,
                pan=pan,
                width=targets.width,
                reverb=preset.reverb_send,
                delay=preset.delay_send,
            )

        self._active_preset_names = list(set(targets.layer_presets.values()))

        if targets.trigger_impact:
            self._handle_rare_event(targets.trigger_impact)

    def note_on(self, layer: str, midi: int, velocity: float, preset_name: str) -> None:
        preset = self.presets.get(preset_name)
        preset.layer = layer
        self.voices.allocate(midi, velocity, preset)

    def sustain_chord(self, layer: str, midi_notes: List[int], velocity: float, preset_name: str) -> None:
        if not midi_notes:
            return
        preset = self.presets.get(preset_name)
        preset.layer = layer
        root = midi_notes[0]
        if self._sustain_notes.get(layer) != root:
            self.voices.release_layer(layer)
            self._sustain_notes[layer] = root
        self.voices.allocate(root, velocity, preset)

    def trigger_perc(self, velocity: float) -> None:
        preset = self.presets.get("Electrical Storm")
        preset.layer = "percussion"
        self.voices.allocate(36, velocity * 0.5, preset)

    def trigger_rhythm_layer(self, layer: str, strength: float) -> None:
        """Distinct percussion layers for composition rhythm events."""
        v = clamp(strength)
        if layer == "kick":
            preset = self.presets.get("Dark Drone Bass")
            preset.layer = "percussion"
            self.voices.allocate(36, v * 0.85, preset)
        elif layer == "snare":
            preset = self.presets.get("Electrical Storm")
            preset.layer = "percussion"
            self.voices.allocate(38, v * 0.72, preset)
        elif layer in ("hat", "hat_ghost"):
            preset = self.presets.get("Glass Bell")
            preset.layer = "percussion"
            self.voices.allocate(42, v * 0.42, preset)
        elif layer == "crash":
            preset = self.presets.get("Electrical Storm")
            preset.layer = "percussion"
            self.voices.allocate(49, v * 0.78, preset)
        elif layer == "fill":
            preset = self.presets.get("Electrical Storm")
            preset.layer = "percussion"
            self.voices.allocate(38, v * 0.8, preset)
            self.voices.allocate(42, v * 0.55, preset)
        elif layer == "bell":
            preset = self.presets.get("Glass Bell")
            preset.layer = "bell"
            self.voices.allocate(72, v * 0.35, preset)
        else:
            self.trigger_perc(v)

    def _handle_rare_event(self, event) -> None:
        from composition_engine import RareEvent
        if event == RareEvent.LIGHTNING:
            self.trigger_perc(0.85)
            self.note_on("impact", 48, 0.7, "Dark Drone Bass")
        elif event == RareEvent.GUST_SWELL:
            if "main_pad" in self._sustain_notes:
                pass  # swell via gain already
        elif event == RareEvent.ATMOSPHERIC_HIT:
            self.trigger_perc(0.6)
        elif event == RareEvent.SUSPENDED_CHORD:
            pass

    def _render_atmosphere(self, n: int, gain: float) -> np.ndarray:
        """Procedural atmosphere layer."""
        t = np.arange(n) / SAMPLE_RATE
        phases = self._atmo_phase + 2.0 * np.pi * (40.0 + 30.0 * self._drift.value) * t
        noise = self._atmo_rng.standard_normal(n) * 0.15
        tone = np.sin(phases) * 0.1
        self._atmo_phase = float(phases[-1] % (2.0 * np.pi))
        return (noise + tone) * gain

    def render(self, n: int) -> np.ndarray:
        t0 = time.perf_counter()
        mod = self._lfo.process_block(n, 0.015)
        layer_audio: Dict[str, np.ndarray] = {}

        for lid in LAYER_IDS:
            layer_audio[lid] = self.voices.render_layer(lid, n, mod_pitch=float(mod[0]))

        # Extra procedural atmosphere on noise_atmo bus
        if self._targets and self._targets.layer_gains.get("noise_atmo", 0) > 0.05:
            layer_audio["noise_atmo"] = layer_audio.get("noise_atmo", np.zeros(n)) + self._render_atmosphere(
                n, self._targets.layer_gains.get("noise_atmo", 0.2),
            )

        left, right, rev_l, rev_r, dly_l, dly_r = self.mixer.mix_stereo(layer_audio, n)

        # Sends
        rl, rr = self.reverb.process(rev_l, rev_r)
        left += rl * 0.85
        right += rr * 0.85
        dl, dr = self.delay.process(dly_l + left * 0.15, dly_r + right * 0.15)
        left = left * 0.85 + dl * 0.35
        right = right * 0.85 + dr * 0.35

        left, right = self.chorus.process(left, right)

        warm = self._warmth.process_block(n)
        drive = 0.15 + float(warm[-1]) * 0.25
        left = soft_saturate(left, drive)
        right = soft_saturate(right, drive)

        master = self._master.process_block(n)
        left *= master
        right *= master

        left, right = self.limiter.process(left, right)
        stereo = np.column_stack([left, right]).astype(np.float32)

        elapsed = time.perf_counter() - t0
        self._render_load = elapsed / (n / SAMPLE_RATE)
        if self._render_load > 0.8:
            self._overload_count += 1
            if self._overload_count > 30:
                logger.warning("Audio overload — reducing quality")
                self.set_quality("Low")
                self._overload_count = 0
        else:
            self._overload_count = max(0, self._overload_count - 1)

        self._sample_pos += n
        if not np.all(np.isfinite(stereo)):
            stereo = np.nan_to_num(stereo)
        return stereo

    @property
    def peak_level(self) -> float:
        return self.limiter.peak

    @property
    def voice_count(self) -> int:
        return self.voices.active_count()

    @property
    def render_load_pct(self) -> float:
        return self._render_load * 100.0

    def get_diagnostics(self) -> dict:
        return {
            "engine_version": ENGINE_VERSION,
            "quality": self.quality,
            "voices_active": self.voice_count,
            "render_load_pct": self.render_load_pct,
            "peak": self.peak_level,
            "limiter_active": self.limiter.active,
            "presets": self._active_preset_names,
            "reverb_profile": self.reverb.profile,
        }
