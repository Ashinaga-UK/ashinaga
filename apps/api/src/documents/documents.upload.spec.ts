import { ForbiddenException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { database } from '../db/connection';
import { ObjectStorageService } from '../storage/object-storage';
import { DocumentsService } from './documents.service';

jest.mock('../db/connection', () => ({
  database: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

const scholarId = '11111111-1111-4111-8111-111111111111';
const typeId = 'a1000000-0000-4000-8000-000000000001';

function mockSelectSequence(results: unknown[][]) {
  let call = 0;
  (database.select as jest.Mock).mockImplementation(() => {
    const rows = results[call] ?? [];
    call += 1;
    const chain: Record<string, unknown> = {};
    const thenable = {
      from: jest.fn().mockReturnValue(chain),
      innerJoin: jest.fn().mockReturnValue(chain),
      where: jest.fn().mockReturnValue(chain),
      orderBy: jest.fn().mockResolvedValue(rows),
      limit: jest.fn().mockResolvedValue(rows),
    };
    Object.assign(chain, thenable);
    return thenable;
  });
}

describe('DocumentsService uploads', () => {
  let service: DocumentsService;
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
        DocumentsService,
        {
          provide: ObjectStorageService,
          useValue: objectStorage,
        },
      ],
    }).compile();
    service = module.get(DocumentsService);
  });

  it('creates a scholar-scoped pending upload POST', async () => {
    mockSelectSequence([
      [{ scholarId, userId: 'user-1', programStage: 'prep_year' }],
      [{ id: typeId, slug: 'passport', label: 'Passport copy', isActive: true, sortOrder: 1 }],
    ]);
    objectStorage.createUploadUrl.mockResolvedValue({
      url: 'https://s3.example/post',
      fields: { Policy: 'policy' },
    });

    const result = await service.createUploadUrl('user-1', {
      typeId,
      fileName: 'passport.pdf',
      fileType: 'application/pdf',
      fileSize: 2048,
    });

    expect(objectStorage.createUploadUrl).toHaveBeenCalledWith({
      key: expect.stringMatching(new RegExp(`^documents/pending/${scholarId}/.+-passport\\.pdf$`)),
      contentType: 'application/pdf',
      contentLength: 2048,
      expiresInSeconds: 300,
    });
    expect(result.fileKey).toMatch(new RegExp(`^documents/pending/${scholarId}/`));
  });

  it('rejects uploads from confirmed scholars', async () => {
    mockSelectSequence([[{ scholarId, userId: 'user-1', programStage: 'scholar' }]]);

    await expect(
      service.createUploadUrl('user-1', {
        typeId,
        fileName: 'passport.pdf',
        fileType: 'application/pdf',
        fileSize: 2048,
      })
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a pending key that belongs to another scholar', async () => {
    mockSelectSequence([
      [{ scholarId, userId: 'user-1', programStage: 'prep_year' }],
      [{ id: typeId, slug: 'passport', label: 'Passport copy', isActive: true, sortOrder: 1 }],
    ]);

    await expect(
      service.confirmUpload('user-1', {
        typeId,
        pendingFileKey: 'documents/pending/other-scholar/upload-passport.pdf',
        fileName: 'passport.pdf',
        fileMimeType: 'application/pdf',
        fileSizeBytes: 2048,
      })
    ).rejects.toThrow('Invalid pending file key');
    expect(objectStorage.copyObject).not.toHaveBeenCalled();
  });

  it('copies the pending object then replaces an existing file', async () => {
    const existing = {
      id: 'file-1',
      scholarId,
      typeId,
      fileKey: 'documents/old-key.pdf',
      fileName: 'old.pdf',
      fileMimeType: 'application/pdf',
      fileSizeBytes: 100,
      uploadedBy: 'user-1',
      uploadedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const updated = { ...existing, fileName: 'passport.pdf', fileKey: 'documents/new-key.pdf' };

    mockSelectSequence([
      [{ scholarId, userId: 'user-1', programStage: 'prep_year' }],
      [
        {
          id: typeId,
          slug: 'passport',
          label: 'Passport copy',
          description: null,
          isActive: true,
          sortOrder: 1,
        },
      ],
      [existing],
    ]);
    objectStorage.headObject.mockResolvedValue({
      contentType: 'application/pdf',
      contentLength: 2048,
    });
    objectStorage.copyObject.mockResolvedValue(undefined);
    objectStorage.deleteObject.mockResolvedValue(undefined);
    (database.update as jest.Mock).mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([updated]),
        }),
      }),
    });

    const result = await service.confirmUpload('user-1', {
      typeId,
      pendingFileKey: `documents/pending/${scholarId}/upload-passport.pdf`,
      fileName: 'passport.pdf',
      fileMimeType: 'application/pdf',
      fileSizeBytes: 2048,
    });

    expect(objectStorage.copyObject).toHaveBeenCalledWith(
      `documents/pending/${scholarId}/upload-passport.pdf`,
      expect.stringMatching(new RegExp(`^documents/${scholarId}/${typeId}/`))
    );
    expect(result.fileName).toBe('passport.pdf');
  });

  it('hides another scholar file from download', async () => {
    mockSelectSequence([
      [
        {
          id: 'file-1',
          scholarId,
          fileKey: 'documents/key.pdf',
          fileName: 'passport.pdf',
        },
      ],
      [{ id: 'other-scholar' }],
    ]);

    await expect(
      service.getDownloadUrl('file-1', 'outsider', 'scholar', 'attachment')
    ).rejects.toThrow('Document not found');
  });
});
