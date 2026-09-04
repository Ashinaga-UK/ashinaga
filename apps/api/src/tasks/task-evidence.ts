export const TASK_TYPES = [
  'document_upload',
  'form_completion',
  'meeting_attendance',
  'goal_update',
  'feedback_submission',
  'other',
] as const;

export type TaskType = (typeof TASK_TYPES)[number];

export type TaskEvidenceFlags = {
  requiresResponse: boolean;
  requiresAttachment: boolean;
  requiresLink: boolean;
};

export function evidenceDefaultsForType(type: TaskType): TaskEvidenceFlags {
  switch (type) {
    case 'document_upload':
      return { requiresResponse: false, requiresAttachment: true, requiresLink: false };
    case 'feedback_submission':
    case 'form_completion':
    case 'goal_update':
      return { requiresResponse: true, requiresAttachment: false, requiresLink: false };
    default:
      return { requiresResponse: false, requiresAttachment: false, requiresLink: false };
  }
}

export function resolveEvidenceFlags(
  type: TaskType,
  overrides: Partial<TaskEvidenceFlags> = {}
): TaskEvidenceFlags {
  const defaults = evidenceDefaultsForType(type);
  return {
    requiresResponse: overrides.requiresResponse ?? defaults.requiresResponse,
    requiresAttachment: overrides.requiresAttachment ?? defaults.requiresAttachment,
    requiresLink: overrides.requiresLink ?? defaults.requiresLink,
  };
}

export function taskRequiresEvidence(flags: TaskEvidenceFlags): boolean {
  return flags.requiresResponse || flags.requiresAttachment || flags.requiresLink;
}

export function normalizePhase(phase?: string | null): string | null {
  const trimmed = phase?.trim().replace(/\s+/g, ' ');
  if (!trimmed) return null;
  return trimmed.toLocaleLowerCase('en-GB');
}
