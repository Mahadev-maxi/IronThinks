/**
 * Microphone manager using AudioWorklet (inline Blob) to capture 16kHz 16-bit Mono PCM.
 * Falls back to ScriptProcessor if AudioWorklet is not permitted or fails to initialize.
 */

const WORKLET_PROCESSOR_CODE = `
class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.targetSampleRate = 16000;
    this.bufferSize = 2048; // ~128ms at 16kHz
    this.buffer = new Int16Array(this.bufferSize);
    this.bufferIndex = 0;
    this.isMuted = false;

    this.port.onmessage = (event) => {
      if (event.data && typeof event.data.muted === 'boolean') {
        this.isMuted = event.data.muted;
      }
    };
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0] || this.isMuted) {
      return true;
    }

    const channelData = input[0];
    const inputSampleRate = sampleRate;
    const sampleRateRatio = inputSampleRate / this.targetSampleRate;

    for (let i = 0; i < channelData.length; i += sampleRateRatio) {
      const index = Math.floor(i);
      const sample = channelData[index];

      const clamped = Math.max(-1.0, Math.min(1.0, sample));
      const int16Sample = clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF;

      this.buffer[this.bufferIndex++] = int16Sample;

      if (this.bufferIndex >= this.bufferSize) {
        const chunkToSend = new Int16Array(this.buffer);
        this.port.postMessage({
          pcmChunk: chunkToSend.buffer
        }, [chunkToSend.buffer]);

        this.bufferIndex = 0;
      }
    }

    return true;
  }
}

registerProcessor('pcm-capture-processor', PcmCaptureProcessor);
`;

export class PcmRecorder {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private scriptProcessorNode: ScriptProcessorNode | null = null;
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

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      source.connect(this.analyserNode);

      // Try inline AudioWorklet first (avoids any network request)
      let workletLoaded = false;
      if (this.audioContext.audioWorklet) {
        try {
          const blob = new Blob([WORKLET_PROCESSOR_CODE], { type: 'application/javascript' });
          const workletUrl = URL.createObjectURL(blob);
          try {
            await this.audioContext.audioWorklet.addModule(workletUrl);
            this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm-capture-processor');
            source.connect(this.workletNode);

            this.workletNode.port.onmessage = (event) => {
              if (!this.isRecording || this.isMuted) return;
              const arrayBuffer = event.data?.pcmChunk as ArrayBuffer;
              if (arrayBuffer) {
                const base64 = this.arrayBufferToBase64(arrayBuffer);
                this.onAudioChunk(base64);
              }
            };
            workletLoaded = true;
          } finally {
            URL.revokeObjectURL(workletUrl);
          }
        } catch (workletErr) {
          console.warn('[PcmRecorder] AudioWorklet setup notice, using script processor fallback:', workletErr);
        }
      }

      // Fallback to ScriptProcessor if worklet is unavailable
      if (!workletLoaded) {
        try {
          const bufferSize = 2048;
          this.scriptProcessorNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
          source.connect(this.scriptProcessorNode);
          this.scriptProcessorNode.connect(this.audioContext.destination);

          this.scriptProcessorNode.onaudioprocess = (e) => {
            if (!this.isRecording || this.isMuted) return;
            const input = e.inputBuffer.getChannelData(0);
            const targetSampleRate = 16000;
            const ratio = (this.audioContext?.sampleRate || 44100) / targetSampleRate;
            const outLength = Math.floor(input.length / ratio);
            const pcm = new Int16Array(outLength);

            for (let i = 0; i < outLength; i++) {
              const srcIdx = Math.floor(i * ratio);
              const sample = Math.max(-1.0, Math.min(1.0, input[srcIdx]));
              pcm[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            }

            const base64 = this.arrayBufferToBase64(pcm.buffer);
            this.onAudioChunk(base64);
          };
        } catch (scriptErr) {
          console.warn('[PcmRecorder] ScriptProcessor fallback notice:', scriptErr);
        }
      }

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
      try { this.workletNode.disconnect(); } catch {}
      this.workletNode = null;
    }

    if (this.scriptProcessorNode) {
      try { this.scriptProcessorNode.disconnect(); } catch {}
      this.scriptProcessorNode = null;
    }

    if (this.analyserNode) {
      try { this.analyserNode.disconnect(); } catch {}
      this.analyserNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try { this.audioContext.close(); } catch {}
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
