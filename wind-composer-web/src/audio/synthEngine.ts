import type { CompositionPlan } from "../types";
import type { OrchestrationTargets } from "../music/orchestration";
import { getStyle } from "../music/styleEngine";

export interface AudioDiagnostics {
  contextState: string;
  sampleRate: number;
  workletStatus: string;
  workletUrl: string;
  synthStatus: string;
  masterGain: number;
  scheduledEvents: number;
  outputRms: number;
  lastError: string | null;
  bypassEffects: boolean;
  peak: number;
}

export function resolveWorkletUrl(): string {
  const base = import.meta.env.BASE_URL;
  const path = base.endsWith("/") ? `${base}synth-worklet.js` : `${base}/synth-worklet.js`;
  return new URL(path, window.location.origin).href;
}

export class WebSynthEngine {
  private ctx: AudioContext | null = null;
  private worklet: AudioWorkletNode | null = null;
  private masterGain: GainNode | null = null;
  private outputAnalyser: AnalyserNode | null = null;
  private streamDest: MediaStreamAudioDestinationNode | null = null;
  private stateListener: ((state: string) => void) | null = null;
  private workletStatus = "not loaded";
  private workletUrl = resolveWorkletUrl();
  private lastError: string | null = null;
  private scheduledEvents = 0;
  private bypassEffects = false;
  peak = 0;

  setStateListener(fn: (state: string) => void): void {
    this.stateListener = fn;
    if (this.ctx) fn(this.ctx.state);
  }

  /** Call synchronously inside a user tap handler (required on iOS Safari). */
  ensureContextSync(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext({ latencyHint: "interactive" });
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1;
      this.outputAnalyser = this.ctx.createAnalyser();
      this.outputAnalyser.fftSize = 256;
      this.masterGain.connect(this.outputAnalyser);
      this.outputAnalyser.connect(this.ctx.destination);
      this.streamDest = this.ctx.createMediaStreamDestination();
      this.ctx.onstatechange = () => {
        if (this.stateListener && this.ctx) this.stateListener(this.ctx.state);
      };
    }
    return this.ctx;
  }

  getContext(): AudioContext | null {
    return this.ctx;
  }

  getRecordStream(): MediaStream | null {
    return this.streamDest?.stream ?? null;
  }

  getDiagnostics(): AudioDiagnostics {
    return {
      contextState: this.ctx?.state ?? "none",
      sampleRate: this.ctx?.sampleRate ?? 0,
      workletStatus: this.workletStatus,
      workletUrl: this.workletUrl,
      synthStatus: this.worklet ? "connected" : "disconnected",
      masterGain: this.masterGain?.gain.value ?? 0,
      scheduledEvents: this.scheduledEvents,
      outputRms: this.getOutputRms(),
      lastError: this.lastError,
      bypassEffects: this.bypassEffects,
      peak: this.peak,
    };
  }

  getOutputRms(): number {
    if (!this.outputAnalyser) return 0;
    const buf = new Float32Array(this.outputAnalyser.fftSize);
    this.outputAnalyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    return Math.sqrt(sum / buf.length);
  }

  async resumeContext(): Promise<string> {
    const ctx = this.ensureContextSync();
    if (ctx.state === "suspended") await ctx.resume();
    return ctx.state;
  }

  async loadWorklet(): Promise<void> {
    if (this.worklet) {
      this.workletStatus = "loaded";
      return;
    }
    const ctx = this.ensureContextSync();
    this.workletUrl = resolveWorkletUrl();
    try {
      await ctx.audioWorklet.addModule(this.workletUrl);
      this.worklet = new AudioWorkletNode(ctx, "synth-processor", {
        numberOfOutputs: 1,
        outputChannelCount: [2],
      });
      this.worklet.port.onmessage = (e) => {
        const d = e.data;
        if (d.type === "peak") this.peak = d.peak;
        if (d.type === "first_note") this.scheduledEvents = Math.max(1, this.scheduledEvents);
        if (d.type === "worklet_ready") this.workletStatus = "loaded";
      };
      this.worklet.connect(this.masterGain!);
      if (this.streamDest) this.worklet.connect(this.streamDest);
      this.workletStatus = "loaded";
      this.lastError = null;
    } catch (err) {
      this.workletStatus = `failed: ${String(err)}`;
      this.lastError = String(err);
      throw err;
    }
  }

  async start(): Promise<void> {
    await this.resumeContext();
    await this.loadWorklet();
    if (this.masterGain) this.masterGain.gain.value = 1;
    this.setBypassEffects(this.bypassEffects);
  }

  async playTestTone(): Promise<string> {
    try {
      const ctx = this.ensureContextSync();
      const state = await this.resumeContext();
      if (state !== "running") return `AudioContext is suspended (${state})`;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      g.gain.value = 0.12;
      osc.type = "sine";
      osc.frequency.value = 440;
      osc.connect(g);
      g.connect(ctx.destination);
      const t = ctx.currentTime;
      osc.start(t);
      osc.stop(t + 1);
      return "Test sound played";
    } catch (err) {
      this.lastError = String(err);
      return `Audio output failed: ${err}`;
    }
  }

  setBypassEffects(enabled: boolean): void {
    this.bypassEffects = enabled;
    if (this.worklet) {
      this.worklet.port.postMessage({ type: "bypass", enabled });
    }
  }

  scheduleStartupChord(): void {
    if (!this.worklet) return;
    this.worklet.port.postMessage({
      type: "orchestration",
      layerGains: { main_pad: 0.75 },
      reverbWet: 0.15,
      delayWet: 0,
      width: 0.1,
      stereoPan: 0,
      warmth: 0.5,
    });
    this.worklet.port.postMessage({
      type: "sound",
      master: 0.85,
      reverb: 0.15,
      width: 0.1,
      warmth: 0.5,
    });
    const midis = [48, 51, 55];
    for (const midi of midis) {
      this.worklet.port.postMessage({
        type: "note",
        layer: "main_pad",
        midi,
        velocity: 0.75,
        preset: "startup",
      });
      this.scheduledEvents += 1;
    }
  }

  releaseAll(): void {
    if (this.worklet) this.worklet.port.postMessage({ type: "release_all" });
  }

  applyTick(tick: {
    plan: CompositionPlan;
    orchestration: OrchestrationTargets;
    sound_tweaks: { reverb: number; width: number; brightness: number; warmth: number; master: number };
  }): void {
    if (!this.worklet) return;
    const orch = tick.orchestration;
    this.worklet.port.postMessage({
      type: "orchestration",
      layerGains: orch.layer_gains,
      reverbWet: tick.sound_tweaks.reverb,
      delayWet: orch.delay_wet,
      width: tick.sound_tweaks.width,
      stereoPan: orch.stereo_pan,
      warmth: tick.sound_tweaks.warmth,
    });
    this.worklet.port.postMessage({
      type: "sound",
      master: tick.sound_tweaks.master,
      reverb: tick.sound_tweaks.reverb,
      width: tick.sound_tweaks.width,
      warmth: tick.sound_tweaks.warmth,
    });
    this.worklet.port.postMessage({
      type: "apply_plan",
      plan: tick.plan,
      orchestration: orch,
    });

    const style = getStyle(tick.plan.musical_style ?? "Ambient");
    const energy = tick.plan.energy_curve;
    const drumDensity = style.drumDensity * (0.65 + energy * 0.5);
    this.worklet.port.postMessage({
      type: "drum_seq",
      tempo_bpm: tick.plan.tempo_bpm,
      kickPattern: style.kickPattern,
      drumDensity: drumDensity,
      kickGain: 0.75 + style.bassLayers * 0.25,
      hatGain: 0.25 + drumDensity * 0.45,
      snareGain: 0.4 + drumDensity * 0.35,
      enabled: drumDensity > 0.08,
    });

    for (const ev of tick.plan.rhythm_events ?? []) {
      if (ev.layer === "kick" || ev.layer === "snare" || ev.layer === "hat") continue;
      if (ev.is_pulse && ev.strength > 0.65) {
        this.worklet.port.postMessage({ type: "drum_fill" });
      } else {
        this.worklet.port.postMessage({ type: "perc", velocity: ev.strength, layer: ev.layer });
      }
      this.scheduledEvents += 1;
    }
  }

  applySoundTweaks(master: number, reverb: number, width: number, warmth: number): void {
    if (!this.worklet) return;
    if (this.masterGain) this.masterGain.gain.value = 1;
    this.worklet.port.postMessage({ type: "sound", master, reverb, width, warmth });
  }
}
