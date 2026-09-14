import { PROPOSAL_STEPS } from './proposal-steps';
import {
  currentStepKey,
  isStepAvailable,
  nextStatusAfterReview,
  nextStatusAfterScholarWrite,
  scholarCanWrite,
} from './proposal-workflow';

describe('proposal-workflow', () => {
  it('keeps step 1 available and locks later steps until the previous is approved', () => {
    expect(isStepAvailable('topic', {})).toBe(true);
    expect(isStepAvailable('outline', {})).toBe(false);
    expect(isStepAvailable('outline', { topic: 'submitted' })).toBe(false);
    expect(isStepAvailable('outline', { topic: 'approved' })).toBe(true);
    expect(isStepAvailable('draft', { topic: 'approved' })).toBe(false);
    expect(isStepAvailable('draft', { topic: 'approved', outline: 'approved' })).toBe(true);
  });

  it('treats the first unapproved step as current, and the last step once all are approved', () => {
    expect(currentStepKey({})).toBe('topic');
    expect(currentStepKey({ topic: 'submitted' })).toBe('topic');
    expect(currentStepKey({ topic: 'approved' })).toBe('outline');
    expect(
      currentStepKey({
        topic: 'approved',
        outline: 'approved',
        draft: 'approved',
        final: 'approved',
      })
    ).toBe('final');
  });

  it('lets a scholar draft or submit only on an available unlocked step', () => {
    expect(scholarCanWrite('submit', null, true)).toBe(true);
    expect(scholarCanWrite('draft', 'changes_requested', true)).toBe(true);
    expect(scholarCanWrite('submit', 'submitted', true)).toBe(false);
    expect(scholarCanWrite('submit', 'draft', false)).toBe(false);
    expect(scholarCanWrite('comment', null, true)).toBe(false);
    expect(scholarCanWrite('comment', 'submitted', true)).toBe(true);
    expect(scholarCanWrite('draft', 'approved', true)).toBe(false);
  });

  it('moves draft/submit and review along the lock', () => {
    expect(nextStatusAfterScholarWrite('draft', null, true)).toBe('draft');
    expect(nextStatusAfterScholarWrite('submit', 'draft', true)).toBe('submitted');
    expect(nextStatusAfterReview('request_changes', 'submitted')).toBe('changes_requested');
    expect(nextStatusAfterReview('approve', 'submitted')).toBe('approved');
    expect(() => nextStatusAfterScholarWrite('submit', 'submitted', true)).toThrow(
      'Proposal step is not writable'
    );
    expect(() => nextStatusAfterReview('approve', 'draft')).toThrow(
      'Only a submitted step can be reviewed'
    );
  });

  it('exposes the catalog in order', () => {
    expect(PROPOSAL_STEPS.map((step) => step.key)).toEqual(['topic', 'outline', 'draft', 'final']);
  });
});
