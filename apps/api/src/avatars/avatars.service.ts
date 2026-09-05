import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { database } from '../db/connection';
import { users } from '../db/schema';
import { ObjectStorageService } from '../storage/object-storage';
import {
  AVATAR_CONTENT_TYPE,
  AVATAR_DOWNLOAD_URL_EXPIRES_IN_SECONDS,
  AVATAR_FILE_MAX_SIZE_BYTES,
  AVATAR_UPLOAD_URL_EXPIRES_IN_SECONDS,
  buildPermanentAvatarFileKey,
  buildPendingAvatarFileKey,
  isPendingAvatarFileKey,
  isPermanentAvatarFileKey,
  isStoredAvatarKey,
  resolveAvatarSrc,
} from './avatar-files';

export type AvatarRedirectResult =
  | { kind: 'redirect'; url: string }
  | { kind: 'data'; contentType: string; body: Buffer };

@Injectable()
export class AvatarsService {
  private readonly logger = new Logger(AvatarsService.name);

  constructor(private readonly objectStorage: ObjectStorageService) {}

  async createUploadUrl(userId: string, input: { fileType: string; fileSize: number }) {
    if (input.fileType !== AVATAR_CONTENT_TYPE) {
      throw new BadRequestException('Avatar uploads must be image/jpeg');
    }
    if (input.fileSize < 1 || input.fileSize > AVATAR_FILE_MAX_SIZE_BYTES) {
      throw new BadRequestException('Avatar file size is out of range');
    }

    const fileKey = buildPendingAvatarFileKey(userId);
    const upload = await this.objectStorage.createUploadUrl({
      key: fileKey,
      contentType: AVATAR_CONTENT_TYPE,
      contentLength: input.fileSize,
      expiresInSeconds: AVATAR_UPLOAD_URL_EXPIRES_IN_SECONDS,
    });

    return { uploadUrl: upload.url, fields: upload.fields, fileKey };
  }

  /**
   * Confirm a pending upload, remove an avatar, or no-op.
   * Returns the value to persist on users.image (S3 key or null).
   */
  async resolveImageUpdate(
    userId: string,
    nextImage: string | null,
    previousImage: string | null | undefined
  ): Promise<string | null> {
    if (nextImage === null || nextImage === '') {
      await this.deleteStoredAvatarIfOurs(previousImage, userId);
      return null;
    }

    if (!isPendingAvatarFileKey(nextImage, userId)) {
      throw new BadRequestException('Invalid avatar upload key');
    }

    const head = await this.objectStorage.headObject(nextImage);
    if (!head) {
      throw new BadRequestException('Avatar upload not found. Please upload again.');
    }
    if (head.contentType && head.contentType !== AVATAR_CONTENT_TYPE) {
      throw new BadRequestException('Avatar must be a JPEG');
    }
    if (
      head.contentLength != null &&
      (head.contentLength < 1 || head.contentLength > AVATAR_FILE_MAX_SIZE_BYTES)
    ) {
      throw new BadRequestException('Avatar file size is out of range');
    }

    const permanentKey = buildPermanentAvatarFileKey(userId, randomUUID());
    await this.objectStorage.copyObject(nextImage, permanentKey);

    try {
      await this.objectStorage.deleteObject(nextImage);
    } catch (error) {
      this.logger.warn(
        `Failed to delete pending avatar ${nextImage}: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    await this.deleteStoredAvatarIfOurs(previousImage, userId);
    return permanentKey;
  }

  async getAvatarResponse(userId: string): Promise<AvatarRedirectResult> {
    const [user] = await database.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user?.image) {
      throw new NotFoundException('Avatar not found');
    }

    const image = user.image;

    if (isStoredAvatarKey(image)) {
      const url = await this.objectStorage.createDownloadUrl({
        key: image,
        contentDisposition: 'inline',
        expiresInSeconds: AVATAR_DOWNLOAD_URL_EXPIRES_IN_SECONDS,
      });
      return { kind: 'redirect', url };
    }

    if (image.startsWith('http://') || image.startsWith('https://')) {
      return { kind: 'redirect', url: image };
    }

    const dataMatch = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/i);
    if (dataMatch) {
      return {
        kind: 'data',
        contentType: dataMatch[1],
        body: Buffer.from(dataMatch[2], 'base64'),
      };
    }

    throw new NotFoundException('Avatar not found');
  }

  withResolvedImage<T extends { id: string; image?: string | null }>(user: T): T {
    return {
      ...user,
      image: resolveAvatarSrc(user.image, user.id),
    };
  }

  private async deleteStoredAvatarIfOurs(
    image: string | null | undefined,
    userId: string
  ): Promise<void> {
    if (!image) return;
    if (!isPermanentAvatarFileKey(image, userId) && !isPendingAvatarFileKey(image, userId)) {
      return;
    }
    try {
      await this.objectStorage.deleteObject(image);
    } catch (error) {
      this.logger.warn(
        `Failed to delete avatar ${image}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
