import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  COORDINATOR_TEXT_MAX_LENGTH,
  CreateCoordinatorNoteDto,
  CreateMeetingUpdateDto,
} from './coordinator-notes.dto';

describe('Coordinator notes DTOs', () => {
  it('rejects an empty note body', async () => {
    const dto = plainToInstance(CreateCoordinatorNoteDto, { body: '' });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'body')).toBe(true);
  });

  it('rejects a meeting with no notes, concern, or further action', async () => {
    const dto = plainToInstance(CreateMeetingUpdateDto, { meetingDate: '2026-09-03' });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'meetingDate')).toBe(true);
  });

  it('accepts a meeting with only a concern', async () => {
    const dto = plainToInstance(CreateMeetingUpdateDto, {
      meetingDate: '2026-09-03',
      concern: 'Missed the last check-in',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects a note body over the text cap', async () => {
    const dto = plainToInstance(CreateCoordinatorNoteDto, {
      body: 'x'.repeat(COORDINATOR_TEXT_MAX_LENGTH + 1),
    });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'body')).toBe(true);
  });

  it('rejects a non ISO date', async () => {
    const dto = plainToInstance(CreateMeetingUpdateDto, {
      meetingDate: '03/09/2026',
      notes: 'Weekly catch-up',
    });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'meetingDate')).toBe(true);
  });
});
