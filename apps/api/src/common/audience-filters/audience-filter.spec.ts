import { describe, expect, it } from '@jest/globals';
import { sql } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { scholars } from '../../db/schema';
import { audienceValuesEqual, matchesAudienceFilters } from './audience-filter';
import { buildResourceAudienceVisibilitySql, matchAnyNormalizedValue } from './audience-filter.sql';

const scholar = {
  program: ' Medicine ',
  year: 'Year 1',
  university: 'Makerere University',
  location: 'Uganda',
  status: 'active',
};

describe('audience filters', () => {
  it('matches an empty audience', () => {
    expect(matchesAudienceFilters([], scholar)).toBe(true);
  });

  it('matches any value within one filter type', () => {
    expect(
      matchesAudienceFilters(
        [
          { type: 'program', value: 'Nursing' },
          { type: 'program', value: 'medicine' },
        ],
        scholar
      )
    ).toBe(true);
  });

  it('requires every filter type group to match', () => {
    expect(
      matchesAudienceFilters(
        [
          { type: 'program', value: 'Medicine' },
          { type: 'year', value: 'Year 2' },
        ],
        scholar
      )
    ).toBe(false);
  });

  it('matches case-insensitively after trimming both values', () => {
    expect(audienceValuesEqual(' Medicine', 'medicine ')).toBe(true);
    expect(
      matchesAudienceFilters([{ type: 'university', value: ' makerere university ' }], scholar)
    ).toBe(true);
  });

  it('casts enum audience columns to text before normalization', () => {
    const query = new PgDialect().sqlToQuery(normalizedSqlEquals(scholars.status, 'active'));

    expect(query.sql.toLowerCase()).toContain('lower(trim("scholars"."status"::text))');
  });

  it('rejects unknown filter types', () => {
    expect(matchesAudienceFilters([{ type: 'programme', value: 'Medicine' }], scholar)).toBe(false);
  });

  it('uses a single equality when a filter type has one value', () => {
    const query = new PgDialect().sqlToQuery(
      matchAnyNormalizedValue(sql.raw('program'), ['Medicine'])
    );
    const generated = query.sql.toLowerCase();

    expect(generated).toContain('lower(trim(');
    expect(generated).not.toContain(' or ');
  });

  it('ors equalities when a filter type has multiple values', () => {
    const query = new PgDialect().sqlToQuery(
      matchAnyNormalizedValue(sql.raw('program'), ['Medicine', 'Nursing'])
    );

    expect(query.sql.toLowerCase()).toContain(' or ');
  });

  it('builds a correlated, normalized resource visibility predicate', () => {
    const query = new PgDialect().sqlToQuery(buildResourceAudienceVisibilitySql(scholar));
    const sql = query.sql.toLowerCase();

    expect(sql).toContain('not exists');
    expect(sql).toContain('lower(trim(');
    expect(sql).toContain('"resource_filters"."resource_id" = "resources"."id"');
    expect(sql).toContain('group by "resource_filters"."filter_type"');
    expect(sql).toContain('bool_or(');
  });
});
