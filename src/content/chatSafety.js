/**
 * FILE: src/content/chatSafety.js
 * PURPOSE: Words and replies for Prana chat safety (CORE_LOGIC §7). Shared by the browser and api/chat.js.
 *   Patterns are case-insensitive regular expressions. Add new ones as new tricks appear; chatRoute.test.js
 *   must keep passing. Kept as a JS module (not JSON) so the server function can import it directly.
 */
export const PATTERNS = {
  // 7.1 — always wins, even over lock-outs and misuse
  crisis: [
    'suicid', 'kill (my ?self|me)', 'end (my|this) life', '(want|wanna|going) to die', "(don'?t|do not) want to (live|be alive|wake up)",
    'no reason to live', 'better off dead', 'self[- ]?harm', '(hurt|harm|cut)(ting)? my ?self', 'overdose',
    'marna (hai|chahta|chahti)', 'mar ja(una|na|aun)', 'khud ko (maar|khatam)', 'jeena nahi', 'atmahatya', 'आत्महत्या', 'मरना', 'जीना नहीं',
    "i'?m in danger", 'someone is (hurting|abusing) me',
  ],
  // 7.0d — tricks to use Prana as a free general AI (counts a strike)
  misuse: [
    'ignore (all |the |your )?(previous|prior|above|earlier)? ?(instructions|rules|prompt)', 'system prompt', 'you are now', 'pretend (to be|you)', '\\bact as\\b',
    'jailbreak', 'developer mode', '\\bDAN\\b', 'do anything now', 'role[- ]?play',
    '(cure|heal|fix|help|save) (me|my \\w+),? you (must|have to|need to|should)', '(doctor|therapist|teacher|professor|boss) (said|says|told me) you (must|have to)',
    "(it'?s an |this is an )?emergency,? (just )?(write|solve|code|do|answer)",
    '\\b(assignment|homework|essay|exam answers?|my code|this code|python|javascript|sql query)\\b',
    '^(please |pls |can you |could you )?(write|solve|code|debug|translate|summari[sz]e|paraphrase|generate|compose) ',
    '[A-Za-z0-9+/]{40,}={0,2}', '[!-/:-@\\[-`{-~]{12,}', // encoded text; long runs of keyboard symbols (not emojis)
  ],
  // 7.2 — feelings get a fixed, caring reply (never sent to Gemini)
  emotional: [
    '\\b(sad|anxious|anxiety|depress\\w*|lonely|alone|stressed|overwhelmed|panic\\w*|scared|afraid|crying|hopeless|worthless|heartbroken|upset|miserable)\\b',
    "can'?t (sleep|cope|stop thinking)", "(feel|feeling|felt|i'?m|i am)( (so|really|very|quite|pretty|kind of))? (low|down|empty|terrible|awful|bad|lost|numb)\\b", 'tired of everything', '\\b(udaas|pareshan|akela|tension)\\b',
  ],
  // 7.3 — personal details are never sent anywhere
  personal: ['[\\w.+-]+@[\\w-]+\\.[\\w.]+', '(\\+?\\d[\\s-]?){10,}', '\\b\\d{4}\\s?\\d{4}\\s?\\d{4}\\b'],
};

// 7.0e — a message must mention the app to reach Gemini
export const APP_WORDS = ['quiz', 'prakriti', 'dosha', 'vata', 'pitta', 'kapha', 'practice', 'dinacharya', 'ahara', 'mantra', 'hum', 'bhramari', '\\bom\\b',
  'check-?in', 'mood', 'progress', 'garden', 'mandala', 'profile', 'account', 'log ?in', 'sign ?(in|out)', 'data', 'privacy', 'delete', 'prana', '\\bapp\\b', 'sattva', 'diet', 'reminder', 'mic'];

export const REPLIES = {
  crisis: "I'm really glad you told me. You deserve support right now from a real person. Please call Tele-MANAS on 14416 (free, 24×7) or, if you're in danger, 112. If you can, reach out to someone you trust and let them know how you're feeling.",
  emotional: "Thank you for sharing that with me. I'm here to help with your daily practices — today's check-in lets me pick ones for how you feel. If things feel heavy, talking to someone helps: Tele-MANAS is free on 14416.",
  personal: "Please don't share personal details like phone numbers, emails or ID numbers here. I don't need them to help you with the app.",
  misuse: "I can only help with using Sattva Heals — like the quiz, your practices or the hum coach.",
  offTopic: "I can only help with using Sattva Heals — like the quiz, your practices or the hum coach.",
  signIn: "Sign in to ask me anything about the app — or have a look at the FAQ on the home page.",
  tooLong: "That's a long message! Please keep it under 300 characters.",
  rate: "Let's pause for a bit — you can ask me again in a few minutes.",
  locked: "Chat is paused on your account until tomorrow.",
  resting: "I'm resting right now — try again in a little while, or see the FAQ on the home page.",
  unsafeOutput: "I can only help with using Sattva Heals. For anything about your health, please talk to a professional.",
};
