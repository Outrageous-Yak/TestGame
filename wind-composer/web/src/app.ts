import "./styles/main.css";
import { ApiClient } from "./api/client";
import { WebSynthEngine } from "./audio/synthEngine";
import { WindAnalyzer } from "./audio/windAnalyzer";
import { AudioRecorder } from "./audio/recorder";
import { WorldMapView } from "./map/worldMap";
import type { LiveInfoDto, SettingsDto, StationDto } from "./types";

const MODES = ["Ambient", "Dream", "Electronic", "Forest", "Ocean"];
const SCALES = ["Major", "Minor", "Pentatonic", "Dorian", "Mixolydian", "Natural Minor"];
const KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const INPUTS = ["Microphone", "Live Weather", "Both"];
const QUALITIES = ["Low", "Standard", "High"];
const SOUNDSCAPES = [
  "Natural Ambient", "Deep Space", "Frozen World", "Cinematic Storm",
  "Dreaming Earth", "Minimal Air", "Dark Horizon", "Luminous Sky",
];

export class WindComposerApp {
  private api = new ApiClient();
  private synth = new WebSynthEngine();
  private analyzer = new WindAnalyzer();
  private recorder = new AudioRecorder();
  private map: WorldMapView | null = null;
  private micStream: MediaStream | null = null;
  private tickTimer: number | null = null;
  private vizTimer: number | null = null;
  private running = false;
  private sampleDelta = 4096;

  private el = {
    status: document.createElement("span"),
    peak: document.createElement("span"),
    info: document.createElement("div"),
    layers: document.createElement("div"),
    canvas: document.createElement("canvas"),
    stationList: document.createElement("div"),
    searchResults: document.createElement("div"),
    livePanel: document.createElement("div"),
    mapContainer: document.createElement("div"),
    micDenied: document.createElement("div"),
  };

  private controls = {
    mode: this.select(MODES),
    scale: this.select(SCALES),
    key: this.select(KEYS),
    input: this.select(INPUTS),
    quality: this.select(QUALITIES),
    soundscape: this.select(SOUNDSCAPES),
    volume: this.range(75),
    sensitivity: this.range(60),
    reverb: this.range(45),
    width: this.range(35),
    brightness: this.range(50),
    warmth: this.range(50),
    search: document.createElement("input"),
  };

  async mount(root: HTMLElement) {
    root.innerHTML = "";
    this.buildLayout(root);
    await this.api.createSession();
    const settings = await this.api.getSettings();
    this.applySettingsToControls(settings);
    this.registerServiceWorker();
    this.setupTabs();
  }

  private buildLayout(root: HTMLElement) {
    const header = this.h("header", "app-header");
    header.append(
      this.h("h1", "title", "Wind Composer"),
      this.el.status,
      this.el.peak,
    );
    root.append(header);

    const toolbar = this.h("div", "toolbar");
    const startBtn = this.btn("Start", () => this.onStart());
    const stopBtn = this.btn("Stop", () => this.onStop());
    const recBtn = this.btn("Record", () => this.onRecord());
    const saveBtn = this.btn("Save", () => this.onSave());
    toolbar.append(startBtn, stopBtn, recBtn, saveBtn);
    root.append(toolbar);

    const row = this.h("div", "control-row");
    row.append(
      this.labelWrap("Mode", this.controls.mode),
      this.labelWrap("Scale", this.controls.scale),
      this.labelWrap("Key", this.controls.key),
      this.labelWrap("Input", this.controls.input),
    );
    root.append(row);

    const row2 = this.h("div", "control-row");
    row2.append(
      this.labelWrap("Volume", this.controls.volume),
      this.labelWrap("Sensitivity", this.controls.sensitivity),
    );
    root.append(row2);

    const sound = this.h("section", "sound-panel");
    sound.append(this.h("h2", "", "Sound Engine"));
    sound.append(
      this.labelWrap("Quality", this.controls.quality),
      this.labelWrap("Soundscape", this.controls.soundscape),
      this.labelWrap("Reverb", this.controls.reverb),
      this.labelWrap("Width", this.controls.width),
      this.labelWrap("Bright", this.controls.brightness),
      this.labelWrap("Warmth", this.controls.warmth),
    );
    this.el.layers.className = "layers";
    sound.append(this.el.layers);
    root.append(sound);

    this.el.micDenied.className = "mic-denied hidden";
    this.el.micDenied.textContent = "Microphone access denied. Live Weather mode still works.";
    root.append(this.el.micDenied);

    const tabs = this.h("nav", "tabs");
    const tabBtns = ["Compose", "Weather", "Map"].map((t) => {
      const b = this.btn(t, () => this.showTab(t));
      b.className = "tab-btn";
      b.dataset.tab = t;
      tabs.append(b);
      return b;
    });
    root.append(tabs);

    const compose = this.h("section", "tab-panel");
    compose.dataset.tab = "Compose";
    this.el.canvas.width = 600;
    this.el.canvas.height = 120;
    this.el.canvas.className = "viz-canvas";
    compose.append(this.el.canvas, this.el.info);
    root.append(compose);

    const weather = this.h("section", "tab-panel hidden");
    weather.dataset.tab = "Weather";
    this.controls.search.placeholder = "Search location…";
    this.controls.search.className = "search-input";
    const searchBtn = this.btn("Search", () => this.onSearch());
    weather.append(this.controls.search, searchBtn, this.el.searchResults, this.el.livePanel, this.el.stationList);
    root.append(weather);

    const mapTab = this.h("section", "tab-panel hidden");
    mapTab.dataset.tab = "Map";
    this.el.mapContainer.className = "map-container";
    mapTab.append(this.el.mapContainer);
    root.append(mapTab);

    this.controls.mode.addEventListener("change", () => this.syncSettings());
    this.controls.scale.addEventListener("change", () => this.syncSettings());
    this.controls.key.addEventListener("change", () => this.syncSettings());
    this.controls.input.addEventListener("change", () => this.syncSettings());
    this.controls.quality.addEventListener("change", () => this.syncSettings());
    this.controls.soundscape.addEventListener("change", () => this.syncSettings());
    this.controls.volume.addEventListener("input", () => this.syncSettings());
    this.controls.sensitivity.addEventListener("input", () => {
      this.analyzer.setSensitivity(this.controls.sensitivity.valueAsNumber / 100);
      this.syncSettings();
    });
    ["reverb", "width", "brightness", "warmth"].forEach((k) => {
      const el = this.controls[k as keyof typeof this.controls] as HTMLInputElement;
      el.addEventListener("input", () => this.syncSoundTweaks());
    });
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

  private setupTabs() {
    this.showTab("Compose");
  }

  private async onStart() {
    try {
      await this.synth.start();
      const input = this.controls.input.value;
      if (input === "Microphone" || input === "Both") {
        try {
          this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          const ctx = this.synth.getContext()!;
          const src = ctx.createMediaStreamSource(this.micStream);
          this.analyzer.attach(src, ctx);
          this.el.micDenied.classList.add("hidden");
        } catch {
          this.el.micDenied.classList.remove("hidden");
        }
      }
      await this.api.start();
      this.running = true;
      this.el.status.textContent = "Playing";
      this.sampleDelta = 4096;
      this.tickTimer = window.setInterval(() => this.tickLoop(), 350);
      this.vizTimer = window.setInterval(() => this.drawViz(), 50);
      await this.refreshStations();
    } catch (e) {
      alert(String(e));
    }
  }

  private async onStop() {
    this.running = false;
    if (this.tickTimer) clearInterval(this.tickTimer);
    if (this.vizTimer) clearInterval(this.vizTimer);
    await this.api.stop();
    this.synth.stop();
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }
    if (this.recorder.isRecording()) this.recorder.stop();
    this.el.status.textContent = "Stopped";
  }

  private async tickLoop() {
    if (!this.running) return;
    const input = this.controls.input.value;
    let micEnergy = 0;
    let gust = false;
    let fft: number[] = [];
    if (input !== "Live Weather" && this.micStream) {
      const a = this.analyzer.analyze();
      micEnergy = a.energy;
      gust = a.gust;
      fft = a.fft;
    }
    const tick = await this.api.tick({
      mic_energy: micEnergy,
      gust,
      sample_delta: this.sampleDelta,
      fft,
    });
    this.synth.applyTick(tick);
    this.updateInfo(tick.live_info, tick.orchestration.active_layers);
    this.el.peak.textContent = `Peak ${this.synth.peak.toFixed(2)}`;
    this.el.peak.classList.toggle("peak-warn", this.synth.peak > 0.88);
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
      const v = a.fft[i] || 0;
      const bh = v * h * 0.9;
      ctx.fillStyle = "#6b9fd4";
      ctx.fillRect((i / bars) * w, h - bh, w / bars - 1, bh);
    }
  }

  private updateInfo(info: LiveInfoDto, layers: string[]) {
    this.el.info.textContent = `Chord: ${info.chord} | State: ${info.composition_state} | Mood: ${info.mood} | ${info.tempo_bpm.toFixed(0)} BPM`;
    this.el.layers.textContent = `Layers: ${layers.join(", ") || "—"}`;
    this.el.livePanel.innerHTML = `
      <p><strong>${info.location_label}</strong> — ${info.condition}</p>
      <p>Wind ${info.wind_speed_kmh.toFixed(0)} km/h · ${info.temperature_c.toFixed(0)}°C</p>
    `;
  }

  private async syncSettings() {
    await this.api.updateSettings({
      mode: this.controls.mode.value,
      scale: this.controls.scale.value,
      key: this.controls.key.value,
      input_source: this.controls.input.value,
      master_volume: this.controls.volume.valueAsNumber / 100,
      sensitivity: this.controls.sensitivity.valueAsNumber / 100,
      audio_quality: this.controls.quality.value,
      soundscape_preset: this.controls.soundscape.value,
      reverb_amount: this.controls.reverb.valueAsNumber / 100,
      width_amount: this.controls.width.valueAsNumber / 100,
      brightness_amount: this.controls.brightness.valueAsNumber / 100,
      warmth_amount: this.controls.warmth.valueAsNumber / 100,
    });
    this.syncSoundTweaks();
  }

  private syncSoundTweaks() {
    this.synth.applySoundTweaks(
      this.controls.volume.valueAsNumber / 100,
      this.controls.reverb.valueAsNumber / 100,
      this.controls.width.valueAsNumber / 100,
      this.controls.warmth.valueAsNumber / 100,
    );
  }

  private applySettingsToControls(s: SettingsDto) {
    this.controls.mode.value = s.mode;
    this.controls.scale.value = s.scale;
    this.controls.key.value = s.key;
    this.controls.input.value = s.input_source;
    this.controls.volume.value = String(s.master_volume * 100);
    this.controls.sensitivity.value = String(s.sensitivity * 100);
    this.analyzer.setSensitivity(s.sensitivity);
    this.controls.quality.value = s.audio_quality;
    this.controls.soundscape.value = s.soundscape_preset;
    this.controls.reverb.value = String(s.reverb_amount * 100);
    this.controls.width.value = String(s.width_amount * 100);
    this.controls.brightness.value = String(s.brightness_amount * 100);
    this.controls.warmth.value = String(s.warmth_amount * 100);
  }

  private async onSearch() {
    const q = this.controls.search.value.trim();
    if (!q) return;
    const results = await this.api.searchLocations(q);
    this.el.searchResults.innerHTML = "";
    for (const loc of results) {
      const b = this.btn(`${loc.name}, ${loc.country}`, () => {
        this.api.addStation(loc).then(() => this.refreshStations());
      });
      b.className = "result-btn";
      this.el.searchResults.append(b);
    }
  }

  private async refreshStations() {
    const stations = await this.api.listStations();
    this.el.stationList.innerHTML = "<h3>Stations</h3>";
    const markers: { lat: number; lon: number; label: string }[] = [];
    for (const s of stations) {
      const row = this.h("div", "station-row");
      const mix = document.createElement("input");
      mix.type = "range";
      mix.min = "0";
      mix.max = "100";
      mix.value = String(s.mix * 100);
      mix.addEventListener("change", () => this.api.updateMix(s.id, mix.valueAsNumber / 100));
      const rm = this.btn("✕", () => this.api.removeStation(s.id).then(() => this.refreshStations()));
      row.append(document.createTextNode(s.display_name), mix, rm);
      this.el.stationList.append(row);
      markers.push({ lat: s.location.latitude, lon: s.location.longitude, label: s.display_name });
    }
    this.map?.setStations(markers);
  }

  private async onMapClick(lat: number, lon: number) {
    await this.api.mapClick(lat, lon);
    await this.refreshStations();
  }

  private onRecord() {
    const stream = this.synth.getRecordStream();
    if (!stream || !this.running) {
      alert("Start playback first.");
      return;
    }
    if (this.recorder.isRecording()) {
      this.recorder.stop();
    } else {
      this.recorder.start(stream);
    }
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

  private registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
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
