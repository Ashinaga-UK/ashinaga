import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { TASK_TYPES, type TaskType } from '../task-evidence';

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
    enum: TASK_TYPES,
  })
  @IsOptional()
  @IsEnum(TASK_TYPES)
  type?: TaskType;

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

  @ApiPropertyOptional({ description: 'Programme phase label' })
  @IsOptional()
  @IsString()
  phase?: string | null;

  @ApiPropertyOptional({ description: 'Whether a written response is required' })
  @IsOptional()
  @IsBoolean()
  requiresResponse?: boolean;

  @ApiPropertyOptional({ description: 'Whether a file upload is required' })
  @IsOptional()
  @IsBoolean()
  requiresAttachment?: boolean;

  @ApiPropertyOptional({ description: 'Whether a link is required' })
  @IsOptional()
  @IsBoolean()
  requiresLink?: boolean;
}
