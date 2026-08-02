"""WAV recording with timestamps."""

from __future__ import annotations

import time
import wave
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional

import numpy as np

from config import SAMPLE_RATE


@dataclass
class RecordingMarker:
    timestamp_sec: float
    label: str


class AudioRecorder:
    """Accumulate stereo output and save as WAV."""

    def __init__(self) -> None:
        self._chunks: List[np.ndarray] = []
        self._markers: List[RecordingMarker] = []
        self._start_time: Optional[float] = None
        self._active = False

    @property
    def is_recording(self) -> bool:
        return self._active

    def start(self) -> None:
        self._chunks.clear()
        self._markers.clear()
        self._start_time = time.monotonic()
        self._active = True
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

    def save(self, path: Path) -> Path:
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

        return path

    def duration_sec(self) -> float:
        total_samples = sum(len(c) for c in self._chunks)
        return total_samples / SAMPLE_RATE
