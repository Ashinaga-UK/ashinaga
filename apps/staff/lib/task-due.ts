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

export function countTaskProgressFlags(
  tasks: Array<{ dueDate: Date | string; status: string; overdue?: boolean }>,
  now = new Date()
) {
  let overdue = 0;
  let dueToday = 0;
  for (const task of tasks) {
    if (isTaskOverdue(task, now)) {
      overdue += 1;
    } else if (isTaskDueToday(task, now)) {
      dueToday += 1;
    }
  }
  return { overdue, dueToday };
}
