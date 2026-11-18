import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Landing from './Landing.jsx';
import faq from '../content/faq.json';
import copy from '../content/landing.json';
import * as motion from './motion.js';

const renderLanding = () => render(<MemoryRouter><Landing /></MemoryRouter>);

describe('Landing page', () => {
  it('has exactly one h1 and every section heading', () => {
    renderLanding();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    for (const t of ['Three steps.', 'Questions,']) expect(screen.getByRole('heading', { name: new RegExp(t) })).toBeInTheDocument();
  });
  it('every "Start free" button goes to /app', () => {
    renderLanding();
    const links = screen.getAllByRole('link', { name: /start free/i });
    expect(links.length).toBeGreaterThanOrEqual(2);
    links.forEach((l) => expect(l).toHaveAttribute('href', '/app'));
  });
  it('has a "Log in" link for returning users that opens the app', () => {
    renderLanding();
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/app');
  });
  it('every in-page link points at a section that exists', () => {
    const { container } = renderLanding();
    const hashes = [...container.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute('href').slice(1));
    expect(hashes.length).toBeGreaterThan(0);
    hashes.forEach((id) => expect(container.querySelector(`#${id}`), `#${id}`).not.toBeNull());
  });
  it('shows every FAQ question and answer', () => {
    renderLanding();
    faq.forEach((f) => { expect(screen.getByText(f.q)).toBeInTheDocument(); expect(screen.getByText(f.a)).toBeInTheDocument(); });
  });
  it('shows all three steps and all hum measures', () => {
    renderLanding();
    copy.steps.forEach((s) => expect(screen.getByRole('heading', { name: s.title })).toBeInTheDocument());
    copy.hum.measures.forEach((m) => expect(screen.getByText(m)).toBeInTheDocument());
  });
  it('shows the helpline and the not-medical note', () => {
    renderLanding();
    expect(screen.getByRole("contentinfo")).toHaveTextContent(/14416/);
    expect(screen.getByText(/not a substitute for professional care/i)).toBeInTheDocument();
  });
  it('first story step is active before any scrolling', () => {
    const { container } = renderLanding();
    expect(container.querySelector('.lp-step.is-active h3')).toHaveTextContent(copy.steps[0].title);
  });
  it('moves the active step when a step reaches mid-screen', () => {
    let cb;
    window.IntersectionObserver = class { constructor(f) { cb = f; } observe() {} disconnect() {} };
    const { container } = renderLanding();
    const steps = container.querySelectorAll('.lp-step');
    act(() => cb([{ isIntersecting: true, target: steps[2] }]));
    expect(container.querySelector('.lp-step.is-active h3')).toHaveTextContent(copy.steps[2].title);
    expect(screen.getByText(`${copy.steps[2].n} / ${copy.steps[2].title}`)).toBeInTheDocument();
    act(() => cb([{ isIntersecting: false, target: steps[0] }])); // leaving a step changes nothing
    expect(container.querySelector('.lp-step.is-active h3')).toHaveTextContent(copy.steps[2].title);
    delete window.IntersectionObserver;
  });
  it('still renders when the browser has no IntersectionObserver', () => {
    delete window.IntersectionObserver;
    expect(() => renderLanding()).not.toThrow();
  });
});

describe('Landing motion', () => {
  it('does nothing when the user prefers reduced motion', () => {
    const orig = window.matchMedia;
    window.matchMedia = () => ({ matches: true });
    const cleanup = motion.initLandingMotion(document.createElement('div'));
    expect(typeof cleanup).toBe('function');
    expect(() => cleanup()).not.toThrow();
    window.matchMedia = orig;
  });
  it('handles a missing root safely', () => {
    expect(() => motion.initLandingMotion(null)()).not.toThrow();
  });
});
