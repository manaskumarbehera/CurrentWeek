/**
 * settings.test.js — the canonical settings module (defaults + storage helpers).
 * chrome.storage.sync is stubbed with an in-memory store.
 */

const { SETTINGS_DEFAULTS, getSettings, saveSettings } = require("../settings");

function stubChrome() {
  const store = {};
  global.chrome = {
    storage: {
      sync: {
        get: (defaults, cb) => cb(Object.assign({}, defaults, store)),
        set: (patch, cb) => {
          Object.assign(store, patch);
          cb && cb();
        },
      },
    },
  };
  return store;
}

afterEach(() => {
  delete global.chrome;
});

describe("SETTINGS_DEFAULTS", () => {
  test("has the canonical keys with expected defaults", () => {
    expect(SETTINGS_DEFAULTS).toEqual({
      iconColor: "#000000",
      theme: null,
      weekSystem: "iso",
      firstDayOfWeek: 1,
      iconMode: "icon",
      milestones: [],
    });
  });
});

describe("getSettings", () => {
  test("resolves to the defaults when storage is empty", async () => {
    stubChrome();
    await expect(getSettings()).resolves.toEqual(SETTINGS_DEFAULTS);
  });

  test("overlays stored values over the defaults", async () => {
    const store = stubChrome();
    store.weekSystem = "us";
    store.firstDayOfWeek = 0;
    const s = await getSettings();
    expect(s.weekSystem).toBe("us");
    expect(s.firstDayOfWeek).toBe(0);
    expect(s.iconMode).toBe("icon"); // untouched default
  });
});

describe("saveSettings", () => {
  test("persists a patch that a subsequent getSettings reads back", async () => {
    stubChrome();
    await saveSettings({ iconMode: "badge", theme: "dark" });
    const s = await getSettings();
    expect(s.iconMode).toBe("badge");
    expect(s.theme).toBe("dark");
    expect(s.weekSystem).toBe("iso"); // unchanged
  });
});
