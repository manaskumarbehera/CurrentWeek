/**
 * @jest-environment jsdom
 *
 * ui.test.js — shared theme + i18n DOM helpers (jsdom).
 */

const { resolveTheme, defaultTheme, applyTheme, applyI18n } = require("../ui");

describe("resolveTheme (pure)", () => {
  test("uses the saved theme when set", () => {
    expect(resolveTheme("blue", true)).toBe("blue");
    expect(resolveTheme("light", true)).toBe("light");
  });
  test("falls back to OS preference when unset", () => {
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme(null, false)).toBe("light");
    expect(resolveTheme("", true)).toBe("dark");
  });
});

describe("defaultTheme", () => {
  test("returns light when matchMedia is unavailable (jsdom default)", () => {
    expect(defaultTheme()).toBe("light");
  });
});

describe("applyTheme", () => {
  test("replaces the body class (no stale theme classes)", () => {
    document.body.className = "blue something";
    applyTheme("dark");
    expect(document.body.className).toBe("dark");
    applyTheme("red");
    expect(document.body.className).toBe("red");
  });
});

describe("applyI18n", () => {
  beforeEach(() => {
    global.chrome = {
      i18n: {
        getMessage: (k) => ({ greet: "Hello", btn: "Go" })[k] || "",
      },
    };
  });
  afterEach(() => delete global.chrome);

  test("replaces [data-i18n] text and [data-i18n-value] values", () => {
    document.body.innerHTML =
      '<span data-i18n="greet">x</span>' +
      '<input id="b" data-i18n-value="btn" value="y" />' +
      '<span data-i18n="missing">keep</span>';
    applyI18n(document);
    expect(document.querySelector("[data-i18n='greet']").textContent).toBe("Hello");
    expect(document.getElementById("b").value).toBe("Go");
    // Missing message → inline text preserved.
    expect(document.querySelector("[data-i18n='missing']").textContent).toBe("keep");
  });
});
