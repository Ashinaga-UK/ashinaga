import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ExportAnnualUpdatesDto } from './export-annual-updates.dto';

describe('ExportAnnualUpdatesDto', () => {
  it('requires annualUpdateIds', async () => {
    const errors = await validate(plainToInstance(ExportAnnualUpdatesDto, {}));

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'annualUpdateIds',
          constraints: expect.objectContaining({
            isArray: expect.any(String),
          }),
        }),
      ])
    );
  });

  it('accepts a list of annual review ids', async () => {
    const errors = await validate(
      plainToInstance(ExportAnnualUpdatesDto, {
        annualUpdateIds: ['11111111-1111-4111-8111-111111111111'],
      })
    );

    expect(errors).toHaveLength(0);
  });
});
