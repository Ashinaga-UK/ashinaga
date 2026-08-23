export const RESOURCE_PENDING_PREFIX = 'resources/pending/';
export const RESOURCE_ARCHIVED_PREFIX = 'resources/archived/';
export const RESOURCE_FILE_MAX_SIZE_BYTES = 10 * 1024 * 1024;
export const RESOURCE_UPLOAD_URL_EXPIRES_IN_SECONDS = 300;
export const RESOURCE_DOWNLOAD_URL_EXPIRES_IN_SECONDS = 900;
export const RESOURCE_ARCHIVED_OBJECT_RETENTION_DAYS = 30;

export const ALLOWED_RESOURCE_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
] as const;

const RESOURCE_MIME_BY_EXTENSION: Record<string, (typeof ALLOWED_RESOURCE_MIME_TYPES)[number]> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

/** Prefer browser MIME; fall back to extension when the OS leaves file.type empty. */
export function resolveResourceMimeType(
  fileName: string,
  fileType?: string | null
): (typeof ALLOWED_RESOURCE_MIME_TYPES)[number] | null {
  if (
    fileType &&
    ALLOWED_RESOURCE_MIME_TYPES.includes(fileType as (typeof ALLOWED_RESOURCE_MIME_TYPES)[number])
  ) {
    return fileType as (typeof ALLOWED_RESOURCE_MIME_TYPES)[number];
  }

  const extension = fileName.includes('.')
    ? `.${fileName.split('.').pop()?.toLowerCase() ?? ''}`
    : '';
  return RESOURCE_MIME_BY_EXTENSION[extension] ?? null;
}

export function sanitizeResourceFileName(fileName: string): string {
  const sanitized = fileName.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/_+/g, '_');
  return sanitized.length > 0 ? sanitized.slice(0, 180) : 'document';
}

export function buildPendingResourceFileKey(uploadId: string, fileName: string): string {
  return `${RESOURCE_PENDING_PREFIX}${uploadId}-${sanitizeResourceFileName(fileName)}`;
}

export function buildPermanentResourceFileKey(
  resourceId: string,
  fileName: string,
  timestamp = Date.now()
): string {
  return `resources/${resourceId}/${timestamp}-${sanitizeResourceFileName(fileName)}`;
}

export function buildArchivedResourceFileKey(
  resourceId: string,
  fileName: string,
  timestamp = Date.now()
): string {
  return `${RESOURCE_ARCHIVED_PREFIX}${resourceId}/${timestamp}-${sanitizeResourceFileName(fileName)}`;
}

export function isPendingResourceFileKey(fileKey: string): boolean {
  return (
    fileKey.startsWith(RESOURCE_PENDING_PREFIX) &&
    !fileKey.includes('..') &&
    fileKey.slice(RESOURCE_PENDING_PREFIX.length).length > 0 &&
    !fileKey.slice(RESOURCE_PENDING_PREFIX.length).includes('/')
  );
}

export function isArchivedResourceFileKey(fileKey: string): boolean {
  return (
    fileKey.startsWith(RESOURCE_ARCHIVED_PREFIX) &&
    !fileKey.includes('..') &&
    fileKey.slice(RESOURCE_ARCHIVED_PREFIX.length).length > 0
  );
}
