// SYNC: keep identical to background.js
function getCurrentWeekNumber(date) {
  const tempDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tempDate.getUTCDay() || 7; // Make Sunday = 7
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum); // Nearest Thursday
  const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
  return Math.ceil((((tempDate - yearStart) / 86400000) + 1) / 7);
}

// Returns the ISO week count for a given year (52 or 53).
// Dec 28 is always in the last ISO week of the year.
function getISOWeeksInYear(year) {
  return getCurrentWeekNumber(new Date(year, 11, 28));
}

document.addEventListener("DOMContentLoaded", function () {
  let previousWeekNumber = null;
  let previousDayName = null;

  // Single initialization point: wait for storage before rendering anything
  chrome.storage.sync.get(["iconColor"], function (items) {
    document.getElementById("iconColor").value = items.iconColor || "#000000";

    const now = new Date();
    document.getElementById("dateInput").value = now.toISOString().split("T")[0];

    const weekNumber = getCurrentWeekNumber(now);
    document.getElementById("weekInput").value = weekNumber;
    document.getElementById("weekNumberDisplay").textContent = "Week " + weekNumber;

    updateDayName(now);
    displayWeekFromDate(now);
  });

  const resetButton = document.getElementById("resetButton");
  resetButton.addEventListener("click", function () {
    const today = new Date();
    document.getElementById("dateInput").value = today.toISOString().split("T")[0];

    const currentWeekNumber = getCurrentWeekNumber(today);
    document.getElementById("weekInput").value = currentWeekNumber;

    displayWeekFromWeekNumber(currentWeekNumber);
    updateDayName(today);
  });

  document.getElementById("iconColor").addEventListener("input", function (e) {
    const color = e.target.value;
    chrome.storage.sync.set({ iconColor: color }, function () {
      chrome.runtime.sendMessage({ action: "updateIcon", color: color });
    });
  });

  document.getElementById("dateInput").addEventListener("input", function (e) {
    // Append T00:00:00 to parse as local midnight — plain "YYYY-MM-DD" is treated as
    // UTC by the Date constructor and shifts the date in UTC-behind timezones.
    const selectedDate = new Date(e.target.value + "T00:00:00");
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

  function displayWeekFromDate(date, updateWeekNumberDisplay = true) {
    const startOfWeek = new Date(date);
    // (getDay()+6)%7 maps Mon=0 … Sun=6 so subtracting it always lands on Monday,
    // including Sunday (old code: getDate()-0+1 advanced to *next* Monday).
    startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7));

    const calculatedWeekNumber = getCurrentWeekNumber(startOfWeek);

    if (updateWeekNumberDisplay) {
      document.getElementById("weekNumberDisplay").textContent =
        "Week " + calculatedWeekNumber;
    }

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(day.getDate() + i);
      document.getElementById(`day${i + 1}`).textContent = day.toDateString();
    }

    if (previousWeekNumber !== calculatedWeekNumber) {
      const weekBarElement = document.querySelector(".week-bar");
      weekBarElement.classList.add("blinking");
      setTimeout(() => {
        weekBarElement.classList.remove("blinking");
      }, 2000);
      previousWeekNumber = calculatedWeekNumber;
    }
  } // end displayWeekFromDate

  // Single canonical definition — ISO 8601 Monday-aligned.
  // updateWeekNumberDisplay is forwarded to displayWeekFromDate so callers can
  // suppress the header update when they have already set it themselves.
  function displayWeekFromWeekNumber(weekNumber, updateWeekNumberDisplay = true) {
    const year = new Date().getFullYear();

    // Start with a rough date inside the requested week
    const simple = new Date(year, 0, 1 + (weekNumber - 1) * 7);
    const dayOfWeek = simple.getDay();
    const startOfWeek = new Date(simple);

    // Adjust to the Monday of that week (ISO-8601)
    if (dayOfWeek <= 4) {
      startOfWeek.setDate(simple.getDate() - dayOfWeek + 1);
    } else {
      startOfWeek.setDate(simple.getDate() + 8 - dayOfWeek);
    }

    displayWeekFromDate(startOfWeek, updateWeekNumberDisplay);
  }

  function adjustWeekNumber(delta) {
    const weekInput = document.getElementById("weekInput");
    let weekNumber = parseInt(weekInput.value) || 0;
    weekNumber += delta;
    const maxWeek = getISOWeeksInYear(new Date().getFullYear());
    weekNumber = Math.max(1, Math.min(maxWeek, weekNumber));
    weekInput.value = weekNumber;
    handleWeekInputChange({ target: weekInput });
  }

  function handleWeekInputChange(e) {
    const weekNumber = parseInt(e.target.value);
    const maxWeek = getISOWeeksInYear(new Date().getFullYear());
    if (weekNumber >= 1 && weekNumber <= maxWeek) {
      const weekNumberDisplayElement = document.getElementById("weekNumberDisplay");
      weekNumberDisplayElement.textContent = "Week " + weekNumber;
      weekNumberDisplayElement.classList.add("blinking");
      setTimeout(() => {
        weekNumberDisplayElement.classList.remove("blinking");
      }, 2000);
      // Pass false: header already updated above, don't double-set it
      displayWeekFromWeekNumber(weekNumber, false);
    } else {
      // Silently clamp — alert() is unreliable inside extension popups
      e.target.value = Math.min(Math.max(weekNumber || 1, 1), maxWeek);
    }
  }

  function updateDayName(date) {
    const language = navigator.language || "en";
    const dayName = new Intl.DateTimeFormat(language, { weekday: "long" }).format(date);

    if (previousDayName !== dayName) {
      const dayDisplayElement = document.getElementById("dayDisplay");
      dayDisplayElement.classList.add("blinking");
      setTimeout(() => {
        dayDisplayElement.classList.remove("blinking");
      }, 2000);
      previousDayName = dayName;
    }

    document.getElementById("dayDisplay").textContent = dayName;
  }

  chrome.storage.sync.get("theme", function (data) {
    applyTheme(data.theme || "light");
  });

  function applyTheme(themeName) {
    const bodyElement = document.body;
    // Clear ALL theme classes (dark/light/blue/red) before applying the new one;
    // old code only removed "dark" and "light", leaving "blue"/"red" behind.
    bodyElement.className = "";
    bodyElement.classList.add(themeName);
  }
});
