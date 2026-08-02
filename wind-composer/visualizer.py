"""Matplotlib visualizer panels for waveform, FFT, and wind meter."""

from __future__ import annotations

import numpy as np
from matplotlib.axes import Axes
from matplotlib.figure import Figure

from config import BLOCK_SIZE


class Visualizer:
    """Update matplotlib axes at ~30 FPS from VisualState snapshots."""

    def __init__(self, figure: Figure) -> None:
        self.figure = figure
        self.ax_wave: Axes = figure.add_subplot(2, 2, 1)
        self.ax_fft: Axes = figure.add_subplot(2, 2, 2)
        self.ax_wind: Axes = figure.add_subplot(2, 2, 3)
        self.ax_info: Axes = figure.add_subplot(2, 2, 4)

        self._wave_line, = self.ax_wave.plot(np.zeros(BLOCK_SIZE), color="#6b9fd4", lw=0.8)
        self._fft_line, = self.ax_fft.plot(np.zeros(BLOCK_SIZE // 2 + 1), color="#9fd46b", lw=0.8)
        self._wind_bar = self.ax_wind.barh([0], [0.0], color="#6b9fd4", height=0.5)[0]
        self._wind_prob_bar = self.ax_wind.barh([1], [0.0], color="#d4a56b", height=0.5)[0]

        self.ax_wave.set_title("Waveform", color="#c8d4e8", fontsize=10)
        self.ax_fft.set_title("FFT Spectrum", color="#c8d4e8", fontsize=10)
        self.ax_wind.set_title("Wind Strength", color="#c8d4e8", fontsize=10)
        self.ax_info.set_title("Musical State", color="#c8d4e8", fontsize=10)

        for ax in (self.ax_wave, self.ax_fft, self.ax_wind, self.ax_info):
            ax.set_facecolor("#1a1f2a")
            ax.tick_params(colors="#8899aa", labelsize=8)
            for spine in ax.spines.values():
                spine.set_color("#334455")

        self.ax_wave.set_ylim(-1.0, 1.0)
        self.ax_fft.set_ylim(0.0, 1.1)
        self.ax_wind.set_xlim(0.0, 1.0)
        self.ax_wind.set_yticks([0, 1])
        self.ax_wind.set_yticklabels(["Energy", "Prob"], color="#8899aa")
        self.ax_info.axis("off")

        self._info_text = self.ax_info.text(
            0.02, 0.95, "", transform=self.ax_info.transAxes,
            va="top", fontsize=10, color="#c8d4e8", family="monospace",
        )

        figure.patch.set_facecolor("#12161f")

    def update(
        self,
        waveform: np.ndarray,
        fft: np.ndarray,
        wind_strength: float,
        wind_probability: float,
        chord: str,
        notes: list[str],
        tempo: float,
        cpu: float,
        recording: bool,
    ) -> None:
        w = waveform if len(waveform) == BLOCK_SIZE else np.pad(waveform, (0, max(0, BLOCK_SIZE - len(waveform))))
        self._wave_line.set_ydata(w)
        self._wave_line.set_xdata(np.arange(len(w)))

        f = fft if len(fft) > 0 else np.zeros(BLOCK_SIZE // 2 + 1)
        self._fft_line.set_ydata(f[:BLOCK_SIZE // 2 + 1])
        self._fft_line.set_xdata(np.arange(len(f[:BLOCK_SIZE // 2 + 1])))

        self._wind_bar.set_width(max(0.0, min(1.0, wind_strength)))
        self._wind_prob_bar.set_width(max(0.0, min(1.0, wind_probability)))

        rec = "● REC" if recording else "○ idle"
        notes_str = ", ".join(notes) if notes else "—"
        info = (
            f"Chord: {chord}\n"
            f"Notes: {notes_str}\n"
            f"Tempo: {tempo:.1f} BPM\n"
            f"CPU: {cpu:.1f}%\n"
            f"Recording: {rec}"
        )
        self._info_text.set_text(info)

        self.figure.canvas.draw_idle()
