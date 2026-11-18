/**
 * FILE: src/engine/scorePrakriti.js
 * PURPOSE: Turns 12 quiz answers into Vata/Pitta/Kapha percentages (docs/CORE_LOGIC.md §2).
 * INPUT: answers[] — one entry per question: 0 = Vata, 1 = Pitta, 2 = Kapha
 * OUTPUT: { vata, pitta, kapha, dominant, label } — percentages always add up to 100
 * USED BY: onboarding, profile (retake)
 */
export const DOSHAS = ['vata', 'pitta', 'kapha']; // order = tie-break priority (§2.3)
const NAME = { vata: 'Vata', pitta: 'Pitta', kapha: 'Kapha' };

export function scorePrakriti(answers, questionCount = 12) {
  if (!Array.isArray(answers) || answers.length !== questionCount || !answers.every((a) => a === 0 || a === 1 || a === 2)) {
    throw new Error(`scorePrakriti needs exactly ${questionCount} answers, each 0, 1 or 2`);
  }
  const counts = [0, 0, 0];
  answers.forEach((a) => counts[a]++);

  // §2.2 round, then fix the total to exactly 100 without changing who leads:
  // a missing point goes to the largest share, an extra point comes off the smallest.
  const pct = counts.map((c) => Math.round((c / questionCount) * 100));
  const order = [0, 1, 2].sort((a, b) => counts[b] - counts[a] || a - b); // highest first, ties by DOSHAS order
  const diff = 100 - pct.reduce((s, x) => s + x, 0);
  pct[diff > 0 ? order[0] : order[2]] += diff;

  const [first, second, third] = order.map((i) => DOSHAS[i]);
  const p = { vata: pct[0], pitta: pct[1], kapha: pct[2] };
  // §2.4 dual if #2 is within 10 points of #1; balanced if all three are
  const label = p[first] - p[third] <= 10 ? 'Tridosha · balanced'
    : p[first] - p[second] <= 10 ? `${NAME[first]} · ${NAME[second]}` : NAME[first];

  return { ...p, dominant: first, label };
}
