// Shared ISO/US week math + settings (single sources of truth), bundled by Vite.
import { getWeekNumber, weekStartDay } from "./week.js";
import { getSettings } from "./settings.js";

// Consume chrome.runtime.lastError so Chrome does not log an "unchecked
// lastError" warning, without emitting anything ourselves.
function swallowLastError() {
  return void chrome.runtime.lastError;
}

// The current week number for the configured system.
function currentWeekNumber(settings) {
  const firstDay = weekStartDay(settings.weekSystem, settings.firstDayOfWeek);
  return getWeekNumber(new Date(), settings.weekSystem, firstDay);
}

// Draw the week number onto the toolbar icon (icon mode).
function drawIcon(weekNumber, color) {
  const canvas = new OffscreenCanvas(128, 128);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = color;
  ctx.font = "bold 100px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${weekNumber}`, canvas.width / 2, canvas.height / 2);
  // Hand the pixels straight to setIcon as ImageData — the documented MV3 path.
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  chrome.action.setIcon({ imageData: { 128: imageData } }, swallowLastError);
}

// Render the toolbar from settings: either a drawn number or badge text.
function renderToolbar(settings) {
  try {
    const weekNumber = currentWeekNumber(settings);
    const name = (chrome.i18n && chrome.i18n.getMessage("extName")) || "Week Number";
    chrome.action.setTitle({ title: `${name} : ${weekNumber}` });

    if (settings.iconMode === "badge") {
      // Restore the static icon and overlay the number as badge text.
      chrome.action.setIcon(
        { path: { 48: "icons/icon48.png", 128: "icons/icon128.png" } },
        swallowLastError
      );
      chrome.action.setBadgeText({ text: String(weekNumber) });
      chrome.action.setBadgeBackgroundColor({ color: settings.iconColor || "#000000" });
    } else {
      chrome.action.setBadgeText({ text: "" }); // clear any badge from badge mode
      drawIcon(weekNumber, settings.iconColor || "#000000");
    }
  } catch {
    // Rendering failed (e.g. OffscreenCanvas unavailable) — nothing actionable.
  }
}

if (typeof chrome !== "undefined" && chrome.runtime) {
  // Re-render the toolbar from the freshly read settings.
  function refreshToolbar() {
    getSettings().then(renderToolbar);
  }

  chrome.runtime.onStartup.addListener(refreshToolbar);
  chrome.runtime.onInstalled.addListener(refreshToolbar);

  // Both the popup color picker ("updateIcon") and the options page
  // ("refreshIcon") have already persisted their change — re-read and render.
  chrome.runtime.onMessage.addListener(function (message) {
    if (message && (message.action === "updateIcon" || message.action === "refreshIcon")) {
      refreshToolbar();
    }
  });

  // The displayed week number changes at midnight / across week boundaries, but
  // an MV3 service worker is ephemeral and setInterval would not survive its
  // teardown. A persistent alarm wakes the worker to keep the toolbar current.
  if (chrome.alarms) {
    chrome.alarms.create("refreshWeekIcon", { periodInMinutes: 60 });
    chrome.alarms.onAlarm.addListener(function (alarm) {
      if (alarm.name === "refreshWeekIcon") {
        refreshToolbar();
      }
    });
  }
}
