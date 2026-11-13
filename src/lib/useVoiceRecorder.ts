import { useCallback, useEffect, useRef, useState } from "react";

type Recorder = {
  stream: MediaStream;
  ctx: AudioContext;
  source: MediaStreamAudioSourceNode;
  node: ScriptProcessorNode;
  mutedOutput: GainNode;
  chunks: Float32Array[];
};

const TARGET_RATE = 16_000;

function downsample(chunks: Float32Array[], rate: number) {
  let length = 0;
  for (const c of chunks) length += c.length;
  const merged = new Float32Array(length);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }
  if (rate <= TARGET_RATE) return { samples: merged, rate };
  const ratio = rate / TARGET_RATE;
  const out = new Float32Array(Math.floor(merged.length / ratio));
  // Interpolate between samples rather than discarding most of the microphone signal.
  // A Web Audio low-pass filter before this stage removes frequencies that would alias.
  for (let i = 0; i < out.length; i += 1) {
    const position = i * ratio;
    const left = Math.floor(position);
    const fraction = position - left;
    const a = merged[left] ?? 0;
    out[i] = a + ((merged[left + 1] ?? a) - a) * fraction;
  }
  return { samples: out, rate: TARGET_RATE };
}

/** Writes a standard 16-bit mono WAV file and returns it as base64. */
function encodeWavBase64(samples: Float32Array, rate: number) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
  };
  text(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i += 1) {
    const s = Math.max(-1, Math.min(1, samples[i] ?? 0));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/** Microphone recording that always produces a complete, decodable WAV clip. */
export function useVoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const active = useRef<Recorder | null>(null);

  const start = useCallback(async () => {
    if (active.current) return;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: { ideal: 1 },
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    let ctx: AudioContext | null = null;
    try {
      ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const rumble = ctx.createBiquadFilter();
      rumble.type = "highpass";
      rumble.frequency.value = 90;
      const presence = ctx.createBiquadFilter();
      presence.type = "peaking";
      presence.frequency.value = 2_700;
      presence.Q.value = 0.8;
      presence.gain.value = 2;
      const antiAlias = ctx.createBiquadFilter();
      antiAlias.type = "lowpass";
      antiAlias.frequency.value = 6_400;
      antiAlias.Q.value = 0.7;
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 12;
      compressor.ratio.value = 2;
      compressor.attack.value = 0.008;
      compressor.release.value = 0.2;
      const node = ctx.createScriptProcessor(4096, 1, 1);
      const mutedOutput = ctx.createGain();
      mutedOutput.gain.value = 0;
      const chunks: Float32Array[] = [];
      node.onaudioprocess = (event) => {
        chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
      };
      source.connect(rumble);
      rumble.connect(presence);
      presence.connect(antiAlias);
      antiAlias.connect(compressor);
      compressor.connect(node);
      // ScriptProcessor must reach an output to run, but the mic must not play back.
      node.connect(mutedOutput);
      mutedOutput.connect(ctx.destination);
      await ctx.resume();
      active.current = { stream, ctx, source, node, mutedOutput, chunks };
      setRecording(true);
    } catch (error) {
      stream.getTracks().forEach((track) => track.stop());
      if (ctx) void ctx.close().catch(() => undefined);
      throw error;
    }
  }, []);

  /** Stops the microphone and returns the clip as base64 WAV (null when silent). */
  const stop = useCallback(async () => {
    const current = active.current;
    active.current = null;
    setRecording(false);
    if (!current) return null;
    current.stream.getTracks().forEach((t) => t.stop());
    current.node.onaudioprocess = null;
    current.node.disconnect();
    current.mutedOutput.disconnect();
    current.source.disconnect();
    const rate = current.ctx.sampleRate;
    await current.ctx.close().catch(() => undefined);
    const { samples, rate: outRate } = downsample(current.chunks, rate);
    if (samples.length < outRate * 0.3) return null;
    return encodeWavBase64(samples, outRate);
  }, []);

  const cancel = useCallback(() => {
    const current = active.current;
    active.current = null;
    setRecording(false);
    if (!current) return;
    current.stream.getTracks().forEach((t) => t.stop());
    current.node.onaudioprocess = null;
    current.node.disconnect();
    current.mutedOutput.disconnect();
    current.source.disconnect();
    void current.ctx.close().catch(() => undefined);
  }, []);

  useEffect(
    () => () => {
      const current = active.current;
      active.current = null;
      if (!current) return;
      current.stream.getTracks().forEach((track) => track.stop());
      current.node.onaudioprocess = null;
      current.node.disconnect();
      current.mutedOutput.disconnect();
      current.source.disconnect();
      void current.ctx.close().catch(() => undefined);
    },
    [],
  );

  return { recording, start, stop, cancel };
}
