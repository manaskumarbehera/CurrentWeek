# Week Number

A tiny Manifest V3 browser extension (Chrome + Edge) that shows the current
**ISO 8601 week number**, day, and date — in the toolbar icon and in a popup
where you can look up any date or week.

- **Toolbar icon** renders the live week number (color is configurable).
- **Popup** — pick a date to see its week and the full Mon–Sun span, or type a
  week number to jump to its dates. Works for any year.
- **Options** — choose a theme (light / dark / blue / red).

Built with **Vite + CRXJS** (`@crxjs/vite-plugin`). The source is ES modules;
all date math lives in one shared module, [`week.js`](week.js).

## Install (development)

1. `npm install` then `npm run dev` (Vite builds `dist/` and watches with HMR).
2. `chrome://extensions` (or `edge://extensions`) → enable **Developer mode**.
3. **Load unpacked** → select the **`dist/`** folder (the bundled output, not the
   repo root).

## Develop

```sh
npm install        # one-time: Vite, CRXJS, Jest, ESLint, Prettier, husky
npm run dev        # Vite dev build + HMR (load dist/ unpacked)
npm run validate   # version check + lint + tests (the CI gate)
npm test           # Jest only (babel-jest for ESM)
npm run lint       # ESLint (flat config)
npm run format     # Prettier
./build.sh         # vite build, then package store ZIPs → build/chrome, build/edge
```

Project conventions and architecture: [`AGENTS.md`](AGENTS.md) /
[`CLAUDE.md`](CLAUDE.md).

## Release

Publishing to the Chrome Web Store and Edge Add-ons is automated and
safe-by-default (a version bump on `main` is the publish signal). See
[`DOCUMENTATION/RELEASE.md`](DOCUMENTATION/RELEASE.md). Known issues and ideas
are tracked in [`DOCUMENTATION/REVIEW.md`](DOCUMENTATION/REVIEW.md).

## License

ISC © Manas Kumar Behera
