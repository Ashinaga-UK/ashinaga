import { reminderDays, staffDigestWeekday } from './notification-config';

describe('notification-config', () => {
  const originalReminder = process.env.NOTIFICATION_REMINDER_DAYS;
  const originalWeekday = process.env.NOTIFICATION_STAFF_DIGEST_WEEKDAY;

  afterEach(() => {
    if (originalReminder === undefined) {
      delete process.env.NOTIFICATION_REMINDER_DAYS;
    } else {
      process.env.NOTIFICATION_REMINDER_DAYS = originalReminder;
    }
    if (originalWeekday === undefined) {
      delete process.env.NOTIFICATION_STAFF_DIGEST_WEEKDAY;
    } else {
      process.env.NOTIFICATION_STAFF_DIGEST_WEEKDAY = originalWeekday;
    }
  });

  it('defaults reminder timing to 2 UTC days (48h for date-only dues)', () => {
    delete process.env.NOTIFICATION_REMINDER_DAYS;
    expect(reminderDays()).toBe(2);
  });

  it('defaults the staff digest to Monday UTC and allows Sunday (0)', () => {
    delete process.env.NOTIFICATION_STAFF_DIGEST_WEEKDAY;
    expect(staffDigestWeekday()).toBe(1);
    process.env.NOTIFICATION_STAFF_DIGEST_WEEKDAY = '0';
    expect(staffDigestWeekday()).toBe(0);
    process.env.NOTIFICATION_STAFF_DIGEST_WEEKDAY = '7';
    expect(staffDigestWeekday()).toBe(1);
  });
});
