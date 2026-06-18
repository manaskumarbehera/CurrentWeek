/**
 * @jest-environment jsdom
 *
 * options.dom.test.js — integration test for the options page wiring: loads the
 * real options.js, populates from stored settings, and persists on Save.
 */

function buildDom() {
  document.body.innerHTML = `
    <select id="themeSelect">
      <option value="light"></option><option value="dark"></option>
      <option value="blue"></option><option value="red"></option>
    </select>
    <select id="weekSystemSelect">
      <option value="iso"></option><option value="us"></option>
    </select>
    <select id="firstDaySelect">
      <option value="1"></option><option value="0"></option>
    </select>
    <select id="iconModeSelect">
      <option value="icon"></option><option value="badge"></option>
    </select>
    <button id="saveButton"></button>
    <span id="status"></span>`;
}

function stubChrome(store = {}) {
  const sent = [];
  global.chrome = {
    i18n: { getMessage: (k) => (k === "settingsSaved" ? "Settings saved." : "") },
    storage: {
      sync: {
        get: (defaults, cb) => cb(Object.assign({}, defaults, store)),
        set: (patch, cb) => {
          Object.assign(store, patch);
          cb && cb();
        },
      },
    },
    runtime: { sendMessage: (m) => sent.push(m), lastError: null },
  };
  return { store, sent };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("options integration", () => {
  // Require once: re-requiring per test would stack DOMContentLoaded listeners
  // on the shared jsdom document (see popup.dom.test.js).
  beforeAll(() => {
    require("../options/options.js");
  });
  beforeEach(() => {
    buildDom();
  });
  afterEach(() => delete global.chrome);

  test("populates selects from stored settings", async () => {
    stubChrome({ theme: "blue", weekSystem: "us", firstDayOfWeek: 0, iconMode: "badge" });
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await flush();

    expect(document.getElementById("themeSelect").value).toBe("blue");
    expect(document.getElementById("weekSystemSelect").value).toBe("us");
    expect(document.getElementById("firstDaySelect").value).toBe("0");
    expect(document.getElementById("iconModeSelect").value).toBe("badge");
    expect(document.body.className).toBe("blue");
  });

  test("Save persists settings, notifies the worker, and shows status", async () => {
    const { store, sent } = stubChrome();
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await flush();

    document.getElementById("weekSystemSelect").value = "us";
    document.getElementById("iconModeSelect").value = "badge";
    document.getElementById("saveButton").click();
    await flush();

    expect(store.weekSystem).toBe("us");
    expect(store.iconMode).toBe("badge");
    expect(store.firstDayOfWeek).toBe(1); // parsed to a number
    expect(sent).toContainEqual({ action: "refreshIcon" });
    expect(document.getElementById("status").textContent).toBe("Settings saved.");
  });

  test("changing the theme select live-previews on the body", async () => {
    stubChrome();
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await flush();

    const themeSelect = document.getElementById("themeSelect");
    themeSelect.value = "red";
    themeSelect.dispatchEvent(new Event("change", { bubbles: true }));
    expect(document.body.className).toBe("red");
  });
});
