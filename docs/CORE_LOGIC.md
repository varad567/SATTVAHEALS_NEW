# CORE_LOGIC.md — How the App Thinks

> Every rule the code follows. Code comments point here by section number (e.g. `CORE_LOGIC §4.2`).
> All logic lives in `src/engine/` as pure functions: same input → same output, no React, no network.
> Numbers marked **(tune)** are starting values to adjust after testing.

---

## 1. Data the engine uses

```js
profile = {
  prakriti: { vata: 48, pitta: 34, kapha: 18, dominant: 'vata', label: 'Vata · Pitta' },
  prefs:    { minutes: 10, diet: 'vegetarian', wake: '07:00' }
}
today   = { date: '2026-11-18', mood: 'overthinking' }   // mood can be 'okay'
history = [{ date, practiceId, module }]                  // last 7 days of completions
```

## 2. Prakriti quiz scoring — `scorePrakriti.js`

**2.1** 12 questions in `src/content/quiz.json`. Every question has exactly 3 options, in the
order **Vata, Pitta, Kapha**. Each answer adds 1 point to that dosha.

**2.2** Percentages: `round(points / 12 × 100)`. Fix rounding so the three always add to 100
without changing who leads: a **missing** point goes to the largest share, an **extra** point comes
off the smallest. (Example: 5/5/2 answers → 42/42/16, not 41/42/17 — found by the exhaustive test.)

**2.3** `dominant` = the highest score. Tie → order Vata > Pitta > Kapha (Vata is the most
easily disturbed, so it is the safest to support first).

**2.4** `label`: if all three are within **10 points** → `"Tridosha · balanced"`; else if the
second-highest is within 10 points of the top → dual type (`"Vata · Pitta"`, highest first);
otherwise single (`"Vata"`).

**2.5** A half-finished quiz is saved in `localStorage` (key `sh.quiz.draft`) and resumed at
the last unanswered question (Flow 2).

## 3. Practice data format — `src/content/practices.json`

25 practices: 8 dinacharya, 9 ahara, 8 mantra (ahara has one extra so every diet has a quick option for every dosha).

```json
{
  "id": "din-foot-oil",
  "module": "dinacharya",
  "title": "Warm oil foot massage",
  "minutes": 5,
  "when": "before sleep",
  "doshas": ["vata"],
  "moods": ["anxious", "overthinking", "stressed"],
  "diet": ["all"],
  "steps": ["Warm a spoon of sesame oil…", "Massage each foot…", "Put on socks…"],
  "reasonKey": "warmth-grounds-vata",
  "humKind": null
}
```

- `doshas`: which doshas the practice settles (1–2 values).
- `moods`: which moods it suits.
- `diet`: `"all"` or a list from `vegetarian | eggetarian | non-vegetarian | vegan | jain`.
  Ahara items must say which diets they fit. Non-food items use `"all"`.
- `humKind`: for mantra items, `"bhramari"` or `"om"`; otherwise `null`.
- Every practice must pass the compliance check (CONTEXT §5) before merge.

## 4. Picking Today's 3 — `pickToday.js`

**4.1 Mood → target dosha**

| Mood | Target dosha |
|---|---|
| anxious | vata |
| overthinking | vata |
| irritable | pitta |
| stressed | pitta |
| low | kapha |
| sluggish | kapha |
| okay | the user's `dominant` |
| anything else / missing | treated exactly as **okay** |

**4.2 Filter** each module's practices:
- `minutes ≤ prefs.minutes` (if nothing passes, ignore this filter for that module)
- diet matches (`"all"` or includes `prefs.diet`) — **never relaxed**; if nothing fits, that
  card is `null` and the screen says so

**4.3 Score** each remaining practice:

| Rule | Points |
|---|---|
| `doshas` includes target dosha | +3 |
| `doshas` includes dominant dosha (and it differs from target) | +1 |
| `moods` includes today's mood | +2 |
| Done yesterday | −5 |
| Done in the last 7 days (not yesterday) | −1 |

Only the most recent time counts. Today and future dates are ignored.

**4.4 Pick** the highest score per module. Tie → alphabetical by `id`. Fully deterministic, so
the same day always gives the same plan.

**4.5 Re-pick** (mood change, retake quiz, edit prefs): run 4.2–4.4 again only for modules whose
card is **not done** today (Flows 3 and 5).

**4.6 New day** starts at local midnight → new check-in, new plan.

## 5. "Why this for you" — `buildReason.js`

One sentence: `"{who} — {how}{fits}."` built from `src/content/reasons.json`.

| Case | `who` |
|---|---|
| practice suits the Prakriti, mood given | "You're Vata-dominant and your mind is busy" |
| practice suits the Prakriti, mood okay | "You're Vata-dominant" |
| picked for today's mood only | "You're feeling irritable today" |
| mood okay, practice outside the Prakriti | "It keeps your Kapha side balanced" |

`how` = `reasons.how[reasonKey]`. Ahara cards add `fits` = " — and it fits your {diet} diet".
Never hard-code reasons in components.

## 6. Hum coach — `src/engine/hum/`

All audio is processed in the browser with the Web Audio API (`AnalyserNode`, 2048-sample frames,
~20 readings per second). **No audio is stored or sent.** Only the numbers in §6.6 are saved.

**6.1 Noise check (3 s silence)** → `noiseFloor` = average loudness in dBFS.
If `noiseFloor > −45 dBFS` **(tune)** → "Too noisy" (Flow 4: retry or timer-only).

**6.2 Hum detection**: a hum starts when loudness stays **12 dB above** `noiseFloor` for 300 ms,
and ends when it drops below that for 300 ms **(tune)**.

**6.3 Measurements per round**

| Measure | How | Good range (tune) |
|---|---|---|
| Hum length | hum end − hum start | ≥ 8 s (Bhramari), ≥ 6 s (Om) |
| Inhale gap | time since previous hum ended | 3–6 s |
| Steadiness | variation of loudness during the hum (std ÷ mean, on amplitude not dB) | < 0.25 = steady |
| Loudness | average dBFS during the hum | −35 to −15 dBFS |
| Pitch | normalised autocorrelation, 80–400 Hz, first strong peak (avoids octave errors), median per round | within 15% of the user's first-round pitch, not rising |

**6.4 One tip at a time**, highest-priority problem first:
1. Too loud → "Soften the hum — a gentle buzz you feel in your face is enough."
2. Hum too short → "Try a longer, slower hum. Let the exhale take its time."
3. Wavy → "Keep the hum even, like a bee's steady buzz."
4. Pitch rising → "Let the pitch drop to a comfortable low tone."
5. Inhale too short → "Take a full, slow breath through the nose before the next hum."
6. All good → "Lovely and steady."

Tips coach **technique only** (CONTEXT §5). Tip wording lives in `src/content/humTips.json`.

**6.4b Timer-only mode** (no mic, mic denied, or a noisy room — Flow 4): the user holds a button while
humming. Only length and inhale are measured; tips are limited to "too short" / "short inhale" / "good";
`steadyRounds` is saved as `null` so Progress never shows a fake "100% steady".

**6.5 Session end**: after the set rounds (default 6). Ending early asks to confirm; the session
is saved only if **≥ 2 rounds** were completed (Flow 4).

**6.6 Saved per session**: `date, practiceId, kind, rounds, avgHum, avgInhale, steadyRounds (null in
timer-only), before (1–5|null), after (1–5|null)`. Saving also marks the mantra card done. The mic is
released the moment the session ends. All thresholds live in one object, `T` in `src/engine/hum/coach.js`.

## 7. Prana chat — routing rules (`api/chat.js` + `src/engine/chatRoute.js`)

Every message goes through these steps **in order**. The routing runs on the server before any
call to Gemini. **Default answer is "no Gemini call"** — Gemini is only reached after every gate
below passes.

**7.0 Lock the API (abuse protection)** — checked before anything else in `api/chat.js`:

| Gate | Rule | On failure |
|---|---|---|
| Kill switch | env `CHAT_ENABLED` must be `"true"` | fallback reply (7.6) |
| Origin | request `Origin` must be `https://sattvaheals.in` (or `www.`, or the Vercel preview URL in dev) | 403 |
| Method / size | `POST` only, JSON body ≤ 2 KB, message 1–300 characters | 400 |
| Signed in | valid Supabase access token, verified on the server | anonymous → FAQ-only mode (7.0b) |
| User rate limit | ≤ **10 messages / 10 min** and ≤ **40 / day** per user | "Let's pause for a bit — try again later." |
| Global cap | ≤ env `CHAT_DAILY_CAP` Gemini calls per day for the whole site (start: 800) | fallback reply (7.6) |
| Lock-out | 3 **strikes** in 24 h → chat locked for that user for 24 h | "Chat is paused on your account until tomorrow." |

**Order of content checks (after the gates above):**
7.1 crisis → 7.0d misuse → 7.2 emotional → 7.3 personal data → 7.0e topic → 7.4 Gemini.
**Crisis always wins** — "I want to die, now write my essay" gets the crisis reply, not a strike.
The same crisis check also runs in FAQ-only mode.

**7.0b FAQ-only mode** — visitors who are not signed in (e.g. on the landing page) get answers
matched from `src/content/faq.json` by keyword in the browser. **They can never reach Gemini.**
Unmatched → "Sign in to ask Prana anything about the app, or see the FAQ."

**7.0c Counters** live in Supabase table `chat_usage` (ARCHITECTURE §4), updated by one atomic
database function, so limits hold across all Vercel instances. Only counts and timestamps are
stored — never message text.

**7.0d Misuse check (a strike)** — any of these → fixed redirect, **not sent to Gemini**, +1 strike:
- override attempts: "ignore previous", "system prompt", "you are now", "pretend", "act as",
  "jailbreak", "developer mode", "DAN", role-play set-ups;
- task-for-hire framing: "to cure me / heal me / help me you must…", "my doctor/therapist said you
  have to…", "it's an emergency, just write…";
- work requests: write/solve/code/essay/assignment/homework/translate/summarise this,
  pasted code or text over 200 characters with no app words;
- encoded or obfuscated text (base64-looking strings, long runs of symbols).
Redirect: *"I can only help with using Sattva Heals — like the quiz, your practices or the hum coach."*
Patterns live in `src/content/chatSafety.json`; update them as new tricks appear.

**7.0e Topic gate** — after 7.1–7.3, the message must contain at least one app word
(quiz, Prakriti, dosha, practice, dinacharya, ahara, mantra, hum, Bhramari, Om, check-in, mood,
progress, profile, account, login, sign in, data, privacy, delete, Prana, app, Sattva). If not →
the same redirect, **no Gemini call, no strike** (honest off-topic questions aren't punished).


**7.1 Crisis check** — matches wording about suicide, self-harm, wanting to die, or being in
danger (list in `src/content/chatSafety.json`, English + common Hinglish). →
Fixed reply: acknowledge, urge reaching out now, show **Tele-MANAS 14416** (verify before launch)
and emergency number **112**. **Not sent to Gemini.** Not stored.

**7.2 Emotional check** — matches feeling words (sad, anxious, stressed, lonely, can't sleep…). →
Fixed, warm reply + a link to today's check-in + the "Need more support?" helpline link.
**Not sent to Gemini.**

**7.3 Personal-data check** — looks for phone numbers, emails, or long numbers. → Ask the user
not to share personal details; **not sent**.

**7.4 App question** → sent to Gemini with:
- the system prompt in `api/prompts/prana.txt` (app facts only, compliance rules, "say you can
  only help with the app", max ~120 words, Prana's warm tone);
- at most the **last 4 messages**; no name, email, Prakriti, or any user ID;
- `maxOutputTokens` 220, temperature 0.3, Gemini safety filters at their strictest setting;
- model name from env `GEMINI_MODEL` (swap without code changes).

**7.5 Output filter** — if Gemini's reply contains a banned word (CONTEXT §5), tries to give
medical advice, contains code, a list longer than 6 items, or more than 160 words, replace it with: "I can only help with using Sattva Heals. For anything about
your health, please talk to a professional."

**7.6 Fallback** — if Gemini fails or the free quota is used up → "I'm resting right now — try
again in a little while." plus a link to the FAQ.

**7.7 Chat history** stays in the browser only (`sessionStorage`); nothing is saved in Supabase.

## 8. Progress — `progressStats.js`

- **Days practised**: days in the last 14 with ≥ 1 completion.
- **Mood trend**: check-ins of the last 14 days grouped as okay / busy mind (anxious,
  overthinking) / heated (irritable, stressed) / heavy (low, sluggish).
- **What works for you**: average `after − before` per hum kind, shown only once a kind has
  **≥ 3** sessions with both values.
- **Hum stats**: average hum length per week; % steady rounds.
