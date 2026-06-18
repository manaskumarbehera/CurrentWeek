"use strict";

// Flat ESLint config (ESLint 9+). After the Vite migration the extension source
// (week.js, background.js, popup/*, options/*) is ES modules; the dev tooling
// (scripts/, tests/, *.cjs, babel.config) stays CommonJS.

const js = require("@eslint/js");

const browserGlobals = {
  chrome: "readonly",
  document: "readonly",
  window: "readonly",
  navigator: "readonly",
  alert: "readonly",
  console: "readonly",
  OffscreenCanvas: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  Event: "readonly",
  KeyboardEvent: "readonly",
};

const nodeGlobals = {
  module: "writable",
  require: "readonly",
  process: "readonly",
  __dirname: "readonly",
  console: "readonly",
  global: "writable",
};

const jestGlobals = {
  describe: "readonly",
  test: "readonly",
  it: "readonly",
  expect: "readonly",
  beforeEach: "readonly",
  afterEach: "readonly",
  beforeAll: "readonly",
  afterAll: "readonly",
  jest: "readonly",
};

module.exports = [
  {
    ignores: ["node_modules/**", "build/**", "dist/**", "coverage/**", "*.zip"],
  },
  js.configs.recommended,
  {
    // Extension source — ES modules running in the browser / service worker.
    files: ["week.js", "settings.js", "ui.js", "background.js", "popup/**/*.js", "options/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: browserGlobals,
    },
    rules: {
      "no-unused-vars": ["warn", { args: "none" }],
      "no-empty": ["error", { allowEmptyCatch: true }],
      // Shipped extension code must not log to the console.
      "no-console": "error",
    },
  },
  {
    // Vite config — ES module, Node context.
    files: ["vite.config.mjs", "*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: nodeGlobals,
    },
  },
  {
    // Dev tooling and tests — CommonJS. Their stdout is their purpose. Tests use
    // jsdom DOM globals, so include the browser set too.
    files: ["scripts/**", "tests/**", "**/*.cjs", "eslint.config.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: { ...browserGlobals, ...nodeGlobals, ...jestGlobals },
    },
    rules: {
      "no-unused-vars": ["warn", { args: "none" }],
      "no-console": "off",
    },
  },
];
