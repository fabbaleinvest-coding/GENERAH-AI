// AudioWorklet: cattura il microfono locale, bufferizza 200ms (4800 campioni @ 24kHz)
// e invia i Float32 al thread principale, che li converte in PCM16 base64 per OpenAI Realtime.
class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4800; // 200ms @ 24kHz
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
    this.isMuted = false;
    this.port.onmessage = (event) => {
      if (event.data && event.data.type === "toggleMute") {
        this.isMuted = event.data.value;
        if (this.isMuted) this.bufferIndex = 0;
      }
    };
  }
  process(inputs) {
    if (this.isMuted) return true;
    const input = inputs[0];
    if (input && input.length > 0) {
      const channelData = input[0];
      for (let i = 0; i < channelData.length; i++) {
        this.buffer[this.bufferIndex++] = channelData[i];
        if (this.bufferIndex >= this.bufferSize) {
          this.port.postMessage({ audio: this.buffer.slice(0) });
          this.bufferIndex = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor("audio-processor", AudioProcessor);
