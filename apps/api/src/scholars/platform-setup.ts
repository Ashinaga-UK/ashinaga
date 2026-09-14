import { sql } from 'drizzle-orm';
import { scholars } from '../db/schema';

/** Outer EXISTS vs NOT EXISTS for Prep Year platform setup list filters. */
export function platformSetupFilterSql(incomplete: boolean) {
  const existsKeyword = incomplete ? sql`EXISTS` : sql`NOT EXISTS`;
  return sql`(
      ${scholars.programStage} = 'prep_year'
      AND ${existsKeyword} (
        SELECT 1
        FROM platforms p
        WHERE p.is_active = true
          AND NOT EXISTS (
            SELECT 1
            FROM scholar_platform_setups s
            WHERE s.scholar_id = ${scholars.id}
              AND s.platform_id = p.id
              AND s.status = 'yes'
          )
      )
    )`;
}

/**
 * Incomplete = fewer "yes" rows than active platforms.
 * Missing join rows count as incomplete (yes count 0).
 * Zero active platforms => not incomplete for everyone.
 */
export function buildPlatformSetupIncompleteMap(
  scholarIds: string[],
  totalActivePlatforms: number,
  yesCountByScholar: Map<string, number>
): Record<string, boolean> {
  if (scholarIds.length === 0) return {};
  if (totalActivePlatforms === 0) {
    return Object.fromEntries(scholarIds.map((id) => [id, false]));
  }

  const result: Record<string, boolean> = {};
  for (const id of scholarIds) {
    result[id] = (yesCountByScholar.get(id) ?? 0) < totalActivePlatforms;
  }
  return result;
}

/** Flatten a drizzle SQL fragment to a string for unit assertions. */
export function sqlFragmentText(fragment: { queryChunks: unknown[] }): string {
  return fragment.queryChunks
    .map((chunk) => {
      if (typeof chunk === 'string') return chunk;
      if (chunk && typeof chunk === 'object' && 'queryChunks' in chunk) {
        return sqlFragmentText(chunk as { queryChunks: unknown[] });
      }
      if (chunk && typeof chunk === 'object' && 'value' in chunk) {
        return String((chunk as { value: unknown }).value);
      }
      return '?';
    })
    .join('');
}
