const { getCurrentWeekNumber } = require('../background');

describe('getCurrentWeekNumber', () => {
  test('returns 1 for first Monday of 2023', () => {
    const date = new Date('2023-01-02');
    expect(getCurrentWeekNumber(date)).toBe(1);
  });

  test('returns 24 for mid June 2023', () => {
    const date = new Date('2023-06-15');
    expect(getCurrentWeekNumber(date)).toBe(24);
  });

  test('returns 52 for last day of 2023', () => {
    const date = new Date('2023-12-31');
    expect(getCurrentWeekNumber(date)).toBe(52);
  });
});
