/**
 * Web Audio API manager maintaining a continuous queue for 24kHz PCM chunks
 * with instant buffer flush for barge-in interruptions.
 */
export class PcmStreamPlayer {
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private nextPlayTime: number = 0;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private isMuted: boolean = false;
  private sampleRate: number = 24000;

  constructor(sampleRate: number = 24000) {
    this.sampleRate = sampleRate;
  }

  public async init(): Promise<void> {
    if (this.audioContext) {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      return;
    }

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    await this.audioContext.resume();

    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 512;
    this.analyserNode.smoothingTimeConstant = 0.8;

    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.setValueAtTime(1.0, this.audioContext.currentTime);

    this.gainNode.connect(this.analyserNode);
    this.analyserNode.connect(this.audioContext.destination);

    this.nextPlayTime = this.audioContext.currentTime;
  }

  /**
   * Queue and smoothly play 24kHz 16-bit Little-Endian PCM audio chunk
   */
  public async playChunk(base64Pcm: string): Promise<void> {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      await this.init();
    }

    if (!this.audioContext || this.isMuted) return;

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    try {
      const rawData = this.base64ToArrayBuffer(base64Pcm);
      const int16Array = new Int16Array(rawData);
      const float32Array = new Float32Array(int16Array.length);

      // Convert 16-bit Little-Endian PCM to Float32 (-1.0 to +1.0)
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      // Create Web Audio Buffer
      const audioBuffer = this.audioContext.createBuffer(1, float32Array.length, this.sampleRate);
      audioBuffer.getChannelData(0).set(float32Array);

      const sourceNode = this.audioContext.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(this.gainNode!);

      // Calculate scheduled start time for gapless playback
      const currentTime = this.audioContext.currentTime;
      const scheduledTime = Math.max(currentTime, this.nextPlayTime);
      sourceNode.start(scheduledTime);

      this.nextPlayTime = scheduledTime + audioBuffer.duration;
      this.activeSources.add(sourceNode);

      sourceNode.onended = () => {
        this.activeSources.delete(sourceNode);
      };
    } catch (err) {
      console.error('[PcmStreamPlayer] Error playing PCM chunk:', err);
    }
  }

  /**
   * INSTANT BARGE-IN INTERRUPTION FLUSH:
   * Immediately stops all currently playing AudioBufferSourceNodes,
   * resets the timeline pointer to now, and clears pending queues.
   */
  public flushBargeIn(): void {
    console.log(`[PcmStreamPlayer] Flushing audio playback queue (${this.activeSources.size} nodes canceled for barge-in)`);
    
    this.activeSources.forEach((source) => {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {
        // Source might have already finished
      }
    });
    this.activeSources.clear();

    if (this.audioContext) {
      this.nextPlayTime = this.audioContext.currentTime;
    }
  }

  public getFrequencyData(array: Uint8Array<ArrayBuffer>): void {
    if (this.analyserNode) {
      this.analyserNode.getByteFrequencyData(array);
    } else {
      array.fill(0);
    }
  }

  public setMute(muted: boolean): void {
    this.isMuted = muted;
    if (this.gainNode && this.audioContext) {
      this.gainNode.gain.setValueAtTime(muted ? 0 : 1.0, this.audioContext.currentTime);
    }
    if (muted) {
      this.flushBargeIn();
    }
  }

  public stop(): void {
    this.flushBargeIn();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = window.atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
