/**
 * FILE: src/landing/Story.jsx
 * PURPOSE: "How it works" — 3 steps; Prana (sticky) changes as each step reaches mid-screen.
 * INPUT: steps[] from landing.json — { n, title, body, colors: 'all' | dosha, mood }
 * Works without JS motion: IntersectionObserver only swaps Prana's look, nothing is hidden.
 */
import { useEffect, useRef, useState } from 'react';
import Prana, { DOSHA_COLORS as D } from '../components/Prana.jsx';

// Front blob = the step's dosha; 'all' = the welcome mix (DESIGN §2).
const look = (c) => (c === 'all' ? undefined : [D.pitta, D.kapha, D[c]]);

export default function Story({ steps }) {
  const [active, setActive] = useState(0);
  const refs = useRef([]);

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(Number(e.target.dataset.i))),
      { rootMargin: '-45% 0px -45% 0px' } // a thin band across the middle of the screen
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [steps.length]);

  const s = steps[active];
  return (
    <section id="how" className="lp-story" aria-labelledby="how-title">
      <div className="lp-story__art">
        <div className="lp-story__sticky">
          <Prana colors={look(s.colors)} mood={s.mood} popKey={active} />
          <p className="lp-story__caption" aria-live="polite">{s.n} / {s.title}</p>
        </div>
      </div>
      <div className="lp-story__steps">
        <p className="eyebrow">How it works</p>
        <h2 id="how-title">Three steps. <em>Ten minutes.</em></h2>
        {steps.map((st, i) => (
          <article key={st.n} data-i={i} ref={(el) => (refs.current[i] = el)} className={`lp-step${i === active ? ' is-active' : ''}`}>
            <span className="lp-step__n">{st.n}</span>
            <h3>{st.title}</h3>
            <p>{st.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
