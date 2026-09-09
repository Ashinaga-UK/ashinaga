import { inactivityDays, monthlySummaryDay, staffDigestWeekday } from './notification-config';

export function utcMonthRange(now: Date, monthOffset: number): { start: Date; end: Date } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthOffset, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthOffset + 1, 1));
  return { start, end };
}

export function isMonthlySummaryDay(now: Date, day = monthlySummaryDay()): boolean {
  return now.getUTCDate() === day;
}

export function monthlyDedupeKey(now: Date): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function utcDateKey(date: Date): string {
  return new Date(date).toISOString().slice(0, 10);
}

export function isStaleLastActivity(
  lastActivity: Date | string | null | undefined,
  now = new Date(),
  days = inactivityDays()
): boolean {
  if (!lastActivity) return false;
  const then = new Date(lastActivity).getTime();
  if (Number.isNaN(then)) return false;
  return now.getTime() - then >= days * 24 * 60 * 60 * 1000;
}

export function isWeeklyStaffDigestDay(now: Date, weekday = staffDigestWeekday()): boolean {
  return now.getUTCDay() === weekday;
}

/** ISO week (UTC), e.g. 2026-W37. One staff digest per week even if the job retries. */
export function staffDigestDedupeKey(now: Date): string {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const isoDay = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - isoDay + 3);
  const year = date.getUTCFullYear();
  const week1Thursday = new Date(Date.UTC(year, 0, 4));
  const week1IsoDay = (week1Thursday.getUTCDay() + 6) % 7;
  week1Thursday.setUTCDate(week1Thursday.getUTCDate() - week1IsoDay + 3);
  const week = 1 + Math.round((date.getTime() - week1Thursday.getTime()) / 604800000);
  return `${year}-W${String(week).padStart(2, '0')}`;
}
