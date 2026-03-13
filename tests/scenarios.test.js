/**
 * scenarios.test.js
 *
 * Scenario-based and exploratory tests for week-number logic.
 *
 * Pure helpers (no DOM/chrome) mirror the formulas used in popup.js so the
 * full calculation chain can be exercised without a browser environment.
 */

const { getCurrentWeekNumber, getISOWeeksInYear } = require('../background');

// ---------------------------------------------------------------------------
// Helpers (mirrors popup.js logic for testing without DOM)
// ---------------------------------------------------------------------------

/** Returns the ISO 8601 Monday for any given date. */
function getISOMonday(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

/**
 * Mirrors displayWeekFromWeekNumber in popup.js.
 * Converts a week number + year back to the Monday that starts that week.
 */
function weekNumberToMonday(weekNumber, year) {
  const simple = new Date(year, 0, 1 + (weekNumber - 1) * 7);
  const dayOfWeek = simple.getDay();
  const startOfWeek = new Date(simple);
  if (dayOfWeek <= 4) {
    startOfWeek.setDate(simple.getDate() - dayOfWeek + 1);
  } else {
    startOfWeek.setDate(simple.getDate() + 8 - dayOfWeek);
  }
  return startOfWeek;
}

/** Returns the ISO Thursday of the week that contains `date`. */
function getISOThursday(date) {
  const d = new Date(date);
  const dayNum = d.getDay() || 7; // Mon=1 … Sun=7 (matches getCurrentWeekNumber internals)
  d.setDate(d.getDate() + (4 - dayNum));
  return d;
}

/** Returns every date in a calendar year as an array of Date objects. */
function allDaysInYear(year) {
  const days = [];
  const d = new Date(year, 0, 1);
  while (d.getFullYear() === year) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

// ===========================================================================
// SCENARIO TESTS
// ===========================================================================

// ---------------------------------------------------------------------------
// Scenario 1 — User opens the extension on a known date
// ---------------------------------------------------------------------------
describe('Scenario 1: User opens extension on a known date', () => {
  test('March 13 2026 (Friday) is in week 11', () => {
    // Week 11 of 2026 runs Mon Mar 9 – Sun Mar 15
    expect(getCurrentWeekNumber(new Date(2026, 2, 13))).toBe(11);
  });

  test('getCurrentWeekNumber always returns a value inside [1, weeksInYear]', () => {
    const today = new Date();
    const week = getCurrentWeekNumber(today);
    const max  = getISOWeeksInYear(today.getFullYear());
    expect(week).toBeGreaterThanOrEqual(1);
    expect(week).toBeLessThanOrEqual(max);
  });

  test('the ISO Monday of the current week has the same week number as today', () => {
    const today  = new Date();
    const monday = getISOMonday(today);
    expect(getCurrentWeekNumber(monday)).toBe(getCurrentWeekNumber(today));
  });
});

// ---------------------------------------------------------------------------
// Scenario 2 — User picks a date at a year boundary (52-week year)
// ---------------------------------------------------------------------------
describe('Scenario 2: User picks dates around the year boundary of a 52-week year (2023)', () => {
  // 2023: week 1 starts Mon Jan 2
  test('Dec 31 2022 (Sat) is week 52 of 2022', () => {
    expect(getCurrentWeekNumber(new Date(2022, 11, 31))).toBe(52);
  });

  test('Sun Jan 1 2023 still belongs to week 52 of 2022', () => {
    expect(getCurrentWeekNumber(new Date(2023, 0, 1))).toBe(52);
  });

  test('Mon Jan 2 2023 is the first day of week 1 of 2023', () => {
    expect(getCurrentWeekNumber(new Date(2023, 0, 2))).toBe(1);
  });

  test('Sun Jan 8 2023 closes week 1 of 2023', () => {
    expect(getCurrentWeekNumber(new Date(2023, 0, 8))).toBe(1);
  });

  test('Mon Jan 9 2023 opens week 2 of 2023', () => {
    expect(getCurrentWeekNumber(new Date(2023, 0, 9))).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Scenario 3 — User explores a 53-week year (2026, the current year)
// ---------------------------------------------------------------------------
describe('Scenario 3: User navigates all weeks of 2026 (53-week year)', () => {
  test('2026 has 53 ISO weeks', () => {
    expect(getISOWeeksInYear(2026)).toBe(53);
  });

  test('week input max for 2026 should be 53, not 52', () => {
    // Regression: old code hard-clamped to 52 and would reject week 53
    const maxWeek = getISOWeeksInYear(2026);
    expect(maxWeek).toBe(53);
    expect(maxWeek).toBeGreaterThan(52);
  });

  test('Mon Dec 28 2026 is the start of week 53', () => {
    expect(getCurrentWeekNumber(new Date(2026, 11, 28))).toBe(53);
  });

  test('Sun Jan 3 2027 closes week 53 of 2026', () => {
    expect(getCurrentWeekNumber(new Date(2027, 0, 3))).toBe(53);
  });

  test('Mon Jan 4 2027 opens week 1 of 2027', () => {
    expect(getCurrentWeekNumber(new Date(2027, 0, 4))).toBe(1);
  });

  test('all week numbers 1–53 are reachable in 2026', () => {
    const weeks = new Set(allDaysInYear(2026).map(d => getCurrentWeekNumber(d)));
    // Remove any days that roll into adj years (week 52/53 of 2025 or week 1 of 2027)
    const ownWeeks = new Set(
      allDaysInYear(2026)
        .filter(d => getISOThursday(d).getFullYear() === 2026)
        .map(d => getCurrentWeekNumber(d))
    );
    for (let w = 1; w <= 53; w++) {
      expect(ownWeeks.has(w)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Scenario 4 — User picks every day in a 52-week year (2023) and checks
// that all 52 weeks are present with no gaps
// ---------------------------------------------------------------------------
describe('Scenario 4: Walking every day of 2023 (52-week year) produces exactly weeks 1–52', () => {
  let ownWeeks;

  beforeAll(() => {
    ownWeeks = new Set(
      allDaysInYear(2023)
        .filter(d => getISOThursday(d).getFullYear() === 2023)
        .map(d => getCurrentWeekNumber(d))
    );
  });

  test('contains exactly 52 distinct week numbers', () => {
    expect(ownWeeks.size).toBe(52);
  });

  test.each(Array.from({ length: 52 }, (_, i) => [i + 1]))(
    'week %i is present',
    (w) => {
      expect(ownWeeks.has(w)).toBe(true);
    }
  );
});

// ---------------------------------------------------------------------------
// Scenario 5 — User uses the reset button (today) across several years
// ---------------------------------------------------------------------------
describe('Scenario 5: "Today" always produces a consistent week for known dates', () => {
  const knownDates = [
    // [year, month(0-based), day, expectedWeek]
    [2023, 0, 2,  1],   // Mon Jan 2 2023 — week 1
    [2023, 5, 15, 24],  // Thu Jun 15 2023 — week 24
    [2023, 11, 31, 52], // Sun Dec 31 2023 — week 52
    [2024, 0, 1,  1],   // Mon Jan 1 2024 — week 1 (Jan 1 2024 is a Monday)
    [2025, 0, 1,  1],   // Wed Jan 1 2025 — week 1
    [2026, 2, 9,  11],  // Mon Mar 9 2026 — week 11
    [2026, 11, 28, 53], // Mon Dec 28 2026 — week 53
  ];

  test.each(knownDates)(
    '%i-%i-%i → week %i',
    (y, m, d, expected) => {
      expect(getCurrentWeekNumber(new Date(y, m, d))).toBe(expected);
    }
  );
});

// ---------------------------------------------------------------------------
// Scenario 6 — User picks each Sunday and sees it land in the correct week,
// NOT the next week (regression for the Sunday off-by-one bug)
// ---------------------------------------------------------------------------
describe('Scenario 6: Every Sunday shares a week number with its own Monday (not the next)', () => {
  // Collect all Sundays in 2026
  const sundays2026 = allDaysInYear(2026).filter(d => d.getDay() === 0);

  test('there are 52 or 53 Sundays in 2026', () => {
    expect(sundays2026.length).toBeGreaterThanOrEqual(52);
  });

  test.each(sundays2026.slice(0, 10).map(d => [d.toDateString()]))(
    'Sunday %s has the same week number as the Monday 6 days before it',
    (dateStr) => {
      const sunday = new Date(dateStr);
      const monday = new Date(sunday);
      monday.setDate(sunday.getDate() - 6);
      expect(getCurrentWeekNumber(sunday)).toBe(getCurrentWeekNumber(monday));
    }
  );
});

// ===========================================================================
// EXPLORATORY TESTS
// ===========================================================================

// ---------------------------------------------------------------------------
// Exploratory 1 — ISO 8601 anchor: Jan 4 is always in week 1
// ---------------------------------------------------------------------------
describe('Exploratory: Jan 4 is always in week 1 (ISO 8601 anchor)', () => {
  const years = [2015, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2030];

  test.each(years.map(y => [y]))(
    'Jan 4 %i → week 1',
    (year) => {
      expect(getCurrentWeekNumber(new Date(year, 0, 4))).toBe(1);
    }
  );
});

// ---------------------------------------------------------------------------
// Exploratory 2 — Dec 28 always equals getISOWeeksInYear for that year
// ---------------------------------------------------------------------------
describe('Exploratory: Dec 28 of year Y is always in the last ISO week of Y', () => {
  const years = [2015, 2019, 2020, 2021, 2023, 2024, 2025, 2026, 2027];

  test.each(years.map(y => [y]))(
    'Dec 28 %i → getISOWeeksInYear(%i)',
    (year) => {
      expect(getCurrentWeekNumber(new Date(year, 11, 28))).toBe(getISOWeeksInYear(year));
    }
  );
});

// ---------------------------------------------------------------------------
// Exploratory 3 — All 7 days of any given week return the same week number
// ---------------------------------------------------------------------------
describe('Exploratory: All 7 days of a week share the same week number', () => {
  const testWeeks = [
    new Date(2026, 2, 9),  // Mon Mar 9 2026 — week 11
    new Date(2023, 0, 2),  // Mon Jan 2 2023 — week 1
    new Date(2015, 11, 28), // Mon Dec 28 2015 — week 53
    new Date(2026, 11, 28), // Mon Dec 28 2026 — week 53
  ];

  test.each(testWeeks.map(d => [d.toDateString()]))(
    'all 7 days of the week starting %s have the same week number',
    (mondayStr) => {
      const monday = new Date(mondayStr);
      const weekNum = getCurrentWeekNumber(monday);
      for (let i = 1; i <= 6; i++) {
        const day = new Date(monday);
        day.setDate(monday.getDate() + i);
        expect(getCurrentWeekNumber(day)).toBe(weekNum);
      }
    }
  );
});

// ---------------------------------------------------------------------------
// Exploratory 4 — Round-trip: weekNumber → Monday → weekNumber is identity
// ---------------------------------------------------------------------------
describe('Exploratory: weekNumberToMonday ↔ getCurrentWeekNumber round-trip', () => {
  const years = [2020, 2023, 2025, 2026];

  test.each(years.map(y => [y]))(
    'every week in %i survives a round-trip',
    (year) => {
      const total = getISOWeeksInYear(year);
      for (let w = 1; w <= total; w++) {
        const monday = weekNumberToMonday(w, year);
        expect(getCurrentWeekNumber(monday)).toBe(w);
      }
    }
  );
});

// ---------------------------------------------------------------------------
// Exploratory 5 — Consecutive Mondays differ by exactly 1 week (with wrap)
// ---------------------------------------------------------------------------
describe('Exploratory: Consecutive Mondays increment the week number by 1 (or wrap 52/53 → 1)', () => {
  test('all Mondays in 2023 produce sequential week numbers 1–52', () => {
    const mondays = allDaysInYear(2023).filter(d => d.getDay() === 1);
    const weekNums = mondays.map(d => getCurrentWeekNumber(d));
    for (let i = 1; i < weekNums.length; i++) {
      const delta = weekNums[i] - weekNums[i - 1];
      // delta should be +1 (normal) or a large negative (year wrap)
      expect(delta === 1 || delta < -10).toBe(true);
    }
  });

  test('all Mondays in 2026 (53-week year) produce sequential week numbers', () => {
    const mondays = allDaysInYear(2026).filter(d => d.getDay() === 1);
    const weekNums = mondays.map(d => getCurrentWeekNumber(d));
    for (let i = 1; i < weekNums.length; i++) {
      const delta = weekNums[i] - weekNums[i - 1];
      expect(delta === 1 || delta < -10).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Exploratory 6 — No date ever returns a week number outside [1, 53]
// ---------------------------------------------------------------------------
describe('Exploratory: week number is always in valid range [1, 53]', () => {
  test('every day across years 2018–2030 returns 1 ≤ week ≤ 53', () => {
    for (let year = 2018; year <= 2030; year++) {
      for (const d of allDaysInYear(year)) {
        const w = getCurrentWeekNumber(d);
        expect(w).toBeGreaterThanOrEqual(1);
        expect(w).toBeLessThanOrEqual(53);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Exploratory 7 — getISOWeeksInYear is always 52 or 53, never anything else
// ---------------------------------------------------------------------------
describe('Exploratory: getISOWeeksInYear is always 52 or 53', () => {
  test('years 2000–2040 each have either 52 or 53 weeks', () => {
    for (let year = 2000; year <= 2040; year++) {
      const w = getISOWeeksInYear(year);
      expect([52, 53]).toContain(w);
    }
  });

  test('correct count of 53-week years in 2000–2040 is 71 years (6 long)', () => {
    // Long (53-week) years in 2000–2040: 2004,2009,2015,2020,2026,2032,2037
    const longYears = [];
    for (let y = 2000; y <= 2040; y++) {
      if (getISOWeeksInYear(y) === 53) longYears.push(y);
    }
    expect(longYears).toEqual([2004, 2009, 2015, 2020, 2026, 2032, 2037]);
  });
});

