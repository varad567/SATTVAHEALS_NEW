import { buildReason } from './buildReason.js';
import practices from '../content/practices.json';
import R from '../content/reasons.json';

const byId = (id) => practices.find((p) => p.id === id);

describe('buildReason', () => {
  it('mentions Prakriti and mood when the practice suits the Prakriti', () => {
    expect(buildReason(byId('man-bhramari-6'), { dominant: 'vata', mood: 'overthinking' }))
      .toBe("You're Vata-dominant and your mind is busy — a long, slow hum gives the mind one simple thing to follow.");
  });
  it('mentions only the mood when the pick came from today’s mood', () => {
    expect(buildReason(byId('aha-coconut-water'), { dominant: 'vata', mood: 'irritable', diet: 'vegan' }))
      .toBe("You're feeling irritable today — cooling, gentle things are the traditional way to soften Pitta's heat — and it fits your vegan diet.");
  });
  it('okay mood: Prakriti only', () => {
    expect(buildReason(byId('din-sunrise-walk'), { dominant: 'kapha', mood: 'okay' })).toMatch(/^You're Kapha-dominant — /);
  });
  it('okay mood and a practice outside the Prakriti still reads well', () => {
    expect(buildReason(byId('din-cool-splash'), { dominant: 'kapha', mood: 'okay' })).toMatch(/^It keeps your Kapha side balanced — /);
  });
  it('diet line appears only on ahara cards', () => {
    expect(buildReason(byId('din-foot-oil'), { dominant: 'vata', mood: 'anxious', diet: 'jain' })).not.toMatch(/diet/);
  });
  it('every practice × dosha × mood gives one clean sentence', () => {
    for (const p of practices) for (const dominant of ['vata', 'pitta', 'kapha']) for (const mood of [...Object.keys(R.moods), 'okay']) {
      const s = buildReason(p, { dominant, mood, diet: 'vegetarian' });
      expect(s).toMatch(/^[A-Z].+\.$/);
      expect(s).not.toMatch(/undefined|null|\s{2}|\.\./);
      expect(s.length).toBeLessThan(200);
    }
  });
});
