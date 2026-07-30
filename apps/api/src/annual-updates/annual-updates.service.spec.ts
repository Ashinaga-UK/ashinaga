import { BadRequestException, ConflictException } from '@nestjs/common';
import { AnnualUpdatesService } from './annual-updates.service';
import type { UpsertAnnualUpdateDto } from './dto/upsert-annual-update.dto';

let mockDb: { insert: jest.Mock };

jest.mock('../db/connection', () => ({
  getDatabase: jest.fn(() => mockDb),
}));

describe('AnnualUpdatesService', () => {
  let service: AnnualUpdatesService;
  let internals: AnnualUpdatesServiceInternals;

  beforeEach(() => {
    mockDb = {
      insert: jest.fn(),
    };
    service = new AnnualUpdatesService();
    internals = service as unknown as AnnualUpdatesServiceInternals;
  });

  describe('CSV helpers', () => {
    it.each(['=SUM(A1:A2)', '+SUM(A1:A2)', '-SUM(A1:A2)', '@SUM(A1:A2)'])(
      'neutralizes formula-like CSV values: %s',
      (value) => {
        expect(internals.escapeCsvValue(value)).toBe(`"'${value}"`);
      }
    );

    it('escapes quotes in CSV values', () => {
      expect(internals.escapeCsvValue('He said "hello"')).toBe('"He said ""hello"""');
    });

    it('formats CSV dates with an explicit UK timezone', () => {
      expect(internals.formatCsvDate('2026-07-21T23:30:00.000Z')).toBe('22/07/2026');
    });
  });

  describe('validateWordLimits', () => {
    it('rejects limited responses over 150 words', () => {
      const overLimitResponse = Array.from({ length: 151 }, (_, index) => `word${index}`).join(' ');

      expect(() =>
        internals.validateWordLimits({
          academicYear: '2025/26',
          leadershipRolesDescription: overLimitResponse,
        })
      ).toThrow(BadRequestException);
    });

    it('allows limited responses of 150 words', () => {
      const limitResponse = Array.from({ length: 150 }, (_, index) => `word${index}`).join(' ');

      expect(() =>
        internals.validateWordLimits({
          academicYear: '2025/26',
          leadershipRolesDescription: limitResponse,
          payItForwardDescription: limitResponse,
          subSaharanAfricaActivitiesDescription: limitResponse,
        })
      ).not.toThrow();
    });
  });

  describe('upsertAnnualUpdate', () => {
    it('uses the scholar/academic-year unique target for conflict-safe upserts', async () => {
      const annualUpdate = {
        id: 'annual-update-1',
        scholarId: 'scholar-1',
        academicYear: '2025/26',
        status: 'draft',
      };
      const returning = jest.fn().mockResolvedValue([annualUpdate]);
      const onConflictDoUpdate = jest.fn().mockReturnValue({ returning });
      const values = jest.fn().mockReturnValue({ onConflictDoUpdate });
      mockDb.insert.mockReturnValue({ values });

      await expect(
        internals.upsertAnnualUpdate('scholar-1', { academicYear: '2025/26' }, 'draft')
      ).resolves.toBe(annualUpdate);

      expect(onConflictDoUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.any(Array),
          set: expect.objectContaining({
            scholarId: 'scholar-1',
            academicYear: '2025/26',
            status: 'draft',
          }),
          setWhere: expect.any(Object),
        })
      );
    });

    it('throws a clean conflict when the upsert cannot update a submitted row', async () => {
      const returning = jest.fn().mockResolvedValue([]);
      const onConflictDoUpdate = jest.fn().mockReturnValue({ returning });
      const values = jest.fn().mockReturnValue({ onConflictDoUpdate });
      mockDb.insert.mockReturnValue({ values });

      await expect(
        internals.upsertAnnualUpdate('scholar-1', { academicYear: '2025/26' }, 'draft')
      ).rejects.toThrow(ConflictException);
    });
  });
});

type AnnualUpdatesServiceInternals = AnnualUpdatesService & {
  escapeCsvValue: (value: unknown) => string;
  formatCsvDate: (value: Date | string | null | undefined) => string;
  upsertAnnualUpdate: (
    scholarId: string,
    dto: UpsertAnnualUpdateDto,
    status: 'draft' | 'submitted'
  ) => Promise<unknown>;
  validateWordLimits: (dto: UpsertAnnualUpdateDto) => void;
};
