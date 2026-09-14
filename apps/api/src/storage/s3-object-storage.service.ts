import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type ObjectHead, ObjectStorageService, type PresignedUpload } from './object-storage';

@Injectable()
export class S3ObjectStorageService extends ObjectStorageService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(configService: ConfigService) {
    super();
    const bucketName = configService.get<string>('S3_BUCKET_NAME');
    if (!bucketName) {
      throw new Error('S3_BUCKET_NAME must be set for resource document uploads');
    }
    this.bucketName = bucketName;
    this.s3Client = new S3Client({
      region: configService.get<string>('AWS_REGION', 'eu-west-3'),
      // Avoid checksum headers that break browser uploads to signed URLs.
      requestChecksumCalculation: 'WHEN_REQUIRED',
    });
  }

  async createUploadUrl(input: {
    key: string;
    contentType: string;
    contentLength: number;
    expiresInSeconds?: number;
  }): Promise<PresignedUpload> {
    const { url, fields } = await createPresignedPost(this.s3Client, {
      Bucket: this.bucketName,
      Key: input.key,
      Expires: input.expiresInSeconds ?? 300,
      Fields: {
        'Content-Type': input.contentType,
      },
      Conditions: [
        ['eq', '$Content-Type', input.contentType],
        // Exact size so a client cannot request a small URL then POST a huge body.
        ['content-length-range', input.contentLength, input.contentLength],
      ],
    });

    return { url, fields };
  }

  async createDownloadUrl(input: {
    key: string;
    contentDisposition?: string;
    expiresInSeconds?: number;
  }): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: input.key,
      ResponseContentDisposition: input.contentDisposition,
    });

    return getSignedUrl(this.s3Client, command, {
      expiresIn: input.expiresInSeconds ?? 900,
    });
  }

  async headObject(key: string): Promise<ObjectHead | null> {
    try {
      const result = await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        })
      );

      return {
        contentType: result.ContentType,
        contentLength: result.ContentLength,
      };
    } catch (error) {
      if (isS3NotFound(error)) {
        return null;
      }
      throw error;
    }
  }

  async copyObject(sourceKey: string, destinationKey: string): Promise<void> {
    await this.s3Client.send(
      new CopyObjectCommand({
        Bucket: this.bucketName,
        CopySource: `${this.bucketName}/${sourceKey}`,
        Key: destinationKey,
        MetadataDirective: 'COPY',
      })
    );
  }

  async deleteObject(key: string): Promise<void> {
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })
    );
  }
}

function isS3NotFound(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as {
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };

  return (
    candidate.name === 'NotFound' ||
    candidate.name === 'NoSuchKey' ||
    candidate.$metadata?.httpStatusCode === 404
  );
}
