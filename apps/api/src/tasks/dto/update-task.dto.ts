import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTaskDto {
  @ApiPropertyOptional({ description: 'The title of the task' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'The description of the task' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'The type of task',
    enum: [
      'document_upload',
      'form_completion',
      'meeting_attendance',
      'goal_update',
      'feedback_submission',
      'other',
    ],
  })
  @IsOptional()
  @IsEnum([
    'document_upload',
    'form_completion',
    'meeting_attendance',
    'goal_update',
    'feedback_submission',
    'other',
  ])
  type?:
    | 'document_upload'
    | 'form_completion'
    | 'meeting_attendance'
    | 'goal_update'
    | 'feedback_submission'
    | 'other';

  @ApiPropertyOptional({
    description: 'The priority of the task',
    enum: ['high', 'medium', 'low'],
  })
  @IsOptional()
  @IsEnum(['high', 'medium', 'low'])
  priority?: 'high' | 'medium' | 'low';

  @ApiPropertyOptional({ description: 'The due date of the task' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}