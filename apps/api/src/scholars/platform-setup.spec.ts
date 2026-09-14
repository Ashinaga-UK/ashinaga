import {
  buildPlatformSetupIncompleteMap,
  platformSetupFilterSql,
  sqlFragmentText,
} from './platform-setup';

describe('platformSetupFilterSql', () => {
  it('uses EXISTS for incomplete and requires prep_year', () => {
    const text = sqlFragmentText(platformSetupFilterSql(true));
    expect(text).toContain("= 'prep_year'");
    expect(text).toMatch(/AND\s+EXISTS\s*\(/);
    expect(text).toContain("s.status = 'yes'");
  });

  it('uses NOT EXISTS for complete and requires prep_year', () => {
    const text = sqlFragmentText(platformSetupFilterSql(false));
    expect(text).toContain("= 'prep_year'");
    expect(text).toMatch(/AND\s+NOT EXISTS\s*\(/);
    expect(text).toContain("s.status = 'yes'");
  });

  it('differs between incomplete and complete only on the outer EXISTS', () => {
    const incomplete = sqlFragmentText(platformSetupFilterSql(true));
    const complete = sqlFragmentText(platformSetupFilterSql(false));
    expect(incomplete).toMatch(/AND\s+EXISTS\s*\(/);
    expect(complete).toMatch(/AND\s+NOT EXISTS\s*\(/);
    expect(incomplete.replace(/AND\s+EXISTS/, 'AND X')).toBe(
      complete.replace(/AND\s+NOT EXISTS/, 'AND X')
    );
  });
});

describe('buildPlatformSetupIncompleteMap', () => {
  const ids = ['a', 'b', 'c'];

  it('treats missing / zero yes counts as incomplete when platforms exist', () => {
    const map = buildPlatformSetupIncompleteMap(ids, 4, new Map([['b', 2]]));
    expect(map).toEqual({ a: true, b: true, c: true });
  });

  it('marks complete only when yes count equals active platform count', () => {
    const map = buildPlatformSetupIncompleteMap(
      ids,
      4,
      new Map([
        ['a', 4],
        ['b', 3],
        ['c', 0],
      ])
    );
    expect(map).toEqual({ a: false, b: true, c: true });
  });

  it('returns not-incomplete for everyone when there are zero active platforms', () => {
    expect(buildPlatformSetupIncompleteMap(ids, 0, new Map())).toEqual({
      a: false,
      b: false,
      c: false,
    });
  });
});
