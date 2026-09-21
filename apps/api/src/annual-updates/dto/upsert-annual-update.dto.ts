import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { IsConsecutiveAcademicYear } from './is-consecutive-academic-year';

export const ANNUAL_UPDATE_COUNT_MAX = 1000;

export class UpsertAnnualUpdateDto {
  @IsString()
  @IsNotEmpty()
  @IsConsecutiveAcademicYear({
    message: 'academicYear must be a consecutive teaching year in YYYY/YYYY or YYYY/YY format',
  })
  academicYear: string;

  @IsOptional()
  @IsString()
  highlights?: string;

  @IsOptional()
  @IsString()
  partTimeJobs?: string;

  @IsOptional()
  @IsString()
  extracurriculars?: string;

  @IsOptional()
  @IsString()
  leadershipRolesDescription?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(ANNUAL_UPDATE_COUNT_MAX)
  leadershipRolesCount?: number;

  @IsOptional()
  @IsString()
  payItForwardDescription?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(ANNUAL_UPDATE_COUNT_MAX)
  payItForwardCount?: number;

  @IsOptional()
  @IsString()
  subSaharanAfricaActivitiesDescription?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(ANNUAL_UPDATE_COUNT_MAX)
  subSaharanAfricaActivitiesCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(ANNUAL_UPDATE_COUNT_MAX)
  independentInternshipsCount?: number;

  @IsOptional()
  @IsString()
  internshipsInAfricaSummary?: string;

  @IsOptional()
  @IsString()
  internshipsElsewhereSummary?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  completedAshinagaAfricaInternship?: boolean;

  @IsOptional()
  @IsString()
  academicYearAverageClassification?: string;

  @IsOptional()
  @IsString()
  academicYearWeightedGrade?: string;
}
