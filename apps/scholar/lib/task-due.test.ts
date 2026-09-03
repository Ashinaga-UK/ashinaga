import { isTaskDueToday, isTaskOverdue } from './task-due';

const now = new Date('2026-09-03T15:00:00.000Z');

describe('isTaskOverdue', () => {
  it('returns false for completed tasks even when overdue is still true', () => {
    expect(
      isTaskOverdue(
        {
          dueDate: '2026-09-01T00:00:00.000Z',
          status: 'completed',
          overdue: true,
        },
        now
      )
    ).toBe(false);
  });

  it('trusts overdue when the task is not completed', () => {
    expect(
      isTaskOverdue(
        {
          dueDate: '2026-09-10T00:00:00.000Z',
          status: 'pending',
          overdue: true,
        },
        now
      )
    ).toBe(true);
    expect(
      isTaskOverdue(
        {
          dueDate: '2026-09-01T00:00:00.000Z',
          status: 'pending',
          overdue: false,
        },
        now
      )
    ).toBe(false);
  });

  it('falls back to due-date comparison when overdue is absent', () => {
    expect(
      isTaskOverdue({ dueDate: '2026-09-02T00:00:00.000Z', status: 'pending' }, now)
    ).toBe(true);
    expect(
      isTaskOverdue({ dueDate: '2026-09-03T00:00:00.000Z', status: 'pending' }, now)
    ).toBe(false);
  });
});

describe('isTaskDueToday', () => {
  it('returns false for completed tasks', () => {
    expect(
      isTaskDueToday({ dueDate: '2026-09-03T00:00:00.000Z', status: 'completed' }, now)
    ).toBe(false);
  });
});
