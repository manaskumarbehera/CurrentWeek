---
name: release-week-number
description: >
  Build, validate, and publish the Week Number extension to the Chrome Web Store
  and Edge Add-ons. TRIGGER when the user wants to cut a release, bump the
  version, package store ZIPs, publish/submit the extension, or debug the release
  pipeline (invalid_grant, 410 Gone, manifest-not-at-root, version-rejected).
  DO NOT TRIGGER for editing extension behavior, tests, or UI — that is normal
  development, not a release.
---

# Releasing the Week Number extension

Two stores, one pipeline (`.github/workflows/release.yml`), official REST APIs
only. **Safe-by-default**: nothing publishes without a version bump on `main`
(or a manual run with `dry_run=false`) AND the store's secrets present.

## Public IDs

- Chrome Web Store: `hjbeeopedbnpahgbkndkemigkcellibm`
- Edge Add-ons product: `deb64eaf-a710-4ef6-9faa-84aac7fc037f`

## Steps to cut a release

1. **Bump the version** in BOTH `manifest.json` and `package.json` to the same
   new value. The stores reject any upload whose version is not strictly greater
   than the live one (1.10 is already published — go to 1.11+).
2. **Changelog**: add `## v<version> — <title> (<date>)` to
   `DOCUMENTATION/CHANGELOG.md`.
3. **Validate locally**: `npm run validate` (version check + lint + tests), then
   `./build.sh chrome edge` and confirm `unzip -l build/<store>/...zip` shows
   `manifest.json` at the root.
4. **Open a PR** on a branch. Never push to `main` or publish without the
   user's explicit go-ahead — a version bump merged to `main` triggers a real
   store submission.
5. **Publish**: merge the bump to `main`, or run the "Release (Chrome + Edge)"
   workflow with `dry_run=false`. Each store publishes only if its secrets exist.

## Secrets (GitHub repo → Settings → Secrets → Actions)

- Chrome (configured): `CHROME_CLIENT_ID`, `CHROME_CLIENT_SECRET`,
  `CHROME_REFRESH_TOKEN`.
- Edge (needed): `WEEK_EDGE_CLIENT_ID`, `WEEK_EDGE_API_KEY` (Partner Center → Publish API,
  v1.1 ApiKey auth; the Azure AD v1 flow was retired 2024-12-31).

## Troubleshooting

- `invalid_grant` (Chrome) → refresh token revoked/expired; mint a new one.
- `410 Gone` (Edge) → you hit the retired v1 API; the workflow uses v1.1 ApiKey.
- Store rejects ZIP → `manifest.json` must be at the ZIP root (`build.sh` does
  this; verify with `unzip -l`).
- Upload 400 "version already exists" → bump the version; you cannot republish
  an already-live version.

See `DOCUMENTATION/RELEASE.md` for the complete reference.
