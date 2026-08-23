import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ANNUAL_UPDATE_COUNT_MAX, UpsertAnnualUpdateDto } from './upsert-annual-update.dto';

describe('UpsertAnnualUpdateDto', () => {
  it.each([
    'leadershipRolesCount',
    'payItForwardCount',
    'subSaharanAfricaActivitiesCount',
    'independentInternshipsCount',
  ] as const)('rejects decimal values for %s', async (field) => {
    const errors = await validateDto({ academicYear: '2025/26', [field]: 1.5 });

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: field,
          constraints: expect.objectContaining({
            isInt: expect.any(String),
          }),
        }),
      ])
    );
  });

  it.each([
    'leadershipRolesCount',
    'payItForwardCount',
    'subSaharanAfricaActivitiesCount',
    'independentInternshipsCount',
  ] as const)('rejects negative values for %s', async (field) => {
    const errors = await validateDto({ academicYear: '2025/26', [field]: -1 });

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: field,
          constraints: expect.objectContaining({
            min: expect.any(String),
          }),
        }),
      ])
    );
  });

  it.each([
    'leadershipRolesCount',
    'payItForwardCount',
    'subSaharanAfricaActivitiesCount',
    'independentInternshipsCount',
  ] as const)('rejects values over the domain cap for %s', async (field) => {
    const errors = await validateDto({
      academicYear: '2025/26',
      [field]: ANNUAL_UPDATE_COUNT_MAX + 1,
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: field,
          constraints: expect.objectContaining({
            max: expect.any(String),
          }),
        }),
      ])
    );
  });

  it('rejects non-boolean Ashinaga internship answers', async () => {
    const errors = await validateDto({
      academicYear: '2025/26',
      completedAshinagaAfricaInternship: 'yes',
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'completedAshinagaAfricaInternship',
          constraints: expect.objectContaining({
            isBoolean: expect.any(String),
          }),
        }),
      ])
    );
  });

  it('rejects null Ashinaga internship answers', async () => {
    const errors = await validateDto({
      academicYear: '2025/26',
      completedAshinagaAfricaInternship: null,
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'completedAshinagaAfricaInternship',
          constraints: expect.objectContaining({
            isBoolean: expect.any(String),
          }),
        }),
      ])
    );
  });

  it('rejects an empty academic year', async () => {
    const errors = await validateDto({ academicYear: '' });

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'academicYear',
          constraints: expect.objectContaining({
            isNotEmpty: expect.any(String),
          }),
        }),
      ])
    );
  });

  it.each(['2025', '2025/2026', '25/26', '2025-26'])(
    'rejects invalid academic year format: %s',
    async (academicYear) => {
      const errors = await validateDto({ academicYear });

      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            property: 'academicYear',
            constraints: expect.objectContaining({
              matches: expect.any(String),
            }),
          }),
        ])
      );
    }
  );

  it('accepts omitted Ashinaga internship answers', async () => {
    const errors = await validateDto({ academicYear: '2025/26' });

    expect(errors).toHaveLength(0);
  });

  it('accepts valid whole-number counts and boolean answers', async () => {
    const errors = await validateDto({
      academicYear: '2025/26',
      leadershipRolesCount: 0,
      payItForwardCount: 1,
      subSaharanAfricaActivitiesCount: ANNUAL_UPDATE_COUNT_MAX,
      independentInternshipsCount: 3,
      completedAshinagaAfricaInternship: false,
    });

    expect(errors).toHaveLength(0);
  });
});

function validateDto(payload: Record<string, unknown>) {
  return validate(plainToInstance(UpsertAnnualUpdateDto, payload));
}
