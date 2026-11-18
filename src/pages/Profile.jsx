/**
 * FILE: src/pages/Profile.jsx
 * PURPOSE: Flow 5 — Prakriti, edit preferences, retake quiz, support, sign out, delete my data (type DELETE).
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Prana, { colorsFor } from '../components/Prana.jsx';
import { Sheet, SupportSheet } from '../components/ui.jsx';
import { useApp } from '../app/AppState.jsx';
import copy from '../content/app.json';

const cap = (s) => s[0].toUpperCase() + s.slice(1);

export default function Profile() {
  const { data, saveProfile, signOut, deleteAll } = useApp();
  const [sheet, setSheet] = useState(null);
  const [typed, setTyped] = useState('');
  const pr = data.profile; const P = copy.prefs;
  const setPref = (k, v) => saveProfile({ ...pr, prefs: { ...pr.prefs, [k]: v } });
  const sel = (k, values, label = String) => (
    <label className="field field--row">{P[k].q}
      <select value={pr.prefs[k]} onChange={(e) => setPref(k, k === 'minutes' ? Number(e.target.value) : e.target.value)}>
        {values.map((v) => <option key={v} value={v}>{label(v)}</option>)}
      </select></label>);
  return (
    <div className="page">
      <div className="row">
        <Prana size={110} colors={colorsFor(pr.prakriti)} />
        <div><p className="eyebrow">Profile</p><h1>{pr.name || 'You'}</h1>
          <p>{pr.prakriti.label} — V {pr.prakriti.vata} · P {pr.prakriti.pitta} · K {pr.prakriti.kapha}</p></div>
      </div>
      <section className="card">
        <label className="field field--row">{P.name}<input defaultValue={pr.name} maxLength={30} onBlur={(e) => e.target.value.trim() !== pr.name && saveProfile({ ...pr, name: e.target.value.trim() })} /></label>
        {sel('minutes', P.minutes.o, (v) => `${v} min`)}
        {sel('diet', P.diet.o, cap)}
        {sel('wake', P.wake.o)}
        <p className="small">Practices you haven't done today are re-picked when you change these.</p>
      </section>
      <div className="stack">
        <Link className="btn btn--soft btn--wide" to="/app/onboarding?retake=1">Retake Prakriti quiz <span aria-hidden="true">→</span></Link>
        <button type="button" className="btn btn--ghost btn--wide" onClick={() => setSheet('help')}>Need more support? <span aria-hidden="true">→</span></button>
        <button type="button" className="btn btn--ghost btn--wide" onClick={signOut}>Sign out <span aria-hidden="true">→</span></button>
        <button type="button" className="link link--danger" onClick={() => { setTyped(''); setSheet('delete'); }}>Delete my data</button>
      </div>
      {sheet === 'help' && <SupportSheet onClose={() => setSheet(null)} />}
      {sheet === 'delete' && (
        <Sheet title="Delete my data" onClose={() => setSheet(null)}>
          <p>This removes your Prakriti, check-ins, practice history and hum stats for good. It can't be undone.</p>
          <label className="field">Type <strong>DELETE</strong> to confirm<input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" /></label>
          <button type="button" className="btn btn--danger btn--wide" disabled={typed !== 'DELETE'} onClick={deleteAll}>Delete everything and sign out</button>
        </Sheet>
      )}
    </div>
  );
}
