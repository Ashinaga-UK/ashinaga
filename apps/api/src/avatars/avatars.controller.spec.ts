import { Test, type TestingModule } from '@nestjs/testing';
import { AuthGuard } from '../auth/auth.guard';
import { AvatarsController } from './avatars.controller';
import { AvatarsService } from './avatars.service';

describe('AvatarsController', () => {
  let controller: AvatarsController;
  const avatarsService = {
    createUploadUrl: jest.fn(),
    getAvatarResponse: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AvatarsController],
      providers: [{ provide: AvatarsService, useValue: avatarsService }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(AvatarsController);
    jest.clearAllMocks();
  });

  it('creates an upload URL for the authenticated user', async () => {
    avatarsService.createUploadUrl.mockResolvedValue({
      uploadUrl: 'https://s3',
      fields: {},
      fileKey: 'avatars/pending/u/x.jpg',
    });

    const result = await controller.createUploadUrl(
      { user: { id: 'user-1' } } as any,
      { fileType: 'image/jpeg', fileSize: 1000 }
    );

    expect(avatarsService.createUploadUrl).toHaveBeenCalledWith('user-1', {
      fileType: 'image/jpeg',
      fileSize: 1000,
    });
    expect(result.fileKey).toContain('avatars/pending');
  });

  it('redirects avatar GET responses', async () => {
    avatarsService.getAvatarResponse.mockResolvedValue({
      kind: 'redirect',
      url: 'https://s3.example/signed',
    });
    const res = {
      status: jest.fn().mockReturnThis(),
      redirect: jest.fn(),
      type: jest.fn().mockReturnThis(),
      header: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    await controller.getAvatar('11111111-1111-4111-8111-111111111111', res as any);

    expect(res.status).toHaveBeenCalledWith(302);
    expect(res.redirect).toHaveBeenCalledWith('https://s3.example/signed');
  });
});
