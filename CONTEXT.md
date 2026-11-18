# CONTEXT.md — Read This First

> **For any AI model or new teammate:** read this whole file before touching code or docs.
> It tells you what Sattva Heals is, where everything lives, and the rules you must follow.
> If this file disagrees with any other doc, this file wins until it is updated.

**Last updated:** 18 Nov 2026 · **Owner:** Varad Bidwai · **Status:** landing, app, hum coach and Supabase layer built and tested; chat + deploy next

---

## 1. What Sattva Heals is (in one paragraph)

Sattva Heals is a free, mobile-first web app for everyday emotional wellbeing — stress, overthinking,
irritability, low mood — in the space below the clinical threshold. It finds the user's **Prakriti**
(Vata / Pitta / Kapha balance) through a short quiz, asks how they feel today, and gives exactly
**three practices for today**: one **dinacharya** (routine), one **ahara** (food), and one **mantra**
(sound) practice. Every card explains *why it was chosen for you*. The mantra practice is guided by a
**hum coach** that listens through the mic during Bhramari or Om and gives live technique tips.
A before/after mood check shows the user which practices actually leave them calmer.
A guide character, **Prana** (three morphing blobs in the user's dosha colours), appears on every
screen, and a **Prana chat** answers questions about using the app. The site lives at
**sattvaheals.in**: landing page at `/`, app at `/app`, working on phone and desktop.

**It does not diagnose, treat, or cure anything.** See §5.

---

## 2. Read the docs in this order

| # | File | What it decides |
|---|------|-----------------|
| 1 | `CONTEXT.md` (this file) | Entry point, rules, glossary |
| 2 | `docs/PRD.md` | Problem, users, v1 scope, what's cut, team split |
| 3 | `docs/CORE_LOGIC.md` | Quiz scoring, engine rules, practice data format, hum analysis rules |
| 4 | `docs/DESIGN.md` | Theme, screens, user flow, motion |
| 5 | `docs/ARCHITECTURE.md` | Stack, folders, database tables, coding conventions |
| 6 | `docs/DECISIONS.md` | Every settled choice and why — check before re-debating anything |

Visual source of truth: the prototype canvas linked at the top of `docs/DESIGN.md`.

---

## 3. Stack (decided — see DECISIONS.md)

- **Frontend:** Vite + React (JavaScript)
- **Backend:** Supabase (Postgres + Google sign-in)
- **Hosting:** Vercel
- **Motion:** GSAP + ScrollTrigger
- **Audio analysis:** Web Audio API, in the browser only
- **Chat:** Google Gemini API (free tier) via a Vercel function — app questions only

Practice content (dinacharya, ahara, mantra) lives as **JSON files in the repo**, not in the database.
The database stores only user data: profile, check-ins, completions, hum session numbers.

---

## 4. Golden rules for writing code

1. **One file = one job.** If a file does two things, split it.
2. **Keep files short.** Target under 150 lines. Over 200 lines needs a reason in DECISIONS.md.
3. **Every file starts with a header comment:**
   ```js
   /**
    * FILE: src/engine/scorePrakriti.js
    * PURPOSE: Turns 12 quiz answers into Vata/Pitta/Kapha percentages.
    * INPUT: answers[] — see docs/CORE_LOGIC.md §2
    * OUTPUT: { vata, pitta, kapha, dominant }
    * USED BY: Onboarding.jsx, Profile.jsx
    */
   ```
4. **Logic lives in `src/engine/` as plain functions.** No React, no database calls inside the engine.
   This makes it testable and readable by anyone.
5. **Content lives in `src/content/` as JSON.** Never hard-code a practice inside a component.
6. **Comment the *why*, not the *what*.** `// Vata users get grounding practices first (CORE_LOGIC §4.2)`
   beats `// loop through practices`.
7. **No new library without a line in DECISIONS.md.**
8. **When editing a file, deliver the full replacement file**, never a diff or patch note.
9. **Every rule in code should point to its doc section** (e.g. `CORE_LOGIC §4.2`), so the doc and
   code can be checked against each other.

---

## 5. Compliance rules (non-negotiable)

- Never use: *treat, treatment, cure, heal (as a claim), diagnose, therapy, disorder, symptom, patient.*
- Use instead: *practice, guidance, protocol, routine, support, wellbeing.*
- The brand name "Sattva Heals" is fine; the copy must not claim the app heals anything.
- Call sound features **Nada practice**, never "sound therapy".
- The hum coach coaches **technique**, never health ("your hum was steady", never "your stress dropped").
- Microphone audio **never leaves the device**. Only numbers (durations, scores) are saved.
- A "Need more support?" link to a professional helpline is visible on the dashboard and profile.
- **Chat:** emotional or crisis messages are never sent to Gemini (free tier data may be reviewed by
  Google). Chat is stored nowhere. Never send names, emails, Prakriti or IDs to Gemini.
- Users must be **18+**.

---

## 6. Glossary

| Term | Meaning in this app |
|------|---------------------|
| **Prakriti** | A person's natural constitution — their balance of the three doshas |
| **Dosha** | One of three tendencies: **Vata** (air/space — movement), **Pitta** (fire/water — heat, intensity), **Kapha** (earth/water — stability, heaviness) |
| **Dinacharya** | Daily routine practice (waking, movement, rest) |
| **Ahara** | Food and eating practice |
| **Mantra** | Short sound practice; in v1 this is Bhramari humming or Om chanting |
| **Bhramari** | "Bee breath" — slow inhale through the nose, long humming exhale |
| **Nada** | Sound, in the yogic sense; our umbrella term for sound practices |
| **Check-in** | The user's daily one-tap mood entry |
| **Today's 3** | The three practices the engine picks each day |
| **Prana** | The guide character; also the name of the chatbot |

---

## 7. Team

| Person | Role |
|--------|------|
| Varad Bidwai | Lead — product, engine, integration, final review |
| Vedanti Khade | Team Zenith (PBL) |
| Darsh Srivastava | Team Zenith (PBL) |
| Aditi Kopare | Team Zenith (PBL) |

Faculty guide: Prof. Vrushali Kondhalkar. Work assignments are in `docs/PRD.md` §9.

---

## 8. How to hand this project to a new AI session

Paste this into the first message:

> Read `CONTEXT.md`, then the docs it lists in order. Follow every rule in §4 and §5.
> Before changing anything, tell me which doc sections your change touches.
> If a request conflicts with a doc, point out the conflict instead of guessing.
