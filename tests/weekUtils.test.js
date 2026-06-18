/**
 * weekUtils.test.js — the shared pure utilities centralized into week.js
 * (previously inline, untested, in popup.js).
 */

const {
  weekStartDay,
  toLocalISODate,
  stripTime,
  sameYMD,
  daysLeftInWeek,
  daysLeftInYear,
  yearFromDateValue,
  getWeekStart,
} = require("../week");

describe("weekStartDay", () => {
  test("ISO is always Monday (1), regardless of firstDay", () => {
    expect(weekStartDay("iso", 0)).toBe(1);
    expect(weekStartDay("iso", 1)).toBe(1);
  });
  test("US follows the firstDay choice", () => {
    expect(weekStartDay("us", 0)).toBe(0);
    expect(weekStartDay("us", 1)).toBe(1);
  });
  test("defaults firstDay to 0", () => {
    expect(weekStartDay("us")).toBe(0);
  });
});

describe("toLocalISODate", () => {
  test("formats as local YYYY-MM-DD (zero-padded)", () => {
    expect(toLocalISODate(new Date(2026, 5, 18))).toBe("2026-06-18");
    expect(toLocalISODate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
  test("uses local fields, not UTC (no day shift)", () => {
    // Local midnight Jan 5 — toISOString() could roll to Jan 4 in UTC-behind TZs.
    expect(toLocalISODate(new Date(2026, 0, 5, 0, 30))).toBe("2026-01-05");
  });
});

describe("stripTime / sameYMD", () => {
  test("stripTime zeroes the time", () => {
    const s = stripTime(new Date(2026, 5, 18, 13, 45, 30));
    expect([s.getHours(), s.getMinutes(), s.getSeconds()]).toEqual([0, 0, 0]);
    expect(s.getDate()).toBe(18);
  });
  test("sameYMD ignores time", () => {
    expect(sameYMD(new Date(2026, 5, 18, 1), new Date(2026, 5, 18, 23))).toBe(true);
    expect(sameYMD(new Date(2026, 5, 18), new Date(2026, 5, 19))).toBe(false);
    expect(sameYMD(new Date(2025, 5, 18), new Date(2026, 5, 18))).toBe(false);
  });
});

describe("daysLeftInWeek", () => {
  const mon = new Date(2026, 5, 15); // Monday
  test("0 on the last day, 6 on the first day", () => {
    expect(daysLeftInWeek(mon, mon)).toBe(6);
    expect(daysLeftInWeek(new Date(2026, 5, 21), mon)).toBe(0); // Sunday
  });
  test("Thursday of a Monday-start week has 3 left", () => {
    expect(daysLeftInWeek(new Date(2026, 5, 18), mon)).toBe(3);
  });
  test("derives consistently from getWeekStart", () => {
    const d = new Date(2026, 5, 18);
    expect(daysLeftInWeek(d, getWeekStart(d, 1))).toBe(3);
  });
});

describe("daysLeftInYear", () => {
  test("0 on Dec 31, 1 on Dec 30", () => {
    expect(daysLeftInYear(new Date(2026, 11, 31))).toBe(0);
    expect(daysLeftInYear(new Date(2026, 11, 30))).toBe(1);
  });
  test("196 days left on Jun 18 2026", () => {
    expect(daysLeftInYear(new Date(2026, 5, 18))).toBe(196);
  });
});

describe("yearFromDateValue", () => {
  test("parses the 4-digit year", () => {
    expect(yearFromDateValue("2026-06-18", 2000)).toBe(2026);
    expect(yearFromDateValue("1999-12-31", 2000)).toBe(1999);
  });
  test("falls back when empty/invalid", () => {
    expect(yearFromDateValue("", 2001)).toBe(2001);
    expect(yearFromDateValue(undefined, 2002)).toBe(2002);
    expect(yearFromDateValue(null, 2003)).toBe(2003);
  });
});
