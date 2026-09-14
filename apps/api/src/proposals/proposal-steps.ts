export const PROPOSAL_STEPS = [
  { key: 'topic', title: 'Topic and research question', sortOrder: 1 },
  { key: 'outline', title: 'Outline', sortOrder: 2 },
  { key: 'draft', title: 'Full draft', sortOrder: 3 },
  { key: 'final', title: 'Final proposal', sortOrder: 4 },
] as const;

export type ProposalStepKey = (typeof PROPOSAL_STEPS)[number]['key'];

export const PROPOSAL_STEP_KEYS = PROPOSAL_STEPS.map((step) => step.key);

export function isProposalStepKey(value: string): value is ProposalStepKey {
  return PROPOSAL_STEP_KEYS.includes(value as ProposalStepKey);
}

export function requireProposalStepKey(value: string): ProposalStepKey {
  if (!isProposalStepKey(value)) {
    throw new Error(`Unknown proposal step: ${value}`);
  }
  return value;
}
