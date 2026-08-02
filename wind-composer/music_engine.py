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
    from weather.models import MusicDriveParams
except ImportError:
    MusicDriveParams = None  # type: ignore

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

    def set_key(self, key: str) -> None:
        self._scale_engine.set_key(key)
        self.chord_engine.reset()
        self.melody_engine.reset()

    def set_master_volume(self, volume: float) -> None:
        self.synth.set_master_gain(volume)

    def set_sensitivity(self, sensitivity: float) -> None:
        self.wind_detector.set_sensitivity(sensitivity)

    def apply_drive(self, drive: MusicDriveParams) -> None:
        """Apply weather-mapped or blended drive parameters."""
        self._weather_only_energy = drive.energy
        self.effects.set_stereo_pan(drive.stereo_pan)
        self.effects.reverb.set_mix(drive.reverb_amount)
        self.effects.stereo_width = 0.25 + drive.atmosphere_layers * 0.35
        self._update_music_from_energy(
            energy=drive.energy,
            gust=drive.gust,
            tempo_override=drive.tempo_bpm,
            bass_mult=drive.bass_intensity,
            percussion=drive.percussion,
            brightness_mult=drive.brightness,
        )

    def _on_input_block(self, block: np.ndarray) -> None:
        feats = self.signal_processor.process(block)
        gust = self.gust_detector.update(feats.short_energy)
        self._last_mic_gust = gust
        wind = self.wind_detector.analyse(feats, gust)
        self._wind_state = wind
        self._update_music_from_energy(wind.energy, gust)

        with self.lock:
            self.visual.waveform = self.signal_processor.waveform.copy()
            self.visual.fft = feats.fft_magnitudes.copy()
            self.visual.wind_strength = wind.energy
            self.visual.wind_probability = wind.probability

    def _update_music_from_energy(
        self,
        energy: float,
        gust: bool,
        tempo_override: Optional[float] = None,
        bass_mult: float = 1.0,
        percussion: float = 0.0,
        brightness_mult: float = 0.5,
    ) -> None:
        profile = MODE_PROFILES[self._mode]
        energy = clamp(energy)

        chord = self.chord_engine.update(energy)
        self._chord_state = chord

        tempo = tempo_override if tempo_override is not None else (
            profile.tempo_min + energy * (profile.tempo_max - profile.tempo_min)
        )
        self.rhythm_engine.set_tempo(tempo, SAMPLE_RATE)

        melody_notes = self.melody_engine.update(
            energy,
            profile.melody_activity,
            gust,
            chord.tones,
        )

        self.effects.set_wind_modulation(energy, gust)

        # Layer control
        self.synth.sustain_pad(chord.tones, energy)
        self.synth.sustain_atmosphere(energy + percussion * 0.3)

        bass_gain = clamp(energy - 0.15) * 0.5 * bass_mult
        if bass_gain > 0.05:
            bass_midi = chord.tones[0] - 12 if chord.tones else self.scale_engine.degree_root(0) - 12
            self.synth.set_layer_frequency("bass", bass_midi)
            self.synth.set_layer_gain("bass", bass_gain)
            if self.synth.layers["bass"].adsr.stage == "idle":
                self.synth.trigger_layer("bass", 0.4 + energy * 0.3)

        for note in melody_notes:
            self.synth.set_layer_frequency("lead", note.midi)
            self.synth.set_layer_gain("lead", note.velocity)
            self.synth.trigger_layer("lead", note.velocity)

        if gust:
            accent_midi = chord.tones[-1] if chord.tones else self.scale_engine.degree_root(0)
            self.synth.set_layer_frequency("lead", accent_midi)
            self.synth.trigger_layer("lead", 0.85)

        cutoff = profile.lp_cutoff_base + energy * 4000.0 * profile.brightness * brightness_mult
        for layer in self.synth.layers:
            self.synth.set_filter_cutoff(layer, cutoff)

        note_names = [self.scale_engine.note_name(n.midi) for n in melody_notes]
        for t in chord.tones[:3]:
            note_names.append(self.scale_engine.note_name(t))

        with self.lock:
            self.visual.current_chord = chord.name
            self.visual.current_notes = note_names[:6]
            self.visual.tempo_bpm = tempo
            self.visual.wind_strength = energy

        # Percussion from rain — trigger bass layer lightly
        if percussion > 0.25 and gust:
            self.synth.trigger_layer("bass", percussion * 0.5)

    def _output_callback(self, outdata: np.ndarray, frames: int, time_info, status) -> None:
        if status:
            logger.warning("Output status: %s", status)

        t0 = time.perf_counter()
        mono = self.synth.render(frames)
        stereo = self.effects.process_mono_to_stereo(mono)

        if self.recorder.is_recording:
            self.recorder.add_block(stereo)

        outdata[:] = stereo
        self._sample_position += frames

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

    def start_recording(self) -> None:
        self.recorder.start()
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
            )
