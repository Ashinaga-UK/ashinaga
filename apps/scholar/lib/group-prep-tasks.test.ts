import type { Task } from './api/tasks';
import { groupPrepYearTasks } from './group-prep-tasks';

function task(overrides: Partial<Task> & Pick<Task, 'id' | 'dueDate' | 'status'>): Task {
  return {
    title: overrides.id,
    description: null,
    type: 'other',
    priority: 'medium',
    assignedBy: 'staff',
    assignedByName: 'Staff',
    createdAt: '2026-01-01T00:00:00.000Z',
    completedAt: null,
    requiresResponse: false,
    requiresAttachment: false,
    requiresLink: false,
    ...overrides,
  };
}

describe('groupPrepYearTasks', () => {
  const now = new Date('2026-09-03T12:00:00.000Z');

  it('groups overdue and due today as due now', () => {
    const grouped = groupPrepYearTasks(
      [
        task({ id: 'overdue', dueDate: '2026-09-01T00:00:00.000Z', status: 'pending' }),
        task({ id: 'today', dueDate: '2026-09-03T00:00:00.000Z', status: 'in_progress' }),
        task({ id: 'later', dueDate: '2026-09-10T00:00:00.000Z', status: 'pending' }),
        task({
          id: 'done',
          dueDate: '2026-09-01T00:00:00.000Z',
          status: 'completed',
          completedAt: '2026-09-02T10:00:00.000Z',
        }),
      ],
      now
    );

    expect(grouped.dueNow.map((item) => item.id)).toEqual(['overdue', 'today']);
    expect(grouped.upcoming.map((item) => item.id)).toEqual(['later']);
    expect(grouped.completed.map((item) => item.id)).toEqual(['done']);
  });
});
