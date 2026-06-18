# CLAUDE.md — Week Number extension

Manifest V3 browser extension (Chrome + Edge) that displays the ISO 8601 week
number, day, and date. Tiny, no bundler — raw JS is loaded by the browser.

**Architecture, code patterns, and known quirks live in [AGENTS.md](AGENTS.md).**
Read it before touching `background.js`, `popup/`, or `options/`. This file
covers the dev/release workflow and conventions.

Built with **Vite + CRXJS** (`@crxjs/vite-plugin`); ES-module source, bundled
into `dist/`.

## Layout

| Path                                    | Role                                                                  |
| --------------------------------------- | --------------------------------------------------------------------- |
| `week.js`                               | Single source of truth for ISO/US week math + pure date utilities     |
| `settings.js`                           | Canonical `SETTINGS_DEFAULTS` + `getSettings`/`saveSettings`          |
| `ui.js`                                 | Shared theme + i18n DOM helpers (popup + options)                     |
| `background.js`                         | MV3 service worker (ES module); toolbar icon/badge, week-system aware |
| `popup/`                                | Toolbar popup UI (ES-module JS)                                       |
| `options/`                              | Options page (theme, week system, first day, toolbar display)         |
| `_locales/en/`                          | i18n messages; manifest uses `__MSG_*__`                              |
| `tests/`                                | Jest unit tests (`require('../week')`; babel-jest transpiles ESM)     |
| `vite.config.mjs`                       | Vite + CRXJS config                                                   |
| `build.sh`                              | `vite build` → `dist/`, then zips per store into `build/<store>/`     |
| `scripts/check-version-consistency.cjs` | Asserts `manifest.json` version == `package.json` version             |
| `.github/workflows/`                    | `ci.yml` (lint+test+build) and `release.yml` (Chrome + Edge publish)  |

## Commands

```sh
npm run dev             # Vite + HMR → load dist/ as an unpacked extension
npm run validate        # version check + lint + tests (what CI runs)
npm test                # Jest (babel-jest for ESM)
npm run lint            # ESLint (flat config, eslint.config.js)
npm run format          # Prettier write
./build.sh chrome edge  # vite build → build/<store>/week-number-v<version>-<store>.zip
```

## Conventions

- **Versioning:** `manifest.json` and `package.json` must always hold the same
  version. Bump both together; `npm run check:versions` enforces it.
- **Single source of truth / no duplication:** date math + date utilities →
  `week.js` (pure); settings defaults + storage → `settings.js`; theme + i18n DOM
  helpers → `ui.js`. The popup, options page, and worker all import these — never
  re-implement a settings object, theme function, or date helper inline.
- **ES modules:** source is ESM (`import`/`export`); the SW is `"type":"module"`.
  Jest reads it via babel-jest. Load the **`dist/`** folder unpacked, not source.
- **No `console.*` in shipped code** — ESLint `no-console` blocks it in
  `week.js`/`background.js`/`popup`/`options` (scripts/tests are exempt).
- **No secrets in the repo.** `.env` is gitignored; store credentials live only
  in GitHub repository secrets.

## Git & hooks

- husky `pre-commit` runs lint-staged (eslint --fix + prettier on staged files).
- husky `pre-push` runs `check:versions && lint && test` (mirrors CI).
- Work on a branch and open a PR. Do **not** push to `main` or trigger a publish
  without the user's explicit go-ahead — a version bump on `main` triggers a real
  store release.

## Releasing

Use the `/release` command or the **store-release-engineer** agent. Full secret
setup and the safe-by-default publish model are in
[DOCUMENTATION/RELEASE.md](DOCUMENTATION/RELEASE.md).

- Chrome Web Store ID: `hjbeeopedbnpahgbkndkemigkcellibm` (credentials configured)
- Edge Add-ons product ID: `deb64eaf-a710-4ef6-9faa-84aac7fc037f` (needs
  `WEEK_EDGE_CLIENT_ID` + `WEEK_EDGE_API_KEY` secrets)
