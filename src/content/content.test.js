/**
 * Content checks: shape of every JSON file + the compliance word rule (CONTEXT §5)
 * over every user-visible string, including JSX text in src/.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import faq from './faq.json';
import landing from './landing.json';

const BANNED = /\b(treat|treats|treating|treatment|cure|cures|cured|curing|heals?|healing|diagnos\w*|therap(y|ies|eutic)|disorders?|symptoms?|patients?)\b/i;
// A banned word is allowed only right after a negation, e.g. "does not diagnose", "not a medical service".
const allowed = (text, i) => /\b(not|no|never)\s+(\w+\s+){0,2}$/i.test(text.slice(Math.max(0, i - 30), i));

function violations(text) {
  const out = []; const re = new RegExp(BANNED, 'gi'); let m;
  while ((m = re.exec(text))) if (!/sattva heals/i.test(text.slice(Math.max(0, m.index - 7), m.index + 6)) && !allowed(text, m.index)) out.push(m[0]);
  return out;
}
const strings = (v, skip = []) => (typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap((x) => strings(x, skip))
  : v && typeof v === 'object' ? Object.entries(v).filter(([k]) => !skip.includes(k)).flatMap(([, x]) => strings(x, skip)) : []);
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });

describe('Content shape', () => {
  it('every FAQ has a question, an answer and match keys', () => {
    expect(faq.length).toBeGreaterThanOrEqual(6);
    faq.forEach((f) => { expect(f.q.trim()).toMatch(/\?$/); expect(f.a.length).toBeGreaterThan(20); expect(f.keys.length).toBeGreaterThan(0); });
  });
  it('FAQ questions are unique', () => expect(new Set(faq.map((f) => f.q)).size).toBe(faq.length));
  it('story steps use valid colours and moods', () => {
    expect(landing.steps).toHaveLength(3);
    landing.steps.forEach((s) => { expect(['all', 'vata', 'pitta', 'kapha']).toContain(s.colors); expect(['idle', 'happy', 'humming']).toContain(s.mood); });
  });
  it('headline arrays have 2–3 lines (line 2 is the italic word)', () => {
    for (const k of ['hero', 'hum', 'rooted', 'cta']) expect(landing[k].title.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Compliance wording (CONTEXT §5)', () => {
  it('rule catches claims and allows disclaimers', () => {
    expect(violations('This will cure your stress')).toEqual(['cure']);
    expect(violations('A sound therapy session')).toEqual(['therapy']);
    expect(violations('It does not diagnose')).toEqual([]);
    expect(violations('Sattva Heals is free')).toEqual([]);
    expect(violations('Prana heals you')).toEqual(['heals']);
  });
  it('no banned words in content JSON (FAQ match keys excluded)', () => {
    const all = [...strings(faq, ['keys']), ...strings(landing)];
    expect(all.flatMap(violations)).toEqual([]);
  });
  it('no banned words in JSX text anywhere in src/', () => {
    const bad = walk('src').filter((p) => /\.jsx$/.test(p) && !/\.test\./.test(p)).flatMap((p) => {
      const text = readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''); // ignore comments
      return [...text.matchAll(/>([^<>{}]+)</g)].flatMap(([, t]) => violations(t).map((w) => `${p}: ${w}`));
    });
    expect(bad).toEqual([]);
  });
});
