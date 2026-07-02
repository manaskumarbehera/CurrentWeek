#!/usr/bin/env node
/**
 * release-chrome.mjs — upload + publish the Week Number extension to the
 * Chrome Web Store via the official API (v1.1). Ported from the owner's
 * sf-audit-extractor release tooling.
 *
 * Usage:
 *   npm run release:chrome        # build + upload + publish (submit for review)
 *   npm run release:chrome:dry    # build + credential check only (no upload)
 *   node scripts/release-chrome.mjs [--dry-run] [--upload-only] [--no-build]
 *
 * Env vars (root .env is loaded; it is gitignored — never commit secrets):
 *   CHROME_EXTENSION_ID   (defaults to the Week Number item ID)
 *   CHROME_CLIENT_ID, CHROME_CLIENT_SECRET, CHROME_REFRESH_TOKEN
 *
 * Known store-side gate: publish fails with "Publish condition not met …
 * privacy information" until the item's Privacy practices tab has been filled
 * once, by hand, in the Developer Dashboard (no API exists for it).
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ── .env loader (no dependency; real env always wins over .env) ────────────
function loadDotEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const raw of fs.readFileSync(envPath, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadDotEnv();

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run") || args.includes("--dry");
const UPLOAD_ONLY = args.includes("--upload-only");
const NO_BUILD = args.includes("--no-build");

const log = (m) => console.log(`[release-chrome] ${m}`);
const fail = (m) => {
  console.error(`[release-chrome] ERR ${m}`);
  process.exit(1);
};

const EXTENSION_ID = process.env.CHROME_EXTENSION_ID || "hjbeeopedbnpahgbkndkemigkcellibm";
const CLIENT_ID = process.env.CHROME_CLIENT_ID;
const CLIENT_SECRET = process.env.CHROME_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.CHROME_REFRESH_TOKEN;

const missing = [];
if (!CLIENT_ID) missing.push("CHROME_CLIENT_ID");
if (!CLIENT_SECRET) missing.push("CHROME_CLIENT_SECRET");
if (!REFRESH_TOKEN) missing.push("CHROME_REFRESH_TOKEN");
if (missing.length) fail(`Missing env vars: ${missing.join(", ")} (see .env.example)`);
log("Credentials present (values not printed).");

// ── Build + locate ZIP ──────────────────────────────────────────────────────
if (!NO_BUILD) {
  log("Building (./build.sh chrome) ...");
  execSync("./build.sh chrome", { cwd: ROOT, stdio: "inherit" });
}
const version = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8")).version;
const zipPath = path.join(ROOT, "build", "chrome", `week-number-v${version}-chrome.zip`);
if (!fs.existsSync(zipPath)) fail(`ZIP not found: ${zipPath}`);
log(`Version ${version} — ${zipPath}`);

// ── OAuth token (missing access_token must fail loudly, never "undefined") ──
async function accessToken() {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const body = await res.json();
  if (!body.access_token) {
    fail(
      `Token exchange failed (${body.error || res.status}): ${body.error_description || "no access_token"} — ` +
        `if invalid_grant, re-mint CHROME_REFRESH_TOKEN (see DOCUMENTATION/RELEASE.md)`
    );
  }
  return body.access_token;
}

async function main() {
  const token = await accessToken();
  log("Access token minted OK.");
  if (DRY_RUN) {
    log("Dry run — stopping before upload. Everything checks out.");
    return;
  }

  // ── Upload ────────────────────────────────────────────────────────────────
  log(`Uploading to item ${EXTENSION_ID} ...`);
  const up = await fetch(
    `https://www.googleapis.com/upload/chromewebstore/v1.1/items/${EXTENSION_ID}`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "x-goog-api-version": "2" },
      body: fs.readFileSync(zipPath),
    }
  );
  const upBody = await up.json();
  if (!up.ok || !["SUCCESS", "IN_PROGRESS"].includes(upBody.uploadState)) {
    fail(`Upload failed (HTTP ${up.status}): ${JSON.stringify(upBody)}`);
  }
  log(`Upload OK (uploadState=${upBody.uploadState}).`);

  if (UPLOAD_ONLY) {
    log("Upload-only mode — draft saved, not submitted for review.");
    return;
  }

  // ── Publish (submit for review) ──────────────────────────────────────────
  log("Publishing (submit for review) ...");
  const pub = await fetch(
    `https://www.googleapis.com/chromewebstore/v1.1/items/${EXTENSION_ID}/publish`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "x-goog-api-version": "2",
        "Content-Length": "0",
      },
    }
  );
  const pubBody = await pub.json();
  if (!pub.ok) {
    const msg = pubBody?.error?.message || JSON.stringify(pubBody);
    if (/privacy information/i.test(msg)) {
      fail(
        `Publish blocked by the one-time Privacy practices form (no API for it).\n` +
          `  Fill it by hand: https://chrome.google.com/webstore/devconsole → item → Privacy practices tab,\n` +
          `  then re-run: npm run release:chrome -- --no-build\n  Store said: ${msg}`
      );
    }
    fail(`Publish failed (HTTP ${pub.status}): ${msg}`);
  }
  log(
    `Chrome Web Store: v${version} submitted for review (status=${JSON.stringify(pubBody.status)}).`
  );
}

main().catch((e) => fail(e.stack || String(e)));
