import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { S3ObjectStorageService } from './s3-object-storage.service';

const send = jest.fn();
const getSignedUrl = jest.fn();
const createPresignedPost = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({ send })),
  GetObjectCommand: jest.fn((input) => ({ type: 'get', input })),
  HeadObjectCommand: jest.fn((input) => ({ type: 'head', input })),
  CopyObjectCommand: jest.fn((input) => ({ type: 'copy', input })),
  DeleteObjectCommand: jest.fn((input) => ({ type: 'delete', input })),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: (...args: unknown[]) => getSignedUrl(...args),
}));

jest.mock('@aws-sdk/s3-presigned-post', () => ({
  createPresignedPost: (...args: unknown[]) => createPresignedPost(...args),
}));

describe('S3ObjectStorageService', () => {
  let service: S3ObjectStorageService;

  beforeEach(async () => {
    send.mockReset();
    getSignedUrl.mockReset();
    createPresignedPost.mockReset();
    getSignedUrl.mockResolvedValue('https://signed.example');
    createPresignedPost.mockResolvedValue({
      url: 'https://s3.example/post',
      fields: { key: 'resources/pending/file.pdf', Policy: 'policy', 'X-Amz-Signature': 'sig' },
    });

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

  it('creates a presigned POST with content type and exact size conditions', async () => {
    const result = await service.createUploadUrl({
      key: 'resources/pending/file.pdf',
      contentType: 'application/pdf',
      contentLength: 1024,
    });

    expect(createPresignedPost).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        Bucket: 'test-bucket',
        Key: 'resources/pending/file.pdf',
        Expires: 300,
        Fields: { 'Content-Type': 'application/pdf' },
        Conditions: [
          ['eq', '$Content-Type', 'application/pdf'],
          ['content-length-range', 1024, 1024],
        ],
      })
    );
    expect(result).toEqual({
      url: 'https://s3.example/post',
      fields: expect.objectContaining({ key: 'resources/pending/file.pdf' }),
    });
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

  it('forwards Content-Disposition on signed downloads', async () => {
    const { GetObjectCommand } = jest.requireMock('@aws-sdk/client-s3');

    await service.createDownloadUrl({
      key: 'resources/id/file.pdf',
      contentDisposition: 'attachment; filename="notes.pdf"',
    });

    expect(GetObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        ResponseContentDisposition: 'attachment; filename="notes.pdf"',
      })
    );
  });

  it('fails to start without S3_BUCKET_NAME', async () => {
    await expect(
      Test.createTestingModule({
        providers: [
          S3ObjectStorageService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => undefined),
            },
          },
        ],
      }).compile()
    ).rejects.toThrow('S3_BUCKET_NAME must be set for resource document uploads');
  });
});
