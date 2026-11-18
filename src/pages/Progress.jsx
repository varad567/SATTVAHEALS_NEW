/**
 * FILE: src/pages/Progress.jsx
 * PURPOSE: Last 14 days — days practised, what works for you, mood trend, hum stats (CORE_LOGIC §8).
 *   Hum stats appear only once there is a hum session, so new users see no empty "—" boxes.
 */
import Prana from '../components/Prana.jsx';
import { useApp } from '../app/AppState.jsx';
import { progressStats } from '../engine/progressStats.js';

const GROUP = { okay: 'okay', busy: 'busy mind', heated: 'heated', heavy: 'heavy' };
const KIND = { bhramari: 'Bhramari', om: 'Om' };

export default function Progress() {
  const { data, date, colors } = useApp();
  const s = progressStats({ ...data, today: date });
  const works = Object.entries(s.works).sort((a, b) => b[1].change - a[1].change);
  const [w0, w1] = s.avgHumByWeek;
  return (
    <div className="page page--grid">
      <header className="page__head"><p className="eyebrow">Last 14 days</p><h1>Your <em>rhythm</em></h1></header>
      <section className="card card--lav">
        <div className="card__row"><h2 className="h-card">Days practised</h2><span>{s.daysPractised} of 14</span></div>
        <div className="days">{s.days.map((d) => <i key={d.date} className={d.done ? 'on' : undefined} title={d.date} />)}</div>
      </section>
      <section className="card card--plum works">
        <Prana size={90} colors={colors} mood={works.length ? 'happy' : 'idle'} />
        <div className="stack"><p className="eyebrow">What works for you</p>
          {works.length
            ? <><p className="h-card">{works.map(([k, v]) => `${KIND[k]} ${v.change > 0 ? '+' : ''}${v.change}`).join(' · ')}</p><p className="small small--light">Average change in how settled you feel, before → after</p></>
            : <p>After three hum sessions with before/after taps, Prana will show which practice settles you most.</p>}
          {s.steadyPct != null && <p className="small small--light">Hum {w0 != null ? `${w0.toFixed(0)} → ` : ''}{w1 != null ? `${w1.toFixed(0)} s this week` : ''} · {s.steadyPct}% steady rounds</p>}
        </div>
      </section>
      <section className="card page__wide">
        <h2 className="h-card">Mood check-ins</h2>
        <div className="moodbars">{s.moodGroups.map((g, i) => <i key={i} className={g ? `m-${g}` : undefined} title={g ? GROUP[g] : 'no check-in'} />)}</div>
        <p className="legend">{Object.entries(GROUP).map(([k, v]) => <span key={k}><i className={`m-${k}`} />{v}</span>)}</p>
      </section>
    </div>
  );
}
