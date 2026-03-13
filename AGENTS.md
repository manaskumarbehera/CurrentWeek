# AGENTS.md — Week Number Chrome Extension

## Project Overview
A Manifest V3 Chrome extension that displays the ISO 8601 week number, day, and date. No build step — raw JS files are loaded directly by the browser.

## Architecture

| File/Dir | Role |
|---|---|
| `background.js` | MV3 service worker: renders the toolbar icon via `OffscreenCanvas`, listens to Chrome runtime events, exports `getCurrentWeekNumber` for testing |
| `popup/` | Main UI (HTML/CSS/JS) shown when the toolbar button is clicked |
| `options/` | Options page (theme selector: light/dark/blue/red), opened inline via `options_ui` |
| `tests/` | Jest unit tests; import directly from `background.js` via CommonJS |

## Key Patterns

### Dual-environment guard (critical)
`background.js` uses two separate guards so the same file works both in Chrome and Node.js (Jest):
```js
if (typeof chrome !== "undefined" && chrome.runtime) { /* Chrome-only */ }
if (typeof module !== "undefined" && module.exports) { module.exports = { getCurrentWeekNumber }; }
```
Any new testable utility added to `background.js` must follow this pattern.

### ISO 8601 week calculation
`getCurrentWeekNumber` uses the "nearest Thursday" algorithm (Monday = week start, Sunday = 7). This function is **intentionally duplicated** in `popup/popup.js` because MV3 service workers and popup pages cannot share ES modules directly — no bundler is used. A `// SYNC:` comment marks both copies as a reminder to keep them identical.

`getISOWeeksInYear(year)` returns 52 or 53 by calling `getCurrentWeekNumber(new Date(year, 11, 28))` — Dec 28 is always in the final ISO week. It lives only in `popup/popup.js` (not needed in `background.js`).

### Week start calculation
`displayWeekFromDate` finds the ISO Monday via:
```js
startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7));
```
`(getDay()+6)%7` maps Mon=0 … Sun=6, so subtracting it always lands on Monday (the old `getDate()-getDay()+1` advanced to the *next* Monday for Sundays).

### Date input parsing
Always parse date-picker values as local midnight:
```js
new Date(e.target.value + "T00:00:00")
```
Plain `new Date("YYYY-MM-DD")` is treated as UTC midnight, which shifts the calendar day in UTC-behind timezones.

### Chrome storage keys
- `iconColor` — hex string (e.g. `"#000000"`); used by both `background.js` and `popup.js`; always fall back to `"#000000"` if unset
- `theme` — string (`"light"` | `"dark"` | `"blue"` | `"red"`); used by `options.js` and `popup.js`

### Theme application
`applyTheme` must clear **all** four theme classes before adding the new one:
```js
bodyElement.className = "";
bodyElement.classList.add(themeName);
```
Using `classList.remove("dark", "light")` is insufficient — it leaves `"blue"`/`"red"` behind.

### Cross-component messaging
Popup → Background to refresh the toolbar icon:
```js
chrome.runtime.sendMessage({ action: "updateIcon", color: color });
```
Background handles this in the `onMessage` listener.

## Developer Workflows

### Run tests
```sh
npm test          # runs Jest on tests/weekNumber.test.js
```
Tests import `getCurrentWeekNumber` from `background.js` — no Chrome API mocks needed because all Chrome calls are inside the runtime guard.

### Load the extension locally
1. Open `chrome://extensions` → enable **Developer mode**
2. Click **Load unpacked** → select this repo root
3. After editing `background.js`, click the ↺ refresh button on the extension card

### No build step
There is no `npm run build`. Edits to JS/CSS/HTML take effect immediately after reloading the extension.

## Known Quirks
- `manifest.json` maps all icon sizes (`"16"`, `"48"`, `"128"`) to `icon48.png` — no dedicated 16px or 128px assets exist.
- `alert()` was removed from `handleWeekInputChange`; invalid week input is now silently clamped to the valid range.
