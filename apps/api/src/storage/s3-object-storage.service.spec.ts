import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { S3ObjectStorageService } from './s3-object-storage.service';

const send = jest.fn();
const getSignedUrl = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({ send })),
  PutObjectCommand: jest.fn((input) => ({ type: 'put', input })),
  GetObjectCommand: jest.fn((input) => ({ type: 'get', input })),
  HeadObjectCommand: jest.fn((input) => ({ type: 'head', input })),
  CopyObjectCommand: jest.fn((input) => ({ type: 'copy', input })),
  DeleteObjectCommand: jest.fn((input) => ({ type: 'delete', input })),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: (...args: unknown[]) => getSignedUrl(...args),
}));

describe('S3ObjectStorageService', () => {
  let service: S3ObjectStorageService;

  beforeEach(async () => {
    send.mockReset();
    getSignedUrl.mockReset();
    getSignedUrl.mockResolvedValue('https://signed.example');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        S3ObjectStorageService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              const config: Record<string, string> = {
                AWS_REGION: 'eu-west-3',
                S3_BUCKET_NAME: 'test-bucket',
              };
              return config[key] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(S3ObjectStorageService);
  });

  it('signs upload URLs with content type', async () => {
    const { PutObjectCommand } = jest.requireMock('@aws-sdk/client-s3');

    await service.createUploadUrl({
      key: 'resources/pending/file.pdf',
      contentType: 'application/pdf',
      contentLength: 1024,
    });

    expect(PutObjectCommand).toHaveBeenCalledWith({
      Bucket: 'test-bucket',
      Key: 'resources/pending/file.pdf',
      ContentType: 'application/pdf',
    });
    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ type: 'put' }),
      { expiresIn: 300 }
    );
  });

  it('returns null when the object does not exist', async () => {
    send.mockRejectedValue({ name: 'NotFound', $metadata: { httpStatusCode: 404 } });

    await expect(service.headObject('resources/pending/missing.pdf')).resolves.toBeNull();
  });

  it('copies objects within the configured bucket', async () => {
    send.mockResolvedValue({});
    const { CopyObjectCommand } = jest.requireMock('@aws-sdk/client-s3');

    await service.copyObject('resources/pending/file.pdf', 'resources/id/file.pdf');

    expect(CopyObjectCommand).toHaveBeenCalledWith({
      Bucket: 'test-bucket',
      CopySource: 'test-bucket/resources/pending/file.pdf',
      Key: 'resources/id/file.pdf',
      MetadataDirective: 'COPY',
    });
  });
});
