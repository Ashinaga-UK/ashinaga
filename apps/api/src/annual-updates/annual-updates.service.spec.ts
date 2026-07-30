import { BadRequestException } from '@nestjs/common';
import { AnnualUpdatesService } from './annual-updates.service';
import type { UpsertAnnualUpdateDto } from './dto/upsert-annual-update.dto';

jest.mock('../db/connection', () => ({
  getDatabase: jest.fn(() => ({})),
}));

describe('AnnualUpdatesService', () => {
  let service: AnnualUpdatesService;
  let internals: AnnualUpdatesServiceInternals;

  beforeEach(() => {
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
});

type AnnualUpdatesServiceInternals = AnnualUpdatesService & {
  escapeCsvValue: (value: unknown) => string;
  formatCsvDate: (value: Date | string | null | undefined) => string;
  validateWordLimits: (dto: UpsertAnnualUpdateDto) => void;
};
