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
├── api/
│   ├── chat.js                ← Prana chat endpoint (CORE_LOGIC §7)
│   ├── delete-account.js      ← removes the auth user (needs service role key)
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
│   │   └── hum/               ← detectHum.js, measure.js, pitch.js, pickTip.js  (§6)
│   ├── lib/
│   │   ├── supabase.js        ← client
│   │   └── db.js              ← every database read/write in one place
│   ├── hooks/                 ← useAuth.js, useMic.js, useToday.js
│   ├── components/            ← Prana, Card, Nav, Sidebar, Bubble, Meter, ChatWidget…
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
chat_usage    (user_id uuid PK, window_start timestamptz, window_count int,
               day date, day_count int, strikes int, strikes_since timestamptz,
               locked_until timestamptz NULL)
chat_global   (day date PK, gemini_calls int)
```

- `chat_usage` / `chat_global` are written **only** by the database function
  `chat_check_and_count(uid, is_strike)` called from `api/chat.js` with the service role key;
  RLS denies all direct access from the browser.

- **RLS on every table**: a user can only select/insert/update/delete rows where
  `user_id = auth.uid()` (`id = auth.uid()` for profiles).
- Chat messages are **never** stored.
- **Delete my data**: client deletes the user's rows (RLS allows it), then calls
  `/api/delete-account`, which verifies the user's token and deletes the auth user.

## 5. Environment variables (Vercel → Settings → Environment Variables)

| Name | Where used | Secret? |
|---|---|---|
| `VITE_SUPABASE_URL` | browser | no |
| `VITE_SUPABASE_ANON_KEY` | browser | no (RLS protects data) |
| `SUPABASE_SERVICE_ROLE_KEY` | `api/delete-account.js`, `api/chat.js` (rate-limit function only) | **yes** |
| `GEMINI_API_KEY` | `api/chat.js` only | **yes** |
| `GEMINI_MODEL` | `api/chat.js` | no |
| `CHAT_ENABLED` | `api/chat.js` — kill switch | no |
| `CHAT_DAILY_CAP` | `api/chat.js` — site-wide Gemini calls per day | no |
| `ALLOWED_ORIGINS` | `api/chat.js` — comma-separated | no |

Secrets never get the `VITE_` prefix (that would ship them to the browser).

## 6. Deployment

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
| `npm test` | Unit tests (Vitest): components, routes, content shape, compliance word scan over all JSON + JSX text |
| `npm run test:e2e` | Real Chrome at 320 / 390 / 768 / 1024 / 1280 / 1920 px: no sideways scroll, nothing cut off, no console errors, tap targets ≥ 44px on phones, axe WCAG 2.1 AA, reduced-motion rendering, keyboard focus, scroll story, FAQ, routes and deep links. Saves screenshots to `e2e/shots/` — look at them; some bugs only show by eye. |

When a bug is found by eye, add a check for it to the e2e file so it can't return.
