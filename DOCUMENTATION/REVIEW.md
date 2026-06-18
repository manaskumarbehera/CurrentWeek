# Week Number — Code Review: Issues, Improvements & Features

Review date: 2026-06-18. Scope: full extension (manifest, background SW, popup,
options, tests). Security posture is good (only `storage` permission, strict CSP,
no host permissions, no remote code, no `eval`). Findings below are ranked.

> **Status (2026-06-18, branch `chore/release-and-tooling-setup`):**
>
> - **All issues FIXED** — #1, #2, #3, #6, #7 (first pass) and **#4, #5** (second pass).
> - **Improvements DONE** — shared `week.js` (kills the SYNC duplication),
>   year-aware tests (`tests/dateOfISOWeek.test.js`, 156 tests total), and a root
>   `README.md`.
> - **Still open (improvements)** — i18n / `_locales`, `prefers-color-scheme`
>   default, externalizing the blink-timeout / default-color constants.
> - **Features** — none built yet; awaiting product direction (see the list below).

## Issues / bugs

### High

1. **Toolbar week number goes stale — it never auto-refreshes.** `background.js`
   only calls `updateIcon` on `onStartup`, `onInstalled`, and the popup
   `updateIcon` message — there is no `chrome.alarms`. If the browser stays open
   across a week boundary (or midnight), the toolbar badge keeps showing the old
   week until restart or until the popup is opened. For an extension whose whole
   job is "show the current week," the always-visible number is the part most
   likely to be wrong. Fix: add an `alarms` permission + a daily/at-midnight
   alarm that re-runs `updateIcon`.

2. **53-week years are unreachable via the native number control.**
   `popup/popup.html:21` hardcodes `max="52"`, but 2026/2020/2015/etc. have 53
   ISO weeks (the JS `getISOWeeksInYear` knows this — `popup.js:128,136`). The
   custom Arrow-Up/Down handler honors 53, but the browser's native spinner and
   form validation cap at 52, so week 53 can't be entered the obvious way. Fix:
   set `max` dynamically from `getISOWeeksInYear(currentYear)` on load.

### Medium

3. **Initial date can be off by one day in UTC-behind timezones.** The date
   input is seeded with `now.toISOString().split("T")[0]` (`popup.js:25` and the
   reset button `:38`), which is the **UTC** date. Late in the day in US
   timezones this shows tomorrow's/yesterday's date — ironic given the rest of
   the code carefully appends `T00:00:00` to parse as _local_ midnight. Fix:
   build the value from local `getFullYear/getMonth/getDate`.

4. **`displayWeekFromWeekNumber` is locked to the current year** (`popup.js`
   uses `new Date().getFullYear()`). Entering a week number always resolves
   within this calendar year even if the date input points at another year, so
   week↔date navigation can disagree across a year boundary. Also its
   week-1→Monday heuristic is untested at the Jan 1 = Fri/Sat/Sun edges.

5. **`chrome.action.setIcon` is passed a data URL as `path`** (`background.js`).
   It works in Chrome today but the documented MV3 approach is `imageData` from
   the `OffscreenCanvas` (`ctx.getImageData`). The current path is more fragile
   across engines (matters for the Edge target).

### Low

6. **Manifest ships a 128px icon but never uses it.** All icon sizes in
   `manifest.json` map to `icons/icon48.png`, yet `icons/icon128.png` exists.
   The store/installation 128px slot is therefore an upscaled-blurry 48px image,
   and there is no dedicated 16px icon. Fix: map `"128"` → `icon128.png` (and add
   a real 16px asset).

7. **Doc inaccuracy in `AGENTS.md`.** It states `getISOWeeksInYear` "lives only
   in `popup/popup.js` (not needed in `background.js`)" — but it is defined _and
   exported_ in `background.js:12,75`. Either remove it from background.js or
   correct the doc (and add a `// SYNC:` marker, since it too is now duplicated).

## Improvements (refactor / quality)

- **Kill the SYNC duplication.** `getCurrentWeekNumber` (and now
  `getISOWeeksInYear`) are hand-copied between `background.js` and
  `popup/popup.js` with a `// SYNC:` comment as the only guard against drift.
  Extract them into a shared `week.js`, loaded by the SW via `importScripts()`
  (or an ES module) and by the popup via `<script src>`. One source of truth,
  and it becomes directly testable.
- **Add popup-logic tests (jsdom).** Current tests only cover the pure date math
  via `background.js`. `displayWeekFromDate`, `displayWeekFromWeekNumber`,
  `adjustWeekNumber`, and `handleWeekInputChange` — the parts most likely to
  break — are untested. Add a `jest-environment jsdom` suite once the shared
  module exists. This directly closes the SYNC-drift risk.
- **Add a `README.md`.** There is none at the root — add install/dev/usage and a
  one-line architecture pointer to `AGENTS.md`/`CLAUDE.md`.
- **Internationalize.** `manifest.name`/`description` and the popup/options
  labels are English-only. Add `default_locale` + `_locales/en/messages.json`
  and `__MSG_*__` references (the day name already localizes via
  `navigator.language`, so the data layer is half done).
- **Respect `prefers-color-scheme`** as the default theme instead of hardcoding
  `"light"` when no preference is saved.
- **Externalize the `value="#000000"` default** and the magic `2000`ms blink
  timeout into named constants.

## Feature ideas

- **Badge-text mode** — use `chrome.action.setBadgeText`/`setBadgeBackgroundColor`
  as a lighter, always-crisp alternative to canvas-rendered icons (and a natural
  fix for issue #5).
- **Configurable week system** — ISO 8601 (current) vs. US week-of-year
  (Sunday-start), plus a "first day of week" setting.
- **Year navigation** — let the week↔date mapping work for any year, not just
  the current one (pairs with fixing #4).
- **"Days remaining" / progress** — days left in the week and in the year, or a
  week-of-year progress bar.
- **Copy-to-clipboard** — quick copy of the week number or the selected date.
- **Notifications/alarm** — optional "new week started" notification (reuses the
  alarm added for issue #1).
- **More themes / custom accent** — extend the existing theme system.

## Suggested order

1. #1 (stale icon) and #2 (max=52) — correctness of the core feature.
2. Extract shared `week.js` + jsdom tests — removes the drift risk underlying
   several items.
3. #3, #6, #7 — small, high-confidence polish.
4. Pick features from the list per product priority.
