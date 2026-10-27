import { RequestMethod } from '@nestjs/common';
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Test, type TestingModule } from '@nestjs/testing';
import { StaffGuard } from '../auth/staff.guard';
import { ScholarActivityReportController } from './scholar-activity-report.controller';
import { ScholarActivityReportService } from './scholar-activity-report.service';

describe('ScholarActivityReportController', () => {
  let controller: ScholarActivityReportController;
  let service: {
    getReport: jest.Mock;
    exportCsv: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      getReport: jest.fn(),
      exportCsv: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScholarActivityReportController],
      providers: [{ provide: ScholarActivityReportService, useValue: service }],
    }).compile();

    controller = module.get(ScholarActivityReportController);
  });

  it('guards GET /report with StaffGuard', () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, ScholarActivityReportController.prototype.getReport)
    ).toBe('report');
    expect(
      Reflect.getMetadata(METHOD_METADATA, ScholarActivityReportController.prototype.getReport)
    ).toBe(RequestMethod.GET);
    expect(
      Reflect.getMetadata(GUARDS_METADATA, ScholarActivityReportController.prototype.getReport)
    ).toEqual(expect.arrayContaining([StaffGuard]));
  });

  it('guards GET /report/csv with StaffGuard', () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, ScholarActivityReportController.prototype.exportCsv)
    ).toBe('report/csv');
    expect(
      Reflect.getMetadata(METHOD_METADATA, ScholarActivityReportController.prototype.exportCsv)
    ).toBe(RequestMethod.GET);
    expect(
      Reflect.getMetadata(GUARDS_METADATA, ScholarActivityReportController.prototype.exportCsv)
    ).toEqual(expect.arrayContaining([StaffGuard]));
  });

  it('forwards report query filters to the service', async () => {
    const query = { program: 'Law', status: 'active' as const };
    service.getReport.mockResolvedValue({ scholars: [] });
    await controller.getReport(query);
    expect(service.getReport).toHaveBeenCalledWith(query);
  });

  it('forwards csv query filters to the service', async () => {
    const query = { nationality: 'Uganda' };
    service.exportCsv.mockResolvedValue('Name\n');
    await controller.exportCsv(query);
    expect(service.exportCsv).toHaveBeenCalledWith(query);
  });
});
