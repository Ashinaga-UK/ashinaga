import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { AnnualUpdatesService } from './annual-updates.service';
import type { UpsertAnnualUpdateDto } from './dto/upsert-annual-update.dto';

let mockDb: { insert: jest.Mock; select: jest.Mock };

jest.mock('../db/connection', () => ({
  getDatabase: jest.fn(() => mockDb),
}));

describe('AnnualUpdatesService', () => {
  let service: AnnualUpdatesService;
  let internals: AnnualUpdatesServiceInternals;

  beforeEach(() => {
    mockDb = {
      insert: jest.fn(),
      select: jest.fn(),
    };
    service = new AnnualUpdatesService();
    internals = service as unknown as AnnualUpdatesServiceInternals;
  });

  describe('CSV helpers', () => {
    it('formats CSV dates with an explicit UK timezone', () => {
      expect(internals.formatCsvDate('2026-07-21T23:30:00.000Z')).toBe('22/07/2026');
    });

    it('does not include draft answers in staff CSV exports', async () => {
      internals.getAnnualUpdatesReportRows = jest.fn().mockResolvedValue([
        {
          annualUpdate: createAnnualUpdate({
            status: 'draft',
            highlights: 'Private draft highlight',
            leadershipRolesCount: 3,
          }),
          scholarName: 'Test Scholar',
          scholarEmail: 'scholar@example.com',
          aaiScholarId: 'AAI-1',
          program: 'UK',
          year: 'Year 1',
          university: 'Test University',
          location: 'UK',
        },
      ]);

      const csv = await service.exportAnnualUpdatesCsv();

      expect(csv).toContain('"draft"');
      expect(csv).not.toContain('Private draft highlight');
      expect(csv).not.toContain('"3"');
    });
  });

  describe('prep-year write access', () => {
    it('rejects saveDraft for prep-year scholars', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ id: 's1', programStage: 'prep_year' }]),
        }),
      });

      await expect(service.saveDraft('user-1', createCompletePayload())).rejects.toBeInstanceOf(
        ForbiddenException
      );
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('rejects submit for prep-year scholars', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ id: 's1', programStage: 'prep_year' }]),
        }),
      });

      await expect(service.submit('user-1', createCompletePayload())).rejects.toBeInstanceOf(
        ForbiddenException
      );
      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });

  describe('getAnnualUpdatesReport', () => {
    it('returns metadata without essay answers', async () => {
      const orderBy = jest.fn().mockResolvedValue([
        {
          id: 'annual-update-1',
          scholarId: 'scholar-1',
          academicYear: '2025/26',
          status: 'submitted',
          submittedAt: new Date('2026-07-21T12:00:00.000Z'),
          updatedAt: new Date('2026-07-21T12:00:00.000Z'),
          scholarName: 'Test Scholar',
          scholarEmail: 'scholar@example.com',
          aaiScholarId: 'AAI-1',
          scholarYear: 'Year 1',
          university: 'Test University',
        },
      ]);
      const innerJoinUsers = jest.fn().mockReturnValue({ orderBy });
      const innerJoinScholars = jest.fn().mockReturnValue({ innerJoin: innerJoinUsers });
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({ innerJoin: innerJoinScholars }),
      });

      const rows = await service.getAnnualUpdatesReport();
      const [row] = rows;

      expect(Array.isArray(rows)).toBe(true);

      expect(row).toEqual(
        expect.objectContaining({
          id: 'annual-update-1',
          scholarName: 'Test Scholar',
          academicYear: '2025/26',
          status: 'submitted',
        })
      );
      expect(row).not.toHaveProperty('highlights');
      expect(row).not.toHaveProperty('leadershipRolesCount');
    });
  });

  describe('hideDraftAnswersForStaff', () => {
    it('removes answer fields from draft annual reviews', () => {
      const draft = internals.hideDraftAnswersForStaff(
        createAnnualUpdate({
          status: 'draft',
          highlights: 'Private draft highlight',
          leadershipRolesCount: 3,
        })
      );

      expect(draft.status).toBe('draft');
      expect(draft.academicYear).toBe('2025/26');
      expect(draft.highlights).toBeNull();
      expect(draft.leadershipRolesCount).toBeNull();
    });

    it('keeps submitted answer fields visible to staff', () => {
      const submitted = internals.hideDraftAnswersForStaff(
        createAnnualUpdate({
          status: 'submitted',
          highlights: 'Submitted highlight',
          leadershipRolesCount: 3,
        })
      );

      expect(submitted.highlights).toBe('Submitted highlight');
      expect(submitted.leadershipRolesCount).toBe(3);
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

  describe('validateRequiredFields', () => {
    it('requires all annual review answers before final submission', () => {
      expect(() =>
        internals.validateRequiredFields({
          academicYear: '2025/26',
        })
      ).toThrow(BadRequestException);
    });

    it('reports the missing required fields', () => {
      const payload = {
        academicYear: '2025/26',
        highlights: 'Highlights',
      };

      expect(() => internals.validateRequiredFields(payload)).toThrow(BadRequestException);

      try {
        internals.validateRequiredFields(payload);
      } catch (error) {
        expect((error as BadRequestException).getResponse()).toEqual(
          expect.objectContaining({
            message: 'Please complete all required fields before submitting.',
            missingFields: expect.arrayContaining([
              'Part-time jobs',
              'Number of leadership roles',
              'Ashinaga 8-week internship answer',
              'Academic year weighted grade',
            ]),
          })
        );
      }
    });

    it('rejects a null Ashinaga internship answer', () => {
      expect(() =>
        internals.validateRequiredFields({
          ...createCompletePayload(),
          completedAshinagaAfricaInternship: null,
        } as UpsertAnnualUpdateDto)
      ).toThrow(BadRequestException);
    });

    it('allows a complete final submission payload', () => {
      expect(() => internals.validateRequiredFields(createCompletePayload())).not.toThrow();
    });

    it('allows a submitted internship answer of false', () => {
      expect(() =>
        internals.validateRequiredFields(
          createCompletePayload({ completedAshinagaAfricaInternship: false })
        )
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

  describe('getMyDraftAnnualUpdate', () => {
    it('returns the latest draft for the scholar', async () => {
      const draft = {
        id: 'annual-update-1',
        scholarId: 'scholar-1',
        academicYear: '2024/25',
        status: 'draft',
      };
      const scholarWhere = jest.fn().mockResolvedValue([{ id: 'scholar-1', userId: 'user-1' }]);
      const draftLimit = jest.fn().mockResolvedValue([draft]);
      const draftOrderBy = jest.fn().mockReturnValue({ limit: draftLimit });
      const draftWhere = jest.fn().mockReturnValue({ orderBy: draftOrderBy });
      const scholarFrom = jest.fn().mockReturnValue({ where: scholarWhere });
      const draftFrom = jest.fn().mockReturnValue({ where: draftWhere });

      mockDb.select.mockReturnValueOnce({ from: scholarFrom }).mockReturnValueOnce({
        from: draftFrom,
      });

      await expect(service.getMyDraftAnnualUpdate('user-1')).resolves.toBe(draft);
    });
  });
});

type AnnualUpdatesServiceInternals = AnnualUpdatesService & {
  formatCsvDate: (value: Date | string | null | undefined) => string;
  getAnnualUpdatesReportRows: jest.Mock;
  hideDraftAnswersForStaff: (annualUpdate: AnnualUpdateFixture) => AnnualUpdateFixture;
  upsertAnnualUpdate: (
    scholarId: string,
    dto: UpsertAnnualUpdateDto,
    status: 'draft' | 'submitted'
  ) => Promise<unknown>;
  validateWordLimits: (dto: UpsertAnnualUpdateDto) => void;
  validateRequiredFields: (dto: UpsertAnnualUpdateDto) => void;
};

type AnnualUpdateFixture = {
  id: string;
  scholarId: string;
  academicYear: string;
  status: 'draft' | 'submitted';
  highlights: string | null;
  partTimeJobs: string | null;
  extracurriculars: string | null;
  leadershipRolesDescription: string | null;
  leadershipRolesCount: number | null;
  payItForwardDescription: string | null;
  payItForwardCount: number | null;
  subSaharanAfricaActivitiesDescription: string | null;
  subSaharanAfricaActivitiesCount: number | null;
  independentInternshipsCount: number | null;
  internshipsInAfricaSummary: string | null;
  internshipsElsewhereSummary: string | null;
  completedAshinagaAfricaInternship: boolean | null;
  academicYearAverageClassification: string | null;
  academicYearWeightedGrade: string | null;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function createAnnualUpdate(overrides: Partial<AnnualUpdateFixture> = {}): AnnualUpdateFixture {
  const now = new Date('2026-07-21T12:00:00.000Z');

  return {
    id: 'annual-update-1',
    scholarId: 'scholar-1',
    academicYear: '2025/26',
    status: 'submitted',
    highlights: 'Highlights',
    partTimeJobs: 'Part-time jobs',
    extracurriculars: 'Extracurriculars',
    leadershipRolesDescription: 'Leadership roles',
    leadershipRolesCount: 1,
    payItForwardDescription: 'Pay it forward',
    payItForwardCount: 2,
    subSaharanAfricaActivitiesDescription: 'Africa activities',
    subSaharanAfricaActivitiesCount: 3,
    independentInternshipsCount: 4,
    internshipsInAfricaSummary: 'Africa internship',
    internshipsElsewhereSummary: 'Elsewhere internship',
    completedAshinagaAfricaInternship: true,
    academicYearAverageClassification: '1st',
    academicYearWeightedGrade: '70%',
    submittedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createCompletePayload(
  overrides: Partial<UpsertAnnualUpdateDto> = {}
): UpsertAnnualUpdateDto {
  return {
    academicYear: '2025/26',
    highlights: 'Highlights',
    partTimeJobs: 'Part-time jobs',
    extracurriculars: 'Extracurriculars',
    leadershipRolesDescription: 'Leadership roles',
    leadershipRolesCount: 1,
    payItForwardDescription: 'Pay it forward',
    payItForwardCount: 2,
    subSaharanAfricaActivitiesDescription: 'Africa activities',
    subSaharanAfricaActivitiesCount: 3,
    independentInternshipsCount: 4,
    internshipsInAfricaSummary: 'Africa internship',
    internshipsElsewhereSummary: 'Elsewhere internship',
    completedAshinagaAfricaInternship: true,
    academicYearAverageClassification: '1st',
    academicYearWeightedGrade: '70%',
    ...overrides,
  };
}
