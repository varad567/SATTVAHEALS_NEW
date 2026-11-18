/**
 * FILE: src/pages/Profile.jsx
 * PURPOSE: Flow 5 — Prakriti, edit preferences (with "Saved" feedback), retake quiz, support, sign out,
 *   delete my data (type DELETE).
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Prana from '../components/Prana.jsx';
import { Sheet, SupportSheet } from '../components/ui.jsx';
import { useApp } from '../app/AppState.jsx';
import { cap } from '../lib/format.js';
import copy from '../content/app.json';

export default function Profile() {
  const { data, colors, saveProfile, signOut, deleteAll } = useApp();
  const [sheet, setSheet] = useState(null);
  const [typed, setTyped] = useState('');
  const [saved, setSaved] = useState(false);
  const pr = data.profile; const P = copy.prefs;
  const save = async (next) => { await saveProfile(next); setSaved(true); setTimeout(() => setSaved(false), 2000); };
  const sel = (k, label = String) => (
    <label className="field field--row">{P[k].q}
      <select value={pr.prefs[k]} onChange={(e) => save({ ...pr, prefs: { ...pr.prefs, [k]: k === 'minutes' ? Number(e.target.value) : e.target.value } })}>
        {P[k].o.map((v) => <option key={v} value={v}>{label(v)}</option>)}
      </select></label>);
  return (
    <div className="page page--grid">
      <header className="page__head row">
        <Prana size={110} colors={colors} />
        <div><p className="eyebrow">Profile</p><h1>{pr.name || 'You'}</h1>
          <p>{pr.prakriti.label} — V {pr.prakriti.vata} · P {pr.prakriti.pitta} · K {pr.prakriti.kapha}</p></div>
      </header>
      <section className="card">
        <label className="field field--row">{P.name}<input defaultValue={pr.name} maxLength={30} onBlur={(e) => e.target.value.trim() !== pr.name && save({ ...pr, name: e.target.value.trim() })} /></label>
        {sel('minutes', (v) => `${v} min`)}{sel('diet', cap)}{sel('wake')}
        <p className="small" role="status">{saved ? 'Saved ✓ — practices not done today have been re-picked.' : "Practices you haven't done today are re-picked when you change these."}</p>
      </section>
      <section className="stack">
        <Link className="btn btn--soft btn--wide" to="/app/onboarding?retake=1">Retake Prakriti quiz <span aria-hidden="true">→</span></Link>
        <button type="button" className="btn btn--ghost btn--wide" onClick={() => setSheet('help')}>Need more support? <span aria-hidden="true">→</span></button>
        <button type="button" className="btn btn--ghost btn--wide" onClick={signOut}>Sign out <span aria-hidden="true">→</span></button>
        <button type="button" className="link link--danger" onClick={() => { setTyped(''); setSheet('delete'); }}>Delete my data</button>
      </section>
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
