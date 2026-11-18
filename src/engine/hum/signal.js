/**
 * FILE: src/engine/hum/signal.js
 * PURPOSE: Measure one audio frame: loudness (dBFS) and pitch (Hz) — CORE_LOGIC §6.3.
 * INPUT: Float32Array of samples in [-1, 1] (one AnalyserNode frame, ~2048 samples), sampleRate
 * Runs ~20× per second in the browser; audio never leaves the device.
 */
export const SILENCE_DB = -100;

/** Root-mean-square loudness in dBFS (0 = full scale, more negative = quieter). */
export function loudness(frame) {
  let sum = 0;
  for (let i = 0; i < frame.length; i++) sum += frame[i] * frame[i];
  const rms = Math.sqrt(sum / frame.length);
  return rms > 0 ? Math.max(SILENCE_DB, 20 * Math.log10(rms)) : SILENCE_DB;
}

/**
 * Fundamental pitch by normalised autocorrelation, searched in 80–400 Hz (humming voice range).
 * Returns null when the frame is not clearly voiced (noise, silence).
 * Takes the first strong peak (≥ 90% of the best) so harmonics-rich hums don't jump an octave down.
 */
export function pitch(frame, sampleRate, minHz = 80, maxHz = 400) {
  const minLag = Math.floor(sampleRate / maxHz), maxLag = Math.min(Math.ceil(sampleRate / minHz), frame.length - 1);
  const n = frame.length - maxLag;
  let energy = 0;
  for (let i = 0; i < n; i++) energy += frame[i] * frame[i];
  if (energy < 1e-6) return null;
  const r = new Float32Array(maxLag + 2);
  let best = 0;
  for (let lag = minLag; lag <= maxLag + 1; lag++) {
    let s = 0, e2 = 0;
    for (let i = 0; i < n; i++) { s += frame[i] * frame[i + lag]; e2 += frame[i + lag] * frame[i + lag]; }
    r[lag] = s / Math.sqrt(energy * e2 || 1);
    if (lag <= maxLag && r[lag] > best) best = r[lag];
  }
  if (best < 0.6) return null; // not voiced
  for (let lag = minLag + 1; lag <= maxLag; lag++) {
    if (r[lag] >= 0.9 * best && r[lag] >= r[lag - 1] && r[lag] >= r[lag + 1]) {
      const shift = (r[lag + 1] - r[lag - 1]) / (2 * (2 * r[lag] - r[lag - 1] - r[lag + 1]) || 1); // parabolic refinement
      return sampleRate / (lag + shift);
    }
  }
  return null;
}
