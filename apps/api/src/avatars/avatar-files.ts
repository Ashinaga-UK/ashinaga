import { randomUUID } from 'node:crypto';

export const AVATAR_PENDING_PREFIX = 'avatars/pending/';
export const AVATAR_CONTENT_TYPE = 'image/jpeg';
/** Post-compress JPEG ceiling (800px @ ~0.85 quality). */
export const AVATAR_FILE_MAX_SIZE_BYTES = 1 * 1024 * 1024;
export const AVATAR_UPLOAD_URL_EXPIRES_IN_SECONDS = 300;
export const AVATAR_DOWNLOAD_URL_EXPIRES_IN_SECONDS = 900;

/** Object id segment in permanent keys (always a UUID from our builders). */
const UUID_SEGMENT = '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';

/**
 * Better Auth user ids are opaque alphanumeric strings (typically 32 chars),
 * not UUIDs. Allow a conservative charset for path segments.
 */
const USER_ID_SEGMENT = '[A-Za-z0-9_-]+';

/** Permanent keys may be .jpg (new uploads) or other image types from migration. */
const PERMANENT_EXT = '(?:jpe?g|png|webp|gif)';

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
    const pattern = new RegExp(
      `^avatars/${escapeRegex(userId)}/${UUID_SEGMENT}\\.${PERMANENT_EXT}$`,
      'i'
    );
    return pattern.test(fileKey);
  }
  return new RegExp(`^avatars/${USER_ID_SEGMENT}/${UUID_SEGMENT}\\.${PERMANENT_EXT}$`, 'i').test(
    fileKey
  );
}

export function isStoredAvatarKey(image: string | null | undefined): boolean {
  if (!image) return false;
  return image.startsWith('avatars/') && !image.includes('..');
}

/**
 * Rewrite stored avatar keys and legacy data URLs to a stable API URL.
 * Leave external https (e.g. dicebear) untouched.
 */
export function resolveAvatarSrc(image: string | null | undefined, userId: string): string | null {
  if (!image) return null;
  if (isStoredAvatarKey(image) || image.startsWith('data:image/')) {
    return buildAvatarPublicUrl(userId);
  }
  return image;
}

/** Reject path tricks / empty ids on public avatar routes. */
export function isValidAvatarUserIdParam(userId: string): boolean {
  return (
    userId.length > 0 &&
    userId.length <= 128 &&
    !userId.includes('/') &&
    !userId.includes('..') &&
    new RegExp(`^${USER_ID_SEGMENT}$`).test(userId)
  );
}
