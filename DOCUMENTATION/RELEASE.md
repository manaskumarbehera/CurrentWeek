# Release & Publishing — Week Number

This extension publishes to **two** stores from one GitHub Actions pipeline
(`.github/workflows/release.yml`), using each store's official REST API.

## Public IDs (not secret)

| Store            | ID                                     | Where                                     |
| ---------------- | -------------------------------------- | ----------------------------------------- |
| Chrome Web Store | `hjbeeopedbnpahgbkndkemigkcellibm`     | `release.yml` → `env.CHROME_EXTENSION_ID` |
| Edge Add-ons     | `deb64eaf-a710-4ef6-9faa-84aac7fc037f` | `release.yml` → `env.EDGE_PRODUCT_ID`     |

Both listings already exist in their dev dashboards, so the API publishes
_updates_ — it does not create the item.

## Repository secrets

Add these under **Settings → Secrets and variables → Actions** on the
`manaskumarbehera/CurrentWeek` repo. A store with missing secrets is silently
skipped (never publishes).

### Chrome Web Store — already configured ✅

Reused from the owner's other extension; the OAuth client is tied to the Google
developer account, not a single item, so it publishes to this extension's ID.

| Secret                 | Notes                                              |
| ---------------------- | -------------------------------------------------- |
| `CHROME_CLIENT_ID`     | Google OAuth client ID                             |
| `CHROME_CLIENT_SECRET` | Google OAuth client secret                         |
| `CHROME_REFRESH_TOKEN` | Long-lived refresh token (verified valid at setup) |

If you ever see `invalid_grant`, the refresh token was revoked/expired — mint a
new one and update `CHROME_REFRESH_TOKEN`.

### Edge Add-ons — needs configuring ⛔

Generated at **Partner Center → Publish API ("new experience", v1.1)**.
Microsoft retired the old Azure AD (v1) flow on 2024-12-31, so only these two
ApiKey-auth values are needed (no client secret / tenant):

| Secret                | Notes                                       |
| --------------------- | ------------------------------------------- |
| `WEEK_EDGE_CLIENT_ID` | Client ID from Partner Center → Publish API |
| `WEEK_EDGE_API_KEY`   | API key from Partner Center → Publish API   |

These exist as secrets on the sf-audit-extractor repo but GitHub secrets are
write-only, so their values can't be copied automatically — set them by hand:

```bash
gh secret set WEEK_EDGE_CLIENT_ID -R manaskumarbehera/CurrentWeek --body "<client-id>"
gh secret set WEEK_EDGE_API_KEY  -R manaskumarbehera/CurrentWeek --body "<api-key>"
```

## Cutting a release

1. Bump `manifest.json` **and** `package.json` to the same new version.
2. Add a `## v<version>` entry to `DOCUMENTATION/CHANGELOG.md`.
3. `npm run validate` (version check + lint + tests).
4. Merge the bump to `main`, **or** run the "Release (Chrome + Edge)" workflow
   with `dry_run=false`.

### Safety model

The pipeline publishes only when **both** are true:

- **Publish intent** — a push to `main` that _bumps_ the manifest version, or a
  manual run with `dry_run=false`. (Manual default is `dry_run=true`.)
- **Credentials present** — the store's secrets are configured.

A main push that doesn't change the version, or a dry run, builds and validates
the ZIPs (uploaded as workflow artifacts) but publishes nothing.

## Local build

```bash
./build.sh chrome edge
# build/chrome/week-number-v<version>-chrome.zip
# build/edge/week-number-v<version>-edge.zip   (manifest.json at ZIP root)
```

## Local publish (no CI needed)

Ported from the owner's sf-audit-extractor tooling. Copy `.env.example` to
`.env` (gitignored) and fill in the credentials — both stores' keys are
developer-account-level and shared with the owner's other extensions.

```bash
npm run release:chrome:dry   # build + credential check, no upload
npm run release:edge:dry     # build + credential probe, no upload
npm run release:chrome       # build + upload + submit for review
npm run release:edge         # build + upload + poll validation + submit
npm run release:stores       # both stores
# scripts accept --upload-only (draft, no review submission) and --no-build
```

The scripts print every store API error verbatim (no swallowed responses) and
fail loudly if the OAuth exchange returns no token.

## Troubleshooting (seen in the wild)

Learned during the v1.13 release (2026-07-02):

- **Chrome upload → `401 UNAUTHENTICATED` / "Invalid Credentials"** while the
  token step "succeeds": the refresh-token exchange actually failed and the
  workflow used the literal string `undefined` as the Bearer token (fixed —
  the token step now fails loudly and prints the redacted exchange response).
  Root cause both times: stale `CHROME_REFRESH_TOKEN`. Working credentials
  live in the owner's other extension projects (e.g.
  `~/IdeaProjects/sf-audit-extractor/.env` — same trio of
  `CHROME_CLIENT_ID`/`CHROME_CLIENT_SECRET`/`CHROME_REFRESH_TOKEN`); the trio
  must be replaced **together** (a refresh token only works with its own
  client). Update via `gh secret set <NAME> -R manaskumarbehera/CurrentWeek`.
- **Chrome publish → `400` "Publish condition not met … privacy information"**:
  one-time manual step — open the item in the
  [Developer Dashboard](https://chrome.google.com/webstore/devconsole), fill
  the **Privacy practices** tab (single-purpose description + data-usage
  certification), save, then re-run the publish. The uploaded draft is kept,
  so re-running the workflow with `dry_run=false, stores=chrome` (or clicking
  **Submit for review** in the console) finishes the release.
  This step **cannot be browser-automated**: Chrome blocks extensions from
  scripting `chrome.google.com/webstore*`, and Google sign-in rejects
  DevTools/CDP-controlled browsers ("This browser or app may not be secure").
  It must be done by hand in a normal browser session.
- **Retrying one store only**: manual runs accept `stores=all|chrome|edge`,
  so a failed store can be retried without re-submitting the other.
