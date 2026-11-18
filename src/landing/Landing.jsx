/**
 * FILE: src/landing/Landing.jsx
 * PURPOSE: The public landing page at "/" (docs/DESIGN.md §7). Copy lives in src/content/landing.json.
 * USED BY: src/main.jsx (route "/")
 */
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Prana from '../components/Prana.jsx';
import Story from './Story.jsx';
import copy from '../content/landing.json';
import faq from '../content/faq.json';
import './landing.css';

const Lines = ({ lines }) => lines.map((l, i) => <span key={i}>{i === 1 ? <em>{l}</em> : l}{' '}</span>);
const Start = ({ className = 'btn' }) => <Link to="/app" className={className}>Start free <span aria-hidden="true">→</span></Link>;

export default function Landing() {
  const root = useRef(null);
  // GSAP loads after first paint, in its own file, so the page shows faster.
  useEffect(() => {
    let cleanup = () => {}, alive = true;
    import('./motion.js').then((m) => { if (alive) cleanup = m.initLandingMotion(root.current); });
    return () => { alive = false; cleanup(); };
  }, []);

  return (
    <div ref={root} className="lp">
      <div className="lp-progress" aria-hidden="true" />
      <header className="lp-top">
        <a href="#top" className="lp-logo"><span aria-hidden="true" />Sattva Heals</a>
        <nav aria-label="Sections" className="lp-nav">
          <a href="#how">How it works</a><a href="#hum">Hum coach</a><a href="#faq">FAQ</a>
        </nav>
        <Start />
      </header>

      <main id="top">
        <section className="lp-hero">
          <div className="lp-hero__text">
            <p className="eyebrow lp-deva">{copy.hero.eyebrow}</p>
            <h1><Lines lines={copy.hero.title} /></h1>
            <p className="lp-lead">{copy.hero.sub}</p>
            <div className="lp-actions"><Start /><a href="#how" className="btn btn--ghost">See how it works</a></div>
          </div>
          <div className="lp-hero__art">
            <div className="lp-blob lp-hero__blob" aria-hidden="true" />
            <div className="lp-hero__prana"><Prana /></div>
            <p className="lp-bubble">{copy.hero.bubble}</p>
          </div>
        </section>

        <Story steps={copy.steps} />

        <section id="hum" className="lp-hum">
          <div className="lp-hum__art" aria-hidden="true"><i /><i /><Prana size={240} mood="humming" /></div>
          <div className="lp-hum__text">
            <p className="eyebrow">Nada practice</p>
            <h2><Lines lines={copy.hum.title} /></h2>
            <p className="lp-lead">{copy.hum.body}</p>
            <ul className="lp-measures">{copy.hum.measures.map((m) => <li key={m}>{m}</li>)}</ul>
            <p className="lp-privacy">{copy.hum.privacy}</p>
          </div>
        </section>

        <section className="lp-cards" aria-labelledby="diff">
          <h2 id="diff" className="sr-only">Why it's different</h2>
          {copy.cards.map((c) => <article key={c.title} className="lp-card"><h3>{c.title}</h3><p>{c.body}</p></article>)}
        </section>

        <section className="lp-rooted">
          <h2><Lines lines={copy.rooted.title} /></h2>
          <div><p className="lp-lead">{copy.rooted.body}</p><p className="lp-note">{copy.rooted.note}</p></div>
        </section>

        <section id="faq" className="lp-faq">
          <h2>Questions, <em>answered</em></h2>
          <div>{faq.map((f) => <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}</div>
        </section>

        <section className="lp-cta">
          <div className="lp-blob lp-cta__blob" aria-hidden="true" />
          <Prana size={160} mood="happy" />
          <h2><Lines lines={copy.cta.title} /></h2>
          <p>{copy.cta.sub}</p>
          <Start className="btn btn--gold" />
        </section>
      </main>

      <footer className="lp-foot">
        <p>{copy.footer.help}</p>
        <nav aria-label="Legal"><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></nav>
        <p>© {new Date().getFullYear()} Sattva Heals · 18+ only · Not a medical service</p>
      </footer>
    </div>
  );
}
