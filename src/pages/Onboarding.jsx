/**
 * FILE: src/pages/Onboarding.jsx
 * PURPOSE: Flow 2 — quiz (12 questions, resumable) → preferences → Prakriti reveal.
 *   ?retake=1 (from Profile): quiz → reveal only; existing name and preferences are kept.
 */
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { colorsFor } from '../components/Prana.jsx';
import { Flow } from '../components/ui.jsx';
import { useApp } from '../app/AppState.jsx';
import { scorePrakriti, DOSHAS } from '../engine/scorePrakriti.js';
import { cap } from '../lib/format.js';
import quiz from '../content/quiz.json';
import copy from '../content/app.json';

const DRAFT = 'sh.quiz.draft'; // CORE_LOGIC §2.5
const loadDraft = () => { try { return JSON.parse(localStorage.getItem(DRAFT)) || []; } catch { return []; } };

export default function Onboarding() {
  const { data, user, saveProfile } = useApp();
  const retake = useSearchParams()[0].has('retake');
  const go = useNavigate();
  const [answers, setAnswers] = useState(() => (retake ? [] : loadDraft()));
  const [i, setI] = useState(() => Math.min(answers.length, quiz.length - 1));
  const [step, setStep] = useState(answers.length >= quiz.length ? 'prefs' : 'quiz');
  const [prefs, setPrefs] = useState(data?.profile?.prefs ?? { minutes: 10, diet: 'vegetarian', wake: '06:30' });
  const [name, setName] = useState(data?.profile?.name ?? user?.name ?? ''); // Google first name, if any

  const tally = { vata: 0, pitta: 0, kapha: 0 };
  answers.forEach((a) => tally[DOSHAS[a]]++);
  const live = { colors: answers.length ? colorsFor(tally) : undefined, popKey: answers.length };

  const answer = (k) => {
    const next = [...answers.slice(0, i), k, ...answers.slice(i + 1)];
    setAnswers(next); localStorage.setItem(DRAFT, JSON.stringify(next));
    if (i < quiz.length - 1) setI(i + 1);
    else if (retake) finish(next); else setStep('prefs');
  };
  async function finish(all = answers) {
    await saveProfile({ ...data?.profile, name: name.trim(), prefs, prakriti: scorePrakriti(all) });
    localStorage.removeItem(DRAFT);
    setStep('reveal');
  }

  if (step === 'reveal') {
    const p = data.profile.prakriti;
    const blurb = copy.doshaBlurbs[p.label.startsWith('Tridosha') ? 'tridosha' : p.dominant];
    return (
      <Flow hero prana={{ colors: colorsFor(p), mood: 'happy', popKey: 'reveal' }} say={`${blurb} I've taken your colours.`}>
        <p className="eyebrow">Your Prakriti</p>
        <h1>{p.label}</h1>
        <div className="card bars">
          {DOSHAS.map((d) => <div key={d} className="bar"><span>{cap(d)}</span><b>{p[d]}%</b><i className={`bar__fill bar__fill--${d}`} style={{ width: `${p[d]}%` }} /></div>)}
        </div>
        <button type="button" className="btn btn--wide" onClick={() => go(retake ? '/app/today' : '/app/checkin')}>
          {retake ? 'Back to today' : "Continue to today's check-in"} <span aria-hidden="true">→</span></button>
      </Flow>
    );
  }

  if (step === 'prefs') {
    const P = copy.prefs;
    const opt = (key, label = String) => (
      <fieldset className="choices"><legend>{P[key].q}</legend>
        {P[key].o.map((v) => <button key={v} type="button" aria-pressed={prefs[key] === v} onClick={() => setPrefs({ ...prefs, [key]: v })}>{label(v)}</button>)}
      </fieldset>);
    return (
      <Flow prana={live} say="Almost there — a few quick ones so your practices fit your day.">
        <p className="eyebrow">A little about your day</p>
        <h1>Almost <em>there.</em></h1>
        <label className="field">{P.name}<input value={name} maxLength={30} autoComplete="given-name" onChange={(e) => setName(e.target.value)} placeholder="Your first name" /></label>
        {opt('minutes', (v) => `${v} min`)}{opt('diet', cap)}{opt('wake')}
        <button type="button" className="btn btn--wide" onClick={() => finish()}>Reveal my Prakriti <span aria-hidden="true">→</span></button>
      </Flow>
    );
  }

  return (
    <Flow prana={live} say={copy.quizLines[Math.min(5, Math.floor(i / 2.4))]}>
      <div className="quiz-top">
        <button type="button" className="icon-btn" aria-label="Previous question" disabled={i === 0} onClick={() => setI(i - 1)}>←</button>
        <span className="eyebrow">Question {i + 1} of {quiz.length}</span>
      </div>
      <div className="progress" role="progressbar" aria-label="Quiz progress" aria-valuemin={0} aria-valuemax={quiz.length} aria-valuenow={answers.length}><i style={{ width: `${(answers.length / quiz.length) * 100}%` }} /></div>
      <h1 className="h-q" key={i}>{quiz[i].q}</h1>
      <div className="options">
        {quiz[i].o.map((t, k) => <button key={t} type="button" aria-pressed={answers[i] === k} onClick={() => answer(k)}>{t}</button>)}
      </div>
    </Flow>
  );
}
