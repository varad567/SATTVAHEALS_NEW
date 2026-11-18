# DECISIONS.md — Settled Choices

> Check here before re-debating anything. Newest first. To change a decision, add a new entry
> that supersedes the old one — never delete history.
> Format: **Decision** · why · what was rejected.

---

## 18 Nov 2026

**D-27. The chat API is locked down** (CORE_LOGIC §7.0): origin check, sign-in required for
Gemini, per-user and site-wide limits stored in Supabase, strikes and 24 h lock-out, misuse and
topic gates before Gemini, short outputs. Why: stop people using Prana as a free general AI
("to cure me you must write my assignment") and keep inside the Gemini free quota.
Rejected: in-memory rate limits (reset per Vercel instance, easy to bypass).

**D-28. Landing-page visitors get FAQ-only chat** (no Gemini). Sign in to ask Prana freely.

**D-21. Chatbot runs on the Gemini API free tier.**
Why: zero running cost. Rejected: Gemini paid tier, Claude API (both cost money).
Consequence: on the free tier Google may use prompts to improve its products and human
reviewers may read them. So the bot is limited by design (D-22, D-23) and the UI warns users.

**D-22. Prana chat answers app questions only.**
Topics: how the app works, quiz, practices, hum coach, privacy, account. Anything else gets a
polite redirect. Rejected: general Ayurveda Q&A (more risk of health claims, more data sent).

**D-23. Emotional and crisis messages never reach Gemini.**
Our own code checks every message first. Crisis wording → fixed reply with the helpline.
Emotional wording → fixed caring reply + a suggested practice + helpline link. Only plain app
questions are forwarded. See CORE_LOGIC §7.

**D-24. Users must be 18+.** Sign-up states it. (Gemini API terms require 18+, and the app is
built for 18–30.)

**D-25. sattvaheals.in becomes: landing page at `/`, app at `/app`.** One Vite project, one
Vercel deployment. The old site is fully replaced.

**D-26. The app is responsive.** Phone layout = the approved prototype. At ≥900px: sidebar nav,
two-column Today screen. See DESIGN §6.

## Oct 2026

**D-20. User flows approved as drawn** (12 branch decisions, DESIGN §5).

**D-19. Guide character is Prana** — three morphing palette blobs with a face; the user's dominant
dosha colour sits in front. Rejected: Madhu the bee, diya flame, lotus sprite, rishi.

**D-18. Fonts: Newsreader (headings), DM Sans (body), Noto Serif Devanagari (Sanskrit).**
Close to the astro demo's Georgia + system sans, with proper Devanagari support.

**D-17. Theme = the astro demo palette.** Cream #FBF7EF, lavender #EDE5F3 / #C4B1D8,
purple #765387, plum #35143F, apricot-gold #EAA459. Rejected: the old dark theme.

**D-16. Hum coach ships complete in v1** — length, inhale gap, steadiness, loudness, pitch.
No partial version.

**D-15. Before/after mood check applies to hum sessions only.** Food and routines don't give an
instant before/after feeling, so tracking them that way adds noise.

**D-14. Dropped:** mala counter, dosha soundscapes (no evidence), dosha clock (not unique),
Ritucharya (scope). **Raga listening = v2 candidate** (evidence supports listening, not timing;
needs licensed recordings).

**D-13. Everything is free.** No payments, no consultations.

**D-12. Practice content lives as JSON in the repo**, not in the database. Keeps the engine pure,
readable and testable.

**D-11. Stack: Vite + React + Supabase + Vercel.** Known to the team, fastest for the timeline.
Rejected: Next.js (more concepts), Firebase (NoSQL clunky for logs), Convex/Neon/PocketBase
(new to the team or harder to deploy).

**D-10. Sign-in: Google only** via Supabase. Email login later.

**D-9. Compliance wording rule carries over** — see CONTEXT §5.
