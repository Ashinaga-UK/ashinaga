import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { requestTypeEnum } from '../../db/schema';
import type { SubmissionRequestType } from '../submission-report';

export class GetSubmissionReportQueryDto {
  @IsOptional()
  @IsString()
  program?: string;

  @IsOptional()
  @IsString()
  year?: string;

  @IsOptional()
  @IsEnum(requestTypeEnum.enumValues)
  type?: SubmissionRequestType;

  /** Inclusive start on requests.submitted_date. */
  @IsOptional()
  @IsDateString()
  from?: string;

  /** Inclusive end for a date-only value, on requests.submitted_date. */
  @IsOptional()
  @IsDateString()
  to?: string;
}
