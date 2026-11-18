/**
 * FILE: src/app/Shell.jsx
 * PURPOSE: Frame for the main app screens: bottom nav on phones, sidebar on desktop (DESIGN §6), offline banner.
 */
import { useEffect, useState } from 'react';
import { NavLink, Link } from 'react-router-dom';

const ICONS = {
  Today: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" /></>,
  Progress: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  Profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
};

function useOnline() {
  const [on, setOn] = useState(() => navigator.onLine !== false);
  useEffect(() => { const f = () => setOn(navigator.onLine); addEventListener('online', f); addEventListener('offline', f); return () => { removeEventListener('online', f); removeEventListener('offline', f); }; }, []);
  return on;
}

export default function Shell({ children }) {
  const online = useOnline();
  return (
    <div className="shell">
      <nav className="nav" aria-label="Main">
        <Link to="/" className="nav__logo"><span aria-hidden="true" />Sattva Heals</Link>
        {Object.entries(ICONS).map(([name, icon]) => (
          <NavLink key={name} to={`/app/${name.toLowerCase()}`} className="nav__item">
            <svg viewBox="0 0 24 24" aria-hidden="true">{icon}</svg>{name}
          </NavLink>
        ))}
      </nav>
      <main className="shell__main">
        {!online && <p className="offline" role="status">You're offline. Changes will save when you're back.</p>}
        {children}
      </main>
    </div>
  );
}
