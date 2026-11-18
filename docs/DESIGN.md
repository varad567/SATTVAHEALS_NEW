# DESIGN.md — Look, Screens, Motion

> The approved clickable prototype is the visual source of truth:
> https://claude.ai/artifact/TV1nkUMRH6amy8FQpAGM54 (Screens page + User flows page).
> This doc records the rules behind it so code matches without guessing.

---

## 1. Tokens (`src/styles/tokens.css`)

```css
:root {
  --cream:   #FBF7EF;  /* page background */
  --lav-1:   #EDE5F3;  /* soft panels, background blobs */
  --lav-2:   #C4B1D8;  /* Vata colour, meters */
  --purple:  #765387;  /* Kapha colour, accents, selected states */
  --plum:    #35143F;  /* text, primary buttons, hum screen background */
  --gold:    #EAA459;  /* Pitta colour, highlight buttons */
  --white:   #FFFFFF;  /* cards */
  --muted:   #5a3d66;  /* secondary text */
  --danger:  #9b2c2c;  /* delete only */
  --line:    #35143F14;/* card borders */

  --font-head: 'Newsreader', Georgia, serif;
  --font-body: 'DM Sans', system-ui, sans-serif;
  --font-deva: 'Noto Serif Devanagari', serif;

  --r-card: 24px;  --r-chip: 18px;  --r-pill: 40px;
}
```

- Headings: Newsreader 400, tight tracking (−0.035em), one *italic purple* word per heading.
- Eyebrows: 11px, uppercase, 2.3px tracking, 600, purple.
- Primary button: plum pill, 56px tall, label left + arrow right.
- Touch targets ≥ 44px. Body text ≥ 14px.

## 2. Prana (the guide) — `src/components/Prana.jsx`

- Three blobs: **front** (carries the face) = dominant dosha colour; the other two sit behind,
  top-right and bottom-left. Vata `--lav-2`, Pitta `--gold`, Kapha `--purple`.
- Face: two plum oval eyes + a curved smile. Happy state: arched eyes + open smile.
  Humming state: closed-line eyes + small round mouth that pulses.
- Before the quiz, Prana shows all three colours (welcome).
- Props: `size`, `mood: 'idle' | 'happy' | 'humming'`, `colors` (from Prakriti), `pop` (bounce key).
- **Speaks rarely**: one short line per screen max, in a speech bubble.
- Never gives health claims; same wording rules as all copy.

## 3. Motion

| Motion | Where | Spec |
|---|---|---|
| Morph | Prana blobs | border-radius keyframes, 5–8 s loops, layers out of sync |
| Drift / bob / breathe | Prana | 2.6 s bob, 4 s breathe (scale 1.05 × 0.96) |
| Look + blink | Prana face | glance every ~7 s, blink every 4.5 s |
| Pop | Prana on any user action | 0.7 s springy scale 0.8 → 1.12 → 1 |
| Rise-in | cards, sections on load | 18px up + fade, 120 ms stagger |
| Slow spin | background blobs | 16 s linear |
| Bars / dots grow | reveal bars, progress | scale from 0, spring ease |
| Ripples | hum screen while humming | 2.4 s rings, two offset |
| Scroll story | landing page only | GSAP ScrollTrigger, ported from the astro `motion.js` |

**Reduced motion**: `prefers-reduced-motion` turns every animation off; content stays visible.

## 4. Screens (mobile, as prototyped)

1. **Welcome** — Prana (all colours) + "Hi, I'm Prana" bubble, headline, Google button, free/disclaimer line.
2. **Quiz** — 12 questions, progress bar, Back; Prana re-stacks to the leading dosha after each answer.
3. **Reveal** — Prana in user colours, orbiting dots, label (e.g. "Vata · Pitta"), V/P/K bars.
4. **Check-in** — Prana reacts per mood; 6 moods + "Feeling okay today".
5. **Today** — greeting, mood chip (edit), Prana panel with 3 progress pills, 3 cards with "Why for you",
   expandable steps, tick to done, "All done" CTA, support link.
6. **Hum coach** — setup (Bhramari/Om, before 1–5) → noise check ring → dark session screen with
   Prana, timer, 4 meters, one tip → "See my session".
7. **Summary** — stats, Prana's tip, after 1–5 with result line, on-device privacy line.
8. **Progress** — days practised, "What works for you", mood bars, hum stats.
9. **Profile** — Prakriti, editable prefs, retake, support sheet, sign out, delete (type DELETE).
10. **Prana chat** — floating Prana bubble bottom-right (above the nav on phones). Opens a sheet:
    Prana header, messages, input, and a fixed notice under the input:
    *"Prana helps with using the app. Don't share personal or health details — messages are
    processed by Google Gemini and may be reviewed to improve their services."*
    Quick-reply chips: "How does the quiz work?", "How does the hum coach listen?",
    "Is my data private?", "How are my practices picked?".

## 5. User flows (approved — see the User flows page)

1. Opening the app · 2. Onboarding · 3. A normal day · 4. Hum coach session · 5. Profile.
Locked branch rules: quiz resumes; mood change / retake / pref edit re-pick only not-done cards;
new day at local midnight; mic denied → retry or timer-only; noisy → retry or timer-only;
early end saves only if ≥ 2 rounds; before/after skippable; "All done" with no streak guilt;
DELETE to confirm data deletion; tap done card again to undo; offline banner.
**Flow 6 (chat):** open bubble → message → CORE_LOGIC §7 routing → reply or fixed safety reply.

## 6. Desktop (≥ 900px)

- **App shell**: left sidebar (logo, Today / Progress / Profile, Prana chat button at the bottom)
  replaces the bottom nav. Content max-width 1100px.
- **Today**: two columns — left (sticky, 360px): Prana large + speech bubble + progress pills;
  right: the three cards.
- **Quiz, check-in, summary, profile**: single centred column, max-width 560px, Prana beside the
  heading instead of above it.
- **Hum coach**: full-bleed plum, centred column 560px, meters in a row of 4.
- **Progress**: 2 × 2 grid of cards.
- **Chat**: a 380 × 560 floating panel bottom-right instead of a full sheet.
- Between 600–899px: phone layout, centred, max-width 560px.

## 7. Landing page (`/`)

Desktop-first, fully responsive. Sections, top to bottom:

1. **Top bar** — logo, "How it works", "Hum coach", "FAQ", "Start free" pill.
2. **Hero** — large Prana (all colours, parallax layers on scroll), headline
   *"Feel more settled, one small practice at a time."*, sub-line, "Start free" + "See how it works".
3. **How it works** (scroll story, 3 pinned steps, Prana changes as you scroll):
   01 Find your Prakriti → 02 Tell Prana how today feels → 03 Get your three practices.
4. **Hum coach** — plum section, animated humming Prana with ripples, the 5 things it listens for,
   privacy line "your voice never leaves your phone".
5. **Why it's different** — 3 cards: Why this for you · Proof of what works for you · Just today's three.
6. **Rooted, evidence-aware** — short IKS framing; note that humming and Om chanting have been
   studied for relaxation (link sources); clear "not a substitute for professional care".
7. **FAQ** — 6–8 questions (also the chatbot's fallback).
8. **Final CTA** — background blob grows on scroll, "Start free".
9. **Footer** — Terms, Privacy, helpline, "18+ only", © Sattva Heals.
