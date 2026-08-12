import { describe, expect, it } from '@jest/globals';
import { PgDialect } from 'drizzle-orm/pg-core';
import { audienceValuesEqual, matchesAudienceFilters } from './audience-filter';
import { buildResourceAudienceVisibilitySql } from './audience-filter.sql';

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

  it('rejects unknown filter types', () => {
    expect(matchesAudienceFilters([{ type: 'programme', value: 'Medicine' }], scholar)).toBe(false);
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
