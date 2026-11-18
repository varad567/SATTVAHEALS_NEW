# PRD.md — Product Requirements, v1

> Decides **what** we build and **why**. How it works inside is in `CORE_LOGIC.md`.
> How it looks is in `DESIGN.md`. **Status:** updated 18 Nov 2026 — adds Prana, landing page, desktop layout, Prana chat

---

## 1. Problem

Everyday stress, overthinking, irritability, and low mood are part of ordinary life, but they rarely
reach the point where someone seeks therapy. The options people have today don't fit this space:

- **Therapy** feels like too much for an ordinary bad week.
- **Wellness and meditation apps** give the same generic advice to everyone.
- **One-time dosha quizzes** give a result once, then nothing to do with it.

Indian Knowledge Systems already offer a personal answer: guidance based on a person's Prakriti.
Nobody has turned it into a simple daily companion that adapts to how you feel *today*.

## 2. Solution in one line

**Know your Prakriti once, tell us how you feel today, get three small practices that fit you —
and see over time which ones actually leave you calmer.**

## 3. Who it's for

**Primary user:** Indians aged 18–30 — students and young working adults — who feel everyday
stress or low mood, are open to traditional practices, and have 10–20 minutes a day.

**Job to be done:** *"When I'm feeling restless, stressed, or low, I want a few small things I can
actually do today that suit me, so I feel more settled without committing to a big programme."*

**Not for:** anyone in crisis or needing clinical care. The app points them to professional support.

## 4. Key selling points (what makes us different)

| # | KSP | Why it's different |
|---|-----|--------------------|
| 1 | **Hum coach** | The mic listens to your Bhramari or Om and gives live technique tips. No wellness app coaches *how* you hum. |
| 2 | **Before/after proof** | A mood tap before and after each hum session. Over time you see which practice works *for you*. |
| 3 | **"Why this for you"** | Every practice shows one line linking it to your Prakriti and today's mood. Nothing is a black box. |
| 4 | **Just today's 3** | No feed, no library to browse, no overload. One routine, one food, one sound practice. |
| 5 | **Rooted and evidence-aware** | IKS practices, chosen where research supports them (e.g. humming and Om chanting studies). |

## 5. v1 features

Each feature lists what "done" means. If it isn't met, the feature isn't done.

### F1. Sign-in
- Google sign-in only, via Supabase.
- **Done when:** a new user signs in and lands on onboarding; a returning user lands on Today.

### F2. Onboarding
- 12-question Prakriti quiz (scoring in `CORE_LOGIC.md` §2).
- 3 preferences: time available per day (5 / 10 / 20 min), diet (vegetarian / eggetarian /
  non-vegetarian / vegan / Jain), usual wake-up time.
- First mood check-in.
- Animated reveal of the user's V/P/K balance.
- **Done when:** completed in under 4 minutes, saved to the profile, retake possible from Profile.

### F3. Daily mood check-in
- One tap from 6 moods: **anxious, overthinking, irritable, stressed, low, sluggish** — plus
  "feeling okay".
- Asked once a day when the user opens the app.
- **Done when:** one check-in per day is saved; the user can change it the same day.

### F4. Personalisation engine
- Inputs: Prakriti, today's mood, preferences, recent history.
- Output: **Today's 3** — exactly one dinacharya, one ahara, one mantra practice.
- Avoids repeating yesterday's practice in the same module where possible.
- **Done when:** the same inputs always give the same output, and every pick has a reason.

### F5. Today screen with "why this for you"
- Shows Today's 3 as cards, each with a one-line reason
  (e.g. *"Picked because you're Vata-dominant and feeling anxious — warm, grounding food helps
  settle Vata."*).
- Tap to expand the full steps; tick to mark done.
- **Done when:** every card shows a reason generated from the engine, not hard-coded text.

### F6. Hum coach (full version)
- Guided Bhramari or Om session, 3–9 rounds, using the phone mic.
- Live analysis of: **hum length, inhale gap, steadiness, loudness, pitch** (rules in
  `CORE_LOGIC.md` §5).
- Live visual: a lotus that opens while the hum is steady.
- One live tip at a time, plus a session summary
  (e.g. *"6 rounds · average hum 9 s · steady · tip: soften the volume"*).
- Noise check before starting; shows "too noisy — try a quieter spot" instead of wrong feedback.
- Audio is processed on the device only; only numbers are saved.
- **Done when:** works on Chrome for Android and Safari for iPhone, and handles mic permission
  being denied gracefully.

### F7. Before/after mood check
- A 1–5 "How settled do you feel?" tap before and after each hum session.
- **Done when:** both values are saved with the session, and the user can skip either.

### F8. Progress
- Days practised (consistency over the last 14 days), mood trend from check-ins,
  hum stats over time, and a simple "what works for you" line comparing average before/after
  change by practice (shown after at least 3 sessions of a practice).
- **Done when:** a user with a week of data sees all four parts; a new user sees a friendly
  empty state.

### F9. Profile
- Shows Prakriti result, preferences (editable), retake quiz, sign out, delete my data.
- "Need more support?" link to a professional helpline.
- **Done when:** deleting data removes every row belonging to the user.

### F10. Prana, the guide
- Animated blob character in the user's dosha colours, on every screen (DESIGN §2).
- **Done when:** Prana reacts to quiz answers, moods, completions and humming as prototyped.

### F11. Landing page at sattvaheals.in
- Desktop-first marketing page with scroll story, hum coach section, FAQ (DESIGN §7).
- **Done when:** loads in under 3 s on 4G and "Start free" leads to sign-in.

### F12. Desktop layout
- The whole app works at ≥ 900px with sidebar and two-column Today (DESIGN §6).
- **Done when:** every screen is usable with mouse + keyboard at 1280px wide.

### F13. Prana chat
- Floating chat on every page; answers **app questions only** using the Gemini API free tier.
- Emotional and crisis messages are answered by fixed, safe replies and **never sent to Gemini**
  (CORE_LOGIC §7). A notice tells users not to share personal or health details.
- **Done when:** the 10 safety test messages in `docs/chat-tests.md` all route correctly, and
  chat works when Gemini is unavailable (friendly fallback).

## 6. Out of scope for v1

| Cut | Reason |
|-----|--------|
| Payments, consultations | Everything is free for now |
| Kundali / birth chart | Outside the copyright-filing scope |
| Blog, issues library | Not part of the new core flow |
| Mala counter | Replaced by the hum coach |
| Madhu the bee | Replaced by Prana |
| Dosha soundscapes | No evidence supports them |
| Dosha clock, Ritucharya (seasons) | Not unique enough / out of scope |
| Email login, Hindi/Marathi | Later; Google sign-in and English first |
| General Ayurveda Q&A in chat | Free-tier privacy and health-claim risk (D-22) |
| Saving chat history | Privacy (CORE_LOGIC §7.7) |
| **Raga listening** | **v2 candidate** — RCTs support raga listening, but it needs licensed recordings |

## 7. Content needed for v1

- 12 quiz questions with answer-to-dosha mapping.
- **24 practices:** 8 dinacharya, 8 ahara, 8 mantra/Nada, each tagged by dosha, mood, minutes,
  and diet type. Format in `CORE_LOGIC.md` §3.
- Reason templates for "why this for you".
- All content checked against the compliance rules in `CONTEXT.md` §5.

## 8. Success criteria (for the PBL review)

- A new user goes from sign-in to Today's 3 in **under 4 minutes**.
- The hum coach gives a correct tip on at least **4 of 5** test sessions in a quiet room.
- Two different profiles with two different moods get **visibly different** plans.
- A new teammate or AI can find any rule in the code from its doc section, and vice versa.
- No banned wording anywhere in the app.

## 9. Team split (proposed — confirm before build)

| Person | Owns |
|--------|------|
| Varad | Engine (scoring + matching), integration, Supabase setup, final review |
| Vedanti | Content: quiz questions, 24 practices, reason templates, compliance check |
| Darsh | Hum coach: mic capture, analysis, tips, noise check |
| Aditi | Screens and motion: onboarding, Today, progress, profile |

## 10. Timeline (original 4-hour estimate — now longer with landing, desktop and chat)

| Block | Time | Output | Check-in |
|-------|------|--------|----------|
| Docs | 45 min | All 6 docs approved | ✅ after docs |
| Foundation | 30 min | Repo, Supabase, sign-in, theme tokens | |
| Engine + content | 45 min | Scoring, matching, 24 practices | ✅ after engine |
| Screens | 60 min | Onboarding, Today, progress, profile | |
| Hum coach | 60 min | Full analysis and tips | |
| Landing + desktop | 60 min | Landing page, responsive shell | ✅ |
| Prana chat | 45 min | api/chat, safety routing, widget | ✅ before deploy |
| Deploy | 15 min | Live on Vercel | |

## 11. Risks

| Risk | Plan |
|------|------|
| Hum analysis is unreliable on cheap mics or in noise | Noise check first; tips only when the signal is clear |
| Safari handles mic audio differently | Test on an iPhone early, not at the end |
| Content takes longer than code | Vedanti starts content immediately after PRD approval |
| A user in real distress uses the app | Helpline link always visible; copy never suggests the app replaces professional help |

## 12. Open items

- Verify Tele-MANAS (14416) and emergency (112) numbers before launch.
- Privacy policy must disclose that chat messages go to Google Gemini (free tier).
- Confirm the team split in §9.
