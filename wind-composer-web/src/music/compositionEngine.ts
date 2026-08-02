import { SAMPLE_RATE, type ModeName } from "../config";
import type { CompositionPlan, MusicDriveParams, WeatherSnapshot } from "../types";
import { clamp, ExponentialSmoother, pick, randBetween } from "../utils";
import { PHRASE_LENGTHS, PROGRESSIONS, STATE_PROFILE, type MusicalState } from "./constants";
import { ScaleEngine } from "./scaleEngine";
import { isStorm } from "../weather/openMeteo";

interface Personality {
  label: string;
  darkness: number;
  power: number;
  warmth: number;
  reflectivity: number;
  hope: number;
}

export interface CompositionContext {
  raw_energy: number;
  gust: boolean;
  tempo_min: number;
  tempo_max: number;
  sample_position: number;
  sample_rate: number;
  weather: WeatherSnapshot | null;
  drive: MusicDriveParams | null;
  stereo_pan: number;
  percussion: number;
}

export class CompositionEngine {
  scaleEngine: ScaleEngine;
  private energy = new ExponentialSmoother(0, 0.04);
  private state: MusicalState = "Gentle Motion";
  private progressionKey = "minor_modal";
  private progressionIdx = 0;
  private phraseNumber = 0;
  private phraseLengthBars = 8;
  private barsInPhrase = 0;
  private currentChord: CompositionPlan["chord"] = null;
  private pedalMidi: number | null = null;
  private lastMeasure = -1;
  private lastBeat = -1;
  private samplesPerBeat = 0;
  private melodyMidi: number | null = null;
  private lastMelodyTime = 0;
  private lastRareEvent = 0;
  private chordMemory: number[] = [];
  private melodyMemory: number[] = [];
  private rhythmEvents: CompositionPlan["rhythm_events"] = [];
  private gustAccent = false;
  private chordStyle = "triad";

  constructor(scaleEngine: ScaleEngine) {
    this.scaleEngine = scaleEngine;
  }

  reset(): void {
    this.energy.reset(0);
    this.state = "Gentle Motion";
    this.currentChord = null;
    this.melodyMidi = null;
  }

  tick(ctx: CompositionContext): CompositionPlan {
    const targetEnergy = this.computeTargetEnergy(ctx);
    const energy = this.energy.update(targetEnergy);
    const personality = this.analyzePersonality(ctx);

    const tempoMid = (ctx.tempo_min + ctx.tempo_max) / 2;
    const sr = ctx.sample_rate > 0 ? ctx.sample_rate : SAMPLE_RATE;
    this.samplesPerBeat = (60 / Math.max(tempoMid, 40)) * sr;
    const beat = this.samplesPerBeat > 0 ? Math.floor(ctx.sample_position / this.samplesPerBeat) : 0;
    const measure = Math.floor(beat / 4);

    if (beat !== this.lastBeat) {
      this.lastBeat = beat;
      this.onBeat(ctx, energy, beat);
    }
    if (measure !== this.lastMeasure) {
      this.lastMeasure = measure;
      this.barsInPhrase += 1;
      if (ctx.gust) this.gustAccent = true;
      if (this.barsInPhrase > 0 && this.barsInPhrase % pick([2, 3, 4]) === 0) {
        this.advanceChord(energy, false);
      }
      if (this.barsInPhrase >= this.phraseLengthBars) {
        this.onPhraseBoundary(ctx, energy, personality);
      }
    }

    if (!this.currentChord) {
      this.chooseChordStyle(personality);
      this.advanceChord(energy, true);
    }

    const profile = STATE_PROFILE[this.state];
    const tempo = clamp(
      tempoMid * profile.tempoF * (0.85 + energy * 0.3),
      ctx.tempo_min,
      ctx.tempo_max,
    );
    const melodyActivity = profile.melody * (0.5 + energy * 0.5) * personality.hope;
    const melodyNotes = this.maybeMelody(melodyActivity, ctx.gust || this.gustAccent, ctx);
    let reverb = profile.reverb;
    if (ctx.drive) reverb = clamp((reverb + ctx.drive.reverb_amount) / 2);
    if (personality.reflectivity > 0.4) reverb = clamp(reverb + 0.12);

    const rare = this.checkRareEvents(ctx, energy);
    const events = [...this.rhythmEvents];
    this.rhythmEvents = [];
    this.gustAccent = false;

    return {
      energy_curve: energy,
      mood: personality.label,
      musical_state: this.state,
      tempo_bpm: tempo,
      chord: this.currentChord,
      melody_notes: melodyNotes,
      rhythm_mode: profile.rhythm,
      rhythm_events: events,
      reverb_amount: reverb,
      stereo_pan: ctx.drive?.stereo_pan ?? ctx.stereo_pan,
      brightness: clamp(0.35 + personality.warmth * 0.3 + (1 - personality.darkness) * 0.2),
      gust_accent: ctx.gust,
      rare_event: rare,
      phrase_number: this.phraseNumber,
      phrase_length_bars: this.phraseLengthBars,
      percussion: ctx.drive?.percussion ?? ctx.percussion,
    };
  }

  private computeTargetEnergy(ctx: CompositionContext): number {
    let e = ctx.raw_energy;
    if (ctx.drive) e = (e + ctx.drive.energy) / 2;
    if (ctx.weather) {
      const w = ctx.weather;
      const windE = clamp(w.wind_speed_kmh / 55);
      e = e * 0.45 + windE * 0.35 + clamp(w.precipitation_mm / 10) * 0.1;
      if (isStorm(w)) e = clamp(e + 0.15);
    }
    return clamp(e);
  }

  private analyzePersonality(ctx: CompositionContext): Personality {
    const w = ctx.weather;
    if (!w) {
      const e = this.energy.value;
      return { label: e < 0.3 ? "Peaceful" : "Gentle Breeze", darkness: 0.2 + e * 0.3, power: e, warmth: 0.5, reflectivity: 0.3, hope: 0.4 };
    }
    const speed = w.wind_speed_kmh;
    const p: Personality = { label: "Calm", darkness: 0.3, power: 0.2, warmth: 0.5, reflectivity: 0.3, hope: 0.4 };
    if (isStorm(w) || speed > 50) {
      p.label = "Storm"; p.darkness = 0.85; p.power = 0.9; p.warmth = 0.35;
    } else if (speed > 25) {
      p.label = "Strong Wind"; p.darkness = 0.55; p.power = 0.7; p.warmth = 0.4;
    } else if (speed < 8) {
      if (w.snowfall_mm > 0) {
        p.label = "Snow"; p.darkness = 0.25; p.reflectivity = 0.7;
      } else if (w.precipitation_mm > 0.5) {
        p.label = "Light Rain"; p.reflectivity = 0.8;
      } else if (w.cloud_cover_pct < 30 && w.temperature_c > 15) {
        p.label = "Sunny Calm"; p.hope = 0.85; p.warmth = 0.7;
      } else {
        p.label = "Peaceful"; p.warmth = 0.65;
      }
    }
    p.power = clamp(speed / 60 + p.power * 0.3);
    return p;
  }

  private onPhraseBoundary(ctx: CompositionContext, energy: number, personality: Personality): void {
    this.phraseNumber += 1;
    this.barsInPhrase = 0;
    this.phraseLengthBars = pick(PHRASE_LENGTHS);
    this.transitionState(personality, energy);
    if (this.state === "Stillness" || this.state === "Night") this.progressionKey = "drone";
    else if (this.state === "Storm") this.progressionKey = "minor_modal";
    else if (personality.hope > 0.7) this.progressionKey = "major_hope";
    this.chooseChordStyle(personality);
    this.advanceChord(energy, true);
  }

  private transitionState(personality: Personality, energy: number): void {
    let candidates: MusicalState[] = [];
    if (personality.label.startsWith("Storm") || energy > 0.75) {
      candidates = ["Storm", "Power", "Building"];
    } else if (energy > 0.55) candidates = ["Building", "Power", "Flow"];
    else if (energy > 0.35) candidates = ["Flow", "Gentle Motion", "Building"];
    else if (energy > 0.15) candidates = ["Gentle Motion", "Flow", "Sunset"];
    else candidates = ["Stillness", "Night", "Recovery"];
    if (personality.hope > 0.7) candidates.push("Sunrise");
    for (const s of candidates) {
      if (s !== this.state || Math.random() < 0.35) {
        this.state = s;
        break;
      }
    }
  }

  private onBeat(_ctx: CompositionContext, _energy: number, _beat: number): void {
    // Drums are sequenced in the audio worklet — avoid legacy pulse events here.
    this.rhythmEvents = [];
  }

  private chooseChordStyle(personality: Personality): void {
    if (this.state === "Stillness" || this.state === "Night") this.chordStyle = "drone";
    else if (personality.label === "Light Rain") this.chordStyle = pick(["sus4", "sus2"]);
    else if (this.state === "Storm") this.chordStyle = "quartal";
    else this.chordStyle = pick(["triad", "sus4", "pedal", "quartal"]);
  }

  private advanceChord(energy: number, force: boolean): void {
    const progList = PROGRESSIONS[this.progressionKey] ?? PROGRESSIONS.minor_modal;
    const prog = progList[this.progressionIdx % progList.length];
    let degree = prog[this.progressionIdx % prog.length];
    if (this.chordMemory.filter((d) => d === degree).length >= 2 && !force) {
      this.progressionIdx += 1;
      degree = prog[this.progressionIdx % prog.length];
    }
    this.progressionIdx += 1;
    this.chordMemory.push(degree);
    if (this.chordMemory.length > 6) this.chordMemory.shift();

    const root = this.scaleEngine.degreeRoot(degree % 7);
    const tones = this.scaleEngine.chordTones(root, 4);
    const roman = ["i", "ii", "iii", "iv", "v", "vi", "vii"];
    this.currentChord = {
      name: `${this.scaleEngine.key} ${roman[degree % 7]}`,
      tones,
      root_midi: root,
      degree_index: degree,
    };
    this.melodyMidi = tones[Math.min(1, tones.length - 1)];
  }

  private maybeMelody(activity: number, gust: boolean, ctx: CompositionContext): CompositionPlan["melody_notes"] {
    const now = performance.now() / 1000;
    if (now - this.lastMelodyTime < 0.25) return [];
    if (Math.random() > activity * 0.25 + 0.04) return [];
    this.lastMelodyTime = now;
    const chordTones = this.currentChord?.tones ?? [];
    let midi = this.melodyMidi ?? this.scaleEngine.nearestScaleNote(60);
    if (chordTones.length && Math.random() < 0.45) {
      midi = pick(chordTones);
    } else {
      midi = this.scaleEngine.stepNote(midi, pick([-1, 1]), gust);
    }
    this.melodyMidi = midi;
    return [{ midi, velocity: clamp(0.25 + activity * 0.5 + (gust ? 0.2 : 0)), duration_sec: gust ? 0.4 : 0.9 }];
  }

  private checkRareEvents(ctx: CompositionContext, energy: number): string | null {
    const now = performance.now() / 1000;
    if (now - this.lastRareEvent < randBetween(45, 90)) return null;
    if (ctx.weather && isStorm(ctx.weather) && Math.random() < 0.08) {
      this.lastRareEvent = now;
      return "lightning";
    }
    if (energy > 0.7 && Math.random() < 0.05) {
      this.lastRareEvent = now;
      return "gust_swell";
    }
    return null;
  }
}
