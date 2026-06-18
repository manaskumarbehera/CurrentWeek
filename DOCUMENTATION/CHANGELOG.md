# Changelog

All notable changes to the Week Number extension. The release pipeline gate
expects a `## v<version>` heading for the version being released.

## v1.12 — Footer UX polish (2026-06-18)

- **Footer UX polish:** the days-left info is grouped into compact chips on the
  left, and Copy week / Copy date became compact icon buttons (# and calendar)
  on the right with tooltips, aria-labels, and a "Copied!" confirmation — fixes
  the ragged wrapping at the 320px popup width.

## v1.11 — Tooling, fixes, features, modern UI, Vite migration (2026-06-18)

### Tooling

- **Centralized all shared logic** — removed the duplicated `defaultTheme`,
  `applyTheme`, `applyI18n`, settings-defaults objects, and the `weekStartDay`
  rule that were copied across `popup.js`/`options.js`/`background.js`. Now:
  date math + utilities in `week.js`, settings in `settings.js`, theme/i18n DOM
  helpers in `ui.js`. **212 tests** (~96% line coverage) — pure logic, settings
  storage, theme/i18n, and jsdom integration tests for the popup, options page,
  and the service-worker render paths (icon + badge).
- **Migrated to Vite + CRXJS** (`@crxjs/vite-plugin`). Source is now ES modules
  (`week.js` exports; `background.js`/`popup.js` import; SW is `type: module`).
  `./build.sh` runs `vite build` → `dist/` then zips per store (same package
  paths, so the release workflow is unchanged). `npm run dev` gives HMR.
  Jest reads the ESM source via babel-jest. Load the **`dist/`** folder unpacked.

### Features & UI

- **"Year in weeks" strip** — a compact row of ticks (one per week of the active
  year) under the day strip: the current week glows, elapsed weeks read as
  filled, a "X% through YYYY" caption tracks year progress, and clicking any tick
  jumps the popup to that week. Reuses the centralized week navigation.
- **Week systems:** ISO 8601 (default) and US week-of-year, with a configurable
  first day of week (Options).
- **Toolbar display:** drawn-number icon (existing) or **badge text** mode.
- **Internationalization:** `_locales/en` + `default_locale`; manifest and UI use
  `__MSG_*__` / `chrome.i18n` (the day name already localized).
- **Popup:** days-remaining (week & year) chips and copy-week / copy-date buttons.
- **Theme:** follows the OS `prefers-color-scheme` when no theme is saved.
- **Modern UI revamp:** redesigned popup — hero week number, today-highlighted day
  strip, compact ~square card, CSS-variable theming (collapsed the duplicated
  theme blocks). No `console.*` in shipped code (enforced by ESLint).

### Fixes from `DOCUMENTATION/REVIEW.md` (bump the version before releasing):

- **Toolbar week number now auto-refreshes** via a `chrome.alarms` hourly alarm
  (`alarms` permission added), so it no longer goes stale across midnight/week
  boundaries while the browser stays open. (#1)
- **53-week years are now reachable** — the popup derives the week input `max`
  from `getISOWeeksInYear()` instead of the hardcoded `52`. (#2)
- **Initial date no longer off-by-one** in UTC-behind timezones — the date input
  is seeded from a local `YYYY-MM-DD` instead of `toISOString()`. (#3)
- **Manifest uses the real 128px icon** (`icon128.png`) instead of an upscaled
  48px image. (#6)
- Corrected the `getISOWeeksInYear` duplication note in `AGENTS.md` and added a
  `// SYNC:` marker to both copies. (#7)
- **Extracted all ISO date math into a single shared `week.js`** (loaded by the
  service worker via `importScripts`, the popup via `<script>`, and Jest via
  `require`), removing the hand-synced duplication between `background.js` and
  `popup.js`.
- **Week→date navigation is now year-aware** — entering a week number resolves
  against the year in the date field instead of always the current year. (#4)
- **Toolbar icon now renders via `setIcon({imageData})`** (the documented MV3
  path) instead of a Blob→FileReader→data-URL round-trip. (#5)
- Added `tests/dateOfISOWeek.test.js` (year-aware week↔date round-trips; 156
  tests total) and a root `README.md`.

## v1.10 — Release tooling & CI (2026-06-18)

- Added `./build.sh` producing store-ready Chrome and Edge ZIPs with
  `manifest.json` at the ZIP root.
- Added CI (`ci.yml`) — version check, lint, test, build on every push/PR.
- Added the tag/bump-driven `release.yml` pipeline that publishes to the Chrome
  Web Store and Edge Add-ons (safe-by-default, per-store credential gates).
- Aligned `package.json` version with `manifest.json` (1.10) and added a
  version-consistency check.
- Added ESLint (flat config), Prettier, lint-staged, and husky pre-commit /
  pre-push hooks.
- Added `.claude/` (store-release-engineer agent, `/release` command, settings)
  and project docs (`CLAUDE.md`, `DOCUMENTATION/RELEASE.md`).

_No functional changes to the extension itself in this version._
