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

export function resolveTaskEvidence(task: {
  type: TaskType;
  requiresResponse?: boolean;
  requiresAttachment?: boolean;
  requiresLink?: boolean;
}): TaskEvidenceFlags {
  const defaults = evidenceDefaultsForType(task.type);
  return {
    requiresResponse: task.requiresResponse ?? defaults.requiresResponse,
    requiresAttachment: task.requiresAttachment ?? defaults.requiresAttachment,
    requiresLink: task.requiresLink ?? defaults.requiresLink,
  };
}
