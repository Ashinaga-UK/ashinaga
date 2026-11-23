import { ForbiddenException, RequestMethod, UnauthorizedException } from '@nestjs/common';
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Test, type TestingModule } from '@nestjs/testing';
import { StaffGuard } from '../auth/staff.guard';
import { SubmissionReportController } from './submission-report.controller';
import { SubmissionReportService } from './submission-report.service';

describe('SubmissionReportController', () => {
  let controller: SubmissionReportController;
  let service: { getReport: jest.Mock; exportCsv: jest.Mock };
  const req = { user: { id: 'staff-user-1' } };

  beforeEach(async () => {
    service = { getReport: jest.fn(), exportCsv: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubmissionReportController],
      providers: [{ provide: SubmissionReportService, useValue: service }],
    }).compile();
    controller = module.get(SubmissionReportController);
  });

  it('mounts GET /api/submissions/report and /api/submissions/report/csv behind StaffGuard', () => {
    expect(Reflect.getMetadata(PATH_METADATA, SubmissionReportController)).toBe('api/submissions');
    for (const [handler, path] of [
      [SubmissionReportController.prototype.getReport, 'report'],
      [SubmissionReportController.prototype.exportCsv, 'report/csv'],
    ] as const) {
      expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(path);
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.GET);
      expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual(
        expect.arrayContaining([StaffGuard])
      );
    }
  });

  it('GET /api/submissions/report forwards filters and the staff user id', async () => {
    const report = { summary: { total: 0, byType: {} }, months: [], cohorts: [], rows: [] };
    service.getReport.mockResolvedValue(report);
    const query = { program: 'Law', type: 'others' as const };
    await expect(controller.getReport(query, req)).resolves.toBe(report);
    expect(service.getReport).toHaveBeenCalledWith(query, 'staff-user-1');
  });

  it('GET /api/submissions/report/csv forwards filters and the staff user id', async () => {
    service.exportCsv.mockResolvedValue('"Month"');
    await expect(controller.exportCsv({ year: '2026' }, req)).resolves.toBe('"Month"');
    expect(service.exportCsv).toHaveBeenCalledWith({ year: '2026' }, 'staff-user-1');
  });

  it('propagates Forbidden for staff who are not super admins', async () => {
    service.getReport.mockRejectedValue(new ForbiddenException());
    service.exportCsv.mockRejectedValue(new ForbiddenException());
    await expect(controller.getReport({}, req)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.exportCsv({}, req)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a request without a user before calling the service', async () => {
    await expect(controller.getReport({}, {})).rejects.toBeInstanceOf(UnauthorizedException);
    expect(service.getReport).not.toHaveBeenCalled();
  });
});
