// Utility function to calculate the current week number
function getCurrentWeekNumber(date) {
  const tempDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tempDate.getUTCDay() || 7; // Make Sunday = 7
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum); // Nearest Thursday
  const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
  return Math.ceil((((tempDate - yearStart) / 86400000) + 1) / 7);


}

document.addEventListener("DOMContentLoaded", function () {
  let previousWeekNumber = null;
  let previousDayName = null;

  chrome.storage.sync.get(["iconColor"], function (items) {
    document.getElementById("iconColor").value = items.iconColor || "#ffffff";

    const now = new Date();
    document.getElementById("dateInput").value = now.toISOString().split("T")[0];

    const weekNumber = getCurrentWeekNumber(now);
    document.getElementById("weekInput").value = weekNumber;
    document.getElementById("weekNumberDisplay").textContent =
      "Week " + weekNumber;

    updateDayName(now);
  });

  const resetButton = document.getElementById("resetButton");
  resetButton.addEventListener("click", function () {
    // Reset date input to today's date
    const today = new Date();
    const dateInput = document.getElementById("dateInput");
    dateInput.valueAsDate = today;

    // Reset week input to the current week number
    const currentWeekNumber = getCurrentWeekNumber(today);
    const weekInput = document.getElementById("weekInput");
    weekInput.value = currentWeekNumber;

    // Reset week bar to the current week
    displayWeekFromWeekNumber(currentWeekNumber);

    // Update day display
    updateDayName(today);
  });
  document.getElementById("iconColor").addEventListener("input", function (e) {
    const color = e.target.value;
    chrome.storage.sync.set({ iconColor: color }, function () {
      chrome.runtime.sendMessage({ action: "updateIcon", color: color });
    });
  });

  document.getElementById("dateInput").addEventListener("input", function (e) {
    const selectedDate = new Date(e.target.value);
    displayWeekFromDate(selectedDate);
    updateDayName(selectedDate);
  });

  document
    .getElementById("weekInput")
    .addEventListener("keydown", function (e) {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        adjustWeekNumber(1);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        adjustWeekNumber(-1);
      }
    });

  document
    .getElementById("weekInput")
    .addEventListener("input", handleWeekInputChange);

  displayWeekFromDate(new Date());

  function displayWeekFromDate(date, updateWeekNumberDisplay = true) {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);

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
      }, 3000);
      previousWeekNumber = calculatedWeekNumber;
    }
  function displayWeekFromWeekNumber(weekNumber) {
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    let daysOffset = weekNumber * 7;

    // Adjusting for the day of the week of start of year
    daysOffset -= startOfYear.getDay() - 1;
    const startOfWeek = new Date(startOfYear);
    startOfWeek.setDate(startOfWeek.getDate() + daysOffset);

    displayWeekFromDate(startOfWeek);
  }
  function displayWeekFromWeekNumber(weekNumber) {
    const year = new Date().getFullYear();

    // Rough date for the requested week
    const simple = new Date(year, 0, 1 + (weekNumber - 1) * 7);
    const dayOfWeek = simple.getDay();
    const startOfWeek = new Date(simple);

    // Adjust to the Monday of that week (ISO-8601)
    if (dayOfWeek <= 4) {
      startOfWeek.setDate(simple.getDate() - dayOfWeek + 1);
    } else {
      startOfWeek.setDate(simple.getDate() + 8 - dayOfWeek);
    }

    displayWeekFromDate(startOfWeek);
  }
  function adjustWeekNumber(delta) {
    const weekInput = document.getElementById("weekInput");
    let weekNumber = parseInt(weekInput.value) || 0;
    weekNumber += delta;
    weekNumber = Math.max(1, Math.min(52, weekNumber));
    weekInput.value = weekNumber;
    handleWeekInputChange({ target: weekInput });
  }

  function handleWeekInputChange(e) {
    const weekNumber = parseInt(e.target.value);
    if (weekNumber >= 1 && weekNumber <= 52) {
      const weekNumberDisplayElement =
        document.getElementById("weekNumberDisplay");
      weekNumberDisplayElement.textContent = "Week " + weekNumber;
      weekNumberDisplayElement.classList.add("blinking"); // Add blinking effect

      // Remove the blinking effect after 3 seconds
      setTimeout(() => {
        weekNumberDisplayElement.classList.remove("blinking");
      }, 3000);

      displayWeekFromWeekNumber(weekNumber, false);
    } else {
      alert("Please enter a valid week number between 1 and 52.");
      e.target.value = Math.min(Math.max(weekNumber, 1), 52); // Clamp the value between 1 and 52
    }
  }

  function updateDayName(date) {
    const language = navigator.language || "en";
    const dayName = new Intl.DateTimeFormat(language, {
      weekday: "long",
    }).format(date);

    if (previousDayName !== dayName) {
      const dayDisplayElement = document.getElementById("dayDisplay");
      dayDisplayElement.classList.add("blinking");
      setTimeout(() => {
        dayDisplayElement.classList.remove("blinking");
      }, 3000);
      previousDayName = dayName;
    }

    document.getElementById("dayDisplay").textContent = dayName;
  }
  chrome.storage.sync.get("theme", function (data) {
    const currentTheme = data.theme || "light"; // Default to light theme if not set
    applyTheme(currentTheme);
  });

  function applyTheme(themeName) {
    const bodyElement = document.body;

    // Reset themes
    bodyElement.classList.remove("dark", "light");

    bodyElement.classList.add(themeName);
  }
});
