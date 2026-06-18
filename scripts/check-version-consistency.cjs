#!/usr/bin/env node
"use strict";

/**
 * check-version-consistency.cjs
 *
 * Verifies the extension version is consistent and well-formed:
 *   - manifest.json "version" matches package.json "version"
 *   - the version follows the Chrome/Edge format (N.N or N.N.N or N.N.N.N)
 *
 * Exit 0 = all checks pass, exit 1 = one or more failures.
 * Mirrors the gate used in CI (.github/workflows/release.yml).
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
let failures = 0;

const fail = (msg) => {
  console.error(`  ❌ ${msg}`);
  failures++;
};
const pass = (msg) => console.log(`  ✅ ${msg}`);

console.log("\n🔍 Version consistency check\n");

function readJSON(file) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8"));
}

let manifestVersion;
let packageVersion;

try {
  manifestVersion = readJSON("manifest.json").version;
} catch (e) {
  fail(`Cannot read manifest.json: ${e.message}`);
}
try {
  packageVersion = readJSON("package.json").version;
} catch (e) {
  fail(`Cannot read package.json: ${e.message}`);
}

if (manifestVersion === undefined) fail('manifest.json has no "version" field');
if (packageVersion === undefined) fail('package.json has no "version" field');

// Chrome/Edge allow 1–4 dot-separated integers (e.g. 1.10, 1.10.0).
const versionRe = /^\d+(\.\d+){0,3}$/;
if (manifestVersion !== undefined) {
  if (versionRe.test(manifestVersion)) {
    pass(`manifest.json version format valid: ${manifestVersion}`);
  } else {
    fail(
      `manifest.json version "${manifestVersion}" is not a valid Chrome/Edge version (N.N[.N[.N]])`
    );
  }
}

if (manifestVersion !== undefined && packageVersion !== undefined) {
  if (manifestVersion === packageVersion) {
    pass(`manifest.json and package.json agree on version ${manifestVersion}`);
  } else {
    fail(`Version mismatch: manifest.json=${manifestVersion} package.json=${packageVersion}`);
  }
}

console.log("");
if (failures > 0) {
  console.error(`❌ Version check failed with ${failures} error(s).\n`);
  process.exit(1);
}
console.log("✅ Version check passed.\n");
