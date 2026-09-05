import { Badge } from './ui/badge';

export function TaskFlagsBadges({ overdue, dueToday }: { overdue: number; dueToday: number }) {
  if (overdue <= 0 && dueToday <= 0) {
    return null;
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {overdue > 0 ? (
        <Badge variant="destructive">Overdue{overdue > 1 ? ` · ${overdue}` : ''}</Badge>
      ) : null}
      {dueToday > 0 ? (
        <Badge variant="outline">Due today{dueToday > 1 ? ` · ${dueToday}` : ''}</Badge>
      ) : null}
    </span>
  );
}
