/**
 * Hum coach screen: timer-only path, the real mic path with a fake microphone playing synthetic hums,
 * the early-end rule, and saving.
 */
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { routes } from '../main.jsx';
import { load } from '../lib/db.js';

const PROFILE = { name: 'V', prefs: { minutes: 10, diet: 'vegetarian', wake: '06:30' }, prakriti: { vata: 75, pitta: 17, kapha: 8, dominant: 'vata', label: 'Vata' } };
const today = new Date().toLocaleDateString('en-CA');
const btn = (name) => screen.getByRole('button', { name });
const click = (el) => act(async () => { fireEvent.click(el); });
const flush = () => act(async () => {}); // data loads via promises; with fake timers, findBy* would wait forever

function setup(id = 'man-bhramari-3') {
  localStorage.setItem('sh.user', JSON.stringify({ id: 'u' }));
  localStorage.setItem('sh.db.v1', JSON.stringify({ u: { profile: PROFILE, checkins: [{ date: today, mood: 'anxious' }], completions: [], sessions: [] } }));
  render(<MemoryRouter initialEntries={[`/app/hum/${id}`]}>{routes}</MemoryRouter>);
}

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); localStorage.clear(); });

it('an unknown or non-mantra practice id goes back to Today', async () => {
  setup('din-foot-oil');
  expect(await screen.findByRole('heading', { name: /good (morning|afternoon|evening)/i })).toBeInTheDocument();
});

it('setup preselects the card’s practice and the before tap is optional and toggles', async () => {
  setup('man-om-6');
  expect(await screen.findByRole('button', { name: 'Om' })).toHaveAttribute('aria-pressed', 'true');
  await click(btn('3')); expect(btn('3')).toHaveAttribute('aria-pressed', 'true');
  expect(btn(/^start with the mic/i)).toBeInTheDocument();
  await click(btn('3')); expect(btn(/skip and start/i)).toBeInTheDocument();
});

it('no microphone in this browser → explains, offers timer-only', async () => {
  setup();
  await click((await flush(), screen.getByRole('button', { name: /start with the mic/i })));
  expect(screen.getByText(/couldn't use the microphone/i)).toBeInTheDocument();
  expect(btn(/try again/i)).toBeInTheDocument();
});

describe('timer-only session', () => {
  async function hum(secs, gap) {
    const b = btn(/hold while you hum/i);
    await act(async () => { fireEvent.pointerDown(b); vi.advanceTimersByTime(secs * 1000); fireEvent.pointerUp(b); vi.advanceTimersByTime(gap * 1000); });
  }
  it('3 holds → summary with real numbers → save stores numbers only and marks the mantra done', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'setTimeout', 'performance'] });
    setup();
    await click((await flush(), screen.getByRole('button', { name: /use the timer only/i })));
    expect(screen.getByText(/round 1 of 3/i)).toBeInTheDocument();
    await hum(9, 4); await hum(5, 2);
    expect(screen.getByText(tipsShortInhaleOrShort())).toBeInTheDocument();
    await hum(10, 0);
    expect(screen.getByRole('heading', { name: /3 rounds, well done/i })).toBeInTheDocument();
    expect(screen.getByText('8 s')).toBeInTheDocument(); // (9+5+10)/3
    expect(screen.getByText('3 s')).toBeInTheDocument(); // (4+2)/2
    await click(btn('4'));
    await click(btn(/save and finish/i));
    const data = await load('u');
    expect(data.sessions).toHaveLength(1);
    expect(data.sessions[0]).toMatchObject({ kind: 'bhramari', practiceId: 'man-bhramari-3', rounds: 3, avgHum: 8, avgInhale: 3, steadyRounds: null, before: null, after: 4 });
    expect(Object.keys(data.sessions[0]).sort()).toEqual(['after', 'avgHum', 'avgInhale', 'before', 'date', 'kind', 'practiceId', 'rounds', 'steadyRounds']); // no audio, nothing else
    expect(data.completions).toEqual([{ date: today, module: 'mantra', practiceId: 'man-bhramari-3' }]);
  });
  it('ending with 1 round asks first and saves nothing', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'setTimeout', 'performance'] });
    setup();
    await click((await flush(), screen.getByRole('button', { name: /use the timer only/i })));
    await hum(8, 3);
    await click(btn(/end session/i));
    expect(screen.getByRole('dialog', { name: /end early/i })).toBeInTheDocument();
    await click(btn(/end without saving/i));
    expect((await load('u')).sessions).toEqual([]);
  });
});
const tipsShortInhaleOrShort = () => /longer, slower hum/i; // 2nd hum was 5 s (< 8 s) → "too short" wins over the short inhale

describe('microphone session (fake mic playing synthetic hums)', () => {
  it('noise check → detects 3 hums → steady → summary with steadiness', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'setTimeout', 'performance'] });
    const SR = 48000; let t0;
    // Script: 4 s quiet, then 3 × (9 s hum at 150 Hz + 4 s quiet).
    const level = (ms) => { const s = ms / 1000 - 4; return s < 0 ? 0 : s % 13 < 9 && s < 39 ? 0.1 : 0; };
    vi.stubGlobal('AudioContext', class {
      sampleRate = SR;
      createAnalyser() { return { fftSize: 2048, getFloatTimeDomainData(b) { const a = level(performance.now() - t0); for (let i = 0; i < b.length; i++) b[i] = a * Math.sin((2 * Math.PI * 150 * i) / SR) + 0.0005 * Math.sin(i * 7.7); } }; }
      createMediaStreamSource() { return { connect() {} }; }
      close() {}
    });
    const track = { stop: vi.fn() };
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn(async () => ({ getTracks: () => [track] })) } });
    setup();
    t0 = performance.now();
    await click((await flush(), screen.getByRole('button', { name: /start with the mic/i })));
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    expect(screen.getByText(/listening to the room/i)).toBeInTheDocument();
    for (let s = 0; s < 45; s++) await act(async () => { vi.advanceTimersByTime(1000); });
    expect(screen.getByRole('heading', { name: /3 rounds, well done/i })).toBeInTheDocument();
    expect(screen.getByText('3/3')).toBeInTheDocument(); // all steady
    expect(screen.getByText('9 s')).toBeInTheDocument();
    expect(track.stop).toHaveBeenCalled(); // mic released as soon as the session ends
    delete navigator.mediaDevices;
  }, 60000); // 45 s of audio = 900 real pitch analyses
  it('a noisy room → "too noisy" with retry and timer-only', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'setTimeout', 'performance'] });
    vi.stubGlobal('AudioContext', class { sampleRate = 48000; createAnalyser() { return { fftSize: 2048, getFloatTimeDomainData(b) { for (let i = 0; i < b.length; i++) b[i] = 0.2 * Math.sin(i * 1.3) * Math.sin(i * 0.07); } }; } createMediaStreamSource() { return { connect() {} }; } close() {} });
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => ({ getTracks: () => [] }) } });
    setup();
    await click((await flush(), screen.getByRole('button', { name: /start with the mic/i })));
    await act(async () => { vi.advanceTimersByTime(3100); });
    expect(screen.getByText(/too noisy/i)).toBeInTheDocument();
    expect(btn(/use the timer only/i)).toBeInTheDocument();
    delete navigator.mediaDevices;
  });
  it('mic permission denied → explains and offers timer-only', async () => {
    vi.stubGlobal('AudioContext', class {});
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => { throw new DOMException('no', 'NotAllowedError'); } } });
    setup();
    await click((await flush(), screen.getByRole('button', { name: /start with the mic/i })));
    expect(screen.getByText(/couldn't use the microphone/i)).toBeInTheDocument();
    delete navigator.mediaDevices;
  });
});
