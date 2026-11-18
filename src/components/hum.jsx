/**
 * FILE: src/components/hum.jsx
 * PURPOSE: Display pieces of the hum coach screen: Scale (1–5 settled tap), Meters, Stats, and the
 *   "tip for next time" picker. No logic beyond formatting — rules live in src/engine/hum/.
 */
import { T } from '../engine/hum/coach.js';
import copy from '../content/app.json';

export function Scale({ value, onPick, label }) {
  return (
    <fieldset className="scale"><legend>{label}</legend>
      <div>{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" aria-pressed={value === n} onClick={() => onPick(value === n ? null : n)}>{n}</button>)}</div>
      <p className="small"><span>{copy.hum.scale[0]}</span><span>{copy.hum.scale[1]}</span></p>
    </fieldset>
  );
}

const Meter = ({ name, pct, value }) => (
  <div className="meter"><span>{name}</span><i><b style={{ width: `${Math.max(0, Math.min(1, pct)) * 100}%` }} /></i><strong>{value}</strong></div>
);

/** Live meters. Timer-only mode has no analysis, so it shows only length and breath. */
export const Meters = ({ last, live, timer }) => (
  <div className="meters">
    <Meter name="Last hum" pct={(last?.length ?? 0) / 12} value={last ? `${last.length.toFixed(1)} s` : '—'} />
    <Meter name="Last inhale" pct={(last?.gap ?? 0) / 6} value={last?.gap != null ? `${last.gap.toFixed(1)} s` : '—'} />
    {!timer && <Meter name="Steadiness" pct={last ? 1 - Math.min(1, last.steadiness / (2 * T.wavy)) : 0} value={last ? (last.steadiness < T.wavy ? 'Steady' : 'A little wavy') : '—'} />}
    {!timer && <Meter name="Loudness" pct={(live.db + 70) / 60} value={live.db > T.tooLoud ? 'Too loud' : live.humming ? 'Soft · good' : '—'} />}
  </div>
);

export const Stats = ({ s }) => (
  <div className="stats">
    <div><b>{s.avgHum ?? '—'} s</b><span>average hum</span></div>
    <div><b>{s.avgInhale ?? '—'} s</b><span>average inhale</span></div>
    <div><b>{s.steadyRounds == null ? '—' : `${s.steadyRounds}/${s.rounds}`}</b><span>steady rounds</span></div>
  </div>
);

/** The tip to carry into next time: the most frequent problem across rounds, else "good". */
export function nextTip(rounds) {
  const count = {};
  rounds.forEach((r) => { if (r.tip !== 'good') count[r.tip] = (count[r.tip] || 0) + 1; });
  return Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'good';
}
