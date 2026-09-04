import { isTaskDueToday, isTaskOverdue } from './task-due';

describe('task-due', () => {
  const now = new Date('2026-09-03T12:00:00.000Z');

  it('treats incomplete tasks due before today UTC as overdue', () => {
    expect(
      isTaskOverdue({ dueDate: '2026-09-02T00:00:00.000Z', status: 'pending' }, now)
    ).toBe(true);
    expect(
      isTaskOverdue({ dueDate: '2026-09-03T00:00:00.000Z', status: 'pending' }, now)
    ).toBe(false);
    expect(
      isTaskOverdue({ dueDate: '2026-09-01T00:00:00.000Z', status: 'completed' }, now)
    ).toBe(false);
  });

  it('treats the UTC calendar due date as due today', () => {
    expect(
      isTaskDueToday({ dueDate: '2026-09-03T00:00:00.000Z', status: 'pending' }, now)
    ).toBe(true);
    expect(
      isTaskDueToday({ dueDate: '2026-09-04T00:00:00.000Z', status: 'pending' }, now)
    ).toBe(false);
  });
});
