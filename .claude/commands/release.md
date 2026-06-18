---
description: Cut a Chrome + Edge release of the Week Number extension
---

Walk through a release of this extension:

1. Confirm the target version. Update `manifest.json` and `package.json` to the
   same new version (e.g. 1.11). They MUST match — `npm run check:versions`.
2. Add a `## v<version> — <title> (<date>)` entry to
   `DOCUMENTATION/CHANGELOG.md` describing what changed.
3. Run `npm run validate` (version check + lint + tests). Fix any failures.
4. Run `./build.sh chrome edge` and confirm both ZIPs exist with `manifest.json`
   at the root (`unzip -l build/chrome/week-number-v<version>-chrome.zip`).
5. Commit on a branch and open a PR. Do NOT push to main or publish without the
   user's explicit go-ahead.
6. To publish: merge the version bump to `main` (the bump is the publish
   signal), or run the "Release (Chrome + Edge)" GitHub Actions workflow with
   `dry_run=false`. Each store publishes only if its secrets are configured.

Publishing is safe-by-default: a main push that does not change the version, or
a manual run left at `dry_run=true`, builds and validates but publishes nothing.

See `DOCUMENTATION/RELEASE.md` for the full secret list and one-time setup.
