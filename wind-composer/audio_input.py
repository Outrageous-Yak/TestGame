"""Microphone capture with automatic recovery."""

from __future__ import annotations

import logging
import threading
import time
from typing import Callable, Optional

import numpy as np
import sounddevice as sd

from config import BLOCK_SIZE, CHANNELS, SAMPLE_RATE
from utils import resolve_input_device

logger = logging.getLogger(__name__)


class AudioInput:
    """
    Continuous microphone read at 44100 Hz / 1024 samples.

    Pushes blocks to a queue for analysis; recovers from disconnects.
    """

    def __init__(
        self,
        on_block: Callable[[np.ndarray], None],
        device_label: str = "",
    ) -> None:
        self.on_block = on_block
        self.device_label = device_label
        self._stream: Optional[sd.InputStream] = None
        self._running = False
        self._recover_thread: Optional[threading.Thread] = None
        self._error_count = 0

    def _input_callback(self, indata: np.ndarray, frames: int, time_info, status) -> None:
        if status:
            logger.warning("Input status: %s", status)
        try:
            block = indata[:, 0].copy() if indata.ndim > 1 else indata.copy()
            self.on_block(block)
        except Exception as exc:
            logger.exception("Input callback error: %s", exc)
            self._error_count += 1

    def start(self) -> None:
        self._running = True
        self._open_stream()
        if self._stream is None:
            self._recover_thread = threading.Thread(target=self._recovery_loop, daemon=True)
            self._recover_thread.start()

    def _open_stream(self) -> None:
        device = resolve_input_device(self.device_label)
        try:
            self._stream = sd.InputStream(
                samplerate=SAMPLE_RATE,
                blocksize=BLOCK_SIZE,
                channels=CHANNELS,
                dtype="float32",
                device=device,
                callback=self._input_callback,
            )
            self._stream.start()
            self._error_count = 0
            logger.info("Microphone stream opened (device=%s)", device)
        except Exception as exc:
            logger.error("Failed to open microphone: %s", exc)
            self._stream = None

    def _recovery_loop(self) -> None:
        while self._running and self._stream is None:
            time.sleep(1.5)
            if not self._running:
                break
            logger.info("Attempting microphone recovery…")
            self._open_stream()

    def stop(self) -> None:
        self._running = False
        if self._stream is not None:
            try:
                self._stream.stop()
                self._stream.close()
            except Exception:
                pass
            self._stream = None

    def set_device(self, device_label: str) -> None:
        self.device_label = device_label
        if self._running:
            self.stop()
            self._running = True
            self._open_stream()

    @property
    def is_active(self) -> bool:
        return self._stream is not None and self._stream.active
