"""Sound Engine controls — quality, soundscape, and mix tweaks."""

from __future__ import annotations

import tkinter as tk
from tkinter import ttk
from typing import Callable, Optional

from config import AUDIO_QUALITY_LEVELS, SOUNDSCAPE_PRESETS

BG = "#12161f"
SURFACE = "#1a1f2a"
TEXT = "#c8d4e8"
ACCENT = "#6b9fd4"
MUTED = "#8899aa"
WARN = "#e07070"


class SoundPanel(ttk.Frame):
    """Compact sound engine section with optional advanced diagnostics."""

    def __init__(
        self,
        parent: tk.Misc,
        controller,
        on_change: Optional[Callable[[], None]] = None,
    ) -> None:
        super().__init__(parent)
        self.controller = controller
        self._on_change = on_change
        self._advanced_visible = False
        self._build()

    def _build(self) -> None:
        header = ttk.Frame(self)
        header.pack(fill=tk.X, padx=4, pady=(4, 2))
        ttk.Label(header, text="Sound Engine", style="Header.TLabel").pack(side=tk.LEFT)
        self.peak_label = ttk.Label(header, text="Peak: —", foreground=MUTED)
        self.peak_label.pack(side=tk.RIGHT, padx=4)
        self.peak_warn = ttk.Label(header, text="", foreground=WARN)
        self.peak_warn.pack(side=tk.RIGHT)

        row1 = ttk.Frame(self)
        row1.pack(fill=tk.X, padx=4, pady=2)

        ttk.Label(row1, text="Quality:").pack(side=tk.LEFT, padx=(0, 4))
        self.quality_combo = ttk.Combobox(
            row1, values=AUDIO_QUALITY_LEVELS, width=10, state="readonly",
        )
        self.quality_combo.pack(side=tk.LEFT, padx=4)
        self.quality_combo.bind("<<ComboboxSelected>>", self._apply_quality)

        ttk.Label(row1, text="Soundscape:").pack(side=tk.LEFT, padx=(12, 4))
        self.soundscape_combo = ttk.Combobox(
            row1, values=SOUNDSCAPE_PRESETS, width=16, state="readonly",
        )
        self.soundscape_combo.pack(side=tk.LEFT, padx=4)
        self.soundscape_combo.bind("<<ComboboxSelected>>", self._apply_soundscape)

        row2 = ttk.Frame(self)
        row2.pack(fill=tk.X, padx=4, pady=2)

        self._add_slider(row2, "Reverb", self._on_reverb)
        self._add_slider(row2, "Width", self._on_width)
        self._add_slider(row2, "Bright", self._on_brightness)
        self._add_slider(row2, "Warmth", self._on_warmth)

        self.layers_label = ttk.Label(self, text="Layers: —", foreground=MUTED)
        self.layers_label.pack(fill=tk.X, padx=8, pady=2)

        adv_btn = ttk.Button(self, text="Advanced diagnostics ▾", command=self._toggle_advanced)
        adv_btn.pack(anchor=tk.W, padx=4, pady=2)

        self.advanced_frame = ttk.Frame(self)
        self.advanced_text = tk.Text(
            self.advanced_frame, height=5, bg=SURFACE, fg=TEXT,
            relief=tk.FLAT, font=("Consolas", 9),
        )
        self.advanced_text.pack(fill=tk.X, padx=4, pady=2)
        self.advanced_text.configure(state=tk.DISABLED)

    def _add_slider(self, parent: ttk.Frame, label: str, command: Callable) -> None:
        ttk.Label(parent, text=label).pack(side=tk.LEFT, padx=(8, 2))
        scale = tk.Scale(
            parent, from_=0, to=100, orient=tk.HORIZONTAL, length=90,
            bg=BG, fg=TEXT, highlightthickness=0, command=command,
        )
        scale.set(50)
        scale.pack(side=tk.LEFT, padx=2)
        setattr(self, f"{label.lower()}_slider", scale)

    def apply_settings(self, settings) -> None:
        self.quality_combo.set(settings.audio_quality)
        self.soundscape_combo.set(settings.soundscape_preset)
        self.reverb_slider.set(int(settings.reverb_amount * 100))
        self.width_slider.set(int(settings.width_amount * 100))
        self.bright_slider.set(int(settings.brightness_amount * 100))
        self.warmth_slider.set(int(settings.warmth_amount * 100))
        self.controller.set_audio_quality(settings.audio_quality)
        self.controller.set_soundscape(settings.soundscape_preset)
        self.controller.set_sound_tweaks(
            settings.reverb_amount,
            settings.width_amount,
            settings.brightness_amount,
            settings.warmth_amount,
        )

    def _apply_quality(self, _event=None) -> None:
        q = self.quality_combo.get()
        self.controller.set_audio_quality(q)
        if self._on_change:
            self._on_change()

    def _apply_soundscape(self, _event=None) -> None:
        sc = self.soundscape_combo.get()
        self.controller.set_soundscape(sc)
        if self._on_change:
            self._on_change()

    def _on_reverb(self, val: str) -> None:
        self._sync_tweaks(reverb=int(val) / 100.0)

    def _on_width(self, val: str) -> None:
        self._sync_tweaks(width=int(val) / 100.0)

    def _on_brightness(self, val: str) -> None:
        self._sync_tweaks(brightness=int(val) / 100.0)

    def _on_warmth(self, val: str) -> None:
        self._sync_tweaks(warmth=int(val) / 100.0)

    def _sync_tweaks(self, **kwargs) -> None:
        r = kwargs.get("reverb", self.reverb_slider.get() / 100.0)
        w = kwargs.get("width", self.width_slider.get() / 100.0)
        b = kwargs.get("brightness", self.bright_slider.get() / 100.0)
        t = kwargs.get("warmth", self.warmth_slider.get() / 100.0)
        self.controller.set_sound_tweaks(r, w, b, t)
        if self._on_change:
            self._on_change()

    def get_settings_values(self) -> dict:
        return {
            "audio_quality": self.quality_combo.get(),
            "soundscape_preset": self.soundscape_combo.get(),
            "reverb_amount": self.reverb_slider.get() / 100.0,
            "width_amount": self.width_slider.get() / 100.0,
            "brightness_amount": self.bright_slider.get() / 100.0,
            "warmth_amount": self.warmth_slider.get() / 100.0,
        }

    def _toggle_advanced(self) -> None:
        self._advanced_visible = not self._advanced_visible
        if self._advanced_visible:
            self.advanced_frame.pack(fill=tk.X, padx=4, pady=2)
        else:
            self.advanced_frame.pack_forget()

    def update_diagnostics(self) -> None:
        vis = self.controller.get_visual_state()
        layers = ", ".join(vis.active_layers) if vis.active_layers else "—"
        self.layers_label.configure(text=f"Layers: {layers}")
        peak = vis.peak_level
        self.peak_label.configure(text=f"Peak: {peak:.2f}")
        if peak > 0.88:
            self.peak_warn.configure(text="⚠")
        else:
            self.peak_warn.configure(text="")

        if self._advanced_visible:
            diag = self.controller.get_audio_diagnostics()
            lines = [
                f"Presets: {', '.join(diag.get('presets', [])) or '—'}",
                f"Voices: {diag.get('voices_active', 0)}  Load: {diag.get('render_load_pct', 0):.1f}%",
                f"Reverb: {diag.get('reverb_profile', '—')}  Quality: {diag.get('quality', '—')}",
                f"Limiter: {'active' if diag.get('limiter_active') else 'idle'}",
            ]
            self.advanced_text.configure(state=tk.NORMAL)
            self.advanced_text.delete("1.0", tk.END)
            self.advanced_text.insert("1.0", "\n".join(lines))
            self.advanced_text.configure(state=tk.DISABLED)
