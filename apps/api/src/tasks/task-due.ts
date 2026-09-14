function startOfUtcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function isTaskOverdue(
  task: { dueDate: Date | string; status: string },
  now = new Date()
): boolean {
  if (task.status === 'completed') return false;
  return startOfUtcDay(new Date(task.dueDate)) < startOfUtcDay(now);
}

export function isTaskDueToday(
  task: { dueDate: Date | string; status: string },
  now = new Date()
): boolean {
  if (task.status === 'completed') return false;
  return startOfUtcDay(new Date(task.dueDate)) === startOfUtcDay(now);
}

/** Date-only dues: N UTC calendar days before the due date (48h => 2). */
export function isTaskDueInCalendarDays(
  task: { dueDate: Date | string; status: string },
  days: number,
  now = new Date()
): boolean {
  if (task.status === 'completed') return false;
  return startOfUtcDay(new Date(task.dueDate)) === startOfUtcDay(now) + days * 24 * 60 * 60 * 1000;
}
