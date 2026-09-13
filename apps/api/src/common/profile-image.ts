import { BadRequestException } from '@nestjs/common';
import { isPendingAvatarFileKey } from '../avatars/avatar-files';

/** @deprecated Prefer S3 avatar keys. Kept for dual-read of legacy rows only. */
export const PROFILE_IMAGE_MAX_DATA_URL_LENGTH = 3_000_000;

const PROFILE_IMAGE_DATA_URL_PATTERN = /^data:image\/(jpeg|jpg|png|webp|gif);base64,/i;

/**
 * Validate a profile image value for PATCH.
 * Accepts null (remove), a pending avatar S3 key owned by the user, or (legacy read-only
 * compatibility is handled on GET — new writes must not send data URLs).
 */
export function validateProfileImage(
  image: string | null | undefined,
  userId: string
): void {
  if (image === null || image === undefined || image === '') return;

  if (isPendingAvatarFileKey(image, userId)) {
    return;
  }

  if (PROFILE_IMAGE_DATA_URL_PATTERN.test(image)) {
    throw new BadRequestException(
      'Profile images must be uploaded to object storage. Request an upload URL first.'
    );
  }

  throw new BadRequestException('Invalid profile image value');
}
