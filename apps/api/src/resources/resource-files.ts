export const RESOURCE_PENDING_PREFIX = 'resources/pending/';
export const RESOURCE_FILE_MAX_SIZE_BYTES = 10 * 1024 * 1024;
export const RESOURCE_UPLOAD_URL_EXPIRES_IN_SECONDS = 300;
export const RESOURCE_DOWNLOAD_URL_EXPIRES_IN_SECONDS = 900;

export const ALLOWED_RESOURCE_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
] as const;

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

export function isPendingResourceFileKey(fileKey: string): boolean {
  return (
    fileKey.startsWith(RESOURCE_PENDING_PREFIX) &&
    !fileKey.includes('..') &&
    fileKey.slice(RESOURCE_PENDING_PREFIX.length).length > 0 &&
    !fileKey.slice(RESOURCE_PENDING_PREFIX.length).includes('/')
  );
}
