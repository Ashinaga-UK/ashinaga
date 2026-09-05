import { Test, type TestingModule } from '@nestjs/testing';
import { getDatabase } from '../db/connection';
import { PrepYearReportService } from './prep-year-report.service';

jest.mock('../db/connection', () => ({
  getDatabase: jest.fn(),
}));

describe('PrepYearReportService', () => {
  let service: PrepYearReportService;

  function chain(result: unknown[] = []) {
    const resolved = Promise.resolve(result);
    const terminal = Object.assign(resolved, {
      limit: () => resolved,
      orderBy: () => resolved,
    });
    const api: {
      from: jest.Mock;
      innerJoin: jest.Mock;
      leftJoin: jest.Mock;
      where: jest.Mock;
      orderBy: jest.Mock;
      limit: jest.Mock;
    } = {
      from: jest.fn(),
      innerJoin: jest.fn(),
      leftJoin: jest.fn(),
      where: jest.fn(),
      orderBy: jest.fn(),
      limit: jest.fn(),
    };
    api.from.mockReturnValue(api);
    api.innerJoin.mockReturnValue(api);
    api.leftJoin.mockReturnValue(api);
    api.where.mockReturnValue(terminal);
    api.orderBy.mockReturnValue(resolved);
    api.limit.mockReturnValue(resolved);
    return api;
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrepYearReportService],
    }).compile();
    service = module.get(PrepYearReportService);
  });

  it('skips related queries when there are no prep_year scholars', async () => {
    const select = jest
      .fn()
      .mockImplementationOnce(() => chain([]))
      .mockImplementationOnce(() => chain([]))
      .mockImplementationOnce(() => chain([]));
    (getDatabase as jest.Mock).mockReturnValue({ select });

    const result = await service.getReport({});

    expect(select).toHaveBeenCalledTimes(3);
    expect(result.scholars).toEqual([]);
    expect(result.summary.scholarCount).toBe(0);
    expect(result.documentTypes).toEqual([]);
    expect(result.platforms).toEqual([]);
  });

  it('loads docs, platforms, and tasks for prep_year scholars', async () => {
    const types = [{ id: 'type-ielts', slug: 'ielts', label: 'IELTS results' }];
    const platforms = [{ id: 'plat-1', slug: 'coursera', name: 'Coursera' }];
    const scholars = [
      {
        scholarId: 's1',
        name: 'Ada',
        email: 'ada@example.com',
        status: 'active',
        intendedUniversity: 'Oxford',
        intendedCourse: 'Law',
        degreePathway: 'Foundation Year',
      },
    ];
    const files = [{ scholarId: 's1', typeId: 'type-ielts' }];
    const setups = [{ scholarId: 's1', platformId: 'plat-1', status: 'yes' }];
    const tasks = [
      {
        scholarId: 's1',
        phase: 'english',
        dueDate: new Date('2026-10-01T00:00:00.000Z'),
        status: 'completed',
      },
    ];

    const select = jest
      .fn()
      .mockImplementationOnce(() => chain(types))
      .mockImplementationOnce(() => chain(platforms))
      .mockImplementationOnce(() => chain(scholars))
      .mockImplementationOnce(() => chain(files))
      .mockImplementationOnce(() => chain(setups))
      .mockImplementationOnce(() => chain(tasks));
    (getDatabase as jest.Mock).mockReturnValue({ select });

    const result = await service.getReport({ phase: 'english' });
    expect(select).toHaveBeenCalledTimes(6);
    expect(result.scholars).toHaveLength(1);
    expect(result.scholars[0]).toMatchObject({
      scholarId: 's1',
      assignedCount: 1,
      completedCount: 1,
      completionRate: 100,
      documents: { 'type-ielts': 'submitted' },
      platforms: { 'plat-1': 'yes' },
    });
  });
});
