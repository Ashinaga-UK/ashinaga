import { RequestMethod } from '@nestjs/common';
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Test } from '@nestjs/testing';
import { StaffGuard } from '../auth/staff.guard';
import { OverviewController } from './overview.controller';
import { OverviewService } from './overview.service';

describe('OverviewController', () => {
  const service = { getOverview: jest.fn() };

  beforeEach(async () => {
    service.getOverview.mockReset();
    await Test.createTestingModule({
      controllers: [OverviewController],
      providers: [{ provide: OverviewService, useValue: service }],
    }).compile();
  });

  it('is a staff-only GET at api/overview', () => {
    expect(Reflect.getMetadata(PATH_METADATA, OverviewController)).toBe('api/overview');
    expect(Reflect.getMetadata(PATH_METADATA, OverviewController.prototype.getOverview)).toBe('/');
    expect(Reflect.getMetadata(METHOD_METADATA, OverviewController.prototype.getOverview)).toBe(
      RequestMethod.GET
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, OverviewController.prototype.getOverview)).toEqual(
      expect.arrayContaining([StaffGuard])
    );
  });

  it('passes the signed-in staff id to the read model', async () => {
    const payload = {
      cohort: { total: 1, prepYear: 0 },
      attention: { items: [], total: 0, truncated: false },
      prepYear: null,
    };
    service.getOverview.mockResolvedValue(payload);
    const controller = new OverviewController(service as unknown as OverviewService);

    await expect(controller.getOverview({ user: { id: 'staff-1' } })).resolves.toBe(payload);
    expect(service.getOverview).toHaveBeenCalledWith('staff-1');
  });
});
