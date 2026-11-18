/**
 * FILE: src/pages/Legal.jsx
 * PURPOSE: Privacy policy and Terms of use, rendered from src/content/legal.json.
 * PROPS: doc — 'privacy' | 'terms'
 */
import { Link } from 'react-router-dom';
import L from '../content/legal.json';

export default function Legal({ doc }) {
  const d = L[doc];
  return (
    <main className="legal">
      <Link to="/" className="legal__back">← Sattva Heals</Link>
      <h1>{d.title}</h1>
      <p className="small">Last updated {L.updated}</p>
      <p className="legal__intro">{d.intro}</p>
      {d.sections.map((s) => (
        <section key={s.h}><h2>{s.h}</h2>{s.p.map((p) => <p key={p}>{p}</p>)}</section>
      ))}
      <p>Contact: <a href={`mailto:${L.contact}`}>{L.contact}</a></p>
      <nav className="legal__nav" aria-label="Legal"><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></nav>
    </main>
  );
}
