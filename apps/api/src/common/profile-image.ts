import { BadRequestException } from '@nestjs/common';

export const PROFILE_IMAGE_MAX_DATA_URL_LENGTH = 3_000_000;

const PROFILE_IMAGE_DATA_URL_PATTERN = /^data:image\/(jpeg|jpg|png|webp|gif);base64,/i;

export function validateProfileImage(image: string | null | undefined): void {
  if (!image) return;

  if (!PROFILE_IMAGE_DATA_URL_PATTERN.test(image)) {
    throw new BadRequestException('Profile image must be a JPEG, PNG, WebP, or GIF data URL');
  }

  if (image.length > PROFILE_IMAGE_MAX_DATA_URL_LENGTH) {
    throw new BadRequestException('Profile image is too large to save');
  }
}
