import {
  isMonthlySummaryDay,
  isStaleLastActivity,
  isWeeklyStaffDigestDay,
  monthlyDedupeKey,
  staffDigestDedupeKey,
  utcMonthRange,
} from './notification-windows';

describe('notification-windows', () => {
  const now = new Date('2026-09-01T08:00:00.000Z');

  it('treats the first UTC day of the month as the monthly summary day by default', () => {
    expect(isMonthlySummaryDay(now)).toBe(true);
    expect(isMonthlySummaryDay(new Date('2026-09-02T08:00:00.000Z'))).toBe(false);
  });

  it('builds UTC month ranges for last month and this month', () => {
    expect(utcMonthRange(now, -1)).toEqual({
      start: new Date('2026-08-01T00:00:00.000Z'),
      end: new Date('2026-09-01T00:00:00.000Z'),
    });
    expect(utcMonthRange(now, 0)).toEqual({
      start: new Date('2026-09-01T00:00:00.000Z'),
      end: new Date('2026-10-01T00:00:00.000Z'),
    });
  });

  it('uses YYYY-MM as the monthly dedupe key', () => {
    expect(monthlyDedupeKey(now)).toBe('2026-09');
  });

  it('does not treat missing lastActivity as stale', () => {
    expect(isStaleLastActivity(null, now, 14)).toBe(false);
    expect(isStaleLastActivity(undefined, now, 14)).toBe(false);
  });

  it('flags lastActivity older than N days', () => {
    expect(isStaleLastActivity(new Date('2026-08-10T08:00:00.000Z'), now, 14)).toBe(true);
    expect(isStaleLastActivity(new Date('2026-08-25T08:00:00.000Z'), now, 14)).toBe(false);
  });

  it('sends the staff digest on Monday UTC only by default', () => {
    expect(isWeeklyStaffDigestDay(new Date('2026-09-07T08:00:00.000Z'))).toBe(true);
    expect(isWeeklyStaffDigestDay(new Date('2026-09-09T08:00:00.000Z'))).toBe(false);
  });

  it('dedupes the staff digest once per ISO week', () => {
    expect(staffDigestDedupeKey(new Date('2026-09-07T08:00:00.000Z'))).toBe('2026-W37');
    expect(staffDigestDedupeKey(new Date('2026-09-13T08:00:00.000Z'))).toBe('2026-W37');
    expect(staffDigestDedupeKey(new Date('2026-09-14T08:00:00.000Z'))).toBe('2026-W38');
  });
});
