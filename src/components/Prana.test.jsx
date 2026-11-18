import { render } from '@testing-library/react';
import Prana, { DOSHA_COLORS } from './Prana.jsx';

const layers = (c) => [...c.querySelectorAll('.prana__body > span')].map((s) => s.style.background);
const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`; };

describe('Prana', () => {
  it('is decorative, so screen readers skip it', () => {
    const { container } = render(<Prana />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });
  it('defaults to all three dosha colours with Vata in front', () => {
    const { container } = render(<Prana />);
    expect(layers(container)).toEqual([DOSHA_COLORS.pitta, DOSHA_COLORS.kapha, DOSHA_COLORS.vata].map(rgb));
  });
  it('uses given colours in [top, bottom, front] order', () => {
    const { container } = render(<Prana colors={['#111111', '#222222', '#333333']} />);
    expect(layers(container)).toEqual(['#111111', '#222222', '#333333'].map(rgb));
  });
  it.each([[230, '1'], [115, '0.5'], [460, '2']])('size %i sets scale %s', (size, s) => {
    const { container } = render(<Prana size={size} />);
    expect(container.firstChild.style.getPropertyValue('--prana-s')).toBe(s);
  });
  it('leaves size to CSS when no size is given', () => {
    const { container } = render(<Prana />);
    expect(container.firstChild.getAttribute('style')).toBeNull();
  });
  it.each(['idle', 'happy', 'humming'])('renders the %s face', (mood) => {
    const { container } = render(<Prana mood={mood} />);
    expect(container.querySelector(`.prana__face--${mood}`)).not.toBeNull();
    expect(container.querySelectorAll('.prana__eyes i')).toHaveLength(2);
  });
  it('replays the bounce when popKey changes (remounts the pop layer)', () => {
    const { container, rerender } = render(<Prana popKey={1} />);
    const before = container.querySelector('.prana__pop');
    rerender(<Prana popKey={1} />);
    expect(container.querySelector('.prana__pop')).toBe(before);
    rerender(<Prana popKey={2} />);
    expect(container.querySelector('.prana__pop')).not.toBe(before);
  });
});
