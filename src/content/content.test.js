/**
 * Content checks: shape of every JSON file + the compliance word rule (CONTEXT §5)
 * over every user-visible string, including JSX text in src/.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import faq from './faq.json';
import landing from './landing.json';
import practices from './practices.json';
import quiz from './quiz.json';
import reasons from './reasons.json';
import humTips from './humTips.json';
import legal from './legal.json';
import app from './app.json';

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
  it('FAQ keys are specific (vague words make ordinary questions match by accident)', () => {
    const vague = ['who', 'what', 'how', 'help', 'keep', 'recommend', 'today', 'use', 'app'];
    faq.forEach((f) => f.keys.forEach((k) => expect(vague).not.toContain(k)));
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

describe('Practices (CORE_LOGIC §3)', () => {
  const MOODS = ['anxious', 'overthinking', 'irritable', 'stressed', 'low', 'sluggish', 'okay'];
  const DIETS = ['all', 'vegetarian', 'eggetarian', 'non-vegetarian', 'vegan', 'jain'];
  it('ids are unique and each module has at least 8', () => {
    expect(new Set(practices.map((p) => p.id)).size).toBe(practices.length);
    for (const m of ['dinacharya', 'ahara', 'mantra']) expect(practices.filter((p) => p.module === m).length).toBeGreaterThanOrEqual(8);
  });
  it.each(practices.map((p) => [p.id, p]))('%s is well-formed', (_, p) => {
    expect(p.title.length).toBeGreaterThan(3);
    expect([5, 10, 20]).toContain(p.minutes);
    expect(p.doshas.length).toBeGreaterThan(0); p.doshas.forEach((d) => expect(['vata', 'pitta', 'kapha']).toContain(d));
    expect(p.moods.length).toBeGreaterThan(0); p.moods.forEach((m) => expect(MOODS).toContain(m));
    p.diet.forEach((d) => expect(DIETS).toContain(d));
    if (p.diet.includes('all')) expect(p.diet).toEqual(['all']);
    expect(reasons.how[p.reasonKey], `reasonKey ${p.reasonKey}`).toBeTruthy();
    expect(p.steps.length).toBeGreaterThanOrEqual(2); p.steps.forEach((st) => expect(st).toMatch(/[.!?]$/));
    if (p.module === 'mantra') { expect(['bhramari', 'om']).toContain(p.humKind); expect(p.rounds).toBeGreaterThanOrEqual(3); }
    else expect(p.humKind).toBeNull();
    if (p.module !== 'ahara') expect(p.diet).toEqual(['all']);
  });
  it('Jain-tagged food never uses roots, onion, garlic, eggs, meat or honey', () => {
    const jain = practices.filter((p) => p.module === 'ahara' && (p.diet.includes('all') || p.diet.includes('jain')));
    const bad = /\b(ginger|onion|garlic|potato|carrot|beet|radish|egg|chicken|fish|meat|honey)\b/i;
    expect(jain.filter((p) => bad.test(p.title + p.steps.join(' '))).map((p) => p.id)).toEqual([]);
  });
  it('vegan-tagged food never uses dairy, ghee, honey or eggs without an alternative', () => {
    const vegan = practices.filter((p) => p.module === 'ahara' && (p.diet.includes('all') || p.diet.includes('vegan')));
    const bad = /\b(milk|ghee|curd|paneer|butter|honey|egg)\b(?![^.]*\b(or|vegan)\b)/i;
    expect(vegan.filter((p) => bad.test(p.steps.join(' '))).map((p) => p.id)).toEqual([]);
  });
  it('every reason key is used', () => {
    const used = new Set(practices.map((p) => p.reasonKey));
    expect(Object.keys(reasons.how).filter((k) => !used.has(k))).toEqual([]);
  });
});

describe('Quiz (CORE_LOGIC §2)', () => {
  it('12 questions, 3 options each, all distinct', () => {
    expect(quiz).toHaveLength(12);
    quiz.forEach((q) => { expect(q.o).toHaveLength(3); expect(new Set(q.o).size).toBe(3); expect(q.q.length).toBeGreaterThan(8); });
    expect(new Set(quiz.map((q) => q.q)).size).toBe(12);
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
  it('no banned words in any content JSON (data keys excluded)', () => {
    const all = [...strings(faq, ['keys']), ...strings(landing), ...strings(practices, ['id', 'reasonKey', 'humKind', 'module', 'diet', 'doshas', 'moods']), ...strings(quiz), ...strings(reasons), ...strings(humTips), ...strings(legal), ...strings(app)];
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
