import { scorePrakriti } from './scorePrakriti.js';

const of = (v, p, k) => [...Array(v).fill(0), ...Array(p).fill(1), ...Array(k).fill(2)];

describe('scorePrakriti — examples from CORE_LOGIC §2', () => {
  it('all Vata', () => expect(scorePrakriti(of(12, 0, 0))).toEqual({ vata: 100, pitta: 0, kapha: 0, dominant: 'vata', label: 'Vata' }));
  it('rounding is fixed on the largest share: 5/4/3 → 42/33/25', () => expect(scorePrakriti(of(5, 4, 3))).toMatchObject({ vata: 42, pitta: 33, kapha: 25 }));
  it('4/4/4 adds up to 100 and is balanced', () => expect(scorePrakriti(of(4, 4, 4))).toEqual({ vata: 34, pitta: 33, kapha: 33, dominant: 'vata', label: 'Tridosha · balanced' }));
  it('ties break Vata > Pitta > Kapha', () => {
    expect(scorePrakriti(of(0, 6, 6)).dominant).toBe('pitta');
    expect(scorePrakriti(of(6, 0, 6)).dominant).toBe('vata');
  });
  it('dual label when #2 is within 10 points', () => expect(scorePrakriti(of(6, 5, 1)).label).toBe('Vata · Pitta'));
  it('single label when #2 is more than 10 points behind', () => expect(scorePrakriti(of(8, 3, 1)).label).toBe('Vata'));
  it('dual label orders by score, not by name', () => expect(scorePrakriti(of(1, 5, 6)).label).toBe('Kapha · Pitta'));
  it('answer order does not matter', () => expect(scorePrakriti([2, 0, 1, 0, 0, 2, 1, 0, 0, 1, 0, 0])).toEqual(scorePrakriti(of(7, 3, 2))));
});

describe('scorePrakriti — bad input', () => {
  it.each([[[]], [of(11, 0, 0)], [of(13, 0, 0)], [[...of(11, 0, 0), 3]], [[...of(11, 0, 0), null]], [[...of(11, 0, 0), '1']], [null], [undefined], [{}]])(
    'rejects %j', (a) => expect(() => scorePrakriti(a)).toThrow(/exactly 12 answers/));
});

describe('scorePrakriti — every possible quiz (3^12 = 531,441 answer sets)', () => {
  it('always totals 100, picks the true leader, and labels consistently', () => {
    const seen = new Set();
    for (let n = 0; n < 3 ** 12; n++) {
      const a = []; let x = n;
      for (let i = 0; i < 12; i++) { a.push(x % 3); x = Math.floor(x / 3); }
      const r = scorePrakriti(a);
      const key = `${r.vata},${r.pitta},${r.kapha}`;
      if (seen.has(key)) continue; seen.add(key); // results depend only on counts; check each distinct one once
      const c = [0, 0, 0]; a.forEach((v) => c[v]++);
      if (r.vata + r.pitta + r.kapha !== 100) throw new Error(`sum ${key}`);
      if ([r.vata, r.pitta, r.kapha].some((v) => v < 0 || v > 100)) throw new Error(`range ${key}`);
      const max = Math.max(...c); const lead = ['vata', 'pitta', 'kapha'][c.indexOf(max)];
      if (r.dominant !== lead) throw new Error(`dominant ${key} → ${r.dominant}`);
      const p = [r.vata, r.pitta, r.kapha]; if (p[['vata', 'pitta', 'kapha'].indexOf(r.dominant)] !== Math.max(...p)) throw new Error(`rounding flipped leader ${key}`);
      if (!/^(Vata|Pitta|Kapha)( · (Vata|Pitta|Kapha))?$|^Tridosha · balanced$/.test(r.label)) throw new Error(`label ${r.label}`);
    }
    expect(seen.size).toBe(91); // every way to split 12 answers into three groups
  });
});
