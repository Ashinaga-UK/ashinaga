import { PROPOSAL_STEPS, type ProposalStepKey } from './proposal-steps';

export const PROPOSAL_STATUSES = ['draft', 'submitted', 'changes_requested', 'approved'] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export type ScholarWriteAction = 'draft' | 'submit' | 'comment';
export type StaffReviewAction = 'approve' | 'request_changes';

export type StatusByStep = Partial<Record<ProposalStepKey, ProposalStatus>>;

export function previousStepKey(stepKey: ProposalStepKey): ProposalStepKey | null {
  const index = PROPOSAL_STEPS.findIndex((step) => step.key === stepKey);
  return index <= 0 ? null : PROPOSAL_STEPS[index - 1].key;
}

export function isStepAvailable(stepKey: ProposalStepKey, statusByStep: StatusByStep): boolean {
  const previous = previousStepKey(stepKey);
  return previous == null || statusByStep[previous] === 'approved';
}

export function currentStepKey(statusByStep: StatusByStep): ProposalStepKey {
  for (const step of PROPOSAL_STEPS) {
    if (statusByStep[step.key] !== 'approved') {
      return step.key;
    }
  }
  return PROPOSAL_STEPS[PROPOSAL_STEPS.length - 1].key;
}

export function scholarCanWrite(
  action: ScholarWriteAction,
  status: ProposalStatus | null,
  available: boolean
): boolean {
  if (!available || status === 'approved') {
    return false;
  }
  if (action === 'comment') {
    return status != null;
  }
  return status == null || status === 'draft' || status === 'changes_requested';
}

export function nextStatusAfterScholarWrite(
  action: 'draft' | 'submit',
  status: ProposalStatus | null,
  available: boolean
): ProposalStatus {
  if (!scholarCanWrite(action, status, available)) {
    throw new Error('Proposal step is not writable');
  }
  return action === 'draft' ? 'draft' : 'submitted';
}

export function nextStatusAfterReview(
  action: StaffReviewAction,
  status: ProposalStatus
): ProposalStatus {
  if (status !== 'submitted') {
    throw new Error('Only a submitted step can be reviewed');
  }
  return action === 'approve' ? 'approved' : 'changes_requested';
}
