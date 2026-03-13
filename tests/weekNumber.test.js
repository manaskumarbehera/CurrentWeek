const { getCurrentWeekNumber, getISOWeeksInYear } = require('../background');

// ---------------------------------------------------------------------------
// Pure helper — mirrors the ISO Monday formula in popup.js displayWeekFromDate
// Used to verify the (getDay()+6)%7 fix for the Sunday off-by-one bug.
// ---------------------------------------------------------------------------
function getISOMonday(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

// ---------------------------------------------------------------------------
// getCurrentWeekNumber
// ---------------------------------------------------------------------------
describe('getCurrentWeekNumber', () => {
  // --- original regression tests ---
  test('returns 1 for first Monday of 2023 (Mon Jan 2)', () => {
    expect(getCurrentWeekNumber(new Date('2023-01-02'))).toBe(1);
  });

  test('returns 24 for mid-June 2023 (Thu Jun 15)', () => {
    expect(getCurrentWeekNumber(new Date('2023-06-15'))).toBe(24);
  });

  test('returns 52 for last day of 2023 (Sun Dec 31)', () => {
    expect(getCurrentWeekNumber(new Date('2023-12-31'))).toBe(52);
  });

  // --- year-boundary edge cases ---
  test('Sunday Jan 1 2023 belongs to week 52 of 2022', () => {
    // ISO week 1 of 2023 starts Mon Jan 2, so Jan 1 (Sun) is still in 2022 W52
    expect(getCurrentWeekNumber(new Date('2023-01-01'))).toBe(52);
  });

  test('Thursday Jan 1 2015 is week 1 of 2015', () => {
    // A Thursday is always in week 1 of its own year (ISO rule)
    expect(getCurrentWeekNumber(new Date('2015-01-01'))).toBe(1);
  });

  test('Monday Dec 30 2024 is week 1 of 2025', () => {
    // ISO week 1 of 2025 starts on Mon Dec 30 2024
    expect(getCurrentWeekNumber(new Date('2024-12-30'))).toBe(1);
  });

  test('Jan 4 is always in week 1 of its own year', () => {
    // ISO 8601: the week containing Jan 4 is always week 1
    expect(getCurrentWeekNumber(new Date('2021-01-04'))).toBe(1);
    expect(getCurrentWeekNumber(new Date('2023-01-04'))).toBe(1);
    expect(getCurrentWeekNumber(new Date('2026-01-04'))).toBe(1);
  });

  // --- 53-week year edge cases ---
  test('returns 53 for Thu Dec 31 2015 (53-week year)', () => {
    expect(getCurrentWeekNumber(new Date('2015-12-31'))).toBe(53);
  });

  test('Sunday Jan 3 2016 is still week 53 of 2015', () => {
    // Last ISO week of 2015 runs Mon Dec 28 2015 – Sun Jan 3 2016
    expect(getCurrentWeekNumber(new Date('2016-01-03'))).toBe(53);
  });

  test('Monday Jan 4 2016 is week 1 of 2016', () => {
    expect(getCurrentWeekNumber(new Date('2016-01-04'))).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// getISOWeeksInYear
// ---------------------------------------------------------------------------
describe('getISOWeeksInYear', () => {
  test('2023 has 52 weeks', () => {
    expect(getISOWeeksInYear(2023)).toBe(52);
  });

  test('2024 has 52 weeks', () => {
    expect(getISOWeeksInYear(2024)).toBe(52);
  });

  test('2025 has 52 weeks', () => {
    expect(getISOWeeksInYear(2025)).toBe(52);
  });

  test('2026 has 53 weeks (year starts on Thursday)', () => {
    // Jan 1 2026 is a Thursday → week 1 owns that day → long year
    expect(getISOWeeksInYear(2026)).toBe(53);
  });

  test('2020 has 53 weeks (leap year starting on Wednesday)', () => {
    expect(getISOWeeksInYear(2020)).toBe(53);
  });

  test('2015 has 53 weeks (year starts on Thursday)', () => {
    expect(getISOWeeksInYear(2015)).toBe(53);
  });
});

// ---------------------------------------------------------------------------
// ISO Monday formula — (getDay()+6)%7
// Verifies the fix for the Sunday off-by-one bug in displayWeekFromDate.
// ---------------------------------------------------------------------------
describe('getISOMonday — (getDay()+6)%7 formula', () => {
  // Week of Mon Mar 9 – Sun Mar 15 2026 (current week at time of writing)
  test('Monday stays as Monday', () => {
    const monday = new Date('2026-03-09');
    expect(getISOMonday(monday).toDateString()).toBe(monday.toDateString());
  });

  test('Sunday Mar 8 2026 maps back to Mon Mar 2 2026 (not forward to Mar 9)', () => {
    // Old bug: getDate()-getDay()+1 → 8-0+1 = 9 (next Monday) ✗
    // Fix:     getDate()-((0+6)%7)  → 8-6   = 2 (correct Monday) ✓
    const sunday = new Date('2026-03-08');
    expect(getISOMonday(sunday).toDateString()).toBe(new Date('2026-03-02').toDateString());
  });

  test('Saturday Mar 7 2026 maps back to Mon Mar 2 2026', () => {
    const saturday = new Date('2026-03-07');
    expect(getISOMonday(saturday).toDateString()).toBe(new Date('2026-03-02').toDateString());
  });

  test('Wednesday Mar 11 2026 maps back to Mon Mar 9 2026', () => {
    const wednesday = new Date('2026-03-11');
    expect(getISOMonday(wednesday).toDateString()).toBe(new Date('2026-03-09').toDateString());
  });

  test('Sunday is in the same ISO week as the 6 days before it', () => {
    // Sun Mar 15 2026 should share a week-number with Mon Mar 9 2026
    const sunday = new Date('2026-03-15');
    const monday = new Date('2026-03-09');
    expect(getCurrentWeekNumber(getISOMonday(sunday))).toBe(getCurrentWeekNumber(getISOMonday(monday)));
  });
});
