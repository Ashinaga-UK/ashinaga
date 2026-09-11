import { sql } from 'drizzle-orm';
import { inactivityDays } from '../notifications/notification-config';

/** Known last_activity older than N days. Null is unknown (not “never logged in”). */
export function loginActivityFilterSql(_filter: 'stale', days = inactivityDays()) {
  return sql`(
    scholars.last_activity IS NOT NULL
    AND scholars.last_activity < (CURRENT_TIMESTAMP - (${days}::int * INTERVAL '1 day'))
  )`;
}
