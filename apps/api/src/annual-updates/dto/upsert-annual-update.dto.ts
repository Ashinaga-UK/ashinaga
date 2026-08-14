import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export const ANNUAL_UPDATE_COUNT_MAX = 1000;
export const ACADEMIC_YEAR_PATTERN = /^\d{4}\/\d{2}$/;

export class UpsertAnnualUpdateDto {
  @IsString()
  @IsNotEmpty()
  @Matches(ACADEMIC_YEAR_PATTERN, {
    message: 'academicYear must be in YYYY/YY format',
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
