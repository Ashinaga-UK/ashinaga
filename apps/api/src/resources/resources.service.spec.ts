import 'reflect-metadata';
import { describe, expect, it } from '@jest/globals';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateResourceDto } from './dto/create-resource.dto';

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
