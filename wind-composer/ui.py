"""Tkinter UI with dark theme and controls."""

from __future__ import annotations

import logging
import tkinter as tk
from pathlib import Path
from tkinter import filedialog, messagebox, ttk
from typing import List

from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from matplotlib.figure import Figure

from config import KEYS, Mode, ScaleName, VIS_INTERVAL_MS, AppSettings
from music_engine import MusicEngine
from utils import list_audio_input_devices
from visualizer import Visualizer

logger = logging.getLogger(__name__)

# Dark theme colors
BG = "#12161f"
SURFACE = "#1a1f2a"
TEXT = "#c8d4e8"
ACCENT = "#6b9fd4"
MUTED = "#8899aa"


class WindComposerUI:
    """Main application window."""

    def __init__(self, settings: AppSettings) -> None:
        self.settings = settings
        self.engine = MusicEngine()
        self.engine.set_mode(settings.mode)
        self.engine.set_scale(settings.scale)
        self.engine.set_key(settings.key)
        self.engine.set_master_volume(settings.master_volume)
        self.engine.set_sensitivity(settings.sensitivity)

        self.root = tk.Tk()
        self.root.title("Wind Composer")
        self.root.configure(bg=BG)
        self.root.geometry(f"{settings.window_width}x{settings.window_height}")
        self.root.minsize(900, 600)

        self._build_styles()
        self._build_layout()
        self._populate_devices()
        self._apply_settings_to_ui()

        self.root.protocol("WM_DELETE_WINDOW", self._on_close)
        self._schedule_visual_update()

    def _build_styles(self) -> None:
        style = ttk.Style()
        style.theme_use("clam")
        style.configure("TFrame", background=BG)
        style.configure("TLabel", background=BG, foreground=TEXT)
        style.configure("TButton", background=SURFACE, foreground=TEXT)
        style.configure("Header.TLabel", font=("Segoe UI", 11, "bold"), foreground=ACCENT)
        style.configure("TCombobox", fieldbackground=SURFACE, background=SURFACE)

    def _build_layout(self) -> None:
        top = ttk.Frame(self.root)
        top.pack(fill=tk.X, padx=10, pady=8)

        ttk.Label(top, text="Wind Composer", style="Header.TLabel").pack(side=tk.LEFT)

        self.status_label = ttk.Label(top, text="Stopped", foreground=MUTED)
        self.status_label.pack(side=tk.RIGHT, padx=8)
        self.rec_indicator = ttk.Label(top, text="○", foreground=MUTED)
        self.rec_indicator.pack(side=tk.RIGHT)

        controls = ttk.Frame(self.root)
        controls.pack(fill=tk.X, padx=10, pady=4)

        self.btn_start = ttk.Button(controls, text="Start", command=self._on_start)
        self.btn_start.pack(side=tk.LEFT, padx=4)
        self.btn_stop = ttk.Button(controls, text="Stop", command=self._on_stop)
        self.btn_stop.pack(side=tk.LEFT, padx=4)
        self.btn_record = ttk.Button(controls, text="Record", command=self._on_record)
        self.btn_record.pack(side=tk.LEFT, padx=4)
        self.btn_save = ttk.Button(controls, text="Save Recording", command=self._on_save)
        self.btn_save.pack(side=tk.LEFT, padx=4)

        row2 = ttk.Frame(self.root)
        row2.pack(fill=tk.X, padx=10, pady=4)

        ttk.Label(row2, text="Microphone:").pack(side=tk.LEFT, padx=(0, 4))
        self.mic_combo = ttk.Combobox(row2, width=42, state="readonly")
        self.mic_combo.pack(side=tk.LEFT, padx=4)

        ttk.Label(row2, text="Mode:").pack(side=tk.LEFT, padx=(12, 4))
        self.mode_combo = ttk.Combobox(
            row2, values=[m.value for m in Mode], width=12, state="readonly",
        )
        self.mode_combo.pack(side=tk.LEFT, padx=4)

        ttk.Label(row2, text="Scale:").pack(side=tk.LEFT, padx=(12, 4))
        self.scale_combo = ttk.Combobox(
            row2, values=[s.value for s in ScaleName], width=14, state="readonly",
        )
        self.scale_combo.pack(side=tk.LEFT, padx=4)

        ttk.Label(row2, text="Key:").pack(side=tk.LEFT, padx=(12, 4))
        self.key_combo = ttk.Combobox(row2, values=KEYS, width=5, state="readonly")
        self.key_combo.pack(side=tk.LEFT, padx=4)

        row3 = ttk.Frame(self.root)
        row3.pack(fill=tk.X, padx=10, pady=4)

        ttk.Label(row3, text="Master volume").pack(side=tk.LEFT)
        self.vol_slider = tk.Scale(
            row3, from_=0, to=100, orient=tk.HORIZONTAL, length=160,
            bg=BG, fg=TEXT, highlightthickness=0, command=self._on_volume,
        )
        self.vol_slider.pack(side=tk.LEFT, padx=8)

        ttk.Label(row3, text="Sensitivity").pack(side=tk.LEFT, padx=(12, 0))
        self.sens_slider = tk.Scale(
            row3, from_=0, to=100, orient=tk.HORIZONTAL, length=160,
            bg=BG, fg=TEXT, highlightthickness=0, command=self._on_sensitivity,
        )
        self.sens_slider.pack(side=tk.LEFT, padx=8)

        self.info_label = ttk.Label(
            row3,
            text="Chord: —  |  Tempo: —  |  CPU: —",
            foreground=MUTED,
        )
        self.info_label.pack(side=tk.RIGHT, padx=8)

        viz_frame = ttk.Frame(self.root)
        viz_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=8)

        self.figure = Figure(figsize=(10, 5), dpi=90)
        self.visualizer = Visualizer(self.figure)
        self.canvas = FigureCanvasTkAgg(self.figure, master=viz_frame)
        self.canvas.get_tk_widget().pack(fill=tk.BOTH, expand=True)

    def _populate_devices(self) -> None:
        try:
            devices = list_audio_input_devices()
            labels = [d[1] for d in devices]
            if not labels:
                labels = ["Default"]
            self.mic_combo["values"] = labels
            if self.settings.microphone and self.settings.microphone in labels:
                self.mic_combo.set(self.settings.microphone)
            else:
                self.mic_combo.current(0)
        except Exception as exc:
            logger.error("Device enumeration failed: %s", exc)
            self.mic_combo["values"] = ["Default"]
            self.mic_combo.current(0)

    def _apply_settings_to_ui(self) -> None:
        self.mode_combo.set(self.settings.mode.value)
        self.scale_combo.set(self.settings.scale.value)
        self.key_combo.set(self.settings.key)
        self.vol_slider.set(int(self.settings.master_volume * 100))
        self.sens_slider.set(int(self.settings.sensitivity * 100))

    def _on_start(self) -> None:
        try:
            mic = self.mic_combo.get()
            self.settings.microphone = mic
            self._sync_settings()
            self.engine.start(mic)
            self.status_label.configure(text="Listening…", foreground=ACCENT)
            self.btn_start.configure(state=tk.DISABLED)
            self.btn_stop.configure(state=tk.NORMAL)
        except Exception as exc:
            logger.exception("Start failed")
            messagebox.showerror("Audio Error", f"Could not start audio:\n{exc}")

    def _on_stop(self) -> None:
        self.engine.stop()
        self.status_label.configure(text="Stopped", foreground=MUTED)
        self.btn_start.configure(state=tk.NORMAL)
        self.btn_stop.configure(state=tk.DISABLED)
        if self.engine.recorder.is_recording:
            self.engine.stop_recording()
            self.rec_indicator.configure(text="○", foreground=MUTED)

    def _on_record(self) -> None:
        if not self.engine.visual.is_running:
            messagebox.showinfo("Record", "Press Start before recording.")
            return
        if self.engine.recorder.is_recording:
            self.engine.stop_recording()
            self.rec_indicator.configure(text="○", foreground=MUTED)
        else:
            self.engine.start_recording()
            self.rec_indicator.configure(text="● REC", foreground="#e07070")

    def _on_save(self) -> None:
        if self.engine.recorder.duration_sec() <= 0:
            messagebox.showinfo("Save", "No recording to save.")
            return
        path = filedialog.asksaveasfilename(
            defaultextension=".wav",
            filetypes=[("WAV audio", "*.wav")],
            title="Save recording",
        )
        if not path:
            return
        try:
            saved = self.engine.recorder.save(Path(path))
            messagebox.showinfo("Saved", f"Recording saved to:\n{saved}")
        except Exception as exc:
            messagebox.showerror("Save failed", str(exc))

    def _on_volume(self, val: str) -> None:
        v = int(val) / 100.0
        self.settings.master_volume = v
        self.engine.set_master_volume(v)

    def _on_sensitivity(self, val: str) -> None:
        s = int(val) / 100.0
        self.settings.sensitivity = s
        self.engine.set_sensitivity(s)

    def _sync_settings(self) -> None:
        mode = Mode(self.mode_combo.get())
        scale = ScaleName(self.scale_combo.get())
        key = self.key_combo.get()
        self.settings.mode = mode
        self.settings.scale = scale
        self.settings.key = key
        self.engine.set_mode(mode)
        self.engine.set_scale(scale)
        self.engine.set_key(key)

    def _schedule_visual_update(self) -> None:
        state = self.engine.get_visual_state()
        self.visualizer.update(
            state.waveform,
            state.fft,
            state.wind_strength,
            state.wind_probability,
            state.current_chord,
            state.current_notes,
            state.tempo_bpm,
            state.cpu_percent,
            state.is_recording,
        )
        self.info_label.configure(
            text=f"Chord: {state.current_chord}  |  Tempo: {state.tempo_bpm:.0f} BPM  |  CPU: {state.cpu_percent:.0f}%",
        )
        self.root.after(VIS_INTERVAL_MS, self._schedule_visual_update)

    def _on_close(self) -> None:
        try:
            self.engine.stop()
        except Exception:
            pass
        self.settings.window_width = self.root.winfo_width()
        self.settings.window_height = self.root.winfo_height()
        self.settings.save()
        self.root.destroy()

    def run(self) -> None:
        self.btn_stop.configure(state=tk.DISABLED)
        # Bind combobox changes once
        self.mode_combo.bind("<<ComboboxSelected>>", lambda _: self._sync_settings())
        self.scale_combo.bind("<<ComboboxSelected>>", lambda _: self._sync_settings())
        self.key_combo.bind("<<ComboboxSelected>>", lambda _: self._sync_settings())
        self.root.mainloop()
