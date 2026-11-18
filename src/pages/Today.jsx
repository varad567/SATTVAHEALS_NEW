/**
 * FILE: src/pages/Today.jsx
 * PURPOSE: The dashboard — Today's 3 with "why this for you", expandable steps, done/undo (Flow 3).
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Prana from '../components/Prana.jsx';
import { Bubble, SupportSheet } from '../components/ui.jsx';
import { Celebrate } from '../components/art.jsx';
import { useApp } from '../app/AppState.jsx';
import { buildReason } from '../engine/buildReason.js';
import { MODULES } from '../engine/pickToday.js';
import { greeting, dayLabel } from '../lib/format.js';
import copy from '../content/app.json';

const LABEL = { dinacharya: 'Dinacharya', ahara: 'Ahara', mantra: 'Mantra · Nada' };

function Card({ module, p, done, reason, onToggle }) {
  const [open, setOpen] = useState(false);
  if (!p) return <article className="pcard pcard--empty"><Prana size={56} mood="idle" /><div><p className="eyebrow">{LABEL[module]}</p><p>{copy.noMatch}</p></div></article>;
  return (
    <article className={`pcard pcard--${module}${done ? ' is-done' : ''}`}>
      <div className="pcard__top">
        <button type="button" className="pcard__main" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span className="eyebrow">{LABEL[module]} · {p.minutes} min · {p.when}</span>
          <span className="pcard__title">{p.title}</span>
          <span className="pcard__why"><strong>Why for you:</strong> {reason}</span>
        </button>
        <button type="button" className="tick" aria-pressed={done} aria-label={`${done ? 'Mark not done' : 'Mark done'}: ${p.title}`} onClick={onToggle}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>
        </button>
      </div>
      {open && (
        <div className="pcard__steps">
          <ol>{p.steps.map((s) => <li key={s}>{s}</li>)}</ol>
          {p.humKind && <Link className="btn btn--gold" to={`/app/hum/${p.id}`}>Hum with Prana <span aria-hidden="true">→</span></Link>}
        </div>
      )}
    </article>
  );
}

export default function Today() {
  const { data, date, plan, mood, doneToday, setDone, colors, idleMood } = useApp();
  const [help, setHelp] = useState(false);
  const { name, prakriti, prefs } = data.profile;
  const n = MODULES.filter((m) => doneToday[m]).length;
  // Celebrate only when the 3rd card is ticked now — not every time the page opens with all done.
  const prev = useRef(n); const [party, setParty] = useState(false);
  useEffect(() => { if (n === 3 && prev.current < 3) { setParty(true); const t = setTimeout(() => setParty(false), 2600); prev.current = n; return () => clearTimeout(t); } prev.current = n; }, [n]);
  const toggle = (m) => { if (!doneToday[m]) navigator.vibrate?.(12); setDone(m, plan[m].id, !doneToday[m]); };
  const moodLabel = mood === 'okay' ? 'Feeling okay' : copy.moods.find((m) => m.id === mood)?.label;
  return (
    <div className="today">
      <header className="today__head">
        <div><p className="eyebrow">{dayLabel(date, { weekday: 'long', day: 'numeric', month: 'short' })}</p>
          <h1>{greeting()}{name ? <>, <em>{name}</em></> : null}</h1></div>
        <Link className="chip" to="/app/checkin" aria-label={`Today's mood: ${moodLabel}. Change`}>{moodLabel} ✎</Link>
      </header>
      <section className="today__prana" aria-label="Prana">
        <Prana colors={colors} mood={n === 3 ? 'happy' : idleMood} popKey={n} />
        <div className="stack">
          <Bubble>{copy.todayLines[n]}</Bubble>
          <div className="pills" role="img" aria-label={`${n} of 3 done`}>{MODULES.map((m, k) => <i key={m} className={k < n ? 'on' : ''} />)}</div>
        </div>
      </section>
      <section className="today__cards" aria-label="Today's three practices">
        {MODULES.map((m) => (
          <Card key={m} module={m} p={plan[m]} done={!!doneToday[m]}
            reason={plan[m] && buildReason(plan[m], { dominant: prakriti.dominant, mood: mood ?? 'okay', diet: prefs.diet })}
            onToggle={() => toggle(m)} />
        ))}
        {n === 3 && <Link className="btn btn--wide" to="/app/progress">All done for today · see your rhythm <span aria-hidden="true">→</span></Link>}
        <button type="button" className="link" onClick={() => setHelp(true)}>Need more support? Talk to a professional</button>
      </section>
      {help && <SupportSheet onClose={() => setHelp(false)} />}
      {party && <Celebrate />}
    </div>
  );
}
