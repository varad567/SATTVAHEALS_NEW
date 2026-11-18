import { render } from '@testing-library/react';
import { Mandala, Flower, Gather, Celebrate } from './art.jsx';
import { skyAt, startSky } from '../lib/sky.js';

describe('Mandala (one ring of 8 petals per hum round)', () => {
  const r = (length, steadiness = 0.05) => ({ length, steadiness });
  const ring = (c, i) => [...c.querySelectorAll('g')][i];
  it('one ring per hummed round, dotted circles for rounds still to come', () => {
    const { container } = render(<Mandala slots={6} rounds={[r(9), r(9)]} kind="bhramari" />);
    expect(container.querySelectorAll('g')).toHaveLength(2);
    expect(container.querySelectorAll('g ellipse')).toHaveLength(16);
    expect(container.querySelectorAll('.ring-empty')).toHaveLength(4);
  });
  const petal = (rounds, kind = 'bhramari') => render(<Mandala slots={3} rounds={rounds} kind={kind} />).container.querySelector('g ellipse');
  it('a longer hum makes bigger petals, capped at a full-length hum', () => {
    const ry = (len) => Number(petal([r(len)]).getAttribute('ry'));
    expect(ry(4)).toBeLessThan(ry(8));
    expect(ry(8)).toBe(ry(20));
  });
  it('a wavy hum makes slimmer petals; timer-only rounds (no steadiness) count as full', () => {
    const rx = (st) => Number(petal([r(9, st)], 'om').getAttribute('rx'));
    expect(rx(0.4)).toBeLessThan(rx(0.05));
    expect(rx(null)).toBe(rx(0.05));
  });
  it('rings sit outside Prana and inside the frame, for any number of rounds', () => {
    for (const slots of [3, 6, 9, 12]) {
      const rounds = Array.from({ length: slots }, () => r(9));
      const { container, unmount } = render(<Mandala slots={slots} rounds={rounds} kind="bhramari" />);
      for (const e of container.querySelectorAll('g ellipse')) {
        const cy = -Number(e.getAttribute('cy')), ry = Number(e.getAttribute('ry'));
        expect(cy - ry).toBeGreaterThan(40); expect(cy + ry).toBeLessThanOrEqual(100);
      }
      unmount();
    }
  });
  it('only the newest ring animates in', () => {
    const { container } = render(<Mandala slots={6} rounds={[r(9), r(9), r(9)]} kind="om" />);
    expect(container.querySelectorAll('.ring-new')).toHaveLength(1);
  });
  it('is decorative', () => expect(render(<Mandala slots={3} rounds={[]} kind="om" />).container.firstChild).toHaveAttribute('aria-hidden', 'true'));
});

describe('Garden flower', () => {
  it('no practice → a seed', () => expect(render(<Flower count={0} />).container.querySelector('.seed')).not.toBeNull());
  it.each([1, 2, 3])('%i practices → a 5-petal bloom with %i colour(s), bigger with more practices', (count) => {
    const { container } = render(<Flower count={count} />);
    const fills = new Set([...container.querySelectorAll('ellipse')].map((e) => e.getAttribute('fill')));
    expect(container.querySelectorAll('ellipse')).toHaveLength(5);
    expect(fills.size).toBe(count);
  });
});

describe('Reveal and celebration', () => {
  it('one gathering blob per quiz answer, coloured by its dosha', () => {
    const { container } = render(<Gather answers={[0, 1, 2, 0]} />);
    const blobs = container.querySelectorAll('i');
    expect(blobs).toHaveLength(4);
    expect(blobs[0].style.background).toBe(blobs[3].style.background);
    expect(blobs[0].style.background).not.toBe(blobs[1].style.background);
  });
  it('celebration is decorative and does not block taps', () => {
    const c = render(<Celebrate />).container.firstChild;
    expect(c).toHaveAttribute('aria-hidden', 'true');
    expect(c.querySelectorAll('i').length).toBeGreaterThan(8);
  });
});

describe('Sky and night mode', () => {
  it.each([[4, 'night'], [5, 'dawn'], [7, 'dawn'], [8, 'day'], [16, 'day'], [17, 'dusk'], [19, 'dusk'], [20, 'night'], [23, 'night'], [0, 'night']])('%i:00 → %s', (h, sky) => expect(skyAt(h)).toBe(sky));
  const at = (h, dark = false) => {
    window.matchMedia = (q) => ({ matches: dark && q.includes('dark'), addEventListener() {}, removeEventListener() {} });
    const root = document.createElement('html');
    const stop = startSky(root, () => new Date(2026, 10, 18, h)); stop();
    return root.dataset;
  };
  it('daytime is the day theme', () => expect({ ...at(12) }).toEqual({ sky: 'day', theme: 'day' }));
  it('night hours switch to the night theme', () => expect({ ...at(22) }).toEqual({ sky: 'night', theme: 'night' }));
  it('a phone in dark mode gets the night theme even at noon', () => expect({ ...at(12, true) }).toEqual({ sky: 'day', theme: 'night' }));
  it('dawn keeps the day theme with a dawn sky', () => expect({ ...at(6) }).toEqual({ sky: 'dawn', theme: 'day' }));
});
