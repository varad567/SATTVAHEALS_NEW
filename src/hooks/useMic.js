/**
 * FILE: src/hooks/useMic.js
 * PURPOSE: Microphone access for the hum coach. Audio stays in the browser: each read() measures the
 *   current frame (loudness + pitch) and nothing is recorded, stored or sent (CONTEXT §5).
 * OUTPUT: { status: 'idle' | 'asking' | 'on' | 'denied' | 'unsupported', start(), stop(), read() → { db, hz } }
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loudness, pitch } from '../engine/hum/signal.js';

export function useMic() {
  const [status, setStatus] = useState('idle');
  const audio = useRef(null); // { stream, ctx, analyser, buf }

  const stop = useCallback(() => {
    const a = audio.current; audio.current = null;
    a?.stream.getTracks().forEach((t) => t.stop());
    a?.ctx.close?.();
    setStatus((s) => (s === 'on' ? 'idle' : s));
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext) { setStatus('unsupported'); return false; }
    setStatus('asking');
    try {
      // Browser clean-up filters would flatten the very things we measure, so they are turned off.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser(); analyser.fftSize = 2048;
      ctx.createMediaStreamSource(stream).connect(analyser);
      audio.current = { stream, ctx, analyser, buf: new Float32Array(analyser.fftSize) };
      setStatus('on'); return true;
    } catch { setStatus('denied'); return false; }
  }, []);

  const read = useCallback(() => {
    const a = audio.current; if (!a) return null;
    a.analyser.getFloatTimeDomainData(a.buf);
    return { db: loudness(a.buf), hz: pitch(a.buf, a.ctx.sampleRate) };
  }, []);

  useEffect(() => stop, [stop]); // always release the mic when the screen closes
  // Stable object: start/stop/read never change, so effects that use them don't restart on every render.
  return useMemo(() => ({ status, start, stop, read }), [status, start, stop, read]);
}
