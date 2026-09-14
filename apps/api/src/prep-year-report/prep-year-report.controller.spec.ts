import { RequestMethod } from '@nestjs/common';
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Test, type TestingModule } from '@nestjs/testing';
import { StaffGuard } from '../auth/staff.guard';
import { PrepYearReportController } from './prep-year-report.controller';
import { PrepYearReportService } from './prep-year-report.service';

describe('PrepYearReportController', () => {
  let controller: PrepYearReportController;
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
      controllers: [PrepYearReportController],
      providers: [{ provide: PrepYearReportService, useValue: service }],
    }).compile();

    controller = module.get(PrepYearReportController);
  });

  it('guards GET /report with StaffGuard', () => {
    expect(Reflect.getMetadata(PATH_METADATA, PrepYearReportController.prototype.getReport)).toBe(
      'report'
    );
    expect(Reflect.getMetadata(METHOD_METADATA, PrepYearReportController.prototype.getReport)).toBe(
      RequestMethod.GET
    );
    expect(
      Reflect.getMetadata(GUARDS_METADATA, PrepYearReportController.prototype.getReport)
    ).toEqual(expect.arrayContaining([StaffGuard]));
  });

  it('guards GET /report/csv with StaffGuard', () => {
    expect(Reflect.getMetadata(PATH_METADATA, PrepYearReportController.prototype.exportCsv)).toBe(
      'report/csv'
    );
    expect(Reflect.getMetadata(METHOD_METADATA, PrepYearReportController.prototype.exportCsv)).toBe(
      RequestMethod.GET
    );
    expect(
      Reflect.getMetadata(GUARDS_METADATA, PrepYearReportController.prototype.exportCsv)
    ).toEqual(expect.arrayContaining([StaffGuard]));
  });

  it('forwards report query filters to the service', async () => {
    const query = { phase: 'english', scholarId: '11111111-1111-4111-8111-111111111111' };
    service.getReport.mockResolvedValue({ scholars: [] });
    await controller.getReport(query);
    expect(service.getReport).toHaveBeenCalledWith(query);
  });

  it('forwards csv query filters to the service', async () => {
    const query = { phase: 'english' };
    service.exportCsv.mockResolvedValue('Name\n');
    await controller.exportCsv(query);
    expect(service.exportCsv).toHaveBeenCalledWith(query);
  });
});
