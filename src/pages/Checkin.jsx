/**
 * FILE: src/pages/Checkin.jsx
 * PURPOSE: Daily mood check-in (Flow 1/3). Saving again the same day replaces the mood and re-picks not-done cards.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flow } from '../components/ui.jsx';
import { useApp } from '../app/AppState.jsx';
import { dayLabel } from '../lib/format.js';
import copy from '../content/app.json';

export default function Checkin() {
  const { mood, setMood, colors, date, idleMood } = useApp();
  const [pick, setPick] = useState(mood);
  const go = useNavigate();
  const say = pick === 'okay' ? copy.okay.say : copy.moods.find((m) => m.id === pick)?.say ?? copy.checkinAsk;
  return (
    <Flow prana={{ colors, mood: pick === 'okay' ? 'happy' : idleMood, popKey: pick ?? '' }} say={say}>
      <p className="eyebrow">{dayLabel(date)} · daily check-in</p>
      <h1>How are you feeling <em>today?</em></h1>
      <div className="moods">
        {copy.moods.map((m) => <button key={m.id} type="button" aria-pressed={pick === m.id} onClick={() => setPick(m.id)}>{m.label}</button>)}
        <button type="button" className="moods__okay" aria-pressed={pick === 'okay'} onClick={() => setPick('okay')}>{copy.okay.label}</button>
      </div>
      <button type="button" className="btn btn--wide" disabled={!pick} onClick={async () => { await setMood(pick); go('/app/today'); }}>
        Show my 3 practices <span aria-hidden="true">→</span></button>
    </Flow>
  );
}
