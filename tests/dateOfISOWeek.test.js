/**
 * dateOfISOWeek.test.js
 *
 * Locks getDateOfISOWeek — the year-aware week→date function behind the popup's
 * week navigation (#4). Previously the popup hardcoded the current year and the
 * Jan-1 = Fri/Sat/Sun edges were untested.
 */

const { getCurrentWeekNumber, getISOWeeksInYear, getDateOfISOWeek } = require("../week");

const ds = (d) => d.toDateString();

describe("getDateOfISOWeek — week 1 Monday across Jan-1 weekday edges", () => {
  // Each case: ISO week 1 of <year> starts on the Monday below (Wikipedia ISO-8601).
  const week1 = [
    [2024, "Mon Jan 01 2024"], // Jan 1 = Monday
    [2025, "Mon Dec 30 2024"], // Jan 1 = Wednesday
    [2026, "Mon Dec 29 2025"], // Jan 1 = Thursday → previous-year Monday
    [2021, "Mon Jan 04 2021"], // Jan 1 = Friday
    [2022, "Mon Jan 03 2022"], // Jan 1 = Saturday
    [2023, "Mon Jan 02 2023"], // Jan 1 = Sunday
    [2015, "Mon Dec 29 2014"], // Jan 1 = Thursday
  ];

  test.each(week1)("week 1 of %i starts %s", (year, expected) => {
    expect(ds(getDateOfISOWeek(1, year))).toBe(expected);
  });
});

describe("getDateOfISOWeek — last week of 53-week years", () => {
  test("week 53 of 2015 starts Mon Dec 28 2015", () => {
    expect(getISOWeeksInYear(2015)).toBe(53);
    expect(ds(getDateOfISOWeek(53, 2015))).toBe("Mon Dec 28 2015");
  });

  test("week 53 of 2020 starts Mon Dec 28 2020", () => {
    expect(getISOWeeksInYear(2020)).toBe(53);
    expect(ds(getDateOfISOWeek(53, 2020))).toBe("Mon Dec 28 2020");
  });
});

describe("getDateOfISOWeek ↔ getCurrentWeekNumber round-trip (year-aware)", () => {
  // The same week number resolves to different dates per year — the property
  // that #4 fixed. Round-trip every week of several distinct years.
  for (const year of [2015, 2020, 2021, 2023, 2024, 2026]) {
    test(`every week of ${year} round-trips to itself`, () => {
      const weeks = getISOWeeksInYear(year);
      for (let w = 1; w <= weeks; w++) {
        const monday = getDateOfISOWeek(w, year);
        expect(monday.getDay()).toBe(1); // always a Monday
        expect(getCurrentWeekNumber(monday)).toBe(w);
      }
    });
  }

  test("week 1 resolves to different dates in different years", () => {
    expect(ds(getDateOfISOWeek(1, 2024))).not.toBe(ds(getDateOfISOWeek(1, 2026)));
  });
});
