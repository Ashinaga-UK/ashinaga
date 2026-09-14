import { normalizeStageLabel } from './proposal-stage-label';

describe('normalizeStageLabel', () => {
  it('accepts numbered steps and lettered sub-steps', () => {
    expect(normalizeStageLabel('1')).toBe('1');
    expect(normalizeStageLabel(' 1A ')).toBe('1a');
    expect(normalizeStageLabel('1b')).toBe('1b');
    expect(normalizeStageLabel('12c')).toBe('12c');
  });

  it('treats blank as unset', () => {
    expect(normalizeStageLabel('')).toBeNull();
    expect(normalizeStageLabel('   ')).toBeNull();
    expect(normalizeStageLabel(undefined)).toBeNull();
  });

  it('rejects labels that are not a number plus optional letter', () => {
    expect(() => normalizeStageLabel('topic')).toThrow('Use a step like 1, 1a, or 1b');
    expect(() => normalizeStageLabel('1ab')).toThrow('Use a step like 1, 1a, or 1b');
  });
});
