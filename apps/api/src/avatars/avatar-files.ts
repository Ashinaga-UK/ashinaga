import { randomUUID } from 'node:crypto';

export const AVATAR_PENDING_PREFIX = 'avatars/pending/';
export const AVATAR_CONTENT_TYPE = 'image/jpeg';
/** Post-compress JPEG ceiling (800px @ ~0.85 quality). */
export const AVATAR_FILE_MAX_SIZE_BYTES = 1 * 1024 * 1024;
export const AVATAR_UPLOAD_URL_EXPIRES_IN_SECONDS = 300;
export const AVATAR_DOWNLOAD_URL_EXPIRES_IN_SECONDS = 900;

const UUID_SEGMENT =
  '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getApiPublicOrigin(): string {
  return (process.env.BETTER_AUTH_URL || 'http://localhost:4000').replace(/\/$/, '');
}

export function buildAvatarPublicUrl(userId: string): string {
  return `${getApiPublicOrigin()}/api/avatars/${userId}`;
}

export function buildPendingAvatarFileKey(userId: string, uploadId = randomUUID()): string {
  return `${AVATAR_PENDING_PREFIX}${userId}/${uploadId}.jpg`;
}

export function buildPermanentAvatarFileKey(userId: string, objectId = randomUUID()): string {
  return `avatars/${userId}/${objectId}.jpg`;
}

export function isPendingAvatarFileKey(fileKey: string, userId: string): boolean {
  const prefix = `${AVATAR_PENDING_PREFIX}${userId}/`;
  if (!fileKey.startsWith(prefix) || fileKey.includes('..')) {
    return false;
  }
  const rest = fileKey.slice(prefix.length);
  return /^[0-9a-f-]+\.jpg$/i.test(rest) && !rest.includes('/');
}

export function isPermanentAvatarFileKey(fileKey: string, userId?: string): boolean {
  if (fileKey.includes('..') || fileKey.startsWith(AVATAR_PENDING_PREFIX)) {
    return false;
  }
  if (userId) {
    const pattern = new RegExp(`^avatars/${escapeRegex(userId)}/${UUID_SEGMENT}\\.jpg$`, 'i');
    return pattern.test(fileKey);
  }
  return new RegExp(`^avatars/${UUID_SEGMENT}/${UUID_SEGMENT}\\.jpg$`, 'i').test(fileKey);
}

export function isStoredAvatarKey(image: string | null | undefined): boolean {
  if (!image) return false;
  return image.startsWith('avatars/') && !image.includes('..');
}

/**
 * Rewrite stored avatar keys to a stable API URL. Leave legacy data URLs and
 * external https (e.g. dicebear) untouched.
 */
export function resolveAvatarSrc(
  image: string | null | undefined,
  userId: string
): string | null {
  if (!image) return null;
  if (isStoredAvatarKey(image)) {
    return buildAvatarPublicUrl(userId);
  }
  return image;
}
