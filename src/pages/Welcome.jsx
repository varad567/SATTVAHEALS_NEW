/**
 * FILE: src/pages/Welcome.jsx
 * PURPOSE: Sign-in screen (Flow 1). Users must confirm they are 18+ first (DECISIONS D-24).
 */
import { useState } from 'react';
import Prana from '../components/Prana.jsx';
import { Bubble } from '../components/ui.jsx';
import { useApp } from '../app/AppState.jsx';
import { LOCAL_MODE } from '../lib/auth.js';
import copy from '../content/app.json';

export default function Welcome() {
  const { signIn } = useApp();
  const [adult, setAdult] = useState(false);
  const w = copy.welcome;
  return (
    <main className="screen screen--center welcome">
      <div className="blob-bg" aria-hidden="true" />
      <Prana size={190} popKey={adult ? 1 : 0} mood={adult ? 'happy' : 'idle'} />
      <Bubble>{w.bubble}</Bubble>
      <p className="eyebrow deva">सत्त्व</p>
      <h1>{w.title[0]} <em>{w.title[1]}</em> {w.title[2]}</h1>
      <label className="check"><input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} />{w.age}</label>
      <button type="button" className="btn btn--wide" disabled={!adult} onClick={signIn}>
        {LOCAL_MODE ? 'Continue (preview)' : 'Continue with Google'} <span aria-hidden="true">→</span>
      </button>
      {LOCAL_MODE && <p className="small">Preview mode: your answers are saved only in this browser.</p>}
      <p className="small">{w.note}</p>
    </main>
  );
}
