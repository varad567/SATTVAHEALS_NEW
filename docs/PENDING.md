# PENDING.md — What's Left

> Everything in the code is built and tested. These are the steps that need you (keys, accounts,
> people) or that can only happen on the live site. Tick them off here.

## Before launch — needs you (about 1 hour on a laptop)

| # | Task | Where | Notes |
|---|------|-------|-------|
| 1 | Create a Supabase project | supabase.com | Free plan is fine |
| 2 | Run `supabase/schema.sql` | Supabase → SQL Editor | Creates all tables, security rules and the chat-limit function |
| 3 | Turn on Google sign-in | Supabase → Authentication → Providers → Google | Needs an OAuth client from Google Cloud Console |
| 4 | Set URLs | Supabase → Authentication → URL configuration | Site `https://sattvaheals.in`, redirects `https://sattvaheals.in/app` and `http://localhost:5173/app` |
| 5 | Get a Gemini API key + model name | Google AI Studio | Free tier (D-21). Pick a current Flash model |
| 6 | New GitHub repo, push the code | github.com | `git remote add origin … && git push` |
| 7 | Import into Vercel | vercel.com → Add New → Project | Framework: Vite |
| 8 | Add env vars | Vercel → Settings → Environment Variables | See `.env.example`. `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (never `VITE_`), `GEMINI_API_KEY`, `GEMINI_MODEL`, `CHAT_ENABLED=true`, `CHAT_DAILY_CAP=800` |
| 9 | Point the domain | Vercel → Domains → add `sattvaheals.in` + `www` | Then update DNS at your registrar as Vercel shows. Replaces the old site |
| 10 | Contact email | `src/content/legal.json` → `contact` | Currently `CONTACT_EMAIL_PLACEHOLDER` |
| 11 | Verify helplines | Tele-MANAS 14416, emergency 112 | Used in chat, Today, Profile, footer, Terms |

## Before launch — needs a person

| # | Task | Who |
|---|------|-----|
| 12 | Review quiz wording, the 25 practices and the "why" lines | Someone with IKS knowledge (PRD §9: Vedanti) |
| 13 | Read Privacy + Terms once more | You; a lawyer if this ever becomes commercial |

## After launch — on real phones and people

| # | Task | Why |
|---|------|-----|
| 14 | Hum coach on iPhone Safari and an Android phone | Mic behaviour differs between browsers; tests used Chrome |
| 15 | Tune `T` in `src/engine/hum/coach.js` with 3–4 real voices | Thresholds are starting values (CORE_LOGIC §6 "tune") |
| 16 | 5-person test (script below) | The only honest way past a 9.5 UI score |
| 17 | Lighthouse on the live site | Performance/SEO score with real fonts and CDN |
| 18 | Confirm fonts load | The test sandbox had no internet, so screenshots show fallback fonts |

### 5-person test script (15 minutes each)

Say: "Think aloud. There are no wrong answers — we're testing the app, not you."

1. Open sattvaheals.in. *What do you think this is for?* (Do they get it in 10 s?)
2. Start and finish the quiz. *Was any question confusing?*
3. Check in with how you feel. Open one practice and mark it done.
4. Do one hum session with the mic. *Did the tips make sense? Did Prana feel helpful or annoying?*
5. Ask Prana chat one question about the app.
6. Change your diet in Profile. *Did you notice anything change?*

Note where they hesitate, misread, or ask "what does this do?". Fix the top 3, retest with 2 people.

## Later (v2 candidates)

Raga listening (needs licensed recordings) · email login · Hindi/Marathi ·
offline queue for changes · more practices per dosha · daily reminders.
