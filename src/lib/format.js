/**
 * FILE: src/lib/format.js
 * PURPOSE: Small formatting helpers. Dates are 'YYYY-MM-DD' in the user's own time zone;
 *   a new day starts at local midnight (CORE_LOGIC §4.6).
 */
export const todayISO = (now = new Date()) => now.toLocaleDateString('en-CA'); // en-CA formats as YYYY-MM-DD
export const addDays = (iso, n) => new Date(Date.parse(iso) + n * 86400000).toISOString().slice(0, 10);
export const greeting = (hour = new Date().getHours()) => (hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening');
export const dayLabel = (iso, opts = { weekday: 'long' }) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-IN', opts);
export const cap = (s) => s[0].toUpperCase() + s.slice(1);
