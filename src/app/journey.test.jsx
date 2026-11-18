/**
 * The whole app, end to end, the way a user goes through it (Flows 1–5), plus guard and edge cases.
 */
import { render, screen, fireEvent, act, within, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { routes } from '../main.jsx';
import quiz from '../content/quiz.json';

const at = (path) => render(<MemoryRouter initialEntries={[path]}>{routes}</MemoryRouter>);
const click = (el) => act(async () => { fireEvent.click(el); });
const btn = (name) => screen.getByRole('button', { name });
const answerQuiz = async (pick = 0, from = 0) => { for (let i = from; i < quiz.length; i++) await click(btn(quiz[i].o[pick])); };
const cards = () => screen.getByRole('region', { name: "Today's three practices" }).querySelectorAll('article');

async function onboard({ pick = 0, diet = 'Vegetarian', minutes = '10 min', name = 'Varad', mood = 'Overthinking' } = {}) {
  at('/app');
  await click(screen.getByRole('checkbox', { name: /18 or older/i }));
  await click(btn(/continue/i));
  await answerQuiz(pick);
  fireEvent.change(screen.getByRole('textbox', { name: /call you/i }), { target: { value: name } });
  await click(btn(minutes)); await click(btn(diet));
  await click(btn(/reveal my prakriti/i));
  await click(btn(/check-in/i));
  await click(btn(mood));
  await click(btn(/show my 3 practices/i));
}

beforeEach(() => { localStorage.clear(); });

describe('Flow 1 — welcome and gate', () => {
  it('cannot continue until the 18+ box is ticked', async () => {
    at('/app');
    expect(btn(/continue/i)).toBeDisabled();
    await click(screen.getByRole('checkbox', { name: /18 or older/i }));
    expect(btn(/continue/i)).toBeEnabled();
  });
  it.each(['/app/today', '/app/progress', '/app/profile', '/app/checkin', '/app/hum/man-om-6'])('%s while signed out shows the welcome screen', (path) => {
    at(path); expect(screen.getByRole('checkbox', { name: /18 or older/i })).toBeInTheDocument();
  });
  it('signed in without a profile → onboarding, even on a deep link', async () => {
    localStorage.setItem('sh.user', JSON.stringify({ id: 'u' }));
    at('/app/today');
    expect(await screen.findByText(`Question 1 of ${quiz.length}`)).toBeInTheDocument();
  });
});

describe('Error recovery', () => {
  it('shows a retry screen when data fails to load, and recovers', async () => {
    const db = await import('../lib/db.js');
    const spy = vi.spyOn(db, 'load').mockRejectedValueOnce(new Error('offline'));
    localStorage.setItem('sh.user', JSON.stringify({ id: 'u' }));
    at('/app');
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't load/i);
    await click(btn(/try again/i));
    expect(await screen.findByText(/Question 1 of/)).toBeInTheDocument();
    spy.mockRestore();
  });
});

describe('Save failures', () => {
  it('a failed save shows "Couldn\u2019t save" and the card stays not done', async () => {
    await onboard();
    const db = await import('../lib/db.js');
    const spy = vi.spyOn(db, 'setDone').mockRejectedValueOnce(new Error('offline'));
    await click(screen.getAllByRole('button', { name: /^Mark done:/ })[0]);
    expect(screen.getByRole('alert')).toHaveTextContent(/couldn't save/i);
    expect(screen.getAllByRole('button', { name: /^Mark done:/ })).toHaveLength(3);
    spy.mockRestore();
    await click(screen.getAllByRole('button', { name: /^Mark done:/ })[0]); // works again → message clears
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('Flow 2 — onboarding', () => {
  it('Back keeps earlier answers and the first question has no Back', async () => {
    localStorage.setItem('sh.user', JSON.stringify({ id: 'u' }));
    at('/app/onboarding');
    expect(await screen.findByRole('button', { name: /previous question/i })).toBeDisabled();
    await click(btn(quiz[0].o[1]));
    await click(btn(/previous question/i));
    expect(btn(quiz[0].o[1])).toHaveAttribute('aria-pressed', 'true');
  });
  it('a half-done quiz resumes where it stopped after the page is closed', async () => {
    localStorage.setItem('sh.user', JSON.stringify({ id: 'u' }));
    at('/app/onboarding');
    for (let i = 0; i < 5; i++) await click(await screen.findByRole('button', { name: quiz[i].o[2] }));
    cleanup(); at('/app/onboarding');
    expect(await screen.findByText(`Question 6 of ${quiz.length}`)).toBeInTheDocument();
  });
  it('all-Kapha answers reveal Kapha at 100%', async () => {
    localStorage.setItem('sh.user', JSON.stringify({ id: 'u' }));
    at('/app/onboarding'); await screen.findByText(/Question 1/);
    await answerQuiz(2); await click(btn(/reveal my prakriti/i));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Kapha');
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});

describe('Flow 3 — a normal day', () => {
  it('lands on Today with three personalised cards', async () => {
    await onboard();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Varad/);
    expect(cards()).toHaveLength(3);
    expect(screen.getAllByText(/Why for you:/)).toHaveLength(3);
    expect(screen.getAllByText(/Vata-dominant and your mind is busy/).length).toBeGreaterThan(0);
  });
  it('done / undo / all done, and Prana responds', async () => {
    await onboard();
    const ticks = () => screen.getAllByRole('button', { name: /^Mark (not )?done:/ });
    await click(ticks()[0]);
    expect(screen.getByText(/one done/i)).toBeInTheDocument();
    await click(ticks()[0]);
    expect(screen.getByText(/here are your three/i)).toBeInTheDocument();
    for (const t of ticks()) await click(t);
    expect(screen.getByText(/all three done/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /all done for today/i })).toHaveAttribute('href', '/app/progress');
  });
  it('opening a card shows its steps; the mantra card links to the hum coach', async () => {
    await onboard();
    const mantra = cards()[2];
    await click(within(mantra).getByRole('button', { expanded: false }));
    expect(within(mantra).getAllByRole('listitem').length).toBeGreaterThanOrEqual(2);
    expect(within(mantra).getByRole('link', { name: /hum with prana/i }).getAttribute('href')).toMatch(/^\/app\/hum\/man-/);
  });
  it('changing mood re-picks only cards that are not done', async () => {
    await onboard({ mood: 'Anxious' }); // Vata + anxious → warm Vata food
    const title = (i) => cards()[i].querySelector('.pcard__title').textContent;
    const food = title(1), routine = title(0);
    await click(screen.getAllByRole('button', { name: /^Mark done:/ })[1]); // keep the food card
    await click(screen.getByRole('link', { name: /today's mood/i }));
    await click(btn('Sluggish')); await click(btn(/show my 3 practices/i)); // Kapha target: every card would change
    expect(title(1)).toBe(food);
    expect(title(0)).not.toBe(routine);
    expect(cards()[0].textContent).toMatch(/feeling sluggish/);
  });
  it('everything survives closing and reopening the app', async () => {
    await onboard();
    await click(screen.getAllByRole('button', { name: /^Mark done:/ })[1]);
    cleanup(); at('/app');
    expect(await screen.findByText(/one done/i)).toBeInTheDocument();
  });
  it('a new day at midnight asks for a fresh check-in', async () => {
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(2026, 10, 18, 23, 58));
    await onboard();
    vi.setSystemTime(new Date(2026, 10, 19, 0, 2));
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(screen.getByRole('heading', { name: /how are you feeling/i })).toBeInTheDocument();
    vi.useRealTimers();
  });
  it('support sheet opens, shows the helpline, and closes with Escape', async () => {
    await onboard();
    await click(btn(/need more support/i));
    const dialog = screen.getByRole('dialog', { name: /talk to someone/i });
    expect(within(dialog).getByRole('link', { name: /tele-manas/i })).toHaveAttribute('href', 'tel:14416');
    await act(async () => { fireEvent.keyDown(document, { key: 'Escape' }); });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('Progress and Profile (Flows 4–5)', () => {
  it('progress shows today as practised', async () => {
    await onboard();
    await click(screen.getAllByRole('button', { name: /^Mark done:/ })[0]);
    await click(screen.getByRole('link', { name: 'Progress' }));
    expect(screen.getByText('1 of 14')).toBeInTheDocument();
    expect(screen.getByText(/after three hum sessions/i)).toBeInTheDocument();
  });
  it('a vegan with 5 minutes never gets a dairy or 20-minute practice', async () => {
    await onboard({ diet: 'Vegan', minutes: '5 min' });
    const text = screen.getByRole('region', { name: "Today's three practices" }).textContent;
    expect(text).not.toMatch(/milk|ghee|20 min/i);
  });
  it('editing diet in Profile re-picks the food card', async () => {
    await onboard({ pick: 2, diet: 'Jain', mood: 'Sluggish' });
    await click(screen.getByRole('link', { name: 'Profile' }));
    fireEvent.change(screen.getByRole('combobox', { name: /how do you eat/i }), { target: { value: 'non-vegetarian' } });
    await act(async () => {});
    await click(screen.getByRole('link', { name: 'Today' }));
    expect(screen.getByRole('region', { name: "Today's three practices" }).textContent).toMatch(/non-vegetarian diet/);
  });
  it('delete needs DELETE typed exactly, then signs out with nothing left', async () => {
    await onboard();
    await click(screen.getByRole('link', { name: 'Profile' }));
    await click(btn('Delete my data'));
    const go = btn(/delete everything/i); const box = screen.getByRole('textbox', { name: /type delete/i });
    for (const v of ['delete', 'DELET', 'DELETE ']) { fireEvent.change(box, { target: { value: v } }); expect(go).toBeDisabled(); }
    fireEvent.change(box, { target: { value: 'DELETE' } });
    await click(go);
    expect(screen.getByRole('checkbox', { name: /18 or older/i })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('sh.db.v1'))).toEqual({});
  });
  it('sign out keeps data for next time', async () => {
    await onboard();
    await click(screen.getByRole('link', { name: 'Profile' }));
    await click(btn(/sign out/i));
    await click(screen.getByRole('checkbox', { name: /18 or older/i })); await click(btn(/continue/i));
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(/Varad/);
  });
  it('retaking the quiz keeps name and preferences', async () => {
    await onboard({ name: 'Asha', diet: 'Vegan' });
    await click(screen.getByRole('link', { name: 'Profile' }));
    await click(screen.getByRole('link', { name: /retake/i }));
    await answerQuiz(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Pitta');
    await click(btn(/back to today/i));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Asha/);
    expect(screen.getByRole('region', { name: "Today's three practices" }).textContent).toMatch(/vegan diet/);
  });
});
