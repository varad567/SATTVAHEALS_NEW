/**
 * FILE: src/components/ui.jsx
 * PURPOSE: Shared pieces for app screens: Bubble (Prana speaking), Flow (setup-screen layout), Sheet (modal), SupportSheet.
 */
import { useEffect, useRef } from 'react';
import Prana from './Prana.jsx';
import copy from '../content/app.json';

export const Bubble = ({ children }) => <p className="bubble" aria-live="polite">{children}</p>;

/**
 * Layout for setup screens (welcome, quiz, prefs, reveal, check-in).
 * Phone: Prana + bubble in a row above the content (hero = big and centred instead).
 * Desktop: split screen — Prana large in a lavender panel on the left, content on the right (DESIGN §6).
 */
export function Flow({ prana, say, hero = false, children }) {
  return (
    <div className={`flow${hero ? ' flow--hero' : ''}`}>
      <aside className="flow__guide"><Prana {...prana} /><Bubble>{say}</Bubble></aside>
      <main className="flow__body">{children}</main>
    </div>
  );
}

/** Bottom sheet on phones, centred card on desktop. Escape or the backdrop closes it; focus moves inside. */
export function Sheet({ title, onClose, children }) {
  const box = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    box.current?.querySelector('button, a, input, select')?.focus();
    const esc = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('keydown', esc); prev?.focus?.(); };
  }, [onClose]);
  return (
    <div className="sheet" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={box} className="sheet__box" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <h2 id="sheet-title">{title}</h2>
        {children}
        <button type="button" className="btn btn--ghost" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export function SupportSheet({ onClose }) {
  const s = copy.support;
  return (
    <Sheet title={s.title} onClose={onClose}>
      <p>{s.body}</p>
      {s.lines.map((l) => (
        <a key={l.tel} className="helpline" href={`tel:${l.tel}`}><span><strong>{l.name}</strong><small>{l.what}</small></span><b>{l.tel}</b></a>
      ))}
    </Sheet>
  );
}
