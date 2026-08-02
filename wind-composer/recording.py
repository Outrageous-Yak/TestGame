"""WAV recording with timestamps and JSON metadata."""

from __future__ import annotations

import json
import time
import wave
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np

from config import SAMPLE_RATE


@dataclass
class RecordingMarker:
    timestamp_sec: float
    label: str


@dataclass
class RecordingMetadata:
    """Metadata saved alongside WAV recordings."""

    location: str = ""
    weather: str = ""
    date: str = ""
    tempo_bpm: float = 0.0
    key: str = ""
    scale: str = ""
    mode: str = ""
    composition_state: str = ""
    mood: str = ""
    phrase_number: int = 0
    phrase_length_bars: int = 0
    chord: str = ""
    soundscape_preset: str = ""
    active_instrument_presets: List[str] = field(default_factory=list)
    reverb_profile: str = ""
    quality_level: str = ""
    peak_level: float = 0.0
    engine_version: str = ""
    extra: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        return d


class AudioRecorder:
    """Accumulate stereo output and save as WAV + JSON metadata."""

    def __init__(self) -> None:
        self._chunks: List[np.ndarray] = []
        self._markers: List[RecordingMarker] = []
        self._start_time: Optional[float] = None
        self._active = False
        self._metadata: Optional[RecordingMetadata] = None

    @property
    def is_recording(self) -> bool:
        return self._active

    def start(self, metadata: Optional[RecordingMetadata] = None) -> None:
        self._chunks.clear()
        self._markers.clear()
        self._start_time = time.monotonic()
        self._active = True
        self._metadata = metadata
        self.mark("recording_start")

    def stop(self) -> None:
        self._active = False
        self.mark("recording_stop")

    def mark(self, label: str) -> None:
        if self._start_time is not None:
            elapsed = time.monotonic() - self._start_time
            self._markers.append(RecordingMarker(elapsed, label))

    def add_block(self, stereo: np.ndarray) -> None:
        if self._active:
            self._chunks.append(stereo.copy())

    def save(self, path: Path, metadata: Optional[RecordingMetadata] = None) -> Path:
        if not self._chunks:
            raise ValueError("No audio recorded")

        audio = np.concatenate(self._chunks, axis=0)
        if audio.ndim == 1:
            audio = np.column_stack([audio, audio])

        audio = np.clip(audio, -1.0, 1.0)
        pcm = (audio * 32767).astype(np.int16)

        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)

        with wave.open(str(path), "wb") as wf:
            wf.setnchannels(2)
            wf.setsampwidth(2)
            wf.setframerate(SAMPLE_RATE)
            wf.writeframes(pcm.tobytes())

        # Sidecar timestamp log
        log_path = path.with_suffix(".log.txt")
        lines = [f"{m.timestamp_sec:.3f}s  {m.label}" for m in self._markers]
        log_path.write_text("\n".join(lines) + "\n")

        meta = metadata or self._metadata
        if meta:
            json_path = path.with_suffix(".json")
            meta_dict = meta.to_dict()
            meta_dict["duration_sec"] = self.duration_sec()
            meta_dict["markers"] = lines
            json_path.write_text(json.dumps(meta_dict, indent=2))

        return path

    def duration_sec(self) -> float:
        total_samples = sum(len(c) for c in self._chunks)
        return total_samples / SAMPLE_RATE
