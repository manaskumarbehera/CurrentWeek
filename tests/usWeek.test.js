/**
 * usWeek.test.js
 *
 * The US week-of-year system and the system-agnostic dispatchers. US weeks:
 * week 1 = the week containing Jan 1, weeks start on `firstDay` (0 = Sun), no
 * nearest-Thursday rule, and partial weeks at each year edge are truncated to
 * that year (so Jan 1 is always week 1).
 */

const {
  getCurrentWeekNumber,
  getISOWeeksInYear,
  getDateOfISOWeek,
  getWeekStart,
  getUSWeekOfYear,
  getUSWeeksInYear,
  getDateOfUSWeek,
  getWeekNumber,
  getWeeksInYear,
  getDateOfWeek,
} = require("../week");

const ds = (d) => d.toDateString();

describe("getWeekStart", () => {
  test("Monday-start equals the ISO Monday", () => {
    const wed = new Date(2026, 2, 11); // Wed Mar 11 2026
    expect(ds(getWeekStart(wed, 1))).toBe("Mon Mar 09 2026");
  });
  test("Sunday-start backs up to Sunday", () => {
    const wed = new Date(2026, 2, 11);
    expect(ds(getWeekStart(wed, 0))).toBe("Sun Mar 08 2026");
  });
  test("a day that is already the first day stays put", () => {
    const sun = new Date(2026, 2, 8); // Sunday
    expect(ds(getWeekStart(sun, 0))).toBe("Sun Mar 08 2026");
  });
});

describe("getUSWeekOfYear", () => {
  test("Jan 1 is always week 1 (several years, Sun & Mon starts)", () => {
    for (const y of [2021, 2022, 2023, 2024, 2025, 2026]) {
      for (const fd of [0, 1]) {
        expect(getUSWeekOfYear(new Date(y, 0, 1), fd)).toBe(1);
      }
    }
  });

  test("differs from ISO where ISO rolls into the previous year", () => {
    // Sun Jan 1 2023: ISO → week 52 of 2022; US (Sun-start) → week 1 of 2023.
    const jan1 = new Date(2023, 0, 1);
    expect(getCurrentWeekNumber(jan1)).toBe(52);
    expect(getUSWeekOfYear(jan1, 0)).toBe(1);
  });

  test("second US week (Sun-start) begins the Sunday after Jan 1", () => {
    // 2021: Jan 1 = Fri, so week 2 starts Sun Jan 3 2021.
    expect(getUSWeekOfYear(new Date(2021, 0, 3), 0)).toBe(2);
    expect(getUSWeekOfYear(new Date(2021, 0, 2), 0)).toBe(1); // Sat, still week 1
  });
});

describe("getUSWeeksInYear", () => {
  test("equals the week number of Dec 31", () => {
    for (const y of [2020, 2021, 2022, 2026]) {
      expect(getUSWeeksInYear(y, 0)).toBe(getUSWeekOfYear(new Date(y, 11, 31), 0));
    }
  });
  test("2021 (Sun-start) has 53 weeks", () => {
    expect(getUSWeeksInYear(2021, 0)).toBe(53);
  });
});

describe("getDateOfUSWeek round-trip", () => {
  // Week starts always land on firstDay; weeks are 7 days apart; weeks whose
  // start falls in year Y round-trip through getUSWeekOfYear. Week 1's start may
  // sit in the prior December (truncated), so it is checked via Jan-1 inclusion.
  for (const fd of [0, 1]) {
    for (const year of [2020, 2021, 2023, 2026]) {
      test(`year ${year}, firstDay ${fd}`, () => {
        const count = getUSWeeksInYear(year, fd);
        const jan1 = new Date(year, 0, 1);
        // Week 1 spans Jan 1.
        expect(getDateOfUSWeek(1, year, fd).getTime()).toBeLessThanOrEqual(jan1.getTime());
        expect(getDateOfUSWeek(2, year, fd).getTime()).toBeGreaterThan(jan1.getTime());
        for (let w = 1; w <= count; w++) {
          const start = getDateOfUSWeek(w, year, fd);
          expect(start.getDay()).toBe(fd);
          if (w >= 2 && start.getFullYear() === year) {
            expect(getUSWeekOfYear(start, fd)).toBe(w);
          }
        }
      });
    }
  }
});

describe("dispatchers route to the right system", () => {
  const d = new Date(2023, 0, 1);
  test("getWeekNumber", () => {
    expect(getWeekNumber(d, "iso")).toBe(getCurrentWeekNumber(d));
    expect(getWeekNumber(d, "us", 0)).toBe(getUSWeekOfYear(d, 0));
    expect(getWeekNumber(d)).toBe(getCurrentWeekNumber(d)); // default iso
  });
  test("getWeeksInYear", () => {
    expect(getWeeksInYear(2026, "iso")).toBe(getISOWeeksInYear(2026));
    expect(getWeeksInYear(2021, "us", 0)).toBe(getUSWeeksInYear(2021, 0));
  });
  test("getDateOfWeek", () => {
    expect(ds(getDateOfWeek(5, 2026, "iso"))).toBe(ds(getDateOfISOWeek(5, 2026)));
    expect(ds(getDateOfWeek(5, 2026, "us", 0))).toBe(ds(getDateOfUSWeek(5, 2026, 0)));
  });
});
