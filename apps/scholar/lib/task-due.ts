function startOfUtcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function isTaskOverdue(
  task: { dueDate: Date | string; status: string; overdue?: boolean },
  now = new Date()
): boolean {
  if (task.status === 'completed') return false;
  if (typeof task.overdue === 'boolean') return task.overdue;
  return startOfUtcDay(new Date(task.dueDate)) < startOfUtcDay(now);
}

export function isTaskDueToday(
  task: { dueDate: Date | string; status: string },
  now = new Date()
): boolean {
  if (task.status === 'completed') return false;
  return startOfUtcDay(new Date(task.dueDate)) === startOfUtcDay(now);
}
