// settings.js — single source of truth for the extension's settings.
//
// Used by the popup, options page, and service worker. Chrome-aware (uses
// chrome.storage.sync) but DOM-free, so it works in the worker too.

// Canonical defaults. `theme: null` means "follow the OS color scheme" — the UI
// resolves that via ui.js resolveTheme(); the worker never needs the theme.
export const SETTINGS_DEFAULTS = {
  iconColor: "#000000",
  theme: null, // null → resolved from prefers-color-scheme in the UI
  weekSystem: "iso", // "iso" | "us"
  firstDayOfWeek: 1, // 0 = Sunday, 1 = Monday
  iconMode: "icon", // "icon" (drawn number) | "badge" (badge text)
  milestones: [], // [{ name: string, date: "YYYY-MM-DD" }] — popup countdowns
};

// Read all settings, merged over the defaults. Promise-based so callers can
// `await` instead of nesting storage callbacks.
export function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(SETTINGS_DEFAULTS, (s) => resolve(s));
  });
}

// Persist a partial settings patch.
export function saveSettings(patch) {
  return new Promise((resolve) => {
    chrome.storage.sync.set(patch, () => resolve());
  });
}
