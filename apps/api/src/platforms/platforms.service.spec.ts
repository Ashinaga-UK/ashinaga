import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PlatformsService } from './platforms.service';

let mockDb: {
  select: jest.Mock;
  update: jest.Mock;
};

jest.mock('../db/connection', () => ({
  getDatabase: jest.fn(() => mockDb),
}));

describe('PlatformsService', () => {
  let service: PlatformsService;

  beforeEach(() => {
    mockDb = {
      select: jest.fn(),
      update: jest.fn(),
    };
    service = new PlatformsService();
  });

  it('lists active platforms and exposes admin edit permission', async () => {
    const rows = [
      {
        id: 'platform-1',
        slug: 'coursera',
        name: 'Coursera',
        signpostingUrl: 'https://www.coursera.org/',
        sortOrder: 2,
      },
    ];
    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockResolvedValue(rows),
        }),
      }),
    });

    await expect(service.listPlatforms('admin')).resolves.toEqual({
      platforms: rows,
      canEdit: true,
    });
    await expect(service.listPlatforms('viewer')).resolves.toEqual({
      platforms: rows,
      canEdit: false,
    });
  });

  it('only allows staff admins to update a platform link', async () => {
    await expect(
      service.updatePlatformUrl('coursera', 'viewer', {
        signpostingUrl: 'https://www.coursera.org/',
      })
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it('normalizes safe links and allows an admin to clear one', async () => {
    const returning = jest
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'platform-1',
          slug: 'coursera',
          name: 'Coursera',
          signpostingUrl: 'https://www.coursera.org/',
          sortOrder: 2,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'platform-1',
          slug: 'coursera',
          name: 'Coursera',
          signpostingUrl: null,
          sortOrder: 2,
        },
      ]);
    const set = jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({ returning }),
    });
    mockDb.update.mockReturnValue({ set });

    const updated = await service.updatePlatformUrl('coursera', 'admin', {
      signpostingUrl: ' https://www.coursera.org ',
    });
    expect(updated.signpostingUrl).toBe('https://www.coursera.org/');
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ signpostingUrl: 'https://www.coursera.org/' })
    );

    const cleared = await service.updatePlatformUrl('coursera', 'admin', {
      signpostingUrl: ' ',
    });
    expect(cleared.signpostingUrl).toBeNull();
    expect(set).toHaveBeenLastCalledWith(expect.objectContaining({ signpostingUrl: null }));
  });

  it('rejects unsafe link schemes', async () => {
    await expect(
      service.updatePlatformUrl('coursera', 'admin', {
        signpostingUrl: 'javascript:alert(1)',
      })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mockDb.update).not.toHaveBeenCalled();
  });
});
