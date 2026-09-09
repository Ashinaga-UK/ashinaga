import { sql } from 'drizzle-orm';
import { inactivityDays } from '../notifications/notification-config';

export function loginActivityFilterSql(_filter: 'stale', days = inactivityDays()) {
  return sql`(
    scholars.last_activity IS NOT NULL
    AND scholars.last_activity < (CURRENT_TIMESTAMP - (${days}::int * INTERVAL '1 day'))
  )`;
}
