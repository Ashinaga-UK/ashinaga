import { BadRequestException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { database } from '../db/connection';
import { ObjectStorageService } from '../storage/object-storage';
import { ResourcesService } from './resources.service';

jest.mock('../db/connection', () => ({
  database: {
    transaction: jest.fn(),
    select: jest.fn(),
    update: jest.fn(),
  },
}));

describe('ResourcesService file uploads', () => {
  let service: ResourcesService;
  const objectStorage = {
    createUploadUrl: jest.fn(),
    createDownloadUrl: jest.fn(),
    headObject: jest.fn(),
    copyObject: jest.fn(),
    deleteObject: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourcesService,
        {
          provide: ObjectStorageService,
          useValue: objectStorage,
        },
      ],
    }).compile();

    service = module.get(ResourcesService);
  });

  it('creates a pending upload URL with signed type and size constraints', async () => {
    objectStorage.createUploadUrl.mockResolvedValue('https://s3.example/upload');

    const result = await service.createUploadUrl({
      fileName: 'Handbook.pdf',
      fileType: 'application/pdf',
      fileSize: 2048,
    });

    expect(objectStorage.createUploadUrl).toHaveBeenCalledWith({
      key: expect.stringMatching(/^resources\/pending\/.+-Handbook\.pdf$/),
      contentType: 'application/pdf',
      contentLength: 2048,
      expiresInSeconds: 300,
    });
    expect(result.uploadUrl).toBe('https://s3.example/upload');
    expect(result.fileKey).toMatch(/^resources\/pending\//);
  });

  it('rejects creating a file resource when the pending object is missing', async () => {
    objectStorage.headObject.mockResolvedValue(null);

    await expect(
      service.createResource(
        {
          title: 'Handbook',
          description: 'Reference',
          type: 'Handbook',
          category: 'Handbook',
          sourceType: 'file',
          pendingFileKey: 'resources/pending/upload-1-handbook.pdf',
          fileName: 'handbook.pdf',
          fileMimeType: 'application/pdf',
          fileSizeBytes: 2048,
        },
        'staff-1'
      )
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(database.transaction).not.toHaveBeenCalled();
  });

  it('promotes a pending upload before saving a file resource', async () => {
    objectStorage.headObject.mockResolvedValue({
      contentType: 'application/pdf',
      contentLength: 2048,
    });
    objectStorage.copyObject.mockResolvedValue(undefined);
    objectStorage.deleteObject.mockResolvedValue(undefined);

    const created = {
      id: 'resource-1',
      title: 'Handbook',
      description: 'Reference',
      type: 'Handbook',
      category: 'Handbook',
      sourceType: 'file',
      url: null,
      fileKey: 'resources/resource-1/handbook.pdf',
      fileName: 'handbook.pdf',
      fileMimeType: 'application/pdf',
      fileSizeBytes: 2048,
      status: 'draft',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    };

    (database.transaction as jest.Mock).mockImplementation(async (callback) => {
      const tx = {
        insert: jest.fn().mockReturnValue({
          values: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([created]),
          }),
        }),
        delete: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      };
      return callback(tx);
    });

    const result = await service.createResource(
      {
        title: 'Handbook',
        description: 'Reference',
        type: 'Handbook',
        category: 'Handbook',
        sourceType: 'file',
        pendingFileKey: 'resources/pending/upload-1-handbook.pdf',
        fileName: 'handbook.pdf',
        fileMimeType: 'application/pdf',
        fileSizeBytes: 2048,
      },
      'staff-1'
    );

    expect(objectStorage.copyObject).toHaveBeenCalledWith(
      'resources/pending/upload-1-handbook.pdf',
      expect.stringMatching(/^resources\/.+\/\d+-handbook\.pdf$/)
    );
    expect(result.sourceType).toBe('file');
    expect(result.url).toBeNull();
    expect(result.fileName).toBe('handbook.pdf');
  });
});
