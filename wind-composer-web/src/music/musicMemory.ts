export class MusicMemory {
  private phrases: number[] = [];
  private fills: string[] = [];
  private bassPatterns: number[][] = [];
  private transitions: string[] = [];
  private sections: string[] = [];
  private leadMotifs: number[][] = [];

  rememberPhrase(id: number): void {
    this.phrases.push(id);
    if (this.phrases.length > 8) this.phrases.shift();
  }

  phraseRecent(id: number): boolean {
    return this.phrases.slice(-3).includes(id);
  }

  rememberFill(type: string): void {
    this.fills.push(type);
    if (this.fills.length > 12) this.fills.shift();
  }

  fillOverused(type: string): boolean {
    return this.fills.filter((f) => f === type).length >= 2;
  }

  rememberBass(pattern: number[]): void {
    this.bassPatterns.push([...pattern]);
    if (this.bassPatterns.length > 16) this.bassPatterns.shift();
  }

  bassOverused(pattern: number[]): boolean {
    const key = pattern.join(",");
    return this.bassPatterns.slice(-4).some((p) => p.join(",") === key);
  }

  rememberTransition(fx: string): void {
    this.transitions.push(fx);
    if (this.transitions.length > 6) this.transitions.shift();
  }

  transitionRecent(fx: string): boolean {
    return this.transitions.slice(-2).includes(fx);
  }

  rememberMotif(motif: number[]): void {
    this.leadMotifs.push([...motif]);
    if (this.leadMotifs.length > 10) this.leadMotifs.shift();
  }

  motifOverused(motif: number[]): boolean {
    const key = motif.join(",");
    return this.leadMotifs.slice(-3).some((m) => m.join(",") === key);
  }

  reset(): void {
    this.phrases = [];
    this.fills = [];
    this.bassPatterns = [];
    this.transitions = [];
    this.sections = [];
    this.leadMotifs = [];
  }
}
