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
  stageLabel: string | null;
  fileName: string | null;
  comments: ProposalComment[];
  resources: ProposalResource[];
  submittedAt: string | null;
  reviewedAt: string | null;
}

export interface ProposalFileUpload {
  pendingFileKey: string;
  fileName: string;
  fileMimeType: string;
  fileSizeBytes: number;
}

export interface ProposalTimeline {
  catalog: Array<{ key: string; title: string; sortOrder: number }>;
  currentStepKey: string;
  steps: ProposalStepView[];
}

export async function getMyProposal(): Promise<ProposalTimeline> {
  return fetchAPI<ProposalTimeline>('/api/proposals/me');
}

export async function saveProposalDraft(
  stepKey: string,
  body: string,
  stageLabel?: string
): Promise<ProposalTimeline> {
  return fetchAPI<ProposalTimeline>(`/api/proposals/me/steps/${stepKey}/draft`, {
    method: 'POST',
    body: JSON.stringify({ body, stageLabel: stageLabel || undefined }),
  });
}

export async function submitProposalStep(
  stepKey: string,
  body: string,
  stageLabel?: string,
  note?: string,
  file?: ProposalFileUpload
): Promise<ProposalTimeline> {
  return fetchAPI<ProposalTimeline>(`/api/proposals/me/steps/${stepKey}/submit`, {
    method: 'POST',
    body: JSON.stringify({
      body,
      stageLabel: stageLabel || undefined,
      note: note?.trim() || undefined,
      ...file,
    }),
  });
}

export async function createProposalUploadUrl(data: {
  fileName: string;
  fileType: string;
  fileSize: number;
}): Promise<{ uploadUrl: string; fields: Record<string, string>; fileKey: string }> {
  return fetchAPI<{ uploadUrl: string; fields: Record<string, string>; fileKey: string }>(
    '/api/proposals/me/upload-url',
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  );
}

export async function getProposalFileDownloadUrl(
  stepKey: string,
  disposition: 'attachment' | 'inline' = 'attachment'
): Promise<{ downloadUrl: string }> {
  const query = disposition === 'inline' ? '?disposition=inline' : '';
  return fetchAPI<{ downloadUrl: string }>(`/api/proposals/me/steps/${stepKey}/file${query}`);
}

const ALLOWED_PROPOSAL_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

const MIME_BY_EXTENSION: Record<string, (typeof ALLOWED_PROPOSAL_MIME_TYPES)[number]> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

export function resolveProposalMimeType(
  fileName: string,
  fileType?: string
): (typeof ALLOWED_PROPOSAL_MIME_TYPES)[number] | null {
  if (
    fileType &&
    ALLOWED_PROPOSAL_MIME_TYPES.includes(fileType as (typeof ALLOWED_PROPOSAL_MIME_TYPES)[number])
  ) {
    return fileType as (typeof ALLOWED_PROPOSAL_MIME_TYPES)[number];
  }
  const extension = fileName.includes('.')
    ? `.${fileName.split('.').pop()?.toLowerCase() ?? ''}`
    : '';
  return MIME_BY_EXTENSION[extension] ?? null;
}

export async function uploadProposalCompletedFile(file: File): Promise<ProposalFileUpload> {
  const fileType = resolveProposalMimeType(file.name, file.type);
  if (!fileType) {
    throw new Error('Upload a PDF or Word document.');
  }
  if (file.size < 1 || file.size > 10 * 1024 * 1024) {
    throw new Error('Upload a file smaller than 10MB.');
  }
  const { uploadUrl, fields, fileKey } = await createProposalUploadUrl({
    fileName: file.name,
    fileType,
    fileSize: file.size,
  });
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  formData.append('file', file);
  const uploaded = await fetch(uploadUrl, { method: 'POST', body: formData });
  if (!uploaded.ok) {
    throw new Error('Could not upload the completed file. Please try again.');
  }
  return {
    pendingFileKey: fileKey,
    fileName: file.name,
    fileMimeType: fileType,
    fileSizeBytes: file.size,
  };
}

export async function addProposalComment(stepKey: string, body: string): Promise<ProposalComment> {
  return fetchAPI<ProposalComment>(`/api/proposals/me/steps/${stepKey}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}
