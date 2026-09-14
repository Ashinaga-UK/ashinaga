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

  it('creates a pending upload POST with signed type and size constraints', async () => {
    objectStorage.createUploadUrl.mockResolvedValue({
      url: 'https://s3.example/upload',
      fields: { key: 'resources/pending/file.pdf', Policy: 'policy' },
    });

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
    expect(result.fields).toEqual(expect.objectContaining({ Policy: 'policy' }));
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

  it('copies the pending upload then deletes it only after the DB save succeeds', async () => {
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
    expect(objectStorage.deleteObject).toHaveBeenCalledWith(
      'resources/pending/upload-1-handbook.pdf'
    );
    expect(result.sourceType).toBe('file');
    expect(result.url).toBeNull();
    expect(result.fileName).toBe('handbook.pdf');
  });

  it('keeps the original filename for display', async () => {
    objectStorage.headObject.mockResolvedValue({
      contentType: 'application/pdf',
      contentLength: 2048,
    });
    objectStorage.copyObject.mockResolvedValue(undefined);
    objectStorage.deleteObject.mockResolvedValue(undefined);

    let insertedFileName: string | undefined;
    (database.transaction as jest.Mock).mockImplementation(async (callback) => {
      const tx = {
        insert: jest.fn().mockReturnValue({
          values: jest.fn((values: { fileName: string }) => {
            insertedFileName = values.fileName;
            return {
              returning: jest.fn().mockResolvedValue([
                {
                  id: 'resource-1',
                  title: 'Handbook',
                  description: 'Reference',
                  type: 'Handbook',
                  category: 'Handbook',
                  sourceType: 'file',
                  url: null,
                  fileKey: 'resources/resource-1/notes.pdf',
                  fileName: values.fileName,
                  fileMimeType: 'application/pdf',
                  fileSizeBytes: 2048,
                  status: 'draft',
                  createdAt: new Date('2026-01-01'),
                  updatedAt: new Date('2026-01-01'),
                },
              ]),
            };
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
        pendingFileKey: 'resources/pending/upload-1-Releve_de_notes.pdf',
        fileName: 'Relevé de notes.pdf',
        fileMimeType: 'application/pdf',
        fileSizeBytes: 2048,
      },
      'staff-1'
    );

    expect(insertedFileName).toBe('Relevé de notes.pdf');
    expect(result.fileName).toBe('Relevé de notes.pdf');
  });

  it('deletes the permanent object when the DB insert fails', async () => {
    objectStorage.headObject.mockResolvedValue({
      contentType: 'application/pdf',
      contentLength: 2048,
    });
    objectStorage.copyObject.mockResolvedValue(undefined);
    objectStorage.deleteObject.mockResolvedValue(undefined);
    (database.transaction as jest.Mock).mockRejectedValue(new Error('db down'));

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
    ).rejects.toThrow('db down');

    expect(objectStorage.deleteObject).toHaveBeenCalledWith(
      expect.stringMatching(/^resources\/.+\/\d+-handbook\.pdf$/)
    );
    expect(objectStorage.deleteObject).not.toHaveBeenCalledWith(
      'resources/pending/upload-1-handbook.pdf'
    );
  });

  it('moves a file resource into the archived prefix on delete', async () => {
    const existing = {
      id: 'resource-1',
      title: 'Handbook',
      description: 'Reference',
      type: 'Handbook',
      category: 'Handbook',
      sourceType: 'file',
      url: null,
      fileKey: 'resources/resource-1/1700000000000-handbook.pdf',
      fileName: 'handbook.pdf',
      fileMimeType: 'application/pdf',
      fileSizeBytes: 2048,
      status: 'live',
      archived: false,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    };

    (database.select as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([existing]),
        }),
      }),
    });
    (database.update as jest.Mock).mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ ...existing, archived: true }]),
        }),
      }),
    });
    objectStorage.copyObject.mockResolvedValue(undefined);
    objectStorage.deleteObject.mockResolvedValue(undefined);

    await expect(service.archiveResource('resource-1', 'staff-1')).resolves.toEqual({
      success: true,
    });

    expect(objectStorage.copyObject).toHaveBeenCalledWith(
      'resources/resource-1/1700000000000-handbook.pdf',
      expect.stringMatching(/^resources\/archived\/resource-1\/\d+-handbook\.pdf$/)
    );
    expect(objectStorage.deleteObject).toHaveBeenCalledWith(
      'resources/resource-1/1700000000000-handbook.pdf'
    );
  });

  it('rejects changing a file resource into a URL', async () => {
    const existing = {
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
      status: 'live',
      archived: false,
    };

    (database.select as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([existing]),
        }),
      }),
    });

    await expect(
      service.updateResource(
        'resource-1',
        {
          sourceType: 'url',
          url: 'https://example.com/handbook',
        },
        'staff-1'
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
