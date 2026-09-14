export const PROPOSAL_PENDING_PREFIX = 'proposals/pending/';
export const PROPOSAL_FILE_MAX_SIZE_BYTES = 10 * 1024 * 1024;
export const PROPOSAL_UPLOAD_URL_EXPIRES_IN_SECONDS = 300;
export const PROPOSAL_DOWNLOAD_URL_EXPIRES_IN_SECONDS = 900;
export const PROPOSAL_DOWNLOAD_DISPOSITIONS = ['attachment', 'inline'] as const;
export type ProposalDownloadDisposition = (typeof PROPOSAL_DOWNLOAD_DISPOSITIONS)[number];

export const ALLOWED_PROPOSAL_MIME_TYPES = [
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
  fileType?: string | null
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

export function sanitizeProposalFileName(fileName: string): string {
  const sanitized = fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/\.{2,}/g, '.');
  return sanitized.length > 0 ? sanitized.slice(0, 180) : 'proposal';
}

export function buildContentDispositionHeader(
  fileName: string,
  disposition: ProposalDownloadDisposition = 'attachment'
): string {
  const asciiFallback = sanitizeProposalFileName(fileName);
  const encoded = encodeURIComponent(fileName.replace(/[\r\n]/g, ''));
  return `${disposition}; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}

export function buildPendingProposalFileKey(
  scholarId: string,
  uploadId: string,
  fileName: string
): string {
  return `${PROPOSAL_PENDING_PREFIX}${scholarId}/${uploadId}-${sanitizeProposalFileName(fileName)}`;
}

export function buildPermanentProposalFileKey(
  scholarId: string,
  stepKey: string,
  fileName: string,
  timestamp = Date.now()
): string {
  return `proposals/${scholarId}/${stepKey}/${timestamp}-${sanitizeProposalFileName(fileName)}`;
}

export function isPendingProposalFileKey(fileKey: string, scholarId: string): boolean {
  const prefix = `${PROPOSAL_PENDING_PREFIX}${scholarId}/`;
  if (!fileKey.startsWith(prefix) || fileKey.includes('..')) {
    return false;
  }
  const rest = fileKey.slice(prefix.length);
  return rest.length > 0 && !rest.includes('/');
}
