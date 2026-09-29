import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { REQUEST_TYPES, type RequestType } from '../../requests/request-types';
import {
  SUBMISSION_KINDS,
  SUBMISSION_STATUS_FILTERS,
  type SubmissionKind,
  type SubmissionStatusFilter,
} from '../submission-report';

export class GetSubmissionReportQueryDto {
  @IsOptional()
  @IsString()
  program?: string;

  @IsOptional()
  @IsString()
  year?: string;

  @IsOptional()
  @IsIn(SUBMISSION_KINDS)
  kind?: SubmissionKind;

  @IsOptional()
  @IsIn(REQUEST_TYPES)
  requestType?: RequestType;

  @IsOptional()
  @IsIn(SUBMISSION_STATUS_FILTERS)
  status?: SubmissionStatusFilter;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsUUID()
  scholarId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
