import {
  isTaskDueInCalendarDays,
  isTaskDueToday,
  isTaskOverdue,
  startOfNextUtcDay,
} from './task-due';

describe('task-due', () => {
  const now = new Date('2026-09-03T12:00:00.000Z');

  it('treats incomplete tasks due before today UTC as overdue', () => {
    expect(isTaskOverdue({ dueDate: '2026-09-02T00:00:00.000Z', status: 'pending' }, now)).toBe(
      true
    );
    expect(isTaskOverdue({ dueDate: '2026-09-03T00:00:00.000Z', status: 'pending' }, now)).toBe(
      false
    );
    expect(isTaskOverdue({ dueDate: '2026-09-01T00:00:00.000Z', status: 'completed' }, now)).toBe(
      false
    );
  });

  it('treats the UTC calendar due date as due today', () => {
    expect(isTaskDueToday({ dueDate: '2026-09-03T00:00:00.000Z', status: 'pending' }, now)).toBe(
      true
    );
    expect(isTaskDueToday({ dueDate: '2026-09-04T00:00:00.000Z', status: 'pending' }, now)).toBe(
      false
    );
  });

  it('starts the next UTC day at midnight, so due-today tasks stay inside the bound', () => {
    expect(startOfNextUtcDay(now).toISOString()).toBe('2026-09-04T00:00:00.000Z');
    expect(new Date('2026-09-03T23:59:59.000Z').getTime()).toBeLessThan(
      startOfNextUtcDay(now).getTime()
    );
    expect(new Date('2026-09-04T00:00:00.000Z').getTime()).toBe(startOfNextUtcDay(now).getTime());
  });

  it('matches incomplete tasks due exactly N UTC calendar days ahead', () => {
    expect(
      isTaskDueInCalendarDays({ dueDate: '2026-09-05T00:00:00.000Z', status: 'pending' }, 2, now)
    ).toBe(true);
    expect(
      isTaskDueInCalendarDays({ dueDate: '2026-09-04T00:00:00.000Z', status: 'pending' }, 2, now)
    ).toBe(false);
    expect(
      isTaskDueInCalendarDays({ dueDate: '2026-09-05T00:00:00.000Z', status: 'completed' }, 2, now)
    ).toBe(false);
  });
});
