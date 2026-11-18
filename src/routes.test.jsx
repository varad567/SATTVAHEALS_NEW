import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { routes } from './main.jsx';

const at = (path) => render(<MemoryRouter initialEntries={[path]}>{routes}</MemoryRouter>);

describe('Routes', () => {
  it.each([['/', /feel more settled/i], ['/app', /the app/i], ['/app/today', /the app/i], ['/privacy', /privacy policy/i], ['/terms', /terms of use/i]])(
    '%s renders', (path, text) => { at(path); expect(screen.getByRole('heading', { level: 1, name: text })).toBeInTheDocument(); });
  it.each(['/nope', '/app-x', '/Privacy/extra'])('%s shows the 404 page', (path) => {
    at(path);
    expect(screen.getByText(/couldn't find this page/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to home/i })).toHaveAttribute('href', '/');
  });
});
