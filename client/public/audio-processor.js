/**
 * AudioWorkletProcessor for 16kHz 16-bit Mono PCM audio capture.
 * Downsamples input from native audio hardware sample rate (e.g. 44.1kHz or 48kHz)
 * to standard 16,000Hz Linear PCM for Gemini Live WebSocket API.
 */
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

    const channelData = input[0]; // Mono input
    const inputSampleRate = sampleRate; // Global AudioWorkletGlobalScope sampleRate
    const sampleRateRatio = inputSampleRate / this.targetSampleRate;

    for (let i = 0; i < channelData.length; i += sampleRateRatio) {
      const index = Math.floor(i);
      const sample = channelData[index];

      // Convert Float32 (-1.0 to +1.0) to 16-bit signed integer (-32768 to 32767)
      const clamped = Math.max(-1.0, Math.min(1.0, sample));
      const int16Sample = clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF;

      this.buffer[this.bufferIndex++] = int16Sample;

      // When chunk is full, emit to main thread
      if (this.bufferIndex >= this.bufferSize) {
        // Copy buffer and dispatch
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
