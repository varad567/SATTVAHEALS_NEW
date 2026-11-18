# ARCHITECTURE.md — Stack, Folders, Data, Rules

> How the code is organised. Coding rules are in CONTEXT §4 and apply everywhere.

---

## 1. Stack

| Part | Choice |
|---|---|
| Frontend | Vite + React (JavaScript), React Router |
| Auth + DB | Supabase (Google sign-in, Postgres, Row Level Security) |
| Chat AI | Google Gemini API, free tier, called only from a Vercel serverless function |
| Hosting | Vercel (static site + `/api` functions), domain **sattvaheals.in** |
| Motion | CSS keyframes for Prana; GSAP + ScrollTrigger on the landing page only |
| Audio | Web Audio API in the browser |

## 2. Routes

| Path | Page | Login needed |
|---|---|---|
| `/` | Landing | no |
| `/privacy`, `/terms` | Legal pages | no |
| `/app` | Welcome / sign-in → redirects per Flow 1 | no |
| `/app/onboarding` | Quiz → prefs → reveal → first check-in | yes |
| `/app/checkin` | Mood check-in | yes |
| `/app/today` | Today's 3 | yes |
| `/app/hum/:kind` | Hum coach | yes |
| `/app/progress` | Progress | yes |
| `/app/profile` | Profile | yes |

Prana chat is available on every page (landing included).

## 3. Folder structure

```
sattvaheals/
├── CONTEXT.md                 ← read first
├── docs/                      ← PRD, CORE_LOGIC, DESIGN, ARCHITECTURE, DECISIONS
├── supabase/schema.sql        ← tables + RLS; run once in Supabase SQL Editor
├── api/
│   ├── chat.js                ← Prana chat endpoint: gates, limits, Gemini call, output filter (CORE_LOGIC §7)
│   ├── _prompt.js             ← Gemini system prompt (underscore = not a route)
│   ├── delete-account.js      ← verifies the user's token, deletes that auth user; rows cascade
│   └── prompts/prana.txt      ← Gemini system prompt
├── src/
│   ├── main.jsx, App.jsx      ← router + auth guard
│   ├── styles/tokens.css      ← DESIGN §1
│   ├── content/               ← quiz.json, practices.json, reasons.json,
│   │                            humTips.json, chatSafety.json, faq.json
│   ├── engine/                ← pure logic, no React
│   │   ├── scorePrakriti.js   ← §2
│   │   ├── pickToday.js       ← §4
│   │   ├── buildReason.js     ← §5
│   │   ├── chatRoute.js       ← §7.1–7.3 (shared by client + api)
│   │   ├── progressStats.js   ← §8
│   │   └── hum/               ← signal.js (loudness, pitch), coach.js (detector, tips, summary, T)  (§6)
│   ├── lib/
│   │   ├── supabase.js        ← client, or null when env vars are missing (= local preview mode)
│   │   ├── db.js              ← picks the store: Supabase if configured, else this browser
│   │   ├── db.remote.js       ← Supabase store (snake_case ↔ camelCase mapping lives only here)
│   │   ├── db.local.js        ← browser store (preview + tests), same functions
│   │   ├── userData.js        ← how each change updates data — shared by both stores and the screen
│   │   ├── auth.js            ← Google sign-in via Supabase, or a local preview user
│   │   ├── format.js          ← dates (local midnight), greeting, cap()
│   │   └── sky.js             ← dawn/day/dusk/night + night theme on <html>
│   ├── hooks/useMic.js        ← mic on/off + one measurement per read(); audio never stored
│   ├── app/                   ← AppState (single source of truth), AppRoutes (Flow 1 gate), Shell
│   ├── components/            ← Prana, ui (Bubble, Flow, Sheet), art (Mandala, Flower, Celebrate, Skeleton, Gather), hum, ChatWidget
│   ├── landing/               ← landing sections + scrollStory.js (GSAP)
│   └── pages/                 ← one file per screen
└── vercel.json                ← SPA rewrites (/app/* → index.html)
```

## 4. Database (Supabase)

```sql
profiles      (id uuid PK = auth.uid(), name text, prakriti jsonb, prefs jsonb,
               age_confirmed bool, created_at timestamptz)
checkins      (id bigserial PK, user_id uuid, date date, mood text,
               UNIQUE (user_id, date))
completions   (id bigserial PK, user_id uuid, date date, practice_id text, module text,
               UNIQUE (user_id, date, module))
hum_sessions  (id bigserial PK, user_id uuid, date date, kind text, rounds int,
               avg_hum real, avg_inhale real, steady_rounds int,
               before smallint NULL, after smallint NULL, created_at timestamptz)
chat_usage    (user_id uuid PK → auth.users cascade, window_start, window_count, day, day_count,
               strikes, strikes_since, locked_until)   -- counts only, never text
chat_global   (day date PK, gemini_calls int)
```

- `chat_usage` / `chat_global` are written **only** by the database function
  `chat_check_and_count(uid, is_strike)` called from `api/chat.js` with the service role key;
  RLS denies all direct access from the browser.

- **RLS on every table**: a user can only select/insert/update/delete rows where
  `user_id = auth.uid()` (`id = auth.uid()` for profiles).
- Chat messages are **never** stored.
- **Delete my data**: the client calls `/api/delete-account` with the user's token; the function
  verifies it and deletes that auth user; `on delete cascade` removes every row they own.
- Full SQL: `supabase/schema.sql`. It is tested in a real Postgres (PGlite) with RLS on.

## 5. Environment variables (Vercel → Settings → Environment Variables)

| Name | Where used | Secret? |
|---|---|---|
| `VITE_SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL`, as Vercel's Supabase integration names it) | browser + server | no |
| `VITE_SUPABASE_ANON_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `_PUBLISHABLE_KEY`) | browser | no (RLS protects data) |
| `SUPABASE_SERVICE_ROLE_KEY` | `api/delete-account.js`, `api/chat.js` (rate-limit function only) | **yes** |
| `GEMINI_API_KEY` | `api/chat.js` only | **yes** |
| `GEMINI_MODEL` | `api/chat.js` | no |
| `CHAT_ENABLED` | `api/chat.js` — kill switch | no |
| `CHAT_DAILY_CAP` | `api/chat.js` — site-wide Gemini calls per day | no |
| `ALLOWED_ORIGINS` | `api/chat.js` — comma-separated | no |

Secrets never get the `VITE_` prefix (that would ship them to the browser).

## 6. Deployment

**Supabase (once):** 1) create a project; 2) SQL Editor → paste and run `supabase/schema.sql`;
3) Authentication → Providers → Google → on (needs a Google Cloud OAuth client); 4) Authentication →
URL configuration → Site URL `https://sattvaheals.in`, redirect `https://sattvaheals.in/app`
(plus `http://localhost:5173/app` for local dev); 5) copy Project URL + anon key into Vercel env vars
(and `.env.local` for dev); service role key only into Vercel, never `VITE_`.

**Vercel:**

1. New GitHub repo `sattvaheals` (fresh history).
2. Import into Vercel → framework "Vite" → add env vars.
3. Vercel → Domains → add `sattvaheals.in` and `www.sattvaheals.in`; update DNS at the
   registrar as Vercel shows. This replaces the old site.
4. Supabase → Auth → URL config: site URL `https://sattvaheals.in`, redirect `https://sattvaheals.in/app`.
   Google OAuth client: add the same redirect.
5. Vercel Hobby plan is for non-commercial use — fine while Sattva Heals stays free.

## 7. Code rules specific to this repo

- Components never call Supabase directly — only through `lib/db.js`.
- Components never contain rules — they call `engine/`.
- Every engine function has a matching `*.test.js` with at least the examples in CORE_LOGIC.
- Every file starts with the header comment (CONTEXT §4.3).

## 8. Testing (run both before every commit)

| Command | What it checks |
|---|---|
| `npm test` | Unit tests (Vitest): the schema in real Postgres (RLS, constraints, cascade), the Supabase store mapping, the delete-account API, the hum engine on synthetic audio, the hum screen with a fake mic, components, routes, content rules (shape, Jain/vegan ingredients, compliance words), and the engine — every one of the 531,441 quiz answer sets, all 315 user scenarios for Today's 3, 7-day variety, and no dead content |
| `npm run test:e2e` | Night theme on every screen + chat + legal pages (`e2e/night.e2e.py`). Hum coach: Chrome's real audio pipeline with a fake mic playing a generated hum recording (`e2e/hum.wav`). Landing: real Chrome at 320 / 390 / 768 / 1024 / 1280 / 1920 px. App: the whole journey (welcome → quiz → prefs → reveal → check-in → Today → support → progress → profile → delete) at 390 and 1280 px. Both check: no sideways scroll, nothing cut off, no console errors, tap targets ≥ 44px on phones, axe WCAG 2.1 AA, reduced-motion rendering, keyboard focus, scroll story, FAQ, routes and deep links. Saves screenshots to `e2e/shots/` — look at them; some bugs only show by eye. |

When a bug is found by eye, add a check for it to the e2e file so it can't return.
