# Wind Composer PWA

Progressive Web App for iPhone Safari and desktop browsers. Reuses the Python composition engine and weather stack via FastAPI; audio runs in the browser with Web Audio API.

## One-command start

```bash
cd wind-composer
chmod +x start.sh
./start.sh
```

Or with Docker explicitly:

```bash
cd wind-composer
docker compose up --build
```

Open **http://localhost:8000** (use your machine's LAN IP on iPhone, e.g. `http://192.168.1.x:8000`).

## Install on iPhone

1. Open the URL in **Safari** (not Chrome).
2. Tap **Share** → **Add to Home Screen**.
3. Launch from the Home Screen icon (standalone mode).

Audio starts only after tapping **Start** (Safari autoplay policy).

## Architecture

- **Backend**: FastAPI session API + WebSocket; headless `CompositionEngine` and weather providers.
- **Frontend**: Vite + TypeScript PWA; Leaflet map; AudioWorklet polyphonic synth.
- **Desktop app**: Original Tkinter app still available via `python main.py`.

See [AUDIO_ARCHITECTURE.md](../AUDIO_ARCHITECTURE.md) for signal flow.

## Development

### Backend only

```bash
cd wind-composer
pip install -r requirements-pwa.txt
export WEB_DIST="$(pwd)/web/dist"
uvicorn api.main:app --reload --port 8000
```

### Frontend dev server (proxies API)

```bash
cd wind-composer/web
npm install
npm run dev
```

### Build frontend

```bash
cd wind-composer/web
npm run build
```

## Testing

```bash
cd wind-composer
python3 test_composition.py
python3 test_engines.py
python3 test_weather.py
python3 test_audio.py
python3 test_api_pwa.py
```

### Manual browser checklist

- [ ] iPhone Safari: Add to Home Screen, standalone launch
- [ ] Start/Stop without clip on iOS
- [ ] Microphone permission grant and deny paths
- [ ] Live Weather with map station add
- [ ] Portrait and landscape layout
- [ ] Recording export (WebM; WAV when supported)
- [ ] Chrome / Edge / Firefox desktop
- [ ] Offline: app shell loads from service worker

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `WEB_DIST` | `web/dist` | Built PWA static files |

## Limitations

- Browser audio is a Web Audio port of the cinematic engine (not bit-identical to desktop).
- Recording exports WebM by default; Safari may not support WAV via MediaRecorder.
- Microphone requires HTTPS or localhost on iOS.
