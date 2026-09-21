-- Expand legacy YYYY/YY teaching years to canonical YYYY/YYYY when safe.
-- When both spellings already exist for the same scholar/year, keep the better
-- row (submitted over draft, then newest updated_at) and drop the other.

WITH legacy_candidates AS (
  SELECT
    legacy.id AS legacy_id,
    substring(legacy.academic_year from 1 for 4)
      || '/'
      || (substring(legacy.academic_year from 1 for 4)::integer + 1)::text AS canonical_year,
    legacy.scholar_id,
    legacy.status AS legacy_status,
    legacy.updated_at AS legacy_updated_at
  FROM annual_updates AS legacy
  WHERE legacy.academic_year ~ '^\d{4}/\d{2}$'
    AND substring(legacy.academic_year from 6 for 2)::integer
      = (substring(legacy.academic_year from 1 for 4)::integer + 1) % 100
),
collisions AS (
  SELECT
    candidate.legacy_id,
    canonical.id AS canonical_id,
    candidate.legacy_status,
    canonical.status AS canonical_status,
    candidate.legacy_updated_at,
    canonical.updated_at AS canonical_updated_at
  FROM legacy_candidates AS candidate
  INNER JOIN annual_updates AS canonical
    ON canonical.scholar_id = candidate.scholar_id
    AND canonical.academic_year = candidate.canonical_year
    AND canonical.id <> candidate.legacy_id
),
delete_ids AS (
  SELECT
    CASE
      WHEN collision.legacy_status = 'submitted'
        AND collision.canonical_status <> 'submitted'
        THEN collision.canonical_id
      WHEN collision.canonical_status = 'submitted'
        AND collision.legacy_status <> 'submitted'
        THEN collision.legacy_id
      WHEN collision.legacy_updated_at >= collision.canonical_updated_at
        THEN collision.canonical_id
      ELSE collision.legacy_id
    END AS id_to_delete
  FROM collisions AS collision
)
DELETE FROM annual_updates
WHERE id IN (SELECT id_to_delete FROM delete_ids);

UPDATE annual_updates AS legacy
SET academic_year =
  substring(legacy.academic_year from 1 for 4)
  || '/'
  || (substring(legacy.academic_year from 1 for 4)::integer + 1)::text
WHERE legacy.academic_year ~ '^\d{4}/\d{2}$'
  AND substring(legacy.academic_year from 6 for 2)::integer
    = (substring(legacy.academic_year from 1 for 4)::integer + 1) % 100
  AND NOT EXISTS (
    SELECT 1
    FROM annual_updates AS canonical
    WHERE canonical.scholar_id = legacy.scholar_id
      AND canonical.id <> legacy.id
      AND canonical.academic_year =
        substring(legacy.academic_year from 1 for 4)
        || '/'
        || (substring(legacy.academic_year from 1 for 4)::integer + 1)::text
  );
