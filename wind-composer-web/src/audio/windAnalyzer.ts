export class WindAnalyzer {
  private analyser: AnalyserNode | null = null;
  private data: Float32Array | null = null;
  private fftData: Uint8Array | null = null;
  private lastEnergy = 0;
  private gustCooldown = 0;
  private sensitivity = 0.6;

  attach(source: MediaStreamAudioSourceNode, ctx: AudioContext) {
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    source.connect(this.analyser);
    this.data = new Float32Array(this.analyser.fftSize);
    this.fftData = new Uint8Array(this.analyser.frequencyBinCount);
  }

  setSensitivity(v: number) {
    this.sensitivity = v;
  }

  analyze(): { energy: number; gust: boolean; fft: number[] } {
    if (!this.analyser || !this.data || !this.fftData) {
      return { energy: 0, gust: false, fft: [] };
    }
    this.analyser.getFloatTimeDomainData(this.data as Float32Array<ArrayBuffer>);
    this.analyser.getByteFrequencyData(this.fftData as Uint8Array<ArrayBuffer>);
    let sum = 0;
    for (let i = 0; i < this.data.length; i++) sum += this.data[i] ** 2;
    const rms = Math.sqrt(sum / this.data.length);
    const energy = Math.min(1, rms * 8 * this.sensitivity);
    const short = Math.min(1, rms * 14 * this.sensitivity);
    let gust = false;
    if (this.gustCooldown > 0) this.gustCooldown--;
    if (short > this.lastEnergy + 0.22 && short > 0.35 && this.gustCooldown === 0) {
      gust = true;
      this.gustCooldown = 30;
    }
    this.lastEnergy = energy * 0.85 + this.lastEnergy * 0.15;
    const fft = Array.from(this.fftData.slice(0, 64)).map((v) => v / 255);
    return { energy, gust, fft };
  }
}
