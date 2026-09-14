import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PREP_TASK_COHORT_STATES, type PrepTaskCohortState } from '../prep-task-cohort';

export class GetTaskCohortQueryDto {
  @IsOptional()
  @IsString()
  phase?: string;

  @IsOptional()
  @IsUUID()
  scholarId?: string;

  @IsOptional()
  @IsUUID()
  assignmentGroupId?: string;

  @IsOptional()
  @IsString()
  columnKey?: string;

  @IsOptional()
  @IsIn(PREP_TASK_COHORT_STATES)
  state?: PrepTaskCohortState;
}
