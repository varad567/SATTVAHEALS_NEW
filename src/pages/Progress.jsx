/**
 * FILE: src/pages/Progress.jsx
 * PURPOSE: Last 14 days — days practised, what works for you, mood trend, hum stats (CORE_LOGIC §8).
 */
import Prana, { colorsFor } from '../components/Prana.jsx';
import { useApp } from '../app/AppState.jsx';
import { progressStats } from '../engine/progressStats.js';

const GROUP = { okay: 'okay', busy: 'busy mind', heated: 'heated', heavy: 'heavy' };
const KIND = { bhramari: 'Bhramari', om: 'Om' };

export default function Progress() {
  const { data, date } = useApp();
  const s = progressStats({ ...data, today: date });
  const works = Object.entries(s.works).sort((a, b) => b[1].change - a[1].change);
  const [w0, w1] = s.avgHumByWeek;
  return (
    <div className="page">
      <p className="eyebrow">Last 14 days</p>
      <h1>Your <em>rhythm</em></h1>
      <section className="card card--lav">
        <div className="card__row"><h2 className="h-card">Days practised</h2><span>{s.daysPractised} of 14</span></div>
        <div className="days">{s.days.map((d) => <i key={d.date} className={d.done ? 'on' : undefined} title={d.date} />)}</div>
      </section>
      <section className="card card--plum works">
        <Prana size={90} colors={colorsFor(data.profile.prakriti)} mood={works.length ? 'happy' : 'idle'} />
        <div><p className="eyebrow">What works for you</p>
          {works.length ? <p className="h-card">{works.map(([k, v]) => `${KIND[k]} ${v.change > 0 ? '+' : ''}${v.change}`).join(' · ')}</p>
            : <p>After three hum sessions with before/after taps, Prana will show which practice settles you most.</p>}
          {works.length > 0 && <p className="small">Average change in how settled you feel, before → after</p>}</div>
      </section>
      <section className="card">
        <h2 className="h-card">Mood check-ins</h2>
        <div className="moodbars">{s.moodGroups.map((g, i) => <i key={i} className={g ? `m-${g}` : undefined} title={g ? GROUP[g] : 'no check-in'} />)}</div>
        <p className="legend">{Object.entries(GROUP).map(([k, v]) => <span key={k}><i className={`m-${k}`} />{v}</span>)}</p>
      </section>
      <section className="grid2">
        <div className="card card--lav"><p className="stat">{w1 == null ? '—' : `${w0 == null ? '' : `${w0.toFixed(0)} → `}${w1.toFixed(0)} s`}</p><p className="small">average hum, this week</p></div>
        <div className="card card--lav"><p className="stat">{s.steadyPct == null ? '—' : `${s.steadyPct}%`}</p><p className="small">steady rounds</p></div>
      </section>
    </div>
  );
}
