-- Expand legacy YYYY/YY teaching years to canonical YYYY/YYYY when safe.
-- Skip rows that would collide with an existing canonical spelling for the same scholar.
UPDATE "annual_updates" AS legacy
SET "academic_year" =
  substring(legacy."academic_year" from 1 for 4)
  || '/'
  || (substring(legacy."academic_year" from 1 for 4)::integer + 1)::text
WHERE legacy."academic_year" ~ '^\d{4}/\d{2}$'
  AND substring(legacy."academic_year" from 6 for 2)::integer
    = (substring(legacy."academic_year" from 1 for 4)::integer + 1) % 100
  AND NOT EXISTS (
    SELECT 1
    FROM "annual_updates" AS canonical
    WHERE canonical."scholar_id" = legacy."scholar_id"
      AND canonical."id" <> legacy."id"
      AND canonical."academic_year" =
        substring(legacy."academic_year" from 1 for 4)
        || '/'
        || (substring(legacy."academic_year" from 1 for 4)::integer + 1)::text
  );
