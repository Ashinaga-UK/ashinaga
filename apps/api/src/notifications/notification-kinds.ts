export const NOTIFICATION_KINDS = {
  taskDueSoon: 'task-due-soon',
  monthlySummary: 'monthly-summary',
  proposalFeedback: 'proposal-feedback',
  staffDigest: 'staff-digest',
} as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[keyof typeof NOTIFICATION_KINDS];

export const STAFF_FEED_KINDS = {
  requestReceived: 'request_received',
  requestStatusChanged: 'request_status_changed',
  taskCompleted: 'task_completed',
  annualReviewSubmitted: 'annual_review_submitted',
} as const;

export type StaffFeedKind = (typeof STAFF_FEED_KINDS)[keyof typeof STAFF_FEED_KINDS];
