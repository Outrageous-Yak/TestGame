import type { CompositionPlan } from "../types";
import type { OrchestrationTargets } from "../music/orchestration";

export class WebSynthEngine {
  private ctx: AudioContext | null = null;
  private worklet: AudioWorkletNode | null = null;
  private streamDest: MediaStreamAudioDestinationNode | null = null;
  peak = 0;

  async init(): Promise<void> {
    if (this.ctx) return;
    this.ctx = new AudioContext({ sampleRate: 44100, latencyHint: "interactive" });
    const base = import.meta.env.BASE_URL;
    await this.ctx.audioWorklet.addModule(`${base}synth-worklet.js`);
    this.worklet = new AudioWorkletNode(this.ctx, "synth-processor", {
      numberOfOutputs: 1,
      outputChannelCount: [2],
    });
    this.worklet.port.onmessage = (e) => {
      if (e.data.type === "peak") this.peak = e.data.peak;
    };
    this.streamDest = this.ctx.createMediaStreamDestination();
    this.worklet.connect(this.ctx.destination);
    this.worklet.connect(this.streamDest);
  }

  getContext(): AudioContext | null {
    return this.ctx;
  }

  getRecordStream(): MediaStream | null {
    return this.streamDest?.stream ?? null;
  }

  async start(): Promise<void> {
    await this.init();
    if (this.ctx?.state === "suspended") await this.ctx.resume();
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
    for (const ev of tick.plan.rhythm_events ?? []) {
      this.worklet.port.postMessage({ type: "perc", velocity: ev.strength });
    }
  }

  applySoundTweaks(master: number, reverb: number, width: number, warmth: number): void {
    if (!this.worklet) return;
    this.worklet.port.postMessage({ type: "sound", master, reverb, width, warmth });
  }
}
