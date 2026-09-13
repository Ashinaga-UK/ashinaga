import { countTaskProgressFlags, isTaskDueToday, isTaskOverdue } from './task-due';

describe('staff task-due', () => {
  const now = new Date('2026-09-03T12:00:00.000Z');

  it('checks completed before trusting an overdue payload flag', () => {
    expect(
      isTaskOverdue(
        { dueDate: '2026-09-01T00:00:00.000Z', status: 'completed', overdue: true },
        now
      )
    ).toBe(false);
  });

  it('counts overdue and due-today from the shared helpers', () => {
    expect(
      countTaskProgressFlags(
        [
          { dueDate: '2026-09-01T00:00:00.000Z', status: 'pending' },
          { dueDate: '2026-09-03T00:00:00.000Z', status: 'in_progress' },
          { dueDate: '2026-09-01T00:00:00.000Z', status: 'completed' },
          { dueDate: '2026-09-04T00:00:00.000Z', status: 'pending' },
        ],
        now
      )
    ).toEqual({ overdue: 1, dueToday: 1 });
  });

  it('treats due today as not overdue', () => {
    expect(isTaskDueToday({ dueDate: '2026-09-03T00:00:00.000Z', status: 'pending' }, now)).toBe(
      true
    );
    expect(isTaskOverdue({ dueDate: '2026-09-03T00:00:00.000Z', status: 'pending' }, now)).toBe(
      false
    );
  });
});
