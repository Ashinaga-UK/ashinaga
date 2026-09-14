import type { Task } from './api/tasks';
import { isTaskDueToday, isTaskOverdue } from './task-due';

function sortByDueDate(a: Task, b: Task): number {
  return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
}

export function groupPrepYearTasks(
  tasks: Task[],
  now = new Date()
): { dueNow: Task[]; upcoming: Task[]; completed: Task[] } {
  const dueNow: Task[] = [];
  const upcoming: Task[] = [];
  const completed: Task[] = [];

  for (const task of tasks) {
    if (task.status === 'completed') {
      completed.push(task);
      continue;
    }
    if (isTaskOverdue(task, now) || isTaskDueToday(task, now)) {
      dueNow.push(task);
    } else {
      upcoming.push(task);
    }
  }

  dueNow.sort(sortByDueDate);
  upcoming.sort(sortByDueDate);
  completed.sort(sortByDueDate);
  return { dueNow, upcoming, completed };
}
