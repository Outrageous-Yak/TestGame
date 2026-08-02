# Decisions

## D001 — Parallel project location

**Decision:** Build Wind Composer in `wind-composer/` alongside existing repo projects.

**Reason:** User requested a parallel desktop sound application without replacing workspace content.

## D002 — Separate input and output streams

**Decision:** Microphone uses `InputStream`; synthesis uses `OutputStream` with shared analysis in the input callback.

**Reason:** Simpler recovery when mic disconnects; output can continue briefly during reconnection attempts.

## D003 — Pure numpy/scipy synthesis

**Decision:** No external synth libraries; vectorized oscillators and lightweight effects.

**Reason:** Spec limits dependencies; keeps CPU predictable and code portable.

## D004 — Indexed settings in user home

**Decision:** `~/.wind_composer_settings.json` for persistence.

**Reason:** Desktop app convention; no project DB required for prototype.

## D005 — Tkinter + matplotlib

**Decision:** Native tkinter UI with embedded matplotlib visualizer.

**Reason:** Spec requirement; avoids extra UI framework dependencies.
