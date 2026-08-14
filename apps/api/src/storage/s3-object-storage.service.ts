import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type ObjectHead, ObjectStorageService } from './object-storage';

@Injectable()
export class S3ObjectStorageService extends ObjectStorageService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(configService: ConfigService) {
    super();
    this.bucketName = configService.get<string>('S3_BUCKET_NAME', '');
    this.s3Client = new S3Client({
      region: configService.get<string>('AWS_REGION', 'eu-west-3'),
      // Avoid checksum headers that break browser PUTs to presigned URLs.
      requestChecksumCalculation: 'WHEN_REQUIRED',
    });
  }

  async createUploadUrl(input: {
    key: string;
    contentType: string;
    contentLength: number;
    expiresInSeconds?: number;
  }): Promise<string> {
    // Signing ContentLength makes AWS SDK v3 throw during presign.
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: input.key,
      ContentType: input.contentType,
    });

    return getSignedUrl(this.s3Client, command, {
      expiresIn: input.expiresInSeconds ?? 300,
    });
  }

  async createDownloadUrl(input: {
    key: string;
    fileName?: string;
    expiresInSeconds?: number;
  }): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: input.key,
      ResponseContentDisposition: input.fileName
        ? `attachment; filename="${input.fileName.replace(/"/g, '')}"`
        : undefined,
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
