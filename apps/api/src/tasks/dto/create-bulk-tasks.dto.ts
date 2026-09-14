import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { TASK_TYPES, type TaskType } from '../task-evidence';

export class CreateBulkTasksDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsEnum(TASK_TYPES)
  type: TaskType;

  @IsOptional()
  @IsEnum(['high', 'medium', 'low'])
  priority?: 'high' | 'medium' | 'low';

  @IsNotEmpty()
  @IsDateString()
  dueDate: string;

  @ValidateIf((dto: CreateBulkTasksDto) => dto.programStage == null)
  @IsArray()
  @ArrayMinSize(1, { message: 'Select at least one scholar' })
  @IsUUID('4', { each: true })
  scholarIds?: string[];

  @IsOptional()
  @IsEnum(['prep_year'])
  programStage?: 'prep_year';

  @IsOptional()
  @IsString()
  phase?: string;

  @IsOptional()
  @IsBoolean()
  requiresResponse?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresAttachment?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresLink?: boolean;
}
