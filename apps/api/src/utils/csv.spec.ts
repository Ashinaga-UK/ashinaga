import { escapeCsvValue } from './csv';

describe('escapeCsvValue', () => {
  it.each(['=SUM(A1:A2)', '+SUM(A1:A2)', '-SUM(A1:A2)', '@SUM(A1:A2)'])(
    'neutralizes formula-like CSV values: %s',
    (value) => {
      expect(escapeCsvValue(value)).toBe(`"'${value}"`);
    }
  );

  it('escapes quotes in CSV values', () => {
    expect(escapeCsvValue('He said "hello"')).toBe('"He said ""hello"""');
  });

  it('returns an empty string for null and undefined', () => {
    expect(escapeCsvValue(null)).toBe('');
    expect(escapeCsvValue(undefined)).toBe('');
  });

  it('quotes ordinary values without a formula prefix', () => {
    expect(escapeCsvValue('draft')).toBe('"draft"');
    expect(escapeCsvValue(3)).toBe('"3"');
  });
});
