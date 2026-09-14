import 'reflect-metadata';
import { describe, expect, it } from '@jest/globals';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';

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

  it('normalizes null filters to an empty audience', async () => {
    const dto = plainToInstance(CreateResourceDto, {
      title: 'Scholar Handbook',
      description: 'Reference material',
      type: 'Handbook',
      category: 'Handbook',
      url: 'https://docs.example/handbook',
      filters: null,
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.filters).toEqual([]);
  });

  it('normalizes null filters on partial updates', async () => {
    const dto = plainToInstance(UpdateResourceDto, { filters: null });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.filters).toEqual([]);
  });

  it('trims filter values at the API boundary', async () => {
    const dto = plainToInstance(CreateResourceDto, {
      title: 'Scholar Handbook',
      description: 'Reference material',
      type: 'Handbook',
      category: 'Handbook',
      url: 'https://docs.example/handbook',
      filters: [{ filterType: 'program', filterValue: ' Medicine ' }],
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.filters?.[0]?.filterValue).toBe('Medicine');
  });

  it('accepts a file resource without a URL', async () => {
    const dto = plainToInstance(CreateResourceDto, {
      title: 'Scholar Handbook',
      description: 'Reference material',
      type: 'Handbook',
      category: 'Handbook',
      sourceType: 'file',
      pendingFileKey: 'resources/pending/upload-1-handbook.pdf',
      fileName: 'handbook.pdf',
      fileMimeType: 'application/pdf',
      fileSizeBytes: 2048,
    });

    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects a file resource without a pending file key', async () => {
    const dto = plainToInstance(CreateResourceDto, {
      title: 'Scholar Handbook',
      description: 'Reference material',
      type: 'Handbook',
      category: 'Handbook',
      sourceType: 'file',
      fileName: 'handbook.pdf',
      fileMimeType: 'application/pdf',
      fileSizeBytes: 2048,
    });

    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'pendingFileKey')).toBe(true);
  });
});
