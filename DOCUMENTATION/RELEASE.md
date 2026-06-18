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
