/**
 * FILE: src/pages/Welcome.jsx
 * PURPOSE: Sign-in screen (Flow 1). Users must confirm they are 18+ first (DECISIONS D-24).
 */
import { useState } from 'react';
import { Flow } from '../components/ui.jsx';
import { useApp } from '../app/AppState.jsx';
import { LOCAL_MODE } from '../lib/auth.js';
import copy from '../content/app.json';

export default function Welcome() {
  const { signIn } = useApp();
  const [adult, setAdult] = useState(false);
  const w = copy.welcome;
  return (
    <Flow hero prana={{ mood: adult ? 'happy' : 'idle', popKey: adult ? 1 : 0 }} say={w.bubble}>
      <p className="eyebrow deva">सत्त्व · everyday wellbeing</p>
      <h1>{w.title[0]} <em>{w.title[1]}</em> {w.title[2]}</h1>
      <label className="check"><input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} />{w.age}</label>
      <button type="button" className="btn btn--wide" disabled={!adult} onClick={signIn}>
        {LOCAL_MODE ? 'Continue (preview)' : 'Continue with Google'} <span aria-hidden="true">→</span>
      </button>
      <p className="small">{LOCAL_MODE && 'Preview mode: your answers are saved only in this browser. '}{w.note}</p>
    </Flow>
  );
}
