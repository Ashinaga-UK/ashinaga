import { RequestMethod } from '@nestjs/common';
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Test, type TestingModule } from '@nestjs/testing';
import { StaffGuard } from '../auth/staff.guard';
import { SubmissionReportController } from './submission-report.controller';
import { SubmissionReportService } from './submission-report.service';

describe('SubmissionReportController', () => {
  let controller: SubmissionReportController;
  let service: {
    getReport: jest.Mock;
    exportCsv: jest.Mock;
    getScholarReport: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      getReport: jest.fn(),
      exportCsv: jest.fn(),
      getScholarReport: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubmissionReportController],
      providers: [{ provide: SubmissionReportService, useValue: service }],
    }).compile();

    controller = module.get(SubmissionReportController);
  });

  it('guards GET /report with StaffGuard', () => {
    expect(Reflect.getMetadata(PATH_METADATA, SubmissionReportController.prototype.getReport)).toBe(
      'report'
    );
    expect(
      Reflect.getMetadata(METHOD_METADATA, SubmissionReportController.prototype.getReport)
    ).toBe(RequestMethod.GET);
    expect(
      Reflect.getMetadata(GUARDS_METADATA, SubmissionReportController.prototype.getReport)
    ).toEqual(expect.arrayContaining([StaffGuard]));
  });

  it('guards GET /report/csv with StaffGuard', () => {
    expect(Reflect.getMetadata(PATH_METADATA, SubmissionReportController.prototype.exportCsv)).toBe(
      'report/csv'
    );
    expect(
      Reflect.getMetadata(METHOD_METADATA, SubmissionReportController.prototype.exportCsv)
    ).toBe(RequestMethod.GET);
    expect(
      Reflect.getMetadata(GUARDS_METADATA, SubmissionReportController.prototype.exportCsv)
    ).toEqual(expect.arrayContaining([StaffGuard]));
  });

  it('guards GET /scholars/:scholarId with StaffGuard', () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, SubmissionReportController.prototype.getScholarReport)
    ).toBe('scholars/:scholarId');
    expect(
      Reflect.getMetadata(METHOD_METADATA, SubmissionReportController.prototype.getScholarReport)
    ).toBe(RequestMethod.GET);
    expect(
      Reflect.getMetadata(GUARDS_METADATA, SubmissionReportController.prototype.getScholarReport)
    ).toEqual(expect.arrayContaining([StaffGuard]));
  });

  it('forwards report query filters to the service', async () => {
    const query = { program: 'Engineering', status: 'pending' as const };
    service.getReport.mockResolvedValue({ rows: [] });
    await controller.getReport(query);
    expect(service.getReport).toHaveBeenCalledWith(query);
  });

  it('forwards csv query filters to the service', async () => {
    const query = { kind: 'request' as const };
    service.exportCsv.mockResolvedValue('Scholar\n');
    await controller.exportCsv(query);
    expect(service.exportCsv).toHaveBeenCalledWith(query);
  });

  it('forwards the scholar id with the query', async () => {
    const scholarId = '11111111-1111-4111-8111-111111111111';
    const query = { status: 'approved' as const };
    service.getScholarReport.mockResolvedValue({ rows: [] });
    await controller.getScholarReport(scholarId, query);
    expect(service.getScholarReport).toHaveBeenCalledWith(scholarId, query);
  });
});
