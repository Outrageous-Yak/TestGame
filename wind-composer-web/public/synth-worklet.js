/* Wind Composer — polyphonic AudioWorklet synth */

const MAX_VOICES = 24;
const TAU = Math.PI * 2;

function wrapIndex(i, len) {
  return ((i % len) + len) % len;
}

class Voice {
  constructor() {
    this.active = false;
    this.layer = "";
    this.midi = 0;
    this.freq = 220;
    this.vel = 0;
    this.phase1 = 0;
    this.phase2 = 0;
    this.env = 0;
    this.stage = "idle";
    this.a = 0.02;
    this.d = 0.15;
    this.s = 0.6;
    this.r = 0.4;
    this.relStart = 0;
    this.filter = 0;
    this.cutoff = 2000;
    this.age = 0;
  }

  midiToFreq(m) {
    return 440 * Math.pow(2, (m - 69) / 12);
  }

  start(midi, vel, atk, dec, sus, rel) {
    this.active = true;
    this.midi = midi;
    this.freq = this.midiToFreq(midi);
    this.vel = vel;
    this.a = atk;
    this.d = dec;
    this.s = sus;
    this.r = rel;
    this.stage = "attack";
    this.age = 0;
    this.env = 0;
    this.filter = 0;
  }

  release() {
    if (this.stage !== "idle") {
      this.stage = "release";
      this.relStart = this.env;
    }
  }

  process(sr) {
    if (!this.active) return 0;
    const atkS = Math.max(1, this.a * sr);
    const decS = Math.max(1, this.d * sr);
    const relS = Math.max(1, this.r * sr);
    if (this.stage === "attack") {
      this.env += 1 / atkS;
      if (this.env >= 1) {
        this.env = 1;
        this.stage = "decay";
      }
    } else if (this.stage === "decay") {
      this.env -= (1 - this.s) / decS;
      if (this.env <= this.s) {
        this.env = this.s;
        this.stage = "sustain";
      }
    } else if (this.stage === "release") {
      this.env -= this.relStart / relS;
      if (this.env <= 0) {
        this.env = 0;
        this.stage = "idle";
        this.active = false;
      }
    }
    const inc1 = TAU * this.freq / sr;
    const inc2 = TAU * (this.freq * 1.004) / sr;
    this.phase1 += inc1;
    this.phase2 += inc2;
    if (this.phase1 > TAU) this.phase1 -= TAU;
    if (this.phase2 > TAU) this.phase2 -= TAU;
    const s1 = Math.sin(this.phase1);
    const s2 = Math.sin(this.phase2);
    let raw = (s1 * 0.55 + s2 * 0.45) * this.env * this.vel;
    const alpha = Math.min(1, TAU * this.cutoff / sr);
    this.filter += alpha * (raw - this.filter);
    raw = this.filter;
    this.age++;
    return raw;
  }
}

class SynthProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.voices = Array.from({ length: MAX_VOICES }, () => new Voice());
    this.layerGains = { main_pad: 0.4 };
    this.master = 0.75;
    this.reverbWet = 0.45;
    this.width = 0.35;
    this.warmth = 0.5;
    this.stereoPan = 0;
    this.revL = new Float32Array(8192);
    this.revR = new Float32Array(8192);
    this.revPos = 0;
    this.dlyL = new Float32Array(44100);
    this.dlyR = new Float32Array(44100);
    this.dlyPos = 0;
    this.dlyLen = 22050;
    this.dlyFb = 0.32;
    this.dlyWet = 0.12;
    this.peak = 0;
    this.sustainLayer = {};
    this.bypassEffects = false;
    this.scheduledEvents = 0;
    this.firstOutputLogged = false;
    this.port.onmessage = (e) => this.onMsg(e.data);
    this.port.postMessage({ type: "worklet_ready" });
  }

  onMsg(msg) {
    if (msg.type === "orchestration") {
      this.layerGains = msg.layerGains || this.layerGains;
      this.reverbWet = msg.reverbWet ?? 0.45;
      this.dlyWet = msg.delayWet ?? 0.12;
      this.width = msg.width ?? 0.35;
      this.stereoPan = msg.stereoPan ?? 0;
      this.warmth = msg.warmth ?? 0.5;
    } else if (msg.type === "sound") {
      this.master = msg.master ?? 0.75;
      if (msg.reverb != null) this.reverbWet = msg.reverb;
      if (msg.width != null) this.width = msg.width;
      if (msg.warmth != null) this.warmth = msg.warmth;
    } else if (msg.type === "bypass") {
      this.bypassEffects = Boolean(msg.enabled);
    } else if (msg.type === "sustain") {
      this.sustainChord(msg.layer, msg.midis, msg.gain, msg.preset);
    } else if (msg.type === "note") {
      this.noteOn(msg.layer, msg.midi, msg.velocity, msg.preset);
      this.scheduledEvents += 1;
      if (this.scheduledEvents === 1) {
        this.port.postMessage({ type: "first_note", midi: msg.midi, layer: msg.layer });
      }
    } else if (msg.type === "perc") {
      this.triggerPerc(msg.velocity);
    } else if (msg.type === "release_layer") {
      this.releaseLayer(msg.layer);
    } else if (msg.type === "release_all") {
      for (const v of this.voices) v.release();
    } else if (msg.type === "apply_plan") {
      this.applyPlan(msg.plan, msg.orchestration);
    }
  }

  allocVoice() {
    for (const v of this.voices) {
      if (!v.active) return v;
    }
    let victim = this.voices[0];
    for (const v of this.voices) {
      if (v.stage === "release" || v.env < victim.env) victim = v;
    }
    return victim;
  }

  presetParams(name) {
    const startup = { attack: 0.05, decay: 0.3, sustain: 0.75, release: 4, cutoff: 1400 };
    const pads = { attack: 1.5, decay: 0.8, sustain: 0.7, release: 2.5, cutoff: 1200 };
    const bass = { attack: 0.1, decay: 0.2, sustain: 0.75, release: 0.5, cutoff: 500 };
    const lead = { attack: 0.05, decay: 0.2, sustain: 0.5, release: 0.6, cutoff: 2500 };
    const atmo = { attack: 2.5, decay: 1.5, sustain: 0.75, release: 4, cutoff: 800 };
    if (name === "startup") return startup;
    if (name && name.toLowerCase().includes("bass")) return bass;
    if (name && (name.includes("Bell") || name.includes("Pluck"))) return lead;
    if (name && (name.includes("Haze") || name.includes("Mist") || name.includes("Storm"))) return atmo;
    return pads;
  }

  noteOn(layer, midi, vel, preset) {
    const p = this.presetParams(preset);
    const v = this.allocVoice();
    v.layer = layer || "main_pad";
    v.cutoff = p.cutoff;
    v.start(midi, vel * 0.55, p.attack, p.decay, p.sustain, p.release);
  }

  sustainChord(layer, midis, gain, preset) {
    if (!midis || !midis.length) return;
    const root = midis[0];
    if (this.sustainLayer[layer] !== root) {
      this.releaseLayer(layer);
      this.sustainLayer[layer] = root;
    }
    for (const midi of midis) {
      this.noteOn(layer, midi, gain, preset);
    }
  }

  releaseLayer(layer) {
    for (const v of this.voices) {
      if (v.layer === layer) v.release();
    }
    delete this.sustainLayer[layer];
  }

  triggerPerc(vel) {
    const v = this.allocVoice();
    v.layer = "percussion";
    v.cutoff = 900;
    v.start(36, vel * 0.35, 0.01, 0.08, 0, 0.15);
  }

  applyPlan(plan, orch) {
    if (!plan || !orch) return;
    const chord = plan.chord;
    if (chord && chord.tones) {
      const mainGain = orch.layer_gains?.main_pad ?? 0.4;
      const mainPreset = orch.layer_presets?.main_pad || "Warm Horizon";
      this.sustainChord("main_pad", chord.tones, mainGain, mainPreset);
      const sec = orch.layer_gains?.secondary_pad ?? 0;
      if (sec > 0.05) {
        this.sustainChord("secondary_pad", chord.tones, sec, orch.layer_presets?.secondary_pad || "Soft Aurora");
      }
      const bassLayer = (orch.layer_gains?.sub_bass ?? 0) > (orch.layer_gains?.soft_bass ?? 0) ? "sub_bass" : "soft_bass";
      const bg = orch.layer_gains?.[bassLayer] ?? 0;
      if (bg > 0.05) {
        this.sustainChord(bassLayer, [chord.tones[0] - 12], bg, orch.layer_presets?.[bassLayer] || "Sub Foundation");
      }
      const choir = orch.layer_gains?.choir ?? 0;
      if (choir > 0.05) {
        this.sustainChord("choir", chord.tones, choir, orch.layer_presets?.choir || "Distant Choir");
      }
    }
    const atmo = orch.layer_gains?.atmosphere ?? 0;
    if (atmo > 0.05) {
      this.sustainChord("atmosphere", [36], atmo, orch.layer_presets?.atmosphere || "Wind Haze");
    }
    const noise = orch.layer_gains?.noise_atmo ?? 0;
    if (noise > 0.05) {
      this.sustainChord("noise_atmo", [40], noise, orch.layer_presets?.noise_atmo || "Electrical Storm");
    }
    for (const n of plan.melody_notes || []) {
      const layer = (orch.layer_gains?.bell ?? 0) > (orch.layer_gains?.lead ?? 0) ? "bell" : "lead";
      this.noteOn(layer, n.midi, n.velocity, orch.layer_presets?.[layer] || "Soft Pulse");
    }
    if (plan.gust_accent && chord?.tones?.length) {
      this.noteOn("lead", chord.tones[chord.tones.length - 1], 0.75, "Glass Bell");
    }
    if (orch.trigger_impact === "lightning") {
      this.triggerPerc(0.85);
    } else if (orch.trigger_impact === "atmospheric_hit") {
      this.triggerPerc(0.6);
    }
    this.port.postMessage({ type: "plan_applied" });
  }

  softSat(x, drive) {
    const d = 1 + drive * 2;
    return Math.tanh(x * d) / Math.tanh(d);
  }

  process(inputs, outputs) {
    const out = outputs[0];
    const L = out[0];
    const R = out[1];
    const sr = sampleRate;
    let peak = 0;
    for (let i = 0; i < L.length; i++) {
      let mono = 0;
      for (const v of this.voices) {
        if (!v.active) continue;
        const lg = this.layerGains[v.layer] ?? 0.35;
        mono += v.process(sr) * lg;
      }
      const layerCount = Math.max(1, Object.keys(this.layerGains).length);
      const comp = 1 / Math.sqrt(layerCount * 0.7);
      mono *= comp * this.master;

      let l;
      let r;
      if (this.bypassEffects) {
        l = mono;
        r = mono;
      } else {
        mono = this.softSat(mono, 0.15 + this.warmth * 0.25);
        const pan = this.stereoPan;
        const w = this.width;
        l = mono * (0.5 - pan * 0.35) * (1 + w * 0.15);
        r = mono * (0.5 + pan * 0.35) * (1 + w * 0.15);
        const rvIdx = wrapIndex(this.revPos - 4000, this.revL.length);
        const rv = (this.revL[rvIdx] + this.revR[rvIdx]) * 0.5 * this.reverbWet;
        this.revL[this.revPos] = l + rv * 0.4;
        this.revR[this.revPos] = r + rv * 0.38;
        this.revPos = (this.revPos + 1) % this.revL.length;
        l += rv;
        r += rv;
        const dIdx = wrapIndex(this.dlyPos - this.dlyLen, this.dlyL.length);
        const dl = this.dlyL[dIdx];
        const dr = this.dlyR[dIdx];
        this.dlyL[this.dlyPos] = l + dl * this.dlyFb;
        this.dlyR[this.dlyPos] = r + dr * this.dlyFb * 0.92;
        this.dlyPos = (this.dlyPos + 1) % this.dlyL.length;
        l = l * 0.88 + dl * this.dlyWet;
        r = r * 0.88 + dr * this.dlyWet;
      }

      peak = Math.max(peak, Math.abs(l), Math.abs(r));
      const ceiling = 0.92;
      if (peak > ceiling) {
        const g = ceiling / peak;
        l *= g;
        r *= g;
      }
      if (!Number.isFinite(l)) l = 0;
      if (!Number.isFinite(r)) r = 0;
      L[i] = l;
      R[i] = r;
      if (!this.firstOutputLogged && (Math.abs(l) > 0.001 || Math.abs(r) > 0.001)) {
        this.firstOutputLogged = true;
        this.port.postMessage({ type: "first_output", level: peak });
      }
    }
    this.peak = peak;
    if (L.length > 0) {
      this.port.postMessage({ type: "peak", peak: this.peak });
    }
    return true;
  }
}

registerProcessor("synth-processor", SynthProcessor);
