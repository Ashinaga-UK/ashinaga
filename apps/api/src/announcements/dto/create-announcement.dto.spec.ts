import 'reflect-metadata';
import { describe, expect, it } from '@jest/globals';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateAnnouncementDto } from './create-announcement.dto';

describe('CreateAnnouncementDto', () => {
  it('normalizes null filters to an empty audience', async () => {
    const dto = plainToInstance(CreateAnnouncementDto, {
      title: 'Update',
      content: 'Announcement content',
      filters: null,
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.filters).toEqual([]);
  });

  it('trims filter values and rejects unknown types', async () => {
    const validDto = plainToInstance(CreateAnnouncementDto, {
      title: 'Update',
      content: 'Announcement content',
      filters: [{ filterType: 'program', filterValue: ' Medicine ' }],
    });
    const invalidDto = plainToInstance(CreateAnnouncementDto, {
      title: 'Update',
      content: 'Announcement content',
      filters: [{ filterType: 'programme', filterValue: 'Medicine' }],
    });

    expect(await validate(validDto)).toHaveLength(0);
    expect(validDto.filters?.[0]?.filterValue).toBe('Medicine');
    expect((await validate(invalidDto)).some((error) => error.property === 'filters')).toBe(true);
  });
});
