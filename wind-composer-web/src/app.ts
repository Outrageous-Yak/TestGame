import "./styles/main.css";
import { WebSynthEngine } from "./audio/synthEngine";
import { WindAnalyzer } from "./audio/windAnalyzer";
import { AudioRecorder } from "./audio/recorder";
import { WorldMapView } from "./map/worldMap";
import {
  AUDIO_QUALITY_LEVELS, KEYS, MODE_PROFILES, MUSICAL_STYLES, SOUNDSCAPE_PRESETS,
} from "./config";
import { MusicSession } from "./music/musicSession";
import {
  loadFavourites, loadSettings, saveFavourites, saveSettings, StationStore,
} from "./storage";
import type { AppSettings, GeoLocation } from "./types";
import { searchLocations } from "./weather/openMeteo";

const INPUTS = ["Microphone", "Live Weather", "Both"];
const MODES = Object.keys(MODE_PROFILES);
const SCALES_LIST = ["Major", "Minor", "Pentatonic", "Dorian", "Mixolydian", "Natural Minor"];

export class WindComposerApp {
  private synth = new WebSynthEngine();
  private analyzer = new WindAnalyzer();
  private recorder = new AudioRecorder();
  private stations = new StationStore();
  private session: MusicSession;
  private map: WorldMapView | null = null;
  private micStream: MediaStream | null = null;
  private tickTimer: number | null = null;
  private vizTimer: number | null = null;
  private weatherTimer: number | null = null;
  private countdownTimer: number | null = null;
  private running = false;
  private audioEnabled = false;
  private audioClockStart = 0;
  private playStartMs = 0;
  private diagTimer: number | null = null;

  private el = {
    status: document.createElement("span"),
    peak: document.createElement("span"),
    info: document.createElement("div"),
    layers: document.createElement("div"),
    canvas: document.createElement("canvas"),
    stationList: document.createElement("div"),
    searchResults: document.createElement("div"),
    favouritesList: document.createElement("div"),
    livePanel: document.createElement("div"),
    liveStatus: document.createElement("div"),
    mapContainer: document.createElement("div"),
    micDenied: document.createElement("div"),
    enableAudioPanel: document.createElement("div"),
    audioState: document.createElement("div"),
    testSoundResult: document.createElement("div"),
    diagPanel: document.createElement("div"),
    silenceWarn: document.createElement("div"),
    volumeHelp: document.createElement("p"),
  };

  private controls = {
    mode: this.select(MODES),
    scale: this.select(SCALES_LIST),
    key: this.select([...KEYS]),
    input: this.select(INPUTS),
    quality: this.select([...AUDIO_QUALITY_LEVELS]),
    soundscape: this.select([...SOUNDSCAPE_PRESETS]),
    style: this.select([...MUSICAL_STYLES]),
    volume: this.range(75),
    sensitivity: this.range(60),
    reverb: this.range(45),
    width: this.range(35),
    brightness: this.range(50),
    warmth: this.range(50),
    danceEffects: document.createElement("input"),
    search: document.createElement("input"),
  };

  constructor() {
    const settings = loadSettings();
    this.session = new MusicSession(settings, this.stations);
  }

  mount(root: HTMLElement) {
    root.innerHTML = "";
    this.buildLayout(root);
    this.applySettingsToControls(loadSettings());
    this.registerServiceWorker();
    this.refreshFavouritesUI();
    this.showTab("Compose");
  }

  private buildLayout(root: HTMLElement) {
    const header = this.h("header", "app-header");
    header.append(this.h("h1", "title", "Wind Composer"), this.el.status, this.el.peak);
    root.append(header);

    this.el.enableAudioPanel.className = "enable-audio-panel";
    this.el.enableAudioPanel.innerHTML = "<p>Tap to enable audio and load the sound engine on your device.</p>";
    const enableBtn = this.btn("Enable Audio", () => this.onEnableAudio());
    enableBtn.className = "enable-audio-btn";
    const testBtn = this.btn("Test Sound", () => this.onTestSound());
    testBtn.className = "test-sound-btn";
    this.el.audioState.className = "audio-state";
    this.el.audioState.textContent = "Audio state: —";
    this.el.testSoundResult.className = "test-sound-result";
    this.el.volumeHelp.className = "volume-help";
    this.el.volumeHelp.textContent =
      "Turn up media volume and disconnect Bluetooth devices if sound is routed elsewhere.";
    this.el.enableAudioPanel.append(enableBtn, testBtn, this.el.audioState, this.el.testSoundResult, this.el.volumeHelp);
    root.append(this.el.enableAudioPanel);

    this.el.diagPanel.className = "diag-panel";
    this.el.silenceWarn.className = "silence-warn hidden";
    root.append(this.el.diagPanel, this.el.silenceWarn);

    const toolbar = this.h("div", "toolbar");
    toolbar.append(
      this.btn("Start", () => this.onStart()),
      this.btn("Stop", () => this.onStop()),
      this.btn("Record", () => this.onRecord()),
      this.btn("Save", () => this.onSave()),
    );
    root.append(toolbar);

    const row = this.h("div", "control-row");
    row.append(
      this.labelWrap("Mode", this.controls.mode),
      this.labelWrap("Scale", this.controls.scale),
      this.labelWrap("Key", this.controls.key),
      this.labelWrap("Input", this.controls.input),
    );
    root.append(row);

    const styleRow = this.h("section", "style-panel");
    styleRow.append(this.h("h2", "style-heading", "Musical Style"));
    const styleWrap = this.h("div", "control-row style-row");
    const styleLabel = this.labelWrap("Style", this.controls.style);
    styleLabel.classList.add("style-select-wrap");
    styleWrap.append(styleLabel);
    const danceLabel = this.h("label", "control-label dance-toggle");
    this.controls.danceEffects.type = "checkbox";
    this.controls.danceEffects.id = "dance-effects";
    this.controls.danceEffects.checked = true;
    danceLabel.append(this.controls.danceEffects, document.createTextNode(" Dance & drums (kick, snare, hats, fills)"));
    styleWrap.append(danceLabel);
    styleRow.append(styleWrap);
    root.append(styleRow);

    const row2 = this.h("div", "control-row");
    row2.append(
      this.labelWrap("Volume", this.controls.volume),
      this.labelWrap("Sensitivity", this.controls.sensitivity),
    );
    root.append(row2);

    const sound = this.h("section", "sound-panel");
    sound.append(this.h("h2", "", "Sound Engine"));
    const bypass = document.createElement("input");
    bypass.type = "checkbox";
    bypass.id = "bypass-effects";
    const bypassLabel = this.h("label", "control-label");
    bypassLabel.append(document.createTextNode("Bypass Effects (diag)"), bypass);
    bypass.addEventListener("change", () => {
      this.synth.setBypassEffects(bypass.checked);
      this.updateDiagnostics();
    });
    sound.append(
      this.labelWrap("Quality", this.controls.quality),
      this.labelWrap("Soundscape", this.controls.soundscape),
      this.labelWrap("Reverb", this.controls.reverb),
      this.labelWrap("Width", this.controls.width),
      this.labelWrap("Bright", this.controls.brightness),
      this.labelWrap("Warmth", this.controls.warmth),
      bypassLabel,
    );
    this.el.layers.className = "layers";
    sound.append(this.el.layers);
    root.append(sound);

    this.el.micDenied.className = "mic-denied hidden";
    this.el.micDenied.textContent = "Microphone access denied. Live Weather mode still works.";
    root.append(this.el.micDenied);

    const tabs = this.h("nav", "tabs");
    ["Compose", "Weather", "Map"].forEach((t) => {
      const b = this.btn(t, () => this.showTab(t));
      b.className = "tab-btn";
      b.dataset.tab = t;
      tabs.append(b);
    });
    root.append(tabs);

    const compose = this.h("section", "tab-panel");
    compose.dataset.tab = "Compose";
    this.el.canvas.width = 600;
    this.el.canvas.height = 120;
    this.el.canvas.className = "viz-canvas";
    compose.append(this.el.canvas, this.el.info, this.el.liveStatus);
    root.append(compose);

    const weather = this.h("section", "tab-panel hidden");
    weather.dataset.tab = "Weather";
    this.controls.search.placeholder = "Search location…";
    this.controls.search.className = "search-input";
    this.el.favouritesList.className = "favourites-panel";
    weather.append(
      this.controls.search,
      this.btn("Search", () => this.onSearch()),
      this.el.searchResults,
      this.el.favouritesList,
      this.el.livePanel,
      this.el.stationList,
    );
    root.append(weather);

    const mapTab = this.h("section", "tab-panel hidden");
    mapTab.dataset.tab = "Map";
    this.el.mapContainer.className = "map-container";
    mapTab.append(this.el.mapContainer);
    root.append(mapTab);

    for (const c of Object.values(this.controls)) {
      if (c instanceof HTMLSelectElement || c instanceof HTMLInputElement) {
        c.addEventListener("change", () => this.syncSettings());
        c.addEventListener("input", () => this.syncSettings());
      }
    }
    this.controls.danceEffects.addEventListener("change", () => this.syncSettings());
  }

  private async onEnableAudio() {
    try {
      this.synth.ensureContextSync();
      this.synth.setStateListener((s) => {
        this.el.audioState.textContent = `Audio state: ${s}`;
      });
      const state = await this.synth.resumeContext();
      this.el.audioState.textContent = `Audio state: ${state}`;
      if (state !== "running") {
        this.el.status.textContent = "Audio not running — tap Enable Audio again";
        return;
      }
      await this.synth.loadWorklet();
      this.audioEnabled = true;
      this.el.enableAudioPanel.classList.remove("hidden");
      this.el.status.textContent = "Audio ready — tap Test Sound or Start";
      this.startDiagTimer();
      this.updateDiagnostics();
    } catch (e) {
      this.el.status.textContent = `Audio init failed: ${e}`;
      this.el.testSoundResult.textContent = `Worklet failed: ${e}`;
    }
  }

  private async onTestSound() {
    this.synth.ensureContextSync();
    const result = await this.synth.playTestTone();
    this.el.testSoundResult.textContent = result;
    this.el.audioState.textContent = `Audio state: ${this.synth.getContext()?.state ?? "none"}`;
    this.updateDiagnostics();
  }

  private showTab(name: string) {
    document.querySelectorAll(".tab-panel").forEach((p) => {
      p.classList.toggle("hidden", (p as HTMLElement).dataset.tab !== name);
    });
    document.querySelectorAll(".tab-btn").forEach((b) => {
      b.classList.toggle("active", (b as HTMLElement).dataset.tab === name);
    });
    if (name === "Map" && !this.map) {
      this.map = new WorldMapView(this.el.mapContainer, (lat, lon) => this.onMapClick(lat, lon));
    }
    if (name === "Map") this.map?.invalidateSize();
  }

  private async onStart() {
    if (!this.audioEnabled) {
      alert("Tap Enable Audio first.");
      return;
    }
    const input = this.controls.input.value;
    try {
      this.synth.ensureContextSync();
      const state = await this.synth.resumeContext();
      if (state !== "running") {
        alert(`AudioContext is ${state}. Tap Enable Audio again.`);
        return;
      }
      await this.synth.start();
      if (this.synth.getDiagnostics().workletStatus.startsWith("failed")) {
        alert(`Worklet failed: ${this.synth.getDiagnostics().lastError}`);
        return;
      }
      if (input === "Microphone" || input === "Both") {
        try {
          this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          const ctx = this.synth.getContext()!;
          this.analyzer.attach(ctx.createMediaStreamSource(this.micStream), ctx);
          this.el.micDenied.classList.add("hidden");
        } catch {
          this.el.micDenied.classList.remove("hidden");
        }
      }
      this.syncSettings();
      this.synth.scheduleStartupChord();
      this.stations.refreshAll().then(() => {
        const stations = this.stations.list().filter((s) => s.enabled && s.weather);
        if (stations.length) {
          const dominant = stations.reduce((best, s) => (s.mix > best.mix ? s : best));
          if (dominant.weather) this.session.onStationWeatherUpdated(dominant.weather);
        }
        this.refreshStationUI();
      });
      this.session.resetPlayback();
      this.running = true;
      this.playStartMs = performance.now();
      const actx = this.synth.getContext();
      this.audioClockStart = actx?.currentTime ?? 0;
      this.el.silenceWarn.classList.add("hidden");
      this.el.status.textContent = "Playing";
      this.tickLoop();
      this.tickTimer = window.setInterval(() => this.tickLoop(), 50);
      this.vizTimer = window.setInterval(() => this.drawViz(), 50);
      this.weatherTimer = window.setInterval(
        () => this.refreshWeather(),
        this.session.settings.refresh_interval_sec * 1000,
      );
      this.countdownTimer = window.setInterval(() => this.updateLivePanel(), 1000);
      this.refreshStationUI();
      this.startDiagTimer();
    } catch (e) {
      this.el.status.textContent = `Start failed: ${e}`;
      alert(String(e));
    }
  }

  private async onStop() {
    this.running = false;
    if (this.tickTimer) clearInterval(this.tickTimer);
    if (this.vizTimer) clearInterval(this.vizTimer);
    if (this.weatherTimer) clearInterval(this.weatherTimer);
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    this.synth.releaseAll();
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }
    if (this.recorder.isRecording()) this.recorder.stop();
    this.el.silenceWarn.classList.add("hidden");
    this.el.status.textContent = "Stopped";
    this.updateDiagnostics();
  }

  private tickLoop() {
    if (!this.running) return;
    try {
      this.tickLoopBody();
    } catch (err) {
      console.error("tickLoop failed", err);
      this.el.status.textContent = `Error: ${err}`;
    }
  }

  private tickLoopBody() {
    const input = this.controls.input.value;
    let micEnergy = 0;
    let gust = false;
    if (input !== "Live Weather" && this.micStream) {
      const a = this.analyzer.analyze();
      micEnergy = a.energy;
      gust = a.gust;
    }
    const actx = this.synth.getContext();
    const sampleRate = actx?.sampleRate ?? 44100;
    const samplePosition = actx
      ? Math.max(0, Math.floor((actx.currentTime - this.audioClockStart) * sampleRate))
      : 0;
    const tick = this.session.tick(samplePosition, micEnergy, gust, sampleRate);
    this.synth.applyTick(tick);
    this.updateLivePanel(tick);
    this.el.peak.textContent = `Peak ${this.synth.peak.toFixed(2)} | RMS ${this.synth.getOutputRms().toFixed(4)}`;
    this.el.peak.classList.toggle("peak-warn", this.synth.peak > 0.88);
    if (this.running) {
      const rms = this.synth.getOutputRms();
      const elapsed = performance.now() - this.playStartMs;
      if (elapsed > 2000 && rms < 0.0005 && this.synth.peak < 0.01) {
        this.el.silenceWarn.textContent = "Audio engine is running but producing silence";
        this.el.silenceWarn.classList.remove("hidden");
      }
    }
    this.updateDiagnostics();
  }

  private async refreshWeather() {
    await this.stations.refreshAll();
    const stations = this.stations.list().filter((s) => s.enabled && s.weather);
    if (!stations.length) return;
    const dominant = stations.reduce((best, s) => (s.mix > best.mix ? s : best));
    if (dominant.weather) this.session.onStationWeatherUpdated(dominant.weather);
    this.refreshStationUI();
  }

  private updateLivePanel(tick?: { plan: import("./types").CompositionPlan }) {
    const live = this.session.getLiveStatus(tick?.plan);
    const sec = live.nextUpdateSec;
    const mm = String(Math.floor(sec / 60)).padStart(2, "0");
    const ss = String(sec % 60).padStart(2, "0");
    this.el.info.textContent =
      `${live.chord} · ${live.section} · ${live.style} · ${live.bpm.toFixed(0)} BPM · ${live.key}`;
    this.el.layers.textContent = `Layers: energy ${(live.energy * 100).toFixed(0)}% · phrase ${live.phrase}`;
    this.el.liveStatus.className = "live-status-panel";
    this.el.liveStatus.innerHTML = `
      <div class="live-grid">
        <div><span class="live-label">Style</span> ${live.style}</div>
        <div><span class="live-label">Section</span> ${live.section}</div>
        <div><span class="live-label">BPM</span> ${live.bpm.toFixed(0)}</div>
        <div><span class="live-label">Energy</span> ${(live.energy * 100).toFixed(0)}%</div>
        <div><span class="live-label">Wind</span> ${live.windKmh.toFixed(0)} km/h</div>
        <div><span class="live-label">Humidity</span> ${live.humidity.toFixed(0)}%</div>
        <div><span class="live-label">Pressure</span> ${live.pressure.toFixed(0)} hPa</div>
        <div><span class="live-label">Temp</span> ${live.temperature.toFixed(0)}°C</div>
        <div><span class="live-label">Trend</span> ${live.trend}</div>
        <div><span class="live-label">Storm</span> ${(live.stormChance * 100).toFixed(0)}%</div>
        <div><span class="live-label">Local Time</span> ${live.localTime}</div>
        <div><span class="live-label">Last Update</span> ${live.lastWeatherUpdate}</div>
        <div><span class="live-label">Next Update</span> ${mm}:${ss}</div>
        <div><span class="live-label">Fill Prob</span> ${(live.fillProbability * 100).toFixed(0)}%</div>
      </div>
      ${live.weatherNotice ? `<p class="weather-notice">${this.escapeHtml(live.weatherNotice).replace(/\n/g, "<br>")}</p>` : ""}
    `;
    const primary = this.stations.list().find((s) => s.enabled && s.weather);
    if (primary?.weather) {
      const w = primary.weather;
      this.el.livePanel.innerHTML = `
        <p><strong>${primary.display_name}</strong> — ${w.condition}</p>
        <p>Wind ${w.wind_speed_kmh.toFixed(0)} km/h · Cloud ${w.cloud_cover_pct.toFixed(0)}% · Rain ${w.precipitation_mm.toFixed(1)} mm</p>
      `;
    }
  }

  private drawViz() {
    const ctx = this.el.canvas.getContext("2d");
    if (!ctx) return;
    const w = this.el.canvas.width;
    const h = this.el.canvas.height;
    ctx.fillStyle = "#0d1520";
    ctx.fillRect(0, 0, w, h);
    const a = this.analyzer.analyze();
    const bars = a.fft.length || 64;
    for (let i = 0; i < bars; i++) {
      const bh = (a.fft[i] || 0) * h * 0.9;
      ctx.fillStyle = "#6b9fd4";
      ctx.fillRect((i / bars) * w, h - bh, w / bars - 1, bh);
    }
  }

  private syncSettings() {
    const s: AppSettings = {
      mode: this.controls.mode.value,
      scale: this.controls.scale.value,
      key: this.controls.key.value,
      master_volume: this.controls.volume.valueAsNumber / 100,
      sensitivity: this.controls.sensitivity.valueAsNumber / 100,
      input_source: this.controls.input.value,
      audio_quality: this.controls.quality.value,
      soundscape_preset: this.controls.soundscape.value,
      musical_style: this.controls.style.value,
      refresh_interval_sec: loadSettings().refresh_interval_sec,
      reverb_amount: this.controls.reverb.valueAsNumber / 100,
      width_amount: this.controls.width.valueAsNumber / 100,
      brightness_amount: this.controls.brightness.valueAsNumber / 100,
      warmth_amount: this.controls.warmth.valueAsNumber / 100,
      dance_effects_enabled: this.controls.danceEffects.checked,
    };
    saveSettings(s);
    this.session.updateSettings(s);
    this.session.setMusicalStyle(s.musical_style);
    this.analyzer.setSensitivity(s.sensitivity);
    this.synth.applySoundTweaks(s.master_volume, s.reverb_amount, s.width_amount, s.warmth_amount);
  }

  private applySettingsToControls(s: AppSettings) {
    this.controls.mode.value = s.mode;
    this.controls.scale.value = s.scale;
    this.controls.key.value = s.key;
    this.controls.input.value = s.input_source;
    this.controls.volume.value = String(s.master_volume * 100);
    this.controls.sensitivity.value = String(s.sensitivity * 100);
    this.analyzer.setSensitivity(s.sensitivity);
    this.controls.quality.value = s.audio_quality;
    this.controls.soundscape.value = s.soundscape_preset;
    this.controls.style.value = s.musical_style;
    this.controls.reverb.value = String(s.reverb_amount * 100);
    this.controls.width.value = String(s.width_amount * 100);
    this.controls.brightness.value = String(s.brightness_amount * 100);
    this.controls.warmth.value = String(s.warmth_amount * 100);
    this.controls.danceEffects.checked = s.dance_effects_enabled ?? true;
  }

  private async onSearch() {
    const q = this.controls.search.value.trim();
    if (!q) return;
    try {
      const results = await searchLocations(q);
      this.el.searchResults.innerHTML = "";
      for (const loc of results) {
        const row = this.h("div", "result-row");
        const b = this.btn(`${loc.name}, ${loc.country}`, () => {
          this.stations.add(loc);
          this.stations.refreshAll().then(() => this.refreshStationUI());
        });
        b.className = "result-btn";
        const fav = this.btn("♥", () => this.addFavourite(loc));
        fav.className = "fav-btn";
        fav.title = "Save favourite";
        row.append(b, fav);
        this.el.searchResults.append(row);
      }
    } catch (e) {
      alert(String(e));
    }
  }

  private refreshFavouritesUI() {
    this.el.favouritesList.innerHTML = "<h3>Favourites</h3>";
    for (const fav of loadFavourites()) {
      const row = this.h("div", "station-row");
      row.append(
        document.createTextNode(fav.label),
        this.btn("Load", () => {
          this.stations.add(fav.location);
          this.stations.refreshAll().then(() => this.refreshStationUI());
        }),
        this.btn("✕", () => {
          const next = loadFavourites().filter((f) => f.id !== fav.id);
          saveFavourites(next);
          this.refreshFavouritesUI();
        }),
      );
      this.el.favouritesList.append(row);
    }
  }

  private addFavourite(location: GeoLocation) {
    const defaultLabel = location.name + (location.country ? `, ${location.country}` : "");
    const label = window.prompt("Favourite name", defaultLabel);
    if (!label?.trim()) return;
    const favs = loadFavourites();
    favs.push({
      id: `fav-${Date.now()}`,
      label: label.trim(),
      location,
    });
    saveFavourites(favs);
    this.refreshFavouritesUI();
  }

  private refreshStationUI() {
    this.el.stationList.className = "station-list";
    this.el.stationList.innerHTML = "<h3>Stations</h3>";
    const markers: { lat: number; lon: number; label: string }[] = [];
    for (const s of this.stations.list()) {
      const row = this.h("div", "station-row");
      const mix = document.createElement("input");
      mix.type = "range";
      mix.min = "0";
      mix.max = "100";
      mix.value = String(s.mix * 100);
      mix.addEventListener("change", () => {
        this.stations.setMix(s.id, mix.valueAsNumber / 100);
      });
      row.append(
        document.createTextNode(s.display_name),
        mix,
        this.btn("♥", () => this.addFavourite(s.location)),
        this.btn("✕", () => {
          this.stations.remove(s.id);
          this.refreshStationUI();
        }),
      );
      this.el.stationList.append(row);
      markers.push({ lat: s.location.latitude, lon: s.location.longitude, label: s.display_name });
    }
    this.map?.setStations(markers);
  }

  private onMapClick(lat: number, lon: number) {
    searchLocations(`${lat}, ${lon}`).then((r) => {
      const loc = r[0] ?? {
        id: `map-${lat}`,
        name: `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`,
        country: "",
        latitude: lat,
        longitude: lon,
      };
      this.stations.add(loc);
      this.stations.refreshAll().then(() => this.refreshStationUI());
    });
  }

  private onRecord() {
    const stream = this.synth.getRecordStream();
    if (!stream || !this.running) {
      alert("Start playback first.");
      return;
    }
    if (this.recorder.isRecording()) this.recorder.stop();
    else this.recorder.start(stream);
  }

  private async onSave() {
    const blob = await this.recorder.exportBlob();
    if (!blob.size) {
      alert("No recording.");
      return;
    }
    const ext = blob.type.includes("webm") ? "webm" : "audio";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `wind-composer-${Date.now()}.${ext}`;
    a.click();
  }

  private startDiagTimer() {
    if (this.diagTimer) clearInterval(this.diagTimer);
    this.diagTimer = window.setInterval(() => this.updateDiagnostics(), 500);
    this.updateDiagnostics();
  }

  private updateDiagnostics() {
    const d = this.synth.getDiagnostics();
    this.el.diagPanel.textContent = [
      `AudioContext: ${d.contextState} @ ${d.sampleRate} Hz`,
      `Worklet: ${d.workletStatus}`,
      `Synth: ${d.synthStatus}`,
      `Master gain: ${d.masterGain.toFixed(2)}`,
      `Scheduled events: ${d.scheduledEvents}`,
      `Output level: ${d.outputRms.toFixed(4)}`,
      d.lastError ? `Last error: ${d.lastError}` : "",
    ].filter(Boolean).join("\n");
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  private registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      const base = import.meta.env.BASE_URL;
      navigator.serviceWorker.register(`${base}sw.js`).catch((e) => {
        console.warn("SW register failed", e);
      });
    }
  }

  private h(tag: string, className?: string, text?: string): HTMLElement {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text) el.textContent = text;
    return el;
  }

  private btn(label: string, onClick: () => void): HTMLButtonElement {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.addEventListener("click", onClick);
    return b;
  }

  private select(options: string[]): HTMLSelectElement {
    const s = document.createElement("select");
    for (const o of options) {
      const opt = document.createElement("option");
      opt.value = o;
      opt.textContent = o;
      s.append(opt);
    }
    return s;
  }

  private range(defaultVal: number): HTMLInputElement {
    const r = document.createElement("input");
    r.type = "range";
    r.min = "0";
    r.max = "100";
    r.value = String(defaultVal);
    return r;
  }

  private labelWrap(label: string, control: HTMLElement): HTMLElement {
    const w = this.h("label", "control-label");
    w.append(document.createTextNode(label), control);
    return w;
  }
}
