"""Central music orchestration: wind → theory → synthesis."""

from __future__ import annotations

import logging
import threading
import time
from dataclasses import dataclass, field
from typing import List, Optional

import numpy as np
import sounddevice as sd

from audio_input import AudioInput
from chord_engine import ChordEngine, ChordState
from composition_engine import CompositionContext, CompositionEngine
from config import BLOCK_SIZE, MODE_PROFILES, Mode, SAMPLE_RATE, ScaleName
from effects import EffectsChain
from melody_engine import MelodyEngine, MelodyNote
from recording import AudioRecorder
from rhythm_engine import RhythmEngine
from scale_engine import ScaleEngine
from signal_processing import SignalProcessor, SignalFeatures
from synth_engine import SynthEngine
from utils import GustDetector, clamp
from wind_detector import WindDetector, WindState

try:
    from weather.models import MusicDriveParams, WeatherSnapshot
except ImportError:
    MusicDriveParams = None  # type: ignore
    WeatherSnapshot = None  # type: ignore

logger = logging.getLogger(__name__)


@dataclass
class VisualState:
    """Thread-safe snapshot for UI and visualizer."""

    waveform: np.ndarray = field(default_factory=lambda: np.zeros(BLOCK_SIZE))
    fft: np.ndarray = field(default_factory=lambda: np.zeros(BLOCK_SIZE // 2 + 1))
    wind_strength: float = 0.0
    wind_probability: float = 0.0
    current_chord: str = "—"
    current_notes: List[str] = field(default_factory=list)
    tempo_bpm: float = 60.0
    cpu_percent: float = 0.0
    is_running: bool = False
    is_recording: bool = False
    mic_active: bool = False
    composition_state: str = "—"
    mood: str = "—"
    phrase_number: int = 0
    active_layers: List[str] = field(default_factory=list)
    peak_level: float = 0.0
    voice_count: int = 0
    audio_load_pct: float = 0.0
    limiter_active: bool = False
    musical_style: str = "Ambient"
    song_section: str = "Flow"
    local_time_str: str = ""
    next_update_sec: float = 0.0


class MusicEngine:
    """Coordinates analysis, musical engines, synthesis, and output."""

    def __init__(self) -> None:
        self.lock = threading.Lock()
        self.visual = VisualState()

        self._scale_engine = ScaleEngine()
        self.chord_engine = ChordEngine(self._scale_engine)
        self.melody_engine = MelodyEngine(self._scale_engine)
        self.rhythm_engine = RhythmEngine()
        self.signal_processor = SignalProcessor()
        self.wind_detector = WindDetector()
        self.gust_detector = GustDetector()
        self.synth = SynthEngine()
        self.effects = EffectsChain()
        self.recorder = AudioRecorder()
        self.composition_engine = CompositionEngine(self._scale_engine)

        self._mode = Mode.AMBIENT
        self._sample_position = 0
        self._wind_state = WindState()
        self._chord_state: Optional[ChordState] = None
        self._audio_input: Optional[AudioInput] = None
        self._output_stream: Optional[sd.OutputStream] = None
        self._running = False
        self._last_cpu_time = time.perf_counter()
        self._use_mic = False
        self._last_mic_gust = False
        self._weather_only_energy = 0.0
        self._weather_snapshot: Optional[WeatherSnapshot] = None
        self._pending_rhythm_events: List = []
        self._last_drive: Optional[MusicDriveParams] = None
        self._location_label = ""
        self._percussion = 0.0
        self._stereo_pan = 0.0
        self._brightness_mult = 0.5
        self._bass_mult = 1.0
        self._sound_reverb = 0.45
        self._sound_width = 0.35
        self._sound_brightness = 0.5
        self._sound_warmth = 0.5
        self._soundscape = "Natural Ambient"
        self._audio_quality = "Standard"

    @property
    def mode(self) -> Mode:
        return self._mode

    @property
    def is_running(self) -> bool:
        return self._running

    @property
    def scale_engine(self) -> ScaleEngine:
        return self._scale_engine

    def get_mic_energy(self) -> float:
        return self._wind_state.energy

    def get_mic_gust(self) -> bool:
        return self._last_mic_gust

    def set_mode(self, mode: Mode) -> None:
        self._mode = mode
        profile = MODE_PROFILES[mode]
        self.synth.configure_osc("pad", profile.pad_osc)
        self.synth.configure_osc("bass", profile.bass_osc)
        self.synth.configure_osc("lead", profile.lead_osc)
        self.synth.configure_osc("atmosphere", profile.atmosphere_osc)
        self.effects.configure(
            (profile.reverb_mix, profile.delay_mix, profile.chorus_mix),
            profile.lp_cutoff_base,
            profile.hp_cutoff,
        )

    def set_scale(self, scale: ScaleName) -> None:
        self._scale_engine.set_scale(scale)
        self.chord_engine.reset()
        self.melody_engine.reset()
        self.composition_engine.reset()

    def set_key(self, key: str) -> None:
        self._scale_engine.set_key(key)
        self.chord_engine.reset()
        self.melody_engine.reset()
        self.composition_engine.reset()

    def set_master_volume(self, volume: float) -> None:
        self.synth.set_master_gain(volume)

    def set_audio_quality(self, level: str) -> None:
        self._audio_quality = level
        self.synth.cinematic.set_quality(level)

    def set_soundscape(self, name: str) -> None:
        self._soundscape = name
        self.synth.cinematic.set_soundscape(name)

    def set_musical_style(self, name: str) -> None:
        self.composition_engine.set_musical_style(name)

    def set_sound_tweaks(
        self,
        reverb: float,
        width: float,
        brightness: float,
        warmth: float,
    ) -> None:
        self._sound_reverb = reverb
        self._sound_width = width
        self._sound_brightness = brightness
        self._sound_warmth = warmth
        self.synth.cinematic.set_user_tweaks(reverb, width, brightness, warmth)

    def get_audio_diagnostics(self) -> dict:
        diag = self.synth.cinematic.get_diagnostics()
        diag["soundscape"] = self._soundscape
        return diag

    def set_sensitivity(self, sensitivity: float) -> None:
        self.wind_detector.set_sensitivity(sensitivity)

    def set_location_label(self, label: str) -> None:
        self._location_label = label
        self.composition_engine.set_location_label(label)

    def set_weather_snapshot(self, weather: Optional[WeatherSnapshot]) -> None:
        self._weather_snapshot = weather

    def get_composition_metadata(self) -> "RecordingMetadata":
        from audio.cinematic_engine import ENGINE_VERSION
        from recording import RecordingMetadata

        meta = self.composition_engine.get_metadata(self._mode.value)
        diag = self.get_audio_diagnostics()
        return RecordingMetadata(
            location=meta.location,
            weather=meta.weather_condition,
            date=meta.weather_date,
            tempo_bpm=meta.tempo_bpm,
            key=meta.key,
            scale=meta.scale,
            mode=meta.mode,
            composition_state=meta.composition_state,
            mood=meta.mood,
            phrase_number=meta.phrase_number,
            phrase_length_bars=meta.phrase_length_bars,
            chord=meta.chord,
            soundscape_preset=self._soundscape,
            active_instrument_presets=diag.get("presets", []),
            reverb_profile=diag.get("reverb_profile", ""),
            quality_level=self._audio_quality,
            peak_level=diag.get("peak", 0.0),
            engine_version=ENGINE_VERSION,
        )

    def apply_drive(self, drive: MusicDriveParams) -> None:
        """Apply weather-mapped drive; composition engine interprets atmosphere."""
        self._last_drive = drive
        self._weather_only_energy = drive.energy
        self._percussion = drive.percussion
        self._stereo_pan = drive.stereo_pan
        self._brightness_mult = drive.brightness
        self._bass_mult = drive.bass_intensity
        self._update_from_composition(drive.energy, drive.gust)

    def _on_input_block(self, block: np.ndarray) -> None:
        feats = self.signal_processor.process(block)
        gust = self.gust_detector.update(feats.short_energy)
        self._last_mic_gust = gust
        wind = self.wind_detector.analyse(feats, gust)
        self._wind_state = wind
        self._update_from_composition(wind.energy, gust)

        with self.lock:
            self.visual.waveform = self.signal_processor.waveform.copy()
            self.visual.fft = feats.fft_magnitudes.copy()
            self.visual.wind_strength = wind.energy
            self.visual.wind_probability = wind.probability

    def _update_from_composition(
        self,
        energy: float,
        gust: bool,
    ) -> None:
        """Generative composition path — weather inspires structure, not just parameters."""
        profile = MODE_PROFILES[self._mode]
        from style_engine import get_style

        style_profile = get_style(self.visual.musical_style)

        ctx = CompositionContext(
            raw_energy=energy,
            gust=gust,
            tempo_min=style_profile.bpm_min,
            tempo_max=style_profile.bpm_max,
            sample_position=self._sample_position,
            weather=self._weather_snapshot,
            drive=self._last_drive,
            stereo_pan=self._stereo_pan,
            percussion=self._percussion,
        )
        plan = self.composition_engine.tick(ctx)

        self.rhythm_engine.set_tempo(plan.tempo_bpm, SAMPLE_RATE)

        chord = plan.chord
        if chord is None:
            chord = self.chord_engine.update(plan.energy_curve)
        self._chord_state = chord

        self.effects.set_stereo_pan(plan.stereo_pan)
        self.effects.reverb.set_mix(plan.reverb_amount)
        self.effects.stereo_width = 0.2 + plan.atmosphere_gain * 0.4
        self.effects.set_wind_modulation(plan.energy_curve, plan.gust_accent)

        tones = chord.tones if chord else []

        if self.synth.use_cinematic:
            reverb = self._sound_reverb * (0.6 + plan.reverb_amount * 0.5)
            self.synth.cinematic.set_user_tweaks(
                reverb,
                self._sound_width,
                self._sound_brightness * plan.brightness,
                self._sound_warmth,
            )
            self.synth.apply_composition_plan(plan)
        else:
            self.synth.sustain_pad(tones, plan.pad_gain)
            self.synth.sustain_atmosphere(plan.atmosphere_gain)

            bass_gain = plan.bass_gain * plan.bass_mult
            if bass_gain > 0.04 and tones:
                from composition_engine import ChordStyle
                bass_midi = tones[0] - 12
                if plan.pedal_midi and plan.chord_style == ChordStyle.PEDAL:
                    bass_midi = plan.pedal_midi - 12
                self.synth.set_layer_frequency("bass", bass_midi)
                self.synth.set_layer_gain("bass", bass_gain)
                if self.synth.layers["bass"].adsr.stage == "idle":
                    self.synth.trigger_layer("bass", 0.35 + plan.energy_curve * 0.35)

            for note in plan.melody_notes:
                self.synth.set_layer_frequency("lead", note.midi)
                self.synth.set_layer_gain("lead", note.velocity * plan.lead_gain)
                self.synth.trigger_layer("lead", note.velocity)

            if plan.gust_accent and tones:
                accent = tones[-1]
                self.synth.set_layer_frequency("lead", accent)
                self.synth.trigger_layer("lead", 0.8)

            if plan.rare_event:
                self._apply_rare_event(plan)

            cutoff = profile.lp_cutoff_base + plan.energy_curve * 4000.0 * profile.brightness * plan.brightness
            for layer in self.synth.layers:
                self.synth.set_filter_cutoff(layer, cutoff)

        note_names = [self._scale_engine.note_name(n.midi) for n in plan.melody_notes]
        for t in tones[:3]:
            note_names.append(self._scale_engine.note_name(t))

        active_layers: List[str] = []
        if self.synth.use_cinematic and self.synth.cinematic._targets:
            active_layers = sorted(self.synth.cinematic._targets.active_layers)

        with self.lock:
            self.visual.current_chord = chord.name if chord else "—"
            self.visual.current_notes = note_names[:6]
            self.visual.tempo_bpm = plan.tempo_bpm
            self.visual.wind_strength = plan.energy_curve
            self.visual.composition_state = plan.musical_state.value
            self.visual.mood = plan.mood
            self.visual.phrase_number = plan.phrase_number
            self.visual.musical_style = getattr(plan, "musical_style", "Ambient")
            self.visual.song_section = getattr(plan, "song_section", "Flow")
            self.visual.local_time_str = getattr(plan, "local_time_str", "")
            self.visual.active_layers = active_layers
            self.visual.peak_level = self.synth.cinematic.peak_level
            self.visual.voice_count = self.synth.cinematic.voice_count
            self.visual.audio_load_pct = self.synth.cinematic.render_load_pct
            self.visual.limiter_active = self.synth.cinematic.limiter.active

        # Rhythm events from composition land in output callback via plan storage
        self._pending_rhythm_events = plan.rhythm_events

        for note in getattr(plan, "bass_notes", []):
            if self.synth.use_cinematic:
                self.synth.cinematic.note_on("soft_bass", note.midi, note.velocity, "Soft Analog Bass")
            else:
                self.synth.set_layer_frequency("bass", note.midi)
                self.synth.trigger_layer("bass", note.velocity)

        if plan.percussion > 0.25 and gust and not self.synth.use_cinematic:
            self.synth.trigger_layer("bass", plan.percussion * 0.45)

    def _apply_rare_event(self, plan) -> None:
        from composition_engine import RareEvent
        if plan.rare_event == RareEvent.GUST_SWELL:
            self.effects.reverb.set_mix(min(0.85, plan.reverb_amount + 0.2))
            if plan.chord and plan.chord.tones:
                self.synth.trigger_layer("lead", 0.9)
        elif plan.rare_event == RareEvent.LIGHTNING:
            self.synth.trigger_layer("atmosphere", 0.95)
            self.synth.trigger_layer("bass", 0.7)
        elif plan.rare_event == RareEvent.ATMOSPHERIC_HIT:
            self.synth.trigger_layer("atmosphere", 0.85)
        elif plan.rare_event == RareEvent.SUSPENDED_CHORD:
            if plan.chord and plan.chord.tones:
                self.synth.sustain_pad(plan.chord.tones, 0.6)
        elif plan.rare_event == RareEvent.CALM_AFTER_STORM:
            self.effects.reverb.set_mix(0.75)

    def _update_music_from_energy(
        self,
        energy: float,
        gust: bool,
        tempo_override: Optional[float] = None,
        bass_mult: float = 1.0,
        percussion: float = 0.0,
        brightness_mult: float = 0.5,
    ) -> None:
        """Legacy path — delegates to composition engine."""
        self._percussion = percussion
        self._bass_mult = bass_mult
        self._brightness_mult = brightness_mult
        self._update_from_composition(energy, gust, tempo_override)

    def _output_callback(self, outdata: np.ndarray, frames: int, time_info, status) -> None:
        if status:
            logger.warning("Output status: %s", status)

        t0 = time.perf_counter()
        rendered = self.synth.render(frames)
        if rendered.ndim == 2 and rendered.shape[1] == 2:
            stereo = rendered
        else:
            stereo = self.effects.process_mono_to_stereo(rendered)

        if self.recorder.is_recording:
            self.recorder.add_block(stereo)

        outdata[:] = stereo
        self._sample_position += frames

        for ev in self._pending_rhythm_events:
            self.synth.trigger_rhythm(ev.layer, ev.strength)
        self._pending_rhythm_events = []

        if not self.synth.use_cinematic:
            events = self.rhythm_engine.update(
                self._wind_state.energy if self._use_mic else self._weather_only_energy,
                MODE_PROFILES[self._mode].rhythm_density,
                self._sample_position,
            )
            for ev in events:
                if ev.layer == "bass":
                    self.synth.trigger_layer("bass", ev.strength)

        # CPU estimate
        elapsed = time.perf_counter() - t0
        block_duration = frames / SAMPLE_RATE
        cpu = clamp(elapsed / block_duration) * 100.0
        with self.lock:
            self.visual.cpu_percent = cpu * 0.3 + self.visual.cpu_percent * 0.7

    def start_microphone(self, mic_label: str) -> None:
        """Start with microphone input and synthesis output."""
        if self._running:
            return
        self._running = True
        self._use_mic = True
        self._reset_musical_state()

        self._audio_input = AudioInput(self._on_input_block, mic_label)
        self._audio_input.start()
        self._start_output_stream()

        with self.lock:
            self.visual.is_running = True
            self.visual.mic_active = self._audio_input.is_active

    def start_output_only(self) -> None:
        """Start synthesis without microphone (live weather mode)."""
        if self._running:
            return
        self._running = True
        self._use_mic = False
        self._reset_musical_state()
        self._start_output_stream()

        with self.lock:
            self.visual.is_running = True
            self.visual.mic_active = False

    def _reset_musical_state(self) -> None:
        self.signal_processor.reset()
        self.wind_detector.reset()
        self.gust_detector.reset()
        self.chord_engine.reset()
        self.melody_engine.reset()
        self.composition_engine.reset()
        self.rhythm_engine.reset()

    def _start_output_stream(self) -> None:
        try:
            self._output_stream = sd.OutputStream(
                samplerate=SAMPLE_RATE,
                blocksize=BLOCK_SIZE,
                channels=2,
                dtype="float32",
                callback=self._output_callback,
            )
            self._output_stream.start()
        except Exception as exc:
            logger.error("Output stream failed: %s", exc)
            self.stop()
            raise

    def start(self, mic_label: str) -> None:
        """Legacy entry — starts microphone mode."""
        self.start_microphone(mic_label)

    def stop(self) -> None:
        self._running = False
        if self._audio_input:
            self._audio_input.stop()
            self._audio_input = None
        if self._output_stream:
            try:
                self._output_stream.stop()
                self._output_stream.close()
            except Exception:
                pass
            self._output_stream = None

        with self.lock:
            self.visual.is_running = False
            self.visual.mic_active = False

    def start_recording(self, metadata=None) -> None:
        self.recorder.start(metadata)
        with self.lock:
            self.visual.is_recording = True

    def stop_recording(self) -> None:
        self.recorder.stop()
        with self.lock:
            self.visual.is_recording = False

    def get_visual_state(self) -> VisualState:
        with self.lock:
            return VisualState(
                waveform=self.visual.waveform.copy(),
                fft=self.visual.fft.copy(),
                wind_strength=self.visual.wind_strength,
                wind_probability=self.visual.wind_probability,
                current_chord=self.visual.current_chord,
                current_notes=list(self.visual.current_notes),
                tempo_bpm=self.visual.tempo_bpm,
                cpu_percent=self.visual.cpu_percent,
                is_running=self.visual.is_running,
                is_recording=self.visual.is_recording,
                mic_active=self.visual.mic_active,
                composition_state=self.visual.composition_state,
                mood=self.visual.mood,
                phrase_number=self.visual.phrase_number,
                active_layers=list(self.visual.active_layers),
                peak_level=self.visual.peak_level,
                voice_count=self.visual.voice_count,
                audio_load_pct=self.visual.audio_load_pct,
                limiter_active=self.visual.limiter_active,
            )
