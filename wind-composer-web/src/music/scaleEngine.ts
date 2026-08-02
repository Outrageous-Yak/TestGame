import type { ScaleName } from "../config";
import { KEYS, NOTE_TO_MIDI, SCALE_INTERVALS } from "../config";

export class ScaleEngine {
  key = "C";
  scale: ScaleName = "Minor";
  private midiNotes: number[] = [];

  constructor(key = "C", scale: ScaleName = "Minor") {
    this.key = key;
    this.scale = scale;
    this.rebuild();
  }

  setKey(key: string): void {
    if (key in NOTE_TO_MIDI) {
      this.key = key;
      this.rebuild();
    }
  }

  setScale(scale: ScaleName): void {
    this.scale = scale;
    this.rebuild();
  }

  rebuild(): void {
    const root = NOTE_TO_MIDI[this.key] ?? 0;
    const intervals = SCALE_INTERVALS[this.scale];
    const notes: number[] = [];
    for (let octave = -2; octave < 4; octave++) {
      for (const interval of intervals) {
        const midi = root + interval + octave * 12 + 48;
        if (midi >= 36 && midi <= 96) notes.push(midi);
      }
    }
    this.midiNotes = [...new Set(notes)].sort((a, b) => a - b);
  }

  nearestScaleNote(midi: number): number {
    if (!this.midiNotes.length) return midi;
    return this.midiNotes.reduce((best, n) =>
      Math.abs(n - midi) < Math.abs(best - midi) ? n : best,
    );
  }

  stepNote(current: number, direction: number, allowLeap = false): number {
    const idx = this.midiNotes.indexOf(current);
    const i = idx >= 0 ? idx : 0;
    const step = allowLeap && direction !== 0 ? direction * 2 : direction >= 0 ? 1 : -1;
    const newIdx = clampIndex(i + step, 0, this.midiNotes.length - 1);
    return this.midiNotes[newIdx];
  }

  chordTones(rootMidi: number, num = 3): number[] {
    const rootIdx = this.midiNotes.indexOf(rootMidi);
    const ri = rootIdx >= 0 ? rootIdx : 0;
    const steps = [0, 2, 4, 6, 4, 2];
    const tones: number[] = [];
    for (let i = 0; i < Math.min(num, steps.length); i++) {
      const idx = ri + steps[i];
      if (idx < this.midiNotes.length) tones.push(this.midiNotes[idx]);
    }
    return tones;
  }

  degreeRoot(degreeIndex: number): number {
    const intervals = SCALE_INTERVALS[this.scale];
    const root = (NOTE_TO_MIDI[this.key] ?? 0) + 48;
    const semitone = intervals[degreeIndex % intervals.length];
    const octaveShift = Math.floor(degreeIndex / intervals.length) * 12;
    return root + semitone + octaveShift;
  }

  noteName(midi: number): string {
    return `${KEYS[midi % 12]}${Math.floor(midi / 12) - 1}`;
  }
}

function clampIndex(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
