/**
 * @jest-environment jsdom
 *
 * popup.dom.test.js — integration test for the popup wiring. Loads the real
 * popup.js against a jsdom DOM with chrome stubbed, and asserts the render +
 * week-navigation behavior (the DOM glue around the tested pure functions).
 */

const MSG = {
  daysLeftWeek: "$1 left in week",
  daysLeftYear: "$1 left in year",
  dayOne: "1 day",
  dayMany: "$1 days",
  copied: "Copied!",
  milestoneDaysLeft: "$1 left",
  milestoneToday: "Today 🎉",
  milestonePassed: "$1 ago",
  removeMilestone: "Remove milestone",
};
const fmt = (s, subs) => (subs || []).reduce((a, v, i) => a.replace("$" + (i + 1), v), s);

function buildDom() {
  document.body.innerHTML = `
    <input id="iconColor" />
    <input type="date" id="dateInput" />
    <input type="number" id="weekInput" min="1" max="53" />
    <button id="resetButton"></button>
    <span id="weekNumberDisplay"></span>
    <span id="dayDisplay"></span>
    <span id="dateDisplay"></span>
    <div class="week-bar">
      <div class="day" id="day1"></div><div class="day" id="day2"></div>
      <div class="day" id="day3"></div><div class="day" id="day4"></div>
      <div class="day" id="day5"></div><div class="day" id="day6"></div>
      <div class="day" id="day7"></div>
    </div>
    <div id="yearStrip"></div>
    <div id="yearProgress"></div>
    <span id="daysLeftWeek"></span>
    <span id="daysLeftYear"></span>
    <button id="copyWeekBtn">Copy week</button>
    <button id="copyDateBtn">Copy date</button>
    <button id="addMilestoneBtn"></button>
    <ul id="milestoneList"></ul>
    <form id="milestoneForm" hidden>
      <input type="text" id="milestoneName" />
      <input type="date" id="milestoneDate" />
      <button type="submit"></button>
    </form>`;
}

function stubChrome(store = {}) {
  global.chrome = {
    i18n: { getMessage: (k, subs) => (MSG[k] ? fmt(MSG[k], subs) : "") },
    storage: {
      sync: {
        get: (defaults, cb) => cb(Object.assign({}, defaults, store)),
        set: (patch, cb) => {
          Object.assign(store, patch);
          cb && cb();
        },
      },
    },
    runtime: { sendMessage: () => {}, lastError: null },
  };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("popup integration", () => {
  // Require once: the module registers a single document-level DOMContentLoaded
  // listener. Re-requiring per test (resetModules) would stack listeners on the
  // shared jsdom document and double-run init.
  beforeAll(() => {
    require("../popup/popup.js");
  });
  beforeEach(() => {
    buildDom();
    stubChrome();
    global.navigator.clipboard = { writeText: () => Promise.resolve() };
  });
  afterEach(() => {
    delete global.chrome;
  });

  test("renders week number, day strip, today highlight and days-left", async () => {
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await flush();

    // Week header is a positive integer.
    const wk = Number(document.getElementById("weekNumberDisplay").textContent);
    expect(Number.isInteger(wk)).toBe(true);
    expect(wk).toBeGreaterThanOrEqual(1);

    // Each day cell has a weekday + day-number span.
    for (let i = 1; i <= 7; i++) {
      const cell = document.getElementById(`day${i}`);
      expect(cell.querySelector(".day-wd")).not.toBeNull();
      expect(cell.querySelector(".day-dn")).not.toBeNull();
    }
    // Exactly one cell is "today" (today is always inside the rendered week).
    expect(document.querySelectorAll(".day.is-today").length).toBe(1);

    // Date display and days-left are populated.
    expect(document.getElementById("dateDisplay").textContent).not.toBe("");
    expect(document.getElementById("daysLeftWeek").textContent).toMatch(/left in week$/);
    expect(document.getElementById("daysLeftYear").textContent).toMatch(/left in year$/);
  });

  test("typing a week number updates the header to that week", async () => {
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await flush();

    const weekInput = document.getElementById("weekInput");
    weekInput.value = "10";
    weekInput.dispatchEvent(new Event("input", { bubbles: true }));
    await flush();

    expect(document.getElementById("weekNumberDisplay").textContent).toBe("10");
  });

  test("copy button writes to the clipboard and flashes 'Copied!'", async () => {
    let copied = "";
    global.navigator.clipboard = {
      writeText: (t) => {
        copied = t;
        return Promise.resolve();
      },
    };
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await flush();

    const btn = document.getElementById("copyWeekBtn");
    btn.click();
    await flush();
    expect(copied).toBe(document.getElementById("weekInput").value);
    expect(btn.classList).toContain("copied");
    expect(btn.dataset.copied).toBe("Copied!");
  });

  test("changing the date updates the week header (ISO week of Jan 1 2026 = 1)", async () => {
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await flush();

    const dateInput = document.getElementById("dateInput");
    dateInput.value = "2026-01-01";
    dateInput.dispatchEvent(new Event("input", { bubbles: true }));
    await flush();

    expect(document.getElementById("weekNumberDisplay").textContent).toBe("1");
    expect(document.getElementById("dayDisplay").textContent).not.toBe("");
  });

  test("reset button jumps the date field back to today", async () => {
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await flush();

    const dateInput = document.getElementById("dateInput");
    dateInput.value = "2020-03-15";
    dateInput.dispatchEvent(new Event("input", { bubbles: true }));
    await flush();

    document.getElementById("resetButton").click();
    await flush();

    const today = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const iso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    expect(dateInput.value).toBe(iso);
  });

  test("ArrowUp / ArrowDown step the week number", async () => {
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await flush();

    const weekInput = document.getElementById("weekInput");
    weekInput.value = "10";
    weekInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    await flush();
    expect(weekInput.value).toBe("11");
    expect(document.getElementById("weekNumberDisplay").textContent).toBe("11");

    weekInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    await flush();
    expect(weekInput.value).toBe("10");
  });

  test("year strip renders one tick per week, highlights current, and jumps on click", async () => {
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await flush();

    const ticks = document.querySelectorAll("#yearStrip .week-tick");
    // 52 or 53 ISO weeks in the current year.
    expect(ticks.length).toBeGreaterThanOrEqual(52);
    expect(ticks.length).toBeLessThanOrEqual(53);
    // Exactly one tick is the current week, and the caption shows progress.
    expect(document.querySelectorAll("#yearStrip .week-tick.is-current").length).toBe(1);
    expect(document.getElementById("yearProgress").textContent).toMatch(/through \d{4}$/);

    // Clicking week 7's tick navigates the popup to week 7.
    document.querySelector('#yearStrip .week-tick[data-week="7"]').click();
    await flush();
    expect(document.getElementById("weekNumberDisplay").textContent).toBe("7");
    expect(document.querySelector('#yearStrip .week-tick[data-week="7"]').classList).toContain(
      "is-current"
    );
  });

  test("adding a milestone renders a row with a days-left countdown and persists it", async () => {
    const store = {};
    stubChrome(store);
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await flush();

    // Open the inline form and submit a milestone 10 days out.
    document.getElementById("addMilestoneBtn").click();
    const form = document.getElementById("milestoneForm");
    expect(form.hidden).toBe(false);

    const target = new Date();
    target.setDate(target.getDate() + 10);
    const pad = (n) => String(n).padStart(2, "0");
    document.getElementById("milestoneName").value = "Launch";
    document.getElementById("milestoneDate").value =
      `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await flush();

    const rows = document.querySelectorAll("#milestoneList .milestone");
    expect(rows.length).toBe(1);
    expect(rows[0].querySelector(".ms-name").textContent).toBe("Launch");
    expect(rows[0].querySelector(".ms-days").textContent).toBe("10 days left");
    expect(form.hidden).toBe(true);
    expect(store.milestones).toEqual([{ name: "Launch", date: expect.any(String) }]);
  });

  test("stored milestones render on load and × removes them", async () => {
    const today = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const iso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    const store = { milestones: [{ name: "Demo day", date: iso }] };
    stubChrome(store);
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await flush();

    // A milestone dated today shows the "Today" state.
    const row = document.querySelector("#milestoneList .milestone");
    expect(row).not.toBeNull();
    expect(row.querySelector(".ms-days").textContent).toBe("Today 🎉");
    expect(row.querySelector(".ms-days").classList).toContain("is-today");

    row.querySelector(".ms-del").click();
    await flush();
    expect(document.querySelectorAll("#milestoneList .milestone").length).toBe(0);
    expect(store.milestones).toEqual([]);
  });

  test("an out-of-range week number is clamped to the year's max", async () => {
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await flush();

    const weekInput = document.getElementById("weekInput");
    weekInput.value = "999";
    weekInput.dispatchEvent(new Event("input", { bubbles: true }));
    await flush();

    // Clamped to the week cap (max reflects the active year: 52 or 53).
    expect(weekInput.value).toBe(weekInput.max);
    expect(Number(weekInput.value)).toBeLessThanOrEqual(53);
  });
});
