#!/usr/bin/env node
/**
 * release-edge.mjs — upload + publish the Week Number extension to Edge
 * Add-ons via the Update REST API v1.1 (ApiKey auth; the Azure AD v1 flow
 * was retired 2024-12-31). Mirrors the GitHub Actions release job so a
 * release can also be cut locally.
 *
 * Usage:
 *   npm run release:edge          # build + upload + poll + publish
 *   npm run release:edge:dry      # build + credential probe only (no upload)
 *   node scripts/release-edge.mjs [--dry-run] [--upload-only] [--no-build]
 *
 * Env vars (root .env is loaded; it is gitignored — never commit secrets):
 *   EDGE_PRODUCT_ID   (defaults to the Week Number product GUID)
 *   EDGE_CLIENT_ID  or WEEK_EDGE_CLIENT_ID
 *   EDGE_API_KEY    or WEEK_EDGE_API_KEY
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://api.addons.microsoftedge.microsoft.com";

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

const log = (m) => console.log(`[release-edge] ${m}`);
const fail = (m) => {
  console.error(`[release-edge] ERR ${m}`);
  process.exit(1);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PRODUCT_ID = process.env.EDGE_PRODUCT_ID || "deb64eaf-a710-4ef6-9faa-84aac7fc037f";
const CLIENT_ID = process.env.EDGE_CLIENT_ID || process.env.WEEK_EDGE_CLIENT_ID;
const API_KEY = process.env.EDGE_API_KEY || process.env.WEEK_EDGE_API_KEY;

const missing = [];
if (!CLIENT_ID) missing.push("EDGE_CLIENT_ID (or WEEK_EDGE_CLIENT_ID)");
if (!API_KEY) missing.push("EDGE_API_KEY (or WEEK_EDGE_API_KEY)");
if (missing.length) fail(`Missing env vars: ${missing.join(", ")} (see .env.example)`);
log("Credentials present (values not printed).");

const authHeaders = { Authorization: `ApiKey ${API_KEY}`, "X-ClientID": CLIENT_ID };

// ── Build + locate ZIP ──────────────────────────────────────────────────────
if (!NO_BUILD) {
  log("Building (./build.sh edge) ...");
  execSync("./build.sh edge", { cwd: ROOT, stdio: "inherit" });
}
const version = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8")).version;
const zipPath = path.join(ROOT, "build", "edge", `week-number-v${version}-edge.zip`);
if (!fs.existsSync(zipPath)) fail(`ZIP not found: ${zipPath}`);
log(`Version ${version} — ${zipPath}`);

async function main() {
  if (DRY_RUN) {
    // Auth probe without side effects: a bogus operation ID returns 404 with
    // valid credentials and 401/403 with bad ones.
    const probe = await fetch(
      `${API}/v1/products/${PRODUCT_ID}/submissions/draft/package/operations/00000000-0000-0000-0000-000000000000`,
      { headers: authHeaders }
    );
    if (probe.status === 401 || probe.status === 403) {
      fail(`Credential probe failed (HTTP ${probe.status}) — check EDGE_CLIENT_ID / EDGE_API_KEY`);
    }
    log(`Dry run — credentials accepted (probe HTTP ${probe.status}). Stopping before upload.`);
    return;
  }

  // ── Upload draft package ──────────────────────────────────────────────────
  log(`Uploading to product ${PRODUCT_ID} ...`);
  const up = await fetch(`${API}/v1/products/${PRODUCT_ID}/submissions/draft/package`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/zip" },
    body: fs.readFileSync(zipPath),
  });
  if (up.status !== 202) fail(`Upload failed (HTTP ${up.status}): ${await up.text()}`);
  const location = up.headers.get("location") || "";
  const opId = location.replace(/\?.*$/, "").replace(/\/+$/, "").split("/").pop();
  if (!opId) fail("Could not parse operation ID from Location header");
  log(`Upload accepted — operation ${opId}. Polling validation ...`);

  // ── Poll package validation (up to ~3 min) ───────────────────────────────
  let validated = false;
  for (let i = 1; i <= 18; i++) {
    await sleep(10000);
    const res = await fetch(
      `${API}/v1/products/${PRODUCT_ID}/submissions/draft/package/operations/${opId}`,
      { headers: authHeaders }
    );
    const body = await res.json().catch(() => ({}));
    log(`  Attempt ${i}/18: status = ${body.status || "Unknown"}`);
    if (body.status === "Succeeded") {
      validated = true;
      break;
    }
    if (body.status === "Failed") fail(`Package validation failed: ${JSON.stringify(body)}`);
  }
  if (!validated) fail("Timed out waiting for package validation");
  log("Package validated.");

  if (UPLOAD_ONLY) {
    log("Upload-only mode — draft saved, not submitted for review.");
    return;
  }

  // ── Publish submission ────────────────────────────────────────────────────
  log("Publishing (submit for review) ...");
  const pub = await fetch(`${API}/v1/products/${PRODUCT_ID}/submissions`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({ notes: `Automated release v${version}` }),
  });
  if (pub.status !== 202) fail(`Publish failed (HTTP ${pub.status}): ${await pub.text()}`);
  log(`Edge Add-ons: v${version} submitted for review.`);
}

main().catch((e) => fail(e.stack || String(e)));
