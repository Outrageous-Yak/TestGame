# Wind Composer

Desktop Python application that transforms live microphone wind into evolving electronic ambient music.

Built as a parallel project alongside the Hex Game, Story Architecture Studio, and Sound Studio in this repository.

## Requirements

- Python 3.12+
- Microphone access
- Linux: `libportaudio2` (for sounddevice)

## Setup

```bash
cd wind-composer
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Run

```bash
python main.py
```

## Usage

1. Select microphone, mode, scale, and key.
2. Press **Start** — the app listens and generates music from wind energy.
3. Press **Record** during playback to capture output.
4. Press **Save Recording** to export WAV (+ timestamp log).
5. Press **Stop** when finished.

## Modes

| Mode | Character |
|------|-----------|
| Ambient | Soft pads, long reverb |
| Dream | Ethereal, slow tempo |
| Electronic | Brighter filters, more rhythm |
| Forest | Noise-blended textures |
| Ocean | Wide reverb, rolling atmosphere |

## Project structure

```
wind-composer/
├── main.py              # Entry point
├── config.py            # Settings, modes, constants
├── audio_input.py       # Microphone capture + recovery
├── signal_processing.py # RMS, FFT, spectral features
├── wind_detector.py     # Wind probability & energy
├── scale_engine.py      # Scales and keys
├── chord_engine.py      # Chord progressions
├── melody_engine.py     # Melody generation
├── rhythm_engine.py     # Wind-scaled rhythm
├── synth_engine.py      # Four-layer synthesizer
├── effects.py           # Reverb, delay, filters
├── music_engine.py      # Central orchestration
├── visualizer.py        # Matplotlib displays
├── ui.py                # Tkinter interface
├── recording.py         # WAV export
└── utils.py             # Shared helpers
```

## Settings persistence

User preferences are saved to `~/.wind_composer_settings.json` automatically on exit.

## Global live weather (v1.1)

Wind Composer can drive music from **live global weather** via a modular provider system.

### Data source

- **Open-Meteo** (default, free, no API key) — live forecast/current conditions at any coordinates
- Provider architecture supports adding NOAA, OpenWeather, METAR, etc.

### Features

- Search by city, country, GPS coordinates, airport/station names
- **World Map** tab — click anywhere to add a station at that location
- Multiple simultaneous stations with **mix sliders** (e.g. Tokyo + Iceland + Antarctica)
- **Favourites** saved to `~/.wind_composer_favourites.json`
- Refresh intervals: 10s, 30s, 60s, 5 minutes
- **Input modes:** Microphone, Live Weather, or Both (blended)

### Phase 3 — Generative composition engine

Weather inspires **compositions**, not just parameters:

- **Weather personality** — storm, rain, snow, sunny calm, peaceful breeze
- **Musical states** — Stillness, Flow, Storm, Recovery, Sunrise, Night, etc.
- **Phrase generator** — 4/8/16/32 bar phrases with evolution
- **Expanded harmony** — modal, suspended, drone, quartal, pedal bass
- **Long-term memory** — avoids repeating chords and melodies
- **Rare events** — gust swells, lightning hits, calm-after-storm
- **Recording metadata** — JSON sidecar with location, weather, state, phrase


| Weather | Music |
|---------|-------|
| Wind speed | Tempo, energy |
| Wind gusts | Accent notes |
| Wind direction | Stereo pan |
| Temperature | Brightness / warmth |
| Humidity | Reverb |
| Pressure | Bass intensity |
| Rain / snow | Percussion |
| Storms | Extra atmosphere layers |

### Usage

1. Open the **Global Weather** tab
2. Search for a location (e.g. `Reykjavik`, `Tokyo`, `27.99, 86.93` for Everest)
3. Add one or more stations; adjust mix sliders
4. Set **Input** to `Live Weather` (or `Both` with microphone)
5. Press **Start**

Live conditions update continuously as weather changes.

