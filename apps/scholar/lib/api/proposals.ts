import { fetchAPI } from '../api-client';

export type ProposalStatus = 'draft' | 'submitted' | 'changes_requested' | 'approved';

export interface ProposalComment {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
}

export interface ProposalResource {
  id: string;
  title: string;
  description: string;
  sourceType: 'url' | 'file';
  url: string | null;
}

export interface ProposalStepView {
  key: string;
  title: string;
  sortOrder: number;
  available: boolean;
  status: ProposalStatus | null;
  body: string | null;
  comments: ProposalComment[];
  resources: ProposalResource[];
  submittedAt: string | null;
  reviewedAt: string | null;
}

export interface ProposalTimeline {
  catalog: Array<{ key: string; title: string; sortOrder: number }>;
  currentStepKey: string;
  steps: ProposalStepView[];
}

export async function getMyProposal(): Promise<ProposalTimeline> {
  return fetchAPI<ProposalTimeline>('/api/proposals/me');
}

export async function saveProposalDraft(stepKey: string, body: string): Promise<ProposalTimeline> {
  return fetchAPI<ProposalTimeline>(`/api/proposals/me/steps/${stepKey}/draft`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}

export async function submitProposalStep(stepKey: string, body: string): Promise<ProposalTimeline> {
  return fetchAPI<ProposalTimeline>(`/api/proposals/me/steps/${stepKey}/submit`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}

export async function addProposalComment(stepKey: string, body: string): Promise<ProposalComment> {
  return fetchAPI<ProposalComment>(`/api/proposals/me/steps/${stepKey}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}
