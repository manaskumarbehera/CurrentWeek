import { getSettings, saveSettings } from "../settings.js";
import { applyI18n, applyTheme, defaultTheme } from "../ui.js";

document.addEventListener("DOMContentLoaded", () => {
  applyI18n(document);

  const themeSelect = document.getElementById("themeSelect");
  const weekSystemSelect = document.getElementById("weekSystemSelect");
  const firstDaySelect = document.getElementById("firstDaySelect");
  const iconModeSelect = document.getElementById("iconModeSelect");
  const statusEl = document.getElementById("status");

  getSettings().then((s) => {
    const theme = s.theme || defaultTheme();
    themeSelect.value = theme;
    weekSystemSelect.value = s.weekSystem;
    firstDaySelect.value = String(s.firstDayOfWeek);
    iconModeSelect.value = s.iconMode;
    applyTheme(theme);
  });

  // Live preview of the theme.
  themeSelect.addEventListener("change", function () {
    applyTheme(this.value);
  });

  document.getElementById("saveButton").addEventListener("click", () => {
    saveSettings({
      theme: themeSelect.value,
      weekSystem: weekSystemSelect.value,
      firstDayOfWeek: parseInt(firstDaySelect.value, 10),
      iconMode: iconModeSelect.value,
    }).then(() => {
      // Week system / first day / icon mode change the toolbar — ask the worker
      // to re-render from the freshly saved settings.
      chrome.runtime.sendMessage({ action: "refreshIcon" });
      statusEl.textContent = chrome.i18n.getMessage("settingsSaved") || "Settings saved.";
      setTimeout(() => (statusEl.textContent = ""), 2000);
    });
  });
});
