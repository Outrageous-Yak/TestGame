import type { MixerLayerId } from '@/domain/types';

type LayerPlayback = {
  source: AudioBufferSourceNode;
  gain: GainNode;
};

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private layerGains: Map<MixerLayerId, GainNode> = new Map();
  private layerPlaybacks: Map<MixerLayerId, LayerPlayback> = new Map();
  private bufferCache: Map<string, AudioBuffer> = new Map();

  async ensureContext(): Promise<AudioContext> {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);

      const layerIds: MixerLayerId[] = ['ambient', 'music', 'sfx', 'master'];
      for (const id of layerIds) {
        const gain = this.ctx.createGain();
        gain.connect(this.masterGain);
        this.layerGains.set(id, gain);
      }
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    return this.ctx;
  }

  async decodeClip(clipId: string, blob: Blob): Promise<AudioBuffer> {
    const cached = this.bufferCache.get(clipId);
    if (cached) return cached;
    const ctx = await this.ensureContext();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    this.bufferCache.set(clipId, buffer);
    return buffer;
  }

  clearBufferCache(clipId?: string): void {
    if (clipId) {
      this.bufferCache.delete(clipId);
    } else {
      this.bufferCache.clear();
    }
  }

  setLayerVolume(layerId: MixerLayerId, volume: number): void {
    const gain = this.layerGains.get(layerId);
    if (gain) {
      gain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  setMasterVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  stopLayer(layerId: MixerLayerId): void {
    const playback = this.layerPlaybacks.get(layerId);
    if (playback) {
      try {
        playback.source.stop();
      } catch {
        // already stopped
      }
      this.layerPlaybacks.delete(layerId);
    }
  }

  stopAll(): void {
    for (const id of this.layerPlaybacks.keys()) {
      this.stopLayer(id);
    }
  }

  async playClip(
    layerId: MixerLayerId,
    clipId: string,
    blob: Blob,
    options: { loop?: boolean; volume?: number } = {},
  ): Promise<void> {
    this.stopLayer(layerId);
    const ctx = await this.ensureContext();
    const buffer = await this.decodeClip(clipId, blob);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = options.loop ?? false;

    const layerGain = this.layerGains.get(layerId);
    if (!layerGain) return;

    const clipGain = ctx.createGain();
    clipGain.gain.value = options.volume ?? 1;
    source.connect(clipGain);
    clipGain.connect(layerGain);

    source.onended = () => {
      if (this.layerPlaybacks.get(layerId)?.source === source) {
        this.layerPlaybacks.delete(layerId);
      }
    };

    source.start(0);
    this.layerPlaybacks.set(layerId, { source, gain: clipGain });
  }

  async playOneShot(blob: Blob, volume = 1): Promise<void> {
    const ctx = await this.ensureContext();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(gain);
    const sfxGain = this.layerGains.get('sfx');
    if (sfxGain) {
      gain.connect(sfxGain);
    } else if (this.masterGain) {
      gain.connect(this.masterGain);
    }
    source.start(0);
  }

  isLayerPlaying(layerId: MixerLayerId): boolean {
    return this.layerPlaybacks.has(layerId);
  }
}

export const audioEngine = new AudioEngine();
