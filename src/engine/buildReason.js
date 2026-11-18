/**
 * FILE: src/engine/buildReason.js
 * PURPOSE: The one-line "why this for you" on every card (docs/CORE_LOGIC.md §5).
 * INPUT: practice, { dominant, mood, diet }
 * OUTPUT: string, e.g. "You're Vata-dominant and your mind is busy — a long, slow hum gives the mind one simple thing to follow."
 */
import R from '../content/reasons.json';

export function buildReason(practice, { dominant, mood, diet }) {
  const name = R.doshaNames[dominant];
  const feeling = R.moods[mood]; // undefined for 'okay'
  // Mention the Prakriti only when the practice suits it; otherwise the pick came from today's mood.
  const who = practice.doshas.includes(dominant)
    ? (feeling ? `You're ${name}-dominant and ${feeling}` : `You're ${name}-dominant`)
    : (feeling ? `You're ${feeling} today` : `It keeps your ${name} side balanced`);
  const fits = practice.module === 'ahara' && diet ? ` — and it fits your ${diet} diet` : '';
  return `${who} — ${R.how[practice.reasonKey]}${fits}.`;
}
