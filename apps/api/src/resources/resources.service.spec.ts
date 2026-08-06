import 'reflect-metadata';
import { describe, expect, it } from '@jest/globals';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateResourceDto } from './dto/create-resource.dto';
import { ResourcesService } from './resources.service';

type ServiceWithMatcher = {
  matchesScholarFilters: (
    filters: Array<{ type: string; value: string }>,
    scholar: Record<string, string | null>
  ) => boolean;
};

describe('ResourcesService', () => {
  describe('matchesScholarFilters', () => {
    const service = new ResourcesService();
    const serviceWithMatcher = service as unknown as ServiceWithMatcher;
    const matchesScholarFilters = (
      filters: Array<{ type: string; value: string }>,
      scholar: Record<string, string | null>
    ) => serviceWithMatcher.matchesScholarFilters(filters, scholar);

    const scholar = {
      program: 'Medicine',
      year: 'Year 1',
      university: 'Makerere University',
      location: 'Uganda',
      status: 'active',
    };

    it('matches when any value within the same filter type matches', () => {
      expect(
        matchesScholarFilters(
          [
            { type: 'program', value: 'Nursing' },
            { type: 'program', value: 'Medicine' },
          ],
          scholar
        )
      ).toBe(true);
    });

    it('requires every filter type group to match', () => {
      expect(
        matchesScholarFilters(
          [
            { type: 'program', value: 'Medicine' },
            { type: 'year', value: 'Year 2' },
          ],
          scholar
        )
      ).toBe(false);
    });

    it('matches resources with no filters for every scholar', () => {
      expect(matchesScholarFilters([], scholar)).toBe(true);
    });

    it('matches filter values case-insensitively', () => {
      expect(
        matchesScholarFilters([{ type: 'program', value: 'medicine' }], scholar)
      ).toBe(true);
      expect(
        matchesScholarFilters([{ type: 'university', value: 'makerere university' }], scholar)
      ).toBe(true);
    });

    it('rejects unknown filter types', () => {
      expect(
        matchesScholarFilters([{ type: 'programme', value: 'Medicine' }], scholar)
      ).toBe(false);
    });
  });
});

describe('CreateResourceDto', () => {
  it('rejects protocol-less URLs', async () => {
    const dto = plainToInstance(CreateResourceDto, {
      title: 'Scholar Handbook',
      description: 'Reference material',
      type: 'Handbook',
      category: 'Handbook',
      url: 'docs.example/handbook',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'url')).toBe(true);
  });

  it('validates nested filter values', async () => {
    const dto = plainToInstance(CreateResourceDto, {
      title: 'Scholar Handbook',
      description: 'Reference material',
      type: 'Handbook',
      category: 'Handbook',
      url: 'https://docs.example/handbook',
      filters: [{ filterType: 'program' }],
    });

    const errors = await validate(dto);
    const filtersError = errors.find((error) => error.property === 'filters');

    expect(filtersError?.children?.[0]?.children?.[0]?.property).toBe('filterValue');
  });

  it('rejects unknown filter types', async () => {
    const dto = plainToInstance(CreateResourceDto, {
      title: 'Scholar Handbook',
      description: 'Reference material',
      type: 'Handbook',
      category: 'Handbook',
      url: 'https://docs.example/handbook',
      filters: [{ filterType: 'programme', filterValue: 'Medicine' }],
    });

    const errors = await validate(dto);
    const filtersError = errors.find((error) => error.property === 'filters');

    expect(filtersError?.children?.[0]?.children?.[0]?.property).toBe('filterType');
  });
});
