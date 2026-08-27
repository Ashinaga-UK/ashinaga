export const DOCUMENT_PENDING_PREFIX = 'documents/pending/';
export const DOCUMENT_FILE_MAX_SIZE_BYTES = 10 * 1024 * 1024;
export const DOCUMENT_UPLOAD_URL_EXPIRES_IN_SECONDS = 300;
export const DOCUMENT_DOWNLOAD_URL_EXPIRES_IN_SECONDS = 900;
export const DOCUMENT_DOWNLOAD_DISPOSITIONS = ['attachment', 'inline'] as const;
export type DocumentDownloadDisposition = (typeof DOCUMENT_DOWNLOAD_DISPOSITIONS)[number];

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
] as const;

const DOCUMENT_MIME_BY_EXTENSION: Record<string, (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number]> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

export function resolveDocumentMimeType(
  fileName: string,
  fileType?: string | null
): (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number] | null {
  if (
    fileType &&
    ALLOWED_DOCUMENT_MIME_TYPES.includes(fileType as (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number])
  ) {
    return fileType === 'image/jpg'
      ? 'image/jpeg'
      : (fileType as (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number]);
  }

  const extension = fileName.includes('.')
    ? `.${fileName.split('.').pop()?.toLowerCase() ?? ''}`
    : '';
  return DOCUMENT_MIME_BY_EXTENSION[extension] ?? null;
}

export function sanitizeDocumentFileName(fileName: string): string {
  const sanitized = fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/\.{2,}/g, '.');
  return sanitized.length > 0 ? sanitized.slice(0, 180) : 'document';
}

export function buildContentDispositionHeader(
  fileName: string,
  disposition: DocumentDownloadDisposition = 'attachment'
): string {
  const asciiFallback = sanitizeDocumentFileName(fileName);
  const encoded = encodeURIComponent(fileName.replace(/[\r\n]/g, ''));
  return `${disposition}; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}

export function buildPendingDocumentFileKey(
  scholarId: string,
  uploadId: string,
  fileName: string
): string {
  return `${DOCUMENT_PENDING_PREFIX}${scholarId}/${uploadId}-${sanitizeDocumentFileName(fileName)}`;
}

export function buildPermanentDocumentFileKey(
  scholarId: string,
  typeId: string,
  fileName: string,
  timestamp = Date.now()
): string {
  return `documents/${scholarId}/${typeId}/${timestamp}-${sanitizeDocumentFileName(fileName)}`;
}

export function isPendingDocumentFileKey(fileKey: string, scholarId: string): boolean {
  const prefix = `${DOCUMENT_PENDING_PREFIX}${scholarId}/`;
  if (!fileKey.startsWith(prefix) || fileKey.includes('..')) {
    return false;
  }
  const rest = fileKey.slice(prefix.length);
  return rest.length > 0 && !rest.includes('/');
}

export function slugifyDocumentTypeLabel(label: string): string {
  const slug = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug.length > 0 ? slug.slice(0, 80) : 'type';
}
