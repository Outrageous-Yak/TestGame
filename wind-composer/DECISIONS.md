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

## D006 — Modular weather provider system

**Decision:** Abstract `WeatherProvider` with Open-Meteo as the first implementation; weather logic lives outside UI (`music_controller`, `weather/` package).

**Reason:** User requirement for pluggable APIs (NOAA, METAR, OpenWeather) and reliability when one source is down.

## Notes

- Target CPU usage under 15% on modern hardware; actual load depends on microphone and system audio stack.
- If no microphone is available, the app shows an error on Start and retries recovery in the background.
- Recording captures **synthesized output** (not raw microphone input).
- Live weather uses Open-Meteo grid/forecast data at coordinates (not simulated when API is reachable).

## Future expansion hooks

Architecture supports ocean buoys, hurricane feeds, MIDI output, AI harmony, plugins, and MP3 export without restructuring core modules.
