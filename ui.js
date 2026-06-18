// ui.js — DOM helpers shared by the popup and options pages (not the worker).
// Theme application and i18n live here so neither page duplicates them.

// Pure: the theme to apply given the saved value and the OS dark preference.
// Empty/null saved theme → follow the OS (dark/light).
export function resolveTheme(savedTheme, prefersDark) {
  return savedTheme || (prefersDark ? "dark" : "light");
}

// The default theme from the OS color scheme (wraps matchMedia for the browser).
export function defaultTheme() {
  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  return resolveTheme(null, prefersDark);
}

// Apply a theme by replacing the body's class (clears all theme classes first,
// so switching away from blue/red doesn't leave a stale class behind).
export function applyTheme(themeName, doc = document) {
  doc.body.className = "";
  doc.body.classList.add(themeName);
}

// Replace [data-i18n] text and [data-i18n-value] values with localized strings,
// falling back to the inline content when a message is missing.
export function applyI18n(root) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    const msg = chrome.i18n.getMessage(el.getAttribute("data-i18n"));
    if (msg) el.textContent = msg;
  });
  root.querySelectorAll("[data-i18n-value]").forEach((el) => {
    const msg = chrome.i18n.getMessage(el.getAttribute("data-i18n-value"));
    if (msg) el.value = msg;
  });
  root.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const msg = chrome.i18n.getMessage(el.getAttribute("data-i18n-title"));
    if (msg) {
      el.title = msg;
      el.setAttribute("aria-label", msg);
    }
  });
}
