import { type SQL, type SQLWrapper, sql } from 'drizzle-orm';
import { resourceFilters, resources } from '../../db/schema';
import type { ScholarAudience } from './audience-filter';

export function normalizedSqlEquals(column: SQLWrapper, value: string | null | undefined): SQL {
  return sql`LOWER(TRIM(${column})) = LOWER(TRIM(${value}))`;
}

export function buildResourceAudienceVisibilitySql(scholar: ScholarAudience): SQL {
  return sql`NOT EXISTS (
    SELECT 1
    FROM (
      SELECT
        BOOL_OR(
          COALESCE(
            CASE ${resourceFilters.filterType}
              WHEN 'program' THEN LOWER(TRIM(${resourceFilters.filterValue})) = LOWER(TRIM(${scholar.program}))
              WHEN 'year' THEN LOWER(TRIM(${resourceFilters.filterValue})) = LOWER(TRIM(${scholar.year}))
              WHEN 'university' THEN LOWER(TRIM(${resourceFilters.filterValue})) = LOWER(TRIM(${scholar.university}))
              WHEN 'location' THEN LOWER(TRIM(${resourceFilters.filterValue})) = LOWER(TRIM(${scholar.location}))
              WHEN 'status' THEN LOWER(TRIM(${resourceFilters.filterValue})) = LOWER(TRIM(${scholar.status}))
              ELSE FALSE
            END,
            FALSE
          )
        ) AS group_matches
      FROM ${resourceFilters}
      WHERE ${resourceFilters.resourceId} = ${resources.id}
      GROUP BY ${resourceFilters.filterType}
    ) AS audience_groups
    WHERE NOT audience_groups.group_matches
  )`;
}
