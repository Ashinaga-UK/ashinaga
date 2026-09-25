import { Test, type TestingModule } from '@nestjs/testing';
import { PlatformsController } from './platforms.controller';
import { PlatformsService } from './platforms.service';

describe('PlatformsController', () => {
  let controller: PlatformsController;
  const service = {
    listPlatforms: jest.fn(),
    updatePlatformUrl: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlatformsController],
      providers: [{ provide: PlatformsService, useValue: service }],
    }).compile();

    controller = module.get(PlatformsController);
    jest.clearAllMocks();
  });

  it('forwards the staff role when listing platforms', async () => {
    service.listPlatforms.mockResolvedValue({ platforms: [], canEdit: true });

    await controller.listPlatforms({ user: { id: 'staff-1', staffRole: 'admin' } });

    expect(service.listPlatforms).toHaveBeenCalledWith('admin');
  });

  it('forwards an admin platform link update', async () => {
    const dto = { signpostingUrl: 'https://www.coursera.org/' };
    service.updatePlatformUrl.mockResolvedValue({ slug: 'coursera', ...dto });

    await controller.updatePlatformUrl(
      'coursera',
      { user: { id: 'staff-1', staffRole: 'admin' } },
      dto
    );

    expect(service.updatePlatformUrl).toHaveBeenCalledWith('coursera', 'admin', dto);
  });
});
