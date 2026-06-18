# AGENTS.md — Week Number Chrome Extension

## Project Overview

A Manifest V3 browser extension (Chrome + Edge) that displays the ISO 8601 / US
week number, day, and date. Built with **Vite + CRXJS** (`@crxjs/vite-plugin`);
the source is ES modules, bundled into `dist/` for loading and packaging.

## Architecture

| File/Dir                       | Role                                                                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `week.js`                      | **Single source of truth** for ISO/US week math + pure date utilities, DOM/Chrome-free                                         |
| `settings.js`                  | **Canonical settings** — `SETTINGS_DEFAULTS`, `getSettings()`, `saveSettings()` (used by popup, options, worker)               |
| `ui.js`                        | **Shared DOM helpers** — `applyTheme`, `applyI18n`, `resolveTheme`/`defaultTheme` (popup + options)                            |
| `background.js`                | MV3 service worker (ES module): renders the toolbar icon (`OffscreenCanvas`) or badge text, week-system aware, alarm-refreshed |
| `popup/`                       | Main UI (HTML/CSS/ES-module JS) shown when the toolbar button is clicked                                                       |
| `options/`                     | Options page: theme, week system, first day of week, toolbar display                                                           |
| `_locales/en/`                 | i18n messages (`messages.json`); manifest uses `__MSG_*__`                                                                     |
| `tests/`                       | Jest unit tests; import the pure functions from `week.js` (babel-jest transpiles the ES modules)                               |
| `vite.config.mjs` / `build.sh` | Vite/CRXJS build → `dist/`; `build.sh` then zips `dist/` per store                                                             |

## Build & module system

- **ES modules, bundled by Vite/CRXJS.** `week.js` uses `export`; `background.js`
  and `popup.js` `import` from it. The manifest service worker is
  `"type": "module"`. CRXJS reads `manifest.json`, bundles the popup/options/SW,
  and emits `dist/` (manifest at root, `_locales` + icons copied through).
- **Dev:** `npm run dev` (Vite + HMR) — load `dist/` as an unpacked extension.
- **Build/package:** `./build.sh` runs `vite build` then zips `dist/` into
  `build/<store>/week-number-v<version>-<store>.zip` for both stores.
- **Tests:** Jest can't read ESM natively, so `babel.config.cjs` (babel-jest)
  transpiles `week.js`'s exports for `require("../week")`. Tests are CommonJS.
- There is **no `// SYNC:` duplication** — add shared date helpers to `week.js`.

## Key Patterns

### Week math (week.js)

`getCurrentWeekNumber` uses the "nearest Thursday" algorithm (Monday = week
start, Sunday = 7). `getISOWeeksInYear(year)` returns 52 or 53 via
`getCurrentWeekNumber(new Date(year, 11, 28))` (Dec 28 is always in the final
ISO week). `getDateOfISOWeek(week, year)` is the year-aware inverse used by the
popup's week→date navigation.

### Week start calculation

`getISOMonday(date)` (in `week.js`) finds the ISO Monday via:

```js
monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
```

`(getDay()+6)%7` maps Mon=0 … Sun=6, so subtracting it always lands on Monday (the old `getDate()-getDay()+1` advanced to the _next_ Monday for Sundays). `displayWeekFromDate` in `popup.js` calls it.

### Date input parsing

Always parse date-picker values as local midnight:

```js
new Date(e.target.value + "T00:00:00");
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
npm test          # Jest over tests/ (week.js pure functions; babel-jest for ESM)
```

Tests import the pure functions from `week.js` — no Chrome API mocks needed
because all Chrome/DOM calls live in `background.js` / `popup.js`, not `week.js`.

### Dev / load the extension locally

1. `npm run dev` — Vite builds `dist/` and watches with HMR.
2. Open `chrome://extensions` (or `edge://extensions`) → enable **Developer mode**.
3. **Load unpacked** → select the **`dist/`** folder (not the repo root — the
   source is ES modules that must be bundled first).
4. CRXJS hot-reloads most changes; for manifest/SW changes click ↺ on the card.

### Build & package

`./build.sh [chrome|edge]` runs `vite build` (→ `dist/`, manifest at root,
`_locales` + icons copied) then zips `dist/` into
`build/<store>/week-number-v<version>-<store>.zip` for store upload. One MV3
build serves both Chrome and Edge. See `DOCUMENTATION/RELEASE.md` for publishing.

## Known Quirks

- `manifest.json` maps all icon sizes (`"16"`, `"48"`, `"128"`) to `icon48.png` — no dedicated 16px or 128px assets exist.
- `alert()` was removed from `handleWeekInputChange`; invalid week input is now silently clamped to the valid range.
