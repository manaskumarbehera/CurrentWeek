/**
 * background.test.js — service-worker render logic. Stubs chrome + OffscreenCanvas,
 * captures the registered listeners, and drives both toolbar render paths.
 */

function setup(store = {}) {
  const calls = { setIcon: [], setTitle: [], setBadgeText: [], setBadgeBg: [], alarmCreate: [] };
  const listeners = {};

  global.OffscreenCanvas = class {
    constructor(w, h) {
      this.width = w;
      this.height = h;
    }
    getContext() {
      return {
        fillText() {},
        getImageData: () => ({ data: new Uint8ClampedArray(4) }),
      };
    }
  };

  global.chrome = {
    i18n: { getMessage: (k) => (k === "extName" ? "Week Number" : "") },
    runtime: {
      lastError: null,
      onStartup: { addListener: (fn) => (listeners.startup = fn) },
      onInstalled: { addListener: (fn) => (listeners.installed = fn) },
      onMessage: { addListener: (fn) => (listeners.message = fn) },
    },
    storage: { sync: { get: (defaults, cb) => cb(Object.assign({}, defaults, store)) } },
    alarms: {
      create: (...a) => calls.alarmCreate.push(a),
      onAlarm: { addListener: (fn) => (listeners.alarm = fn) },
    },
    action: {
      setIcon: (o, cb) => {
        calls.setIcon.push(o);
        cb && cb();
      },
      setTitle: (o) => calls.setTitle.push(o),
      setBadgeText: (o) => calls.setBadgeText.push(o),
      setBadgeBackgroundColor: (o) => calls.setBadgeBg.push(o),
    },
  };
  return { calls, listeners, store };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

afterEach(() => {
  delete global.chrome;
  delete global.OffscreenCanvas;
});

describe("background service worker", () => {
  test("registers lifecycle listeners and the refresh alarm on load", () => {
    const { calls, listeners } = setup();
    jest.resetModules();
    require("../background.js");
    expect(typeof listeners.installed).toBe("function");
    expect(typeof listeners.message).toBe("function");
    expect(typeof listeners.alarm).toBe("function");
    expect(calls.alarmCreate.length).toBe(1);
    expect(calls.alarmCreate[0][0]).toBe("refreshWeekIcon");
  });

  test("icon mode draws the number and clears any badge", async () => {
    const { calls, listeners } = setup({ iconMode: "icon" });
    jest.resetModules();
    require("../background.js");
    listeners.installed();
    await flush();

    // Drawn-icon path: setIcon with imageData, badge cleared, title set.
    expect(calls.setIcon.some((o) => o.imageData)).toBe(true);
    expect(calls.setBadgeText).toContainEqual({ text: "" });
    expect(calls.setTitle[0].title).toMatch(/^Week Number : \d+$/);
  });

  test("badge mode sets badge text + color and restores the static icon", async () => {
    const { calls, listeners } = setup({ iconMode: "badge", iconColor: "#123456" });
    jest.resetModules();
    require("../background.js");
    listeners.installed();
    await flush();

    const badge = calls.setBadgeText.find((o) => o.text && o.text !== "");
    expect(badge).toBeDefined();
    expect(Number.isInteger(Number(badge.text))).toBe(true);
    expect(calls.setBadgeBg).toContainEqual({ color: "#123456" });
    // Static icon restored via path (not a drawn imageData).
    expect(calls.setIcon.some((o) => o.path)).toBe(true);
  });

  test("a refreshIcon message re-renders the toolbar", async () => {
    const { calls, listeners } = setup({ iconMode: "icon" });
    jest.resetModules();
    require("../background.js");
    listeners.message({ action: "refreshIcon" });
    await flush();
    expect(calls.setIcon.length).toBeGreaterThan(0);
  });
});
