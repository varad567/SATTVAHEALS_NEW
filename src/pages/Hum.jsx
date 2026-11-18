/**
 * FILE: src/pages/Hum.jsx
 * PURPOSE: The hum coach (Flow 4): setup + "before" tap → mic + 3 s noise check → rounds with live meters,
 *   Prana humming along and one tip at a time → summary + "after" tap → save (numbers only) and mark mantra done.
 *   No mic, mic denied, or a noisy room → timer-only mode: hold a button while humming (no analysis, no tips
 *   beyond length and breath). Ending with fewer than 2 rounds saves nothing (CORE_LOGIC §6.5).
 */
import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import Prana from '../components/Prana.jsx';
import { Bubble, Sheet } from '../components/ui.jsx';
import { Scale, Meters, Stats, nextTip } from '../components/hum.jsx';
import { Mandala } from '../components/art.jsx';
import { useApp } from '../app/AppState.jsx';
import { useMic } from '../hooks/useMic.js';
import { createDetector, isNoisy, pickTip, summarize, canSave, median } from '../engine/hum/coach.js';
import { cap } from '../lib/format.js';
import practices from '../content/practices.json';
import tips from '../content/humTips.json';
import copy from '../content/app.json';
import './hum.css';

const H = copy.hum;

export default function Hum() {
  const practice = practices.find((p) => p.id === useParams().id && p.humKind);
  const { colors, addSession, setDone, date } = useApp();
  const mic = useMic(); const { read, stop } = mic;
  const go = useNavigate();
  const [step, setStep] = useState('setup'); // setup → noise → session → summary
  const [timer, setTimer] = useState(false); // timer-only mode
  const [kind, setKind] = useState(practice?.humKind);
  const [before, setBefore] = useState(null);
  const [after, setAfter] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [live, setLive] = useState({ humming: false, secs: 0, db: -100 });
  const [confirmEnd, setConfirmEnd] = useState(false);
  const det = useRef(null), held = useRef(null), lastEnd = useRef(null);
  const total = practice?.rounds ?? 6;

  const addRound = (r) => setRounds((rs) => [...rs, { ...r, tip: pickTip(r, { kind, firstPitch: rs[0]?.pitch }) }]);

  // Noise check: 3 s of readings → the room's floor (§6.1).
  useEffect(() => {
    if (step !== 'noise') return;
    const dbs = []; const id = setInterval(() => { const r = read(); if (r) dbs.push(r.db); }, 50);
    const done = setTimeout(() => { clearInterval(id); const floor = median(dbs); if (isNoisy(floor)) setStep('noisy'); else { det.current = createDetector(floor); setStep('session'); } }, 3000);
    return () => { clearInterval(id); clearTimeout(done); };
  }, [step, read]);

  // Live listening during the session (§6.2–6.4), ~20 readings per second.
  useEffect(() => {
    if (step !== 'session' || timer) return;
    const id = setInterval(() => {
      const r = read(); if (!r) return;
      const t = performance.now(); const round = det.current.feed(t, r.db, r.hz);
      if (round) addRound(round);
      setLive({ humming: det.current.humming, secs: det.current.humming ? (t - det.current.since) / 1000 : 0, db: r.db });
    }, 50);
    return () => clearInterval(id);
  }, [step, timer, read, kind]);

  useEffect(() => { if (rounds.length >= total && step === 'session') { stop(); setStep('summary'); } }, [rounds.length, total, step, stop]);
  // Timer-only mode: tick the seconds while the button is held.
  useEffect(() => { if (!timer || !live.humming) return; const id = setInterval(() => setLive((l) => ({ ...l, secs: (performance.now() - held.current) / 1000 })), 100); return () => clearInterval(id); }, [timer, live.humming]);

  if (!practice) return <Navigate to="/app/today" replace />;

  const startMic = async () => { if (await mic.start()) setStep('noise'); else setStep('nomic'); };
  const timerOnly = () => { stop(); setTimer(true); setStep('session'); };
  const holdStart = () => { held.current = performance.now(); setLive({ humming: true, secs: 0, db: -100 }); };
  const holdEnd = () => {
    if (held.current == null) return;
    const now = performance.now();
    addRound({ length: (now - held.current) / 1000, gap: lastEnd.current == null ? null : (held.current - lastEnd.current) / 1000, steadiness: null, loudness: null, pitch: null });
    lastEnd.current = now; held.current = null; setLive({ humming: false, secs: 0, db: -100 });
  };

  const end = () => (canSave(rounds) ? (stop(), setStep('summary')) : setConfirmEnd(true));
  const save = async () => {
    await addSession({ date, practiceId: practice.id, kind, before, after, ...summarize(rounds) });
    await setDone('mantra', practice.id, true);
    go('/app/today');
  };

  const last = rounds.at(-1);
  const dark = step === 'session';
  const say = { setup: H.setup, noise: H.noiseAsk, noisy: H.noisy, nomic: H.micDenied, summary: tips[nextTip(rounds)] }[step]
    ?? (live.humming ? H.humming : last ? tips[last.tip] : timer ? H.timerHint : H.ready);

  return (
    <main className={`hum${dark ? ' hum--dark' : ''}`}>
      <header className="hum__top">
        <button type="button" className="icon-btn" aria-label="Close hum coach" onClick={() => (rounds.length && step === 'session' ? end() : go('/app/today'))}>✕</button>
        <p className="eyebrow">{dark ? `${cap(kind)} · round ${Math.min(rounds.length + 1, total)} of ${total}` : practice.title}</p>
      </header>

      <div className="hum__guide">
        <div className="hum__prana" style={{ transform: `scale(${live.humming ? Math.min(1.25, 1 + live.secs * 0.025) : 1})` }}>
          {(dark || step === 'summary') && <Mandala slots={total} rounds={rounds} kind={kind} colors={colors} />}
          {live.humming && <><i className="ring" /><i className="ring ring--2" /></>}
          <Prana size={dark ? 170 : 130} colors={colors} mood={live.humming ? 'humming' : step === 'summary' ? 'happy' : 'idle'} popKey={rounds.length} />
        </div>
        <Bubble>{say}</Bubble>
      </div>

      {step === 'setup' && (
        <section className="hum__body">
          <div className="choices" role="group" aria-label="Practice">{['bhramari', 'om'].map((k) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>{cap(k)}</button>)}</div>
          <Scale label={H.settledQ} value={before} onPick={setBefore} />
          <p className="small">{H.micWhy}</p>
          <button type="button" className="btn btn--wide" onClick={startMic}>{before ? 'Start' : 'Skip and start'} with the mic <span aria-hidden="true">→</span></button>
          <button type="button" className="btn btn--ghost btn--wide" onClick={timerOnly}>Use the timer only</button>
        </section>
      )}

      {step === 'noise' && <section className="hum__body"><div className="noise-ring" aria-hidden="true" /><p className="center">Listening to the room…</p></section>}

      {(step === 'noisy' || step === 'nomic') && (
        <section className="hum__body">
          <button type="button" className="btn btn--wide" onClick={startMic}>Try again <span aria-hidden="true">→</span></button>
          <button type="button" className="btn btn--ghost btn--wide" onClick={timerOnly}>Use the timer only</button>
        </section>
      )}

      {step === 'session' && (
        <section className="hum__body">
          <p className="hum__secs" aria-live="off"><span className="eyebrow">{live.humming ? 'Humming' : rounds.length ? 'Breathe in' : 'Ready'}</span>{live.secs.toFixed(1)} s</p>
          <Meters last={rounds.at(-1)} live={live} timer={timer} />
          {timer
            ? <button type="button" className="btn btn--gold btn--wide hold" onPointerDown={holdStart} onPointerUp={holdEnd} onPointerLeave={holdEnd} onKeyDown={(e) => e.key === ' ' && !e.repeat && holdStart()} onKeyUp={(e) => e.key === ' ' && holdEnd()}>{live.humming ? 'Humming… let go to breathe in' : 'Hold while you hum'}</button>
            : <p className="small center">Prana is listening. Hum whenever you're ready.</p>}
          <button type="button" className="link" onClick={end}>End session</button>
        </section>
      )}

      {step === 'summary' && (
        <section className="hum__body">
          <h1>{rounds.length} rounds, <em>well done.</em></h1>
          <p className="small center">Your mandala from this session — longer, steadier hums make fuller petals.</p>
          <Stats s={summarize(rounds)} />
          <Scale label="How settled do you feel now?" value={after} onPick={setAfter} />
          {before && after && <p className="card card--plum">{H.after[after > before ? 'better' : after === before ? 'same' : 'worse'].replace('{n}', `${after - before} point${after - before > 1 ? 's' : ''}`)}</p>}
          <p className="small">{H.privacy}</p>
          <button type="button" className="btn btn--wide" onClick={save}>Save and finish <span aria-hidden="true">→</span></button>
        </section>
      )}

      {confirmEnd && (
        <Sheet title="End early?" onClose={() => setConfirmEnd(false)}>
          <p>{H.endEarly}</p>
          <button type="button" className="btn btn--wide" onClick={() => { stop(); go('/app/today'); }}>End without saving</button>
        </Sheet>
      )}
    </main>
  );
}
