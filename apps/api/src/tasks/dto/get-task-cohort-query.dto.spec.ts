import 'reflect-metadata';
import { describe, expect, it } from '@jest/globals';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { GetTaskCohortQueryDto } from './get-task-cohort-query.dto';

describe('GetTaskCohortQueryDto', () => {
  it('accepts an empty query', async () => {
    expect(await validate(plainToInstance(GetTaskCohortQueryDto, {}))).toHaveLength(0);
  });

  it('accepts the five completion states and UUIDs', async () => {
    const dto = plainToInstance(GetTaskCohortQueryDto, {
      phase: 'english',
      scholarId: '11111111-1111-4111-8111-111111111111',
      assignmentGroupId: '22222222-2222-4222-8222-222222222222',
      state: 'overdue',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects an unknown state and a non-UUID scholarId', async () => {
    const dto = plainToInstance(GetTaskCohortQueryDto, {
      scholarId: 'not-a-uuid',
      state: 'submitted',
    });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'state')).toBe(true);
    expect(errors.some((error) => error.property === 'scholarId')).toBe(true);
  });
});
