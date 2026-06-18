import {
  getWeekNumber,
  getWeeksInYear,
  getDateOfWeek,
  getWeekStart,
  weekStartDay as resolveWeekStartDay,
  toLocalISODate,
  sameYMD,
  daysLeftInWeek,
  daysLeftInYear,
  yearFromDateValue,
} from "../week.js";
import { SETTINGS_DEFAULTS, getSettings, saveSettings } from "../settings.js";
import { applyI18n, applyTheme, defaultTheme } from "../ui.js";

const BLINK_MS = 2000; // how long the "value changed" highlight stays on
const COPIED_MS = 1200; // how long a copy button shows its "Copied!" label
const DEFAULT_ICON_COLOR = SETTINGS_DEFAULTS.iconColor;

// "2 days" / "1 day", localized.
function dayCountLabel(n) {
  return n === 1
    ? chrome.i18n.getMessage("dayOne") || "1 day"
    : chrome.i18n.getMessage("dayMany", [String(n)]) || `${n} days`;
}

document.addEventListener("DOMContentLoaded", function () {
  applyI18n(document);

  let previousWeekNumber = null;
  let previousDayName = null;

  // Set from stored settings before the first render.
  let weekSystem = SETTINGS_DEFAULTS.weekSystem;
  let firstDayOfWeek = SETTINGS_DEFAULTS.firstDayOfWeek;

  // The weekday a week starts on (centralized rule in week.js).
  const weekStartDay = () => resolveWeekStartDay(weekSystem, firstDayOfWeek);

  // The year a week number is resolved against — taken from the date field so
  // navigation works for any year, not just the current one.
  function getActiveYear() {
    return yearFromDateValue(document.getElementById("dateInput").value, new Date().getFullYear());
  }

  function blink(el) {
    el.classList.add("blinking");
    setTimeout(() => el.classList.remove("blinking"), BLINK_MS);
  }

  // Single initialization point: wait for settings before rendering anything.
  getSettings().then(function (s) {
    weekSystem = s.weekSystem;
    firstDayOfWeek = s.firstDayOfWeek;

    document.getElementById("iconColor").value = s.iconColor || DEFAULT_ICON_COLOR;
    applyTheme(s.theme || defaultTheme());

    const now = new Date();
    document.getElementById("dateInput").value = toLocalISODate(now);
    document.getElementById("weekInput").max = getWeeksInYear(
      now.getFullYear(),
      weekSystem,
      weekStartDay()
    );

    document.getElementById("weekInput").value = getWeekNumber(now, weekSystem, weekStartDay());
    updateDayName(now);
    displayWeekFromDate(now);
  });

  document.getElementById("resetButton").addEventListener("click", function () {
    const today = new Date();
    document.getElementById("dateInput").value = toLocalISODate(today);
    document.getElementById("weekInput").value = getWeekNumber(today, weekSystem, weekStartDay());
    displayWeekFromDate(today);
    updateDayName(today);
  });

  document.getElementById("iconColor").addEventListener("input", function (e) {
    saveSettings({ iconColor: e.target.value }).then(() => {
      chrome.runtime.sendMessage({ action: "updateIcon" });
    });
  });

  document.getElementById("dateInput").addEventListener("input", function (e) {
    if (!e.target.value) return; // ignore a cleared date field
    // Append T00:00:00 to parse as local midnight — plain "YYYY-MM-DD" is treated
    // as UTC by the Date constructor and shifts the date in UTC-behind timezones.
    const selectedDate = new Date(e.target.value + "T00:00:00");
    document.getElementById("weekInput").max = getWeeksInYear(
      selectedDate.getFullYear(),
      weekSystem,
      weekStartDay()
    );
    displayWeekFromDate(selectedDate);
    updateDayName(selectedDate);
  });

  document.getElementById("weekInput").addEventListener("keydown", function (e) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      adjustWeekNumber(1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      adjustWeekNumber(-1);
    }
  });

  document.getElementById("weekInput").addEventListener("input", handleWeekInputChange);

  document.getElementById("copyWeekBtn").addEventListener("click", function () {
    copyText(document.getElementById("weekInput").value, this);
  });
  document.getElementById("copyDateBtn").addEventListener("click", function () {
    copyText(document.getElementById("dateInput").value, this);
  });

  function displayWeekFromDate(date, updateWeekNumberDisplay = true) {
    const startOfWeek = getWeekStart(date, weekStartDay());
    const calculatedWeekNumber = getWeekNumber(startOfWeek, weekSystem, weekStartDay());

    if (updateWeekNumberDisplay) {
      document.getElementById("weekNumberDisplay").textContent = calculatedWeekNumber;
    }

    const today = new Date();
    const wdFmt = new Intl.DateTimeFormat(navigator.language || "en", { weekday: "short" });
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(day.getDate() + i);
      const cell = document.getElementById(`day${i + 1}`);
      cell.innerHTML =
        `<span class="day-wd">${wdFmt.format(day)}</span>` +
        `<span class="day-dn">${day.getDate()}</span>`;
      cell.title = day.toDateString();
      cell.classList.toggle("is-today", sameYMD(day, today));
      cell.classList.toggle("is-selected", sameYMD(day, date));
    }

    updateDaysLeft(date, startOfWeek);

    if (previousWeekNumber !== calculatedWeekNumber) {
      blink(document.querySelector(".week-bar"));
      previousWeekNumber = calculatedWeekNumber;
    }
  }

  // Resolve a week number to its start within the active year, then render it.
  function displayWeekFromWeekNumber(weekNumber, updateWeekNumberDisplay = true) {
    const startOfWeek = getDateOfWeek(weekNumber, getActiveYear(), weekSystem, weekStartDay());
    displayWeekFromDate(startOfWeek, updateWeekNumberDisplay);
  }

  function adjustWeekNumber(delta) {
    const weekInput = document.getElementById("weekInput");
    let weekNumber = parseInt(weekInput.value) || 0;
    weekNumber += delta;
    const maxWeek = getWeeksInYear(getActiveYear(), weekSystem, weekStartDay());
    weekNumber = Math.max(1, Math.min(maxWeek, weekNumber));
    weekInput.value = weekNumber;
    handleWeekInputChange({ target: weekInput });
  }

  function handleWeekInputChange(e) {
    const weekNumber = parseInt(e.target.value);
    const maxWeek = getWeeksInYear(getActiveYear(), weekSystem, weekStartDay());
    if (weekNumber >= 1 && weekNumber <= maxWeek) {
      const display = document.getElementById("weekNumberDisplay");
      display.textContent = weekNumber;
      blink(display);
      // Pass false: header already updated above, don't double-set it.
      displayWeekFromWeekNumber(weekNumber, false);
    } else {
      // Silently clamp — alert() is unreliable inside extension popups.
      e.target.value = Math.min(Math.max(weekNumber || 1, 1), maxWeek);
    }
  }

  // Days remaining in the current week and the current calendar year.
  function updateDaysLeft(date, startOfWeek) {
    const leftInWeek = daysLeftInWeek(date, startOfWeek);
    const leftInYear = daysLeftInYear(date);

    document.getElementById("daysLeftWeek").textContent =
      chrome.i18n.getMessage("daysLeftWeek", [dayCountLabel(leftInWeek)]) ||
      `${dayCountLabel(leftInWeek)} left in week`;
    document.getElementById("daysLeftYear").textContent =
      chrome.i18n.getMessage("daysLeftYear", [dayCountLabel(leftInYear)]) ||
      `${dayCountLabel(leftInYear)} left in year`;
  }

  function copyText(text, btn) {
    navigator.clipboard.writeText(String(text)).then(() => {
      const original = btn.textContent;
      btn.textContent = chrome.i18n.getMessage("copied") || "Copied!";
      btn.classList.add("copied");
      setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove("copied");
      }, COPIED_MS);
    });
  }

  function updateDayName(date) {
    const language = navigator.language || "en";
    const dayName = new Intl.DateTimeFormat(language, { weekday: "long" }).format(date);

    if (previousDayName !== dayName) {
      blink(document.getElementById("dayDisplay"));
      previousDayName = dayName;
    }
    document.getElementById("dayDisplay").textContent = dayName;
    document.getElementById("dateDisplay").textContent = new Intl.DateTimeFormat(language, {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  }
});
