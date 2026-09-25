/**
 * Microphone manager using AudioWorklet to capture 16kHz 16-bit Mono PCM.
 */
export class PcmRecorder {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private isRecording: boolean = false;
  private isMuted: boolean = false;
  private onAudioChunk: (base64Chunk: string) => void;
  private onVolumeChange?: (volume: number) => void;
  private volumeInterval: number | null = null;

  constructor(options: {
    onAudioChunk: (base64Chunk: string) => void;
    onVolumeChange?: (volume: number) => void;
  }) {
    this.onAudioChunk = options.onAudioChunk;
    this.onVolumeChange = options.onVolumeChange;
  }

  public async start(): Promise<void> {
    if (this.isRecording) return;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      await this.audioContext.resume();

      // Load our AudioWorklet processor
      await this.audioContext.audioWorklet.addModule('/audio-processor.js');

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm-capture-processor');

      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      source.connect(this.analyserNode);
      source.connect(this.workletNode);

      // Handle raw PCM chunks from processor
      this.workletNode.port.onmessage = (event) => {
        if (!this.isRecording || this.isMuted) return;
        const arrayBuffer = event.data?.pcmChunk as ArrayBuffer;
        if (arrayBuffer) {
          const base64 = this.arrayBufferToBase64(arrayBuffer);
          this.onAudioChunk(base64);
        }
      };

      this.isRecording = true;

      // Start volume meter polling
      if (this.onVolumeChange && this.analyserNode) {
        const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
        this.volumeInterval = window.setInterval(() => {
          if (!this.analyserNode || !this.isRecording || this.isMuted) {
            this.onVolumeChange?.(0);
            return;
          }
          this.analyserNode.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          const normalized = Math.min(1, average / 128);
          this.onVolumeChange?.(normalized);
        }, 80);
      }
    } catch (err: any) {
      console.error('[PcmRecorder] Failed to start audio recorder:', err);
      throw new Error(`Microphone access error: ${err.message}`);
    }
  }

  public setMute(muted: boolean): void {
    this.isMuted = muted;
    if (this.workletNode) {
      this.workletNode.port.postMessage({ muted });
    }
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public stop(): void {
    this.isRecording = false;

    if (this.volumeInterval) {
      clearInterval(this.volumeInterval);
      this.volumeInterval = null;
    }

    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }

    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}
