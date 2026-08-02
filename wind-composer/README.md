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

## Notes

- Target CPU usage under 15% on modern hardware; actual load depends on microphone and system audio stack.
- If no microphone is available, the app shows an error on Start and retries recovery in the background.
- Recording captures **synthesized output** (not raw microphone input).

## Future expansion hooks

Architecture supports adding MIDI output, AI harmony, plugins, multiple wind zones, and MP3 export without restructuring core modules.
