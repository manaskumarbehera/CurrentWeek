// week.js — single source of truth for ISO 8601 / US week math (ES module).
//
// Imported by the bundled service worker, popup, and options via Vite/CRXJS,
// and by Jest (babel-jest transpiles these exports to CommonJS for tests).
// All functions are pure; the browser surfaces (icon rendering, inputs) live in
// background.js / popup.js.

// Current ISO 8601 week number (1–53) for a given date. "Nearest Thursday" rule,
// Monday = week start, Sunday = 7.
export function getCurrentWeekNumber(date) {
  const tempDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tempDate.getUTCDay() || 7; // Make Sunday = 7
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum); // Nearest Thursday
  const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
  return Math.ceil(((tempDate - yearStart) / 86400000 + 1) / 7);
}

// Number of ISO weeks in a year (52 or 53). Dec 28 is always in the final week.
export function getISOWeeksInYear(year) {
  return getCurrentWeekNumber(new Date(year, 11, 28));
}

// The Monday (local time) of the ISO week containing `date`.
// (getDay()+6)%7 maps Mon=0 … Sun=6, so subtracting it always lands on Monday —
// including Sunday, which the naive getDate()-getDay()+1 pushes to *next* Monday.
export function getISOMonday(date) {
  const monday = new Date(date);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}

// The Monday (local time) that starts ISO `week` of `year`. Inverse of
// getCurrentWeekNumber for the week-start day. Year is explicit so callers can
// resolve a week against any year, not just the current one.
export function getDateOfISOWeek(week, year) {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const isoWeekStart = new Date(simple);
  if (dow <= 4) {
    // Sun(0)–Thu(4): back up to this week's Monday.
    isoWeekStart.setDate(simple.getDate() - dow + 1);
  } else {
    // Fri(5)–Sat(6): the Monday that owns Jan 4 is in the following calendar week.
    isoWeekStart.setDate(simple.getDate() + 8 - dow);
  }
  return isoWeekStart;
}

// ── US week-of-year system ────────────────────────────────────────────────
// In the US scheme, week 1 is simply the week that contains Jan 1, weeks start
// on `firstDay` (0 = Sunday by convention), and there is no nearest-Thursday
// rule — so a year has 53 or 54 numbered weeks. firstDay: 0 = Sun … 6 = Sat.

// The start-of-week (local) for `date`, given which weekday starts the week.
// getISOMonday(date) === getWeekStart(date, 1).
export function getWeekStart(date, firstDay = 1) {
  const d = new Date(date);
  const diff = (d.getDay() - firstDay + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

// US week number (1-based) of `date` within its own calendar year.
export function getUSWeekOfYear(date, firstDay = 0) {
  const firstWeekStart = getWeekStart(new Date(date.getFullYear(), 0, 1), firstDay);
  const thisWeekStart = getWeekStart(date, firstDay);
  const diffDays = Math.round((thisWeekStart - firstWeekStart) / 86400000);
  return Math.floor(diffDays / 7) + 1;
}

// Number of US weeks in `year` (53 or 54) — the week number of Dec 31.
export function getUSWeeksInYear(year, firstDay = 0) {
  return getUSWeekOfYear(new Date(year, 11, 31), firstDay);
}

// The start-of-week date for US `week` of `year`.
export function getDateOfUSWeek(week, year, firstDay = 0) {
  const firstWeekStart = getWeekStart(new Date(year, 0, 1), firstDay);
  const d = new Date(firstWeekStart);
  d.setDate(d.getDate() + (week - 1) * 7);
  return d;
}

// ── System-agnostic dispatchers ───────────────────────────────────────────
// system: "iso" (default) | "us". For ISO, firstDay is ignored (Monday-anchored
// by definition); for US it selects the week-start day.
export function getWeekNumber(date, system = "iso", firstDay = 0) {
  return system === "us" ? getUSWeekOfYear(date, firstDay) : getCurrentWeekNumber(date);
}

export function getWeeksInYear(year, system = "iso", firstDay = 0) {
  return system === "us" ? getUSWeeksInYear(year, firstDay) : getISOWeeksInYear(year);
}

export function getDateOfWeek(week, year, system = "iso", firstDay = 0) {
  return system === "us" ? getDateOfUSWeek(week, year, firstDay) : getDateOfISOWeek(week, year);
}

// ── Shared pure utilities (no DOM/Chrome) used by the popup ────────────────

// The weekday a week starts on for a given system. ISO is Monday-anchored by
// definition; US follows the user's first-day-of-week choice. Single source for
// the `system === "iso" ? 1 : firstDay` rule used in the popup and the worker.
export function weekStartDay(system, firstDay = 0) {
  return system === "us" ? firstDay : 1;
}

// Local midnight as "YYYY-MM-DD" for <input type="date"> (toISOString would emit
// the UTC date, a day off in UTC-behind timezones late in the day).
export function toLocalISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Date stripped to local midnight — for whole-day differences.
export function stripTime(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function sameYMD(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// Whole days remaining after `date` within its week (0 on the last day).
export function daysLeftInWeek(date, startOfWeek) {
  const offset = Math.min(
    6,
    Math.max(0, Math.round((stripTime(date) - stripTime(startOfWeek)) / 86400000))
  );
  return 6 - offset;
}

// Whole days remaining from `date` to Dec 31 of its year (0 on Dec 31).
export function daysLeftInYear(date) {
  const endOfYear = new Date(date.getFullYear(), 11, 31);
  return Math.max(0, Math.round((stripTime(endOfYear) - stripTime(date)) / 86400000));
}

// The 4-digit year from a "YYYY-MM-DD" input value, or `fallbackYear` if empty.
export function yearFromDateValue(value, fallbackYear) {
  const year = value ? parseInt(String(value).slice(0, 4), 10) : NaN;
  return Number.isFinite(year) ? year : fallbackYear;
}
