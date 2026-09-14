export const NOTIFICATION_KINDS = {
  taskDueSoon: 'task-due-soon',
  monthlySummary: 'monthly-summary',
  proposalFeedback: 'proposal-feedback',
  staffDigest: 'staff-digest',
} as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[keyof typeof NOTIFICATION_KINDS];
