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

const KICK_DEFAULT = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];

class DrumEngine {
  constructor() {
    this.bpm = 120;
    this.targetBpm = 120;
    this.kickPattern = KICK_DEFAULT.slice();
    this.hatPattern = [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0];
    this.drumDensity = 0.5;
    this.kickGain = 0.9;
    this.hatGain = 0.42;
    this.snareGain = 0.55;
    this.clapGain = 0.4;
    this.swing = 0;
    this.enabled = true;
    this.sampleAcc = 0;
    this.step = 0;
    this.samplesPerStep = 0;
    this.kickEnv = 0;
    this.kickFreq = 160;
    this.kickPhase = 0;
    this.hatEnv = 0;
    this.hatNoise = 0;
    this.openHatEnv = 0;
    this.openHatNoise = 0;
    this.snareEnv = 0;
    this.snareNoise = 0;
    this.snareTonePhase = 0;
    this.clapEnv = 0;
    this.clapNoise = 0;
    this.crashEnv = 0;
    this.crashNoise = 0;
    this.tomEnv = 0;
    this.tomFreq = 120;
    this.tomPhase = 0;
    this.rideEnv = 0;
    this.rideNoise = 0;
    this.noiseEnv = 0;
    this.noiseVal = 0;
    this.fxEnv = 0;
    this.fxType = "";
    this.pendingFill = 0;
    this.bassPattern = [];
    this.bassGain = 0.45;
    this.bassEnv = 0;
    this.bassPhase = 0;
    this.bassFreq = 110;
    this.skipChordBass = false;
    this.drumBusGain = 1.2;
  }

  setConfig(msg) {
    if (msg.tempo_bpm > 0) {
      this.targetBpm = msg.tempo_bpm;
      this.bpm = msg.tempo_bpm;
    }
    if (msg.kickPattern && msg.kickPattern.length) this.kickPattern = msg.kickPattern;
    if (msg.hatPattern && msg.hatPattern.length) this.hatPattern = msg.hatPattern;
    if (msg.drumDensity != null) this.drumDensity = msg.drumDensity;
    if (msg.kickGain != null) this.kickGain = msg.kickGain;
    if (msg.hatGain != null) this.hatGain = msg.hatGain;
    if (msg.snareGain != null) this.snareGain = msg.snareGain;
    if (msg.clapGain != null) this.clapGain = msg.clapGain;
    if (msg.swing != null) this.swing = msg.swing;
    if (msg.enabled != null) this.enabled = Boolean(msg.enabled);
    if (msg.bassPattern) this.bassPattern = msg.bassPattern;
    if (msg.bassGain != null) this.bassGain = msg.bassGain;
    if (msg.skipChordBass != null) this.skipChordBass = Boolean(msg.skipChordBass);
    if (msg.drumBusGain != null) this.drumBusGain = msg.drumBusGain;
    this._recalcStepLen();
  }

  _recalcStepLen() {
    this.samplesPerStep = (60 / Math.max(this.bpm, 40)) * sampleRate / 4;
    if (this.samplesPerStep < 1) this.samplesPerStep = 1;
  }

  triggerBass(midi) {
    this.bassFreq = 440 * Math.pow(2, (midi - 69) / 12);
    this.bassEnv = 1;
    this.bassPhase = 0;
  }

  triggerKick() {
    this.kickEnv = 1;
    this.kickFreq = 210;
    this.kickPhase = 0;
  }

  triggerHat(vel) {
    this.hatEnv = vel;
    this.hatNoise = Math.random() * 2 - 1;
  }

  triggerOpenHat(vel) {
    this.openHatEnv = vel;
    this.openHatNoise = Math.random() * 2 - 1;
  }

  triggerSnare(vel) {
    this.snareEnv = vel;
    this.snareNoise = Math.random() * 2 - 1;
    this.snareTonePhase = 0;
  }

  triggerClap(vel) {
    this.clapEnv = vel;
    this.clapNoise = Math.random() * 2 - 1;
  }

  triggerCrash(vel) {
    this.crashEnv = vel;
    this.crashNoise = Math.random() * 2 - 1;
  }

  triggerTom(vel) {
    this.tomEnv = vel;
    this.tomFreq = 95 + Math.random() * 40;
    this.tomPhase = 0;
  }

  triggerRide(vel) {
    this.rideEnv = vel;
    this.rideNoise = Math.random() * 2 - 1;
  }

  triggerNoise(vel) {
    this.noiseEnv = vel;
    this.noiseVal = Math.random() * 2 - 1;
  }

  triggerFill() {
    this.pendingFill = 5;
  }

  triggerFx(fx) {
    this.fxType = fx;
    this.fxEnv = 1;
    if (fx === "noise_riser") this.noiseEnv = 0.65;
    if (fx === "reverse_crash") this.crashEnv = 0.7;
    if (fx === "impact" || fx === "sub_drop") this.kickEnv = 1;
  }

  triggerLayer(layer, vel) {
    const v = vel ?? 0.5;
    if (layer === "kick") this.triggerKick();
    else if (layer === "snare") this.triggerSnare(v);
    else if (layer === "hat") this.triggerHat(v);
    else if (layer === "open_hat") this.triggerOpenHat(v);
    else if (layer === "clap") this.triggerClap(v);
    else if (layer === "crash") this.triggerCrash(v);
    else if (layer === "tom") this.triggerTom(v);
    else if (layer === "ride") this.triggerRide(v);
    else if (layer === "noise" || layer === "percussion") this.triggerNoise(v);
    else this.triggerSnare(v * 0.7);
  }

  onStep() {
    const pat = this.kickPattern;
    const hatPat = this.hatPattern;
    const idx = this.step % 16;
    if (pat[idx]) this.triggerKick();
    if (hatPat[idx] && this.drumDensity > 0.1) {
      this.triggerHat(this.hatGain * (0.55 + this.drumDensity * 0.45));
    }
    if (this.drumDensity > 0.28 && (idx === 4 || idx === 12)) {
      this.triggerSnare(this.snareGain * (0.72 + this.drumDensity * 0.28));
    }
    if (this.pendingFill > 0) {
      this.triggerSnare(this.snareGain * 0.88);
      this.triggerHat(this.hatGain * 0.75);
      this.pendingFill -= 1;
    }
    if (this.bassPattern.length && idx % 4 === 0) {
      const bi = Math.floor(idx / 4) % this.bassPattern.length;
      const midi = this.bassPattern[bi];
      if (midi > 0) this.triggerBass(midi);
    }
    const swingDelay = this.swing > 0 && idx % 2 === 1 ? this.samplesPerStep * this.swing * 0.35 : 0;
    this.sampleAcc -= swingDelay;
    this.step = (this.step + 1) % 16;
  }

  processSample(sr) {
    if (!this.enabled) return { drum: 0, bass: 0 };
    this.sampleAcc += 1;
    while (this.sampleAcc >= this.samplesPerStep) {
      this.sampleAcc -= this.samplesPerStep;
      this.onStep();
    }
    let drum = 0;
    let bass = 0;
    if (this.kickEnv > 0) {
      this.kickPhase += TAU * this.kickFreq / sr;
      if (this.kickPhase > TAU) this.kickPhase -= TAU;
      drum += Math.sin(this.kickPhase) * this.kickEnv * this.kickGain * 1.12;
      this.kickFreq *= 0.9982;
      this.kickEnv -= 1 / (0.085 * sr);
      if (this.kickEnv < 0) this.kickEnv = 0;
    }
    if (this.hatEnv > 0) {
      this.hatNoise = this.hatNoise * 0.55 + (Math.random() * 2 - 1) * 0.45;
      drum += this.hatNoise * this.hatEnv * 0.32;
      this.hatEnv -= 1 / (0.032 * sr);
      if (this.hatEnv < 0) this.hatEnv = 0;
    }
    if (this.openHatEnv > 0) {
      this.openHatNoise = this.openHatNoise * 0.5 + (Math.random() * 2 - 1) * 0.5;
      drum += this.openHatNoise * this.openHatEnv * 0.28;
      this.openHatEnv -= 1 / (0.18 * sr);
      if (this.openHatEnv < 0) this.openHatEnv = 0;
    }
    if (this.snareEnv > 0) {
      this.snareTonePhase += TAU * 210 / sr;
      if (this.snareTonePhase > TAU) this.snareTonePhase -= TAU;
      this.snareNoise = this.snareNoise * 0.52 + (Math.random() * 2 - 1) * 0.48;
      drum += (this.snareNoise * 0.68 + Math.sin(this.snareTonePhase) * 0.32) * this.snareEnv * 0.52;
      this.snareEnv -= 1 / (0.13 * sr);
      if (this.snareEnv < 0) this.snareEnv = 0;
    }
    if (this.clapEnv > 0) {
      this.clapNoise = this.clapNoise * 0.4 + (Math.random() * 2 - 1) * 0.6;
      drum += this.clapNoise * this.clapEnv * this.clapGain * 0.45;
      this.clapEnv -= 1 / (0.09 * sr);
      if (this.clapEnv < 0) this.clapEnv = 0;
    }
    if (this.crashEnv > 0) {
      this.crashNoise = this.crashNoise * 0.45 + (Math.random() * 2 - 1) * 0.55;
      drum += this.crashNoise * this.crashEnv * 0.42;
      this.crashEnv -= 1 / (0.55 * sr);
      if (this.crashEnv < 0) this.crashEnv = 0;
    }
    if (this.tomEnv > 0) {
      this.tomPhase += TAU * this.tomFreq / sr;
      if (this.tomPhase > TAU) this.tomPhase -= TAU;
      drum += Math.sin(this.tomPhase) * this.tomEnv * 0.38;
      this.tomFreq *= 0.9985;
      this.tomEnv -= 1 / (0.16 * sr);
      if (this.tomEnv < 0) this.tomEnv = 0;
    }
    if (this.rideEnv > 0) {
      this.rideNoise = this.rideNoise * 0.7 + (Math.random() * 2 - 1) * 0.3;
      drum += this.rideNoise * this.rideEnv * 0.22;
      this.rideEnv -= 1 / (0.25 * sr);
      if (this.rideEnv < 0) this.rideEnv = 0;
    }
    if (this.noiseEnv > 0) {
      this.noiseVal = this.noiseVal * 0.5 + (Math.random() * 2 - 1) * 0.5;
      const riser = this.fxType === "noise_riser" ? (1 - this.fxEnv) * 0.3 : 0;
      drum += this.noiseVal * this.noiseEnv * (0.28 + riser);
      this.noiseEnv -= 1 / (0.2 * sr);
      if (this.noiseEnv < 0) this.noiseEnv = 0;
    }
    if (this.fxEnv > 0) {
      this.fxEnv -= 1 / (2.5 * sr);
      if (this.fxEnv < 0) this.fxEnv = 0;
    }
    if (this.bassEnv > 0) {
      this.bassPhase += TAU * this.bassFreq / sr;
      if (this.bassPhase > TAU) this.bassPhase -= TAU;
      bass += Math.sin(this.bassPhase) * this.bassEnv * this.bassGain * 0.55;
      this.bassEnv -= 1 / (0.22 * sr);
      if (this.bassEnv < 0) this.bassEnv = 0;
    }
    drum = Math.tanh(drum * 1.35) * this.drumBusGain;
    return { drum, bass };
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
    this.drums = new DrumEngine();
    this.drums.setConfig({ tempo_bpm: 120, kickPattern: KICK_DEFAULT, drumDensity: 0.5 });
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
      this.drums.triggerLayer(msg.layer, msg.velocity);
    } else if (msg.type === "drum_seq") {
      this.drums.setConfig(msg);
    } else if (msg.type === "drum_fill") {
      this.drums.triggerFill();
    } else if (msg.type === "transition_fx") {
      this.drums.triggerFx(msg.fx);
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
      if (bg > 0.05 && !this.drums.skipChordBass) {
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
      let padMono = 0;
      let bassMono = 0;
      let leadL = 0;
      let leadR = 0;
      for (const v of this.voices) {
        if (!v.active) continue;
        const lg = this.layerGains[v.layer] ?? 0.35;
        const sample = v.process(sr) * lg;
        if (v.layer === "soft_bass" || v.layer === "sub_bass") bassMono += sample;
        else if (v.layer === "lead" || v.layer === "bell") {
          leadL += sample * 0.78;
          leadR += sample * 0.78;
        } else padMono += sample;
      }
      const layerCount = Math.max(1, Object.keys(this.layerGains).length);
      const comp = 1 / Math.sqrt(layerCount * 0.7);
      padMono *= comp * this.master;
      bassMono *= comp * this.master * 0.92;
      leadL *= comp * this.master;
      leadR *= comp * this.master;

      const drumOut = this.drums.processSample(sr);
      const drum = drumOut.drum;
      const seqBass = drumOut.bass;
      let padsL;
      let padsR;
      if (this.bypassEffects) {
        padsL = padMono + bassMono;
        padsR = padMono + bassMono;
      } else {
        let wet = this.softSat(padMono, 0.15 + this.warmth * 0.25);
        const pan = this.stereoPan;
        const w = this.width;
        padsL = wet * (0.5 - pan * 0.35) * (1 + w * 0.18);
        padsR = wet * (0.5 + pan * 0.35) * (1 + w * 0.18);
        const rvIdx = wrapIndex(this.revPos - 4000, this.revL.length);
        const rv = (this.revL[rvIdx] + this.revR[rvIdx]) * 0.5 * this.reverbWet;
        this.revL[this.revPos] = padsL + rv * 0.4;
        this.revR[this.revPos] = padsR + rv * 0.38;
        this.revPos = (this.revPos + 1) % this.revL.length;
        padsL += rv;
        padsR += rv;
        const dIdx = wrapIndex(this.dlyPos - this.dlyLen, this.dlyL.length);
        const dl = this.dlyL[dIdx];
        const dr = this.dlyR[dIdx];
        this.dlyL[this.dlyPos] = padsL + dl * this.dlyFb;
        this.dlyR[this.dlyPos] = padsR + dr * this.dlyFb * 0.92;
        this.dlyPos = (this.dlyPos + 1) % this.dlyL.length;
        padsL = padsL * 0.88 + dl * this.dlyWet;
        padsR = padsR * 0.88 + dr * this.dlyWet;
      }

      const lw = this.width * 0.35 + 0.15;
      let l = padsL + bassMono + seqBass + drum + leadL * (1 + lw);
      let r = padsR + bassMono + seqBass + drum + leadR * (1 + lw);

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
