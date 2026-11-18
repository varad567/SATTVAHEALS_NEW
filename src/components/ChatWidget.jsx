/**
 * FILE: src/components/ChatWidget.jsx
 * PURPOSE: Prana chat on every page (DESIGN §4.10, CORE_LOGIC §7).
 *   Crisis, feelings, personal details, misuse and FAQ answers are decided here in the browser by chatRoute,
 *   so those messages never leave the device. Only a plain app question from a signed-in user (Supabase mode)
 *   goes to /api/chat, which checks everything again. History lives in this tab only (sessionStorage).
 */
import { useEffect, useRef, useState } from 'react';
import Prana from './Prana.jsx';
import { route } from '../engine/chatRoute.js';
import { REPLIES } from '../content/chatSafety.js';
import { getToken } from '../lib/auth.js';
import faq from '../content/faq.json';

const KEY = 'sh.chat';
export const CHIPS = ['How does the quiz work?', 'How does the hum coach listen?', 'Is my data private?', 'How are my practices picked?'];
const NOTICE = "Prana helps with using the app. Don't share personal or health details — questions Prana can't answer here are sent to Google Gemini and may be reviewed to improve their services.";
const loadChat = () => { try { return JSON.parse(sessionStorage.getItem(KEY)) || []; } catch { return []; } };

async function askServer(message, history) {
  const token = await getToken();
  if (!token) return REPLIES.signIn; // preview mode or signed out → FAQ-only (D-28)
  try {
    const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ message, history: history.slice(-4) }) });
    return (await r.json()).reply || REPLIES.resting;
  } catch { return REPLIES.resting; }
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState(loadChat);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef(null), list = useRef(null);

  useEffect(() => { try { sessionStorage.setItem(KEY, JSON.stringify(msgs.slice(-30))); } catch { /* storage off: chat still works */ } list.current?.scrollTo?.(0, 1e6); }, [msgs]);
  useEffect(() => { if (!open) return; input.current?.focus(); const esc = (e) => e.key === 'Escape' && setOpen(false); addEventListener('keydown', esc); return () => removeEventListener('keydown', esc); }, [open]);

  async function send(raw) {
    const message = raw.trim(); if (!message || busy) return;
    const history = msgs; setText('');
    setMsgs((m) => [...m, { from: 'you', text: message }]);
    const local = route(message, { faq });
    let reply = local.reply;
    if (local.gemini) { setBusy(true); reply = await askServer(message, history); setBusy(false); }
    setMsgs((m) => [...m, { from: 'prana', text: reply, crisis: local.type === 'crisis' }]);
  }

  return (
    <>
      <button type="button" className="chat-fab" aria-label={open ? 'Close chat with Prana' : 'Chat with Prana'} aria-expanded={open} onClick={() => setOpen(!open)}>
        <Prana size={46} mood={open ? 'happy' : 'idle'} />
      </button>
      {open && (
        <section className="chat" role="dialog" aria-label="Chat with Prana">
          <header className="chat__head"><Prana size={40} mood="happy" /><div><strong>Prana</strong><span>Here to help with the app</span></div>
            <button type="button" className="icon-btn" aria-label="Close chat" onClick={() => setOpen(false)}>✕</button></header>
          <div className="chat__list" ref={list} aria-live="polite">
            {!msgs.length && <p className="chat__msg chat__msg--prana">Hi! Ask me anything about using Sattva Heals.</p>}
            {msgs.map((m, i) => <p key={i} className={`chat__msg chat__msg--${m.from}${m.crisis ? ' chat__msg--crisis' : ''}`}>{m.text}{m.crisis && <a href="tel:14416">Call Tele-MANAS 14416</a>}</p>)}
            {busy && <p className="chat__msg chat__msg--prana chat__typing" aria-label="Prana is typing"><i /><i /><i /></p>}
          </div>
          {!msgs.length && <div className="chat__chips">{CHIPS.map((c) => <button key={c} type="button" onClick={() => send(c)}>{c}</button>)}</div>}
          <form className="chat__form" onSubmit={(e) => { e.preventDefault(); send(text); }}>
            <input ref={input} value={text} maxLength={300} onChange={(e) => setText(e.target.value)} placeholder="Ask about the app…" aria-label="Your message" />
            <button type="submit" className="btn" disabled={!text.trim() || busy} aria-label="Send">→</button>
          </form>
          <p className="chat__notice">{NOTICE}</p>
        </section>
      )}
    </>
  );
}
