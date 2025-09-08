import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateTaskDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsEnum([
    'document_upload',
    'form_completion',
    'meeting_attendance',
    'goal_update',
    'feedback_submission',
    'other',
  ])
  type:
    | 'document_upload'
    | 'form_completion'
    | 'meeting_attendance'
    | 'goal_update'
    | 'feedback_submission'
    | 'other';

  @IsOptional()
  @IsEnum(['high', 'medium', 'low'])
  priority?: 'high' | 'medium' | 'low';

  @IsNotEmpty()
  @IsDateString()
  dueDate: string;

  @IsNotEmpty()
  @IsUUID()
  scholarId: string;
}
