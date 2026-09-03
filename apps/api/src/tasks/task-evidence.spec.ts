import {
  evidenceDefaultsForType,
  normalizePhase,
  resolveEvidenceFlags,
  taskRequiresEvidence,
} from './task-evidence';

describe('task-evidence', () => {
  it('defaults document_upload to attachment only', () => {
    expect(evidenceDefaultsForType('document_upload')).toEqual({
      requiresResponse: false,
      requiresAttachment: true,
      requiresLink: false,
    });
  });

  it('defaults form-style types to a written response', () => {
    expect(evidenceDefaultsForType('form_completion').requiresResponse).toBe(true);
    expect(evidenceDefaultsForType('feedback_submission').requiresResponse).toBe(true);
    expect(evidenceDefaultsForType('goal_update').requiresResponse).toBe(true);
  });

  it('defaults other and meeting types to complete-only', () => {
    expect(taskRequiresEvidence(evidenceDefaultsForType('other'))).toBe(false);
    expect(taskRequiresEvidence(evidenceDefaultsForType('meeting_attendance'))).toBe(false);
  });

  it('lets explicit flags override type defaults', () => {
    expect(
      resolveEvidenceFlags('document_upload', {
        requiresResponse: true,
        requiresAttachment: false,
        requiresLink: true,
      })
    ).toEqual({
      requiresResponse: true,
      requiresAttachment: false,
      requiresLink: true,
    });
  });

  it('normalizes phase with trim, collapsed whitespace, and lowercase', () => {
    expect(normalizePhase('  English  ')).toBe('english');
    expect(normalizePhase('Orientation   Week')).toBe('orientation week');
    expect(normalizePhase('   ')).toBeNull();
  });
});
