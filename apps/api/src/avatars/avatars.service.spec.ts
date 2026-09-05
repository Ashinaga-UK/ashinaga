import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { ObjectStorageService } from '../storage/object-storage';
import { AvatarsService } from './avatars.service';

jest.mock('../db/connection', () => ({
  database: {
    select: jest.fn(),
  },
}));

describe('AvatarsService', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  let service: AvatarsService;
  let objectStorage: {
    createUploadUrl: jest.Mock;
    createDownloadUrl: jest.Mock;
    headObject: jest.Mock;
    copyObject: jest.Mock;
    deleteObject: jest.Mock;
  };

  beforeEach(async () => {
    objectStorage = {
      createUploadUrl: jest.fn(),
      createDownloadUrl: jest.fn(),
      headObject: jest.fn(),
      copyObject: jest.fn(),
      deleteObject: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvatarsService,
        { provide: ObjectStorageService, useValue: objectStorage },
      ],
    }).compile();

    service = module.get(AvatarsService);
  });

  it('creates a jpeg-only pending upload URL', async () => {
    objectStorage.createUploadUrl.mockResolvedValue({
      url: 'https://s3.example/post',
      fields: { key: 'pending' },
    });

    const result = await service.createUploadUrl(userId, {
      fileType: 'image/jpeg',
      fileSize: 12_000,
    });

    expect(result.fileKey).toMatch(new RegExp(`^avatars/pending/${userId}/`));
    expect(objectStorage.createUploadUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: 'image/jpeg',
        contentLength: 12_000,
      })
    );
  });

  it('rejects non-jpeg upload URL requests', async () => {
    await expect(
      service.createUploadUrl(userId, { fileType: 'image/png', fileSize: 100 })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('confirms a pending upload, copies to permanent, deletes old', async () => {
    const pending = `avatars/pending/${userId}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg`;
    const previous = `avatars/${userId}/cccccccc-cccc-4ccc-8ccc-cccccccccccc.jpg`;
    objectStorage.headObject.mockResolvedValue({
      contentType: 'image/jpeg',
      contentLength: 2048,
    });
    objectStorage.copyObject.mockResolvedValue(undefined);
    objectStorage.deleteObject.mockResolvedValue(undefined);

    const next = await service.resolveImageUpdate(userId, pending, previous);

    expect(next).toMatch(new RegExp(`^avatars/${userId}/`));
    expect(objectStorage.copyObject).toHaveBeenCalledWith(pending, next);
    expect(objectStorage.deleteObject).toHaveBeenCalledWith(pending);
    expect(objectStorage.deleteObject).toHaveBeenCalledWith(previous);
  });

  it('removes an avatar and deletes the stored object', async () => {
    const previous = `avatars/${userId}/cccccccc-cccc-4ccc-8ccc-cccccccccccc.jpg`;
    objectStorage.deleteObject.mockResolvedValue(undefined);

    await expect(service.resolveImageUpdate(userId, null, previous)).resolves.toBeNull();
    expect(objectStorage.deleteObject).toHaveBeenCalledWith(previous);
  });

  it('does not delete external https images on remove', async () => {
    await expect(
      service.resolveImageUpdate(userId, null, 'https://api.dicebear.com/x.png')
    ).resolves.toBeNull();
    expect(objectStorage.deleteObject).not.toHaveBeenCalled();
  });

  it('redirects permanent keys via signed download URL', async () => {
    const { database } = require('../db/connection');
    const key = `avatars/${userId}/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg`;
    database.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([{ id: userId, image: key }]),
        }),
      }),
    });
    objectStorage.createDownloadUrl.mockResolvedValue('https://s3.example/signed');

    await expect(service.getAvatarResponse(userId)).resolves.toEqual({
      kind: 'redirect',
      url: 'https://s3.example/signed',
    });
  });

  it('404s when the user has no image', async () => {
    const { database } = require('../db/connection');
    database.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([{ id: userId, image: null }]),
        }),
      }),
    });

    await expect(service.getAvatarResponse(userId)).rejects.toBeInstanceOf(NotFoundException);
  });
});
