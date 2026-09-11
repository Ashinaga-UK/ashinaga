function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}

/** 48h for date-only due dates: two UTC calendar days before the due date. */
export function reminderDays(): number {
  return parsePositiveInt(process.env.NOTIFICATION_REMINDER_DAYS, 2);
}

export function inactivityDays(): number {
  return parsePositiveInt(process.env.NOTIFICATION_INACTIVITY_DAYS, 14);
}

export function monthlySummaryDay(): number {
  const day = parsePositiveInt(process.env.NOTIFICATION_MONTHLY_DAY, 1);
  return Math.min(day, 28);
}

export function activityTouchHours(): number {
  return parsePositiveInt(process.env.NOTIFICATION_ACTIVITY_TOUCH_HOURS, 6);
}

/** Human window for the due-soon email, matching NOTIFICATION_REMINDER_DAYS. */
export function dueSoonWindowLabel(days = reminderDays()): string {
  if (days === 1) return 'in 24 hours';
  if (days === 2) return 'in 48 hours';
  return `in ${days} days`;
}

/** UTC weekday for the staff digest. 0=Sunday … 6=Saturday. Default Monday. */
export function staffDigestWeekday(): number {
  const parsed = Number(process.env.NOTIFICATION_STAFF_DIGEST_WEEKDAY);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 6) return 1;
  return Math.floor(parsed);
}

export function cronSecret(): string | undefined {
  const value = process.env.CRON_SECRET?.trim();
  return value ? value : undefined;
}
