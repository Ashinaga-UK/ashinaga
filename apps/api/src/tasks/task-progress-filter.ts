import { sql } from 'drizzle-orm';
import { scholars } from '../db/schema';

export type TaskProgressFilter = 'overdue' | 'due_today' | 'behind';

/**
 * List filter for ASH-84 flags. Uses the same UTC calendar day as isTaskOverdue /
 * isTaskDueToday. Does not silently AND programStage.
 */
export function taskProgressFilterSql(filter: TaskProgressFilter) {
  const dueCompare =
    filter === 'overdue'
      ? sql`(t.due_date AT TIME ZONE 'UTC')::date < (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date`
      : filter === 'due_today'
        ? sql`(t.due_date AT TIME ZONE 'UTC')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date`
        : sql`(t.due_date AT TIME ZONE 'UTC')::date <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date`;

  return sql`EXISTS (
    SELECT 1
    FROM tasks t
    WHERE t.scholar_id = ${scholars.id}
      AND t.deleted_at IS NULL
      AND t.status <> 'completed'
      AND ${dueCompare}
  )`;
}
