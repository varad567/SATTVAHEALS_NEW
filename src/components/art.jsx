/**
 * FILE: src/components/art.jsx
 * PURPOSE: The creative layer (DESIGN §3b) — plain SVG + CSS, no libraries, all decorative (aria-hidden):
 *   Mandala  — one ring of petals per hum round; petal size = how long you hummed, fullness = how steady.
 *   Flower   — one per practised day in the Progress garden; bigger, more colourful = more practices that day.
 *   Celebrate — floating blobs when all three of today's practices are done.
 *   Skeleton — soft placeholder shapes while data loads.
 *   Gather   — the reveal: one blob per quiz answer drifts in and becomes Prana.
 * Rules shown here are display only; the numbers come from the hum engine (CORE_LOGIC §6).
 */
import { DOSHA_COLORS as D } from './Prana.jsx';
import { T } from '../engine/hum/coach.js';
import { DOSHAS } from '../engine/scorePrakriti.js';
import './art.css';

/**
 * Mandala: each hum round adds one ring of 8 petals around Prana (inner ring = round 1).
 * Petal size grows with hum length (full size = a full-length hum); a steady hum makes full, rounded petals,
 * a wavering one makes slimmer petals. Rings not yet hummed show as faint dotted circles.
 */
export function Mandala({ slots, rounds, kind, colors = [D.pitta, D.kapha, D.vata] }) {
  // Rings sit outside Prana's body (radius 54) and the outermost petals end inside the frame (99).
  const inner = 54, band = (99 - inner) / (slots + 0.75);
  const rings = Array.from({ length: slots }, (_, i) => i).reverse(); // draw outer rings first so inner ones overlap them
  return (
    <svg className="mandala" viewBox="-100 -100 200 200" aria-hidden="true">
      {rings.map((i) => {
        const r = rounds[i], d = inner + band * (i + 0.5);
        if (!r) return <circle key={i} className="ring-empty" r={d} />;
        const size = 0.55 + 0.45 * Math.min(1, r.length / T.goodLength[kind]);
        const ry = Math.max(3, band * 1.25 * size), rx = ry * (r.steadiness == null || r.steadiness < T.wavy ? 0.62 : 0.4);
        return (
          <g key={i} className={i === rounds.length - 1 ? 'ring-new' : undefined} fill={colors[i % 3]}>
            {Array.from({ length: 8 }, (_, k) => <ellipse key={k} cx="0" cy={-d} rx={rx} ry={ry} transform={`rotate(${k * 45 + (i % 2) * 22.5})`} />)}
          </g>
        );
      })}
    </svg>
  );
}

/** Garden flower: 5 petals; more practices that day = bigger bloom and more colours. */
export function Flower({ count }) {
  if (!count) return <svg className="flower" viewBox="-20 -20 40 40" aria-hidden="true"><circle r="2.5" className="seed" /></svg>;
  const palette = [[D.vata], [D.vata, D.pitta], [D.vata, D.pitta, D.kapha]][count - 1];
  return (
    <svg className="flower flower--on" viewBox="-20 -20 40 40" aria-hidden="true">
      <g transform={`scale(${[0.62, 0.82, 1][count - 1]})`}>
        {Array.from({ length: 5 }, (_, k) => <ellipse key={k} cx="0" cy="-9" rx="6" ry="9" fill={palette[k % palette.length]} transform={`rotate(${k * 72})`} />)}
        <circle r="4.5" fill="#35143F" />
      </g>
    </svg>
  );
}

export function Celebrate() {
  return (
    <div className="celebrate" aria-hidden="true">
      {Array.from({ length: 16 }, (_, i) => (
        <i key={i} style={{ '--x': `${(i * 37) % 100}%`, '--d': `${(i % 5) * 0.12}s`, '--s': 0.6 + ((i * 7) % 5) / 6, background: Object.values(D)[i % 3] }} />
      ))}
    </div>
  );
}

export const Skeleton = () => (
  <div className="skeleton" aria-busy="true" aria-label="Loading">
    <i className="sk sk--title" /><i className="sk sk--panel" /><i className="sk sk--card" /><i className="sk sk--card" /><i className="sk sk--card" />
  </div>
);

/** answers = quiz answers (0 Vata, 1 Pitta, 2 Kapha); each becomes a small blob drifting into the centre. */
export function Gather({ answers }) {
  return (
    <div className="gather" aria-hidden="true">
      {answers.map((a, i) => {
        const angle = (i / answers.length) * 2 * Math.PI;
        return <i key={i} style={{ '--x': `${Math.cos(angle) * 150}px`, '--y': `${Math.sin(angle) * 130}px`, '--d': `${i * 0.06}s`, background: D[DOSHAS[a]] }} />;
      })}
    </div>
  );
}
