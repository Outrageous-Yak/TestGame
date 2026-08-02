export class AudioRecorder {
  private recorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private active = false;

  start(stream: MediaStream): void {
    this.chunks = [];
    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";
    this.recorder = new MediaRecorder(stream, { mimeType: mime });
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.recorder.start(250);
    this.active = true;
  }

  stop(): void {
    if (this.recorder && this.active) {
      this.recorder.stop();
    }
    this.active = false;
  }

  async exportBlob(): Promise<Blob> {
    return new Blob(this.chunks, { type: this.recorder?.mimeType || "audio/webm" });
  }

  async exportWav(streamChunks: Float32Array[], sampleRate: number): Promise<Blob> {
    const length = streamChunks.reduce((a, c) => a + c.length, 0);
    const interleaved = new Float32Array(length * 2);
    let offset = 0;
    for (const chunk of streamChunks) {
      for (let i = 0; i < chunk.length; i++) {
        interleaved[offset * 2] = chunk[i];
        interleaved[offset * 2 + 1] = chunk[i];
        offset++;
      }
    }
    const pcm = new Int16Array(interleaved.length);
    for (let i = 0; i < interleaved.length; i++) {
      const s = Math.max(-1, Math.min(1, interleaved[i]));
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    const writeStr = (o: number, s: string) => {
      for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
    };
    writeStr(0, "RIFF");
    view.setUint32(4, 36 + pcm.length * 2, true);
    writeStr(8, "WAVE");
    writeStr(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 2, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 4, true);
    view.setUint16(32, 4, true);
    view.setUint16(34, 16, true);
    writeStr(36, "data");
    view.setUint32(40, pcm.length * 2, true);
    return new Blob([header, pcm], { type: "audio/wav" });
  }

  isRecording(): boolean {
    return this.active;
  }
}
