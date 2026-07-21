import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpsertAnnualUpdateDto {
  @IsString()
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
  leadershipRolesCount?: number;

  @IsOptional()
  @IsString()
  payItForwardDescription?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  payItForwardCount?: number;

  @IsOptional()
  @IsString()
  subSaharanAfricaActivitiesDescription?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  subSaharanAfricaActivitiesCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  independentInternshipsCount?: number;

  @IsOptional()
  @IsString()
  internshipsInAfricaSummary?: string;

  @IsOptional()
  @IsString()
  internshipsElsewhereSummary?: string;

  @IsOptional()
  @IsBoolean()
  completedAshinagaAfricaInternship?: boolean;

  @IsOptional()
  @IsString()
  academicYearAverageClassification?: string;

  @IsOptional()
  @IsString()
  academicYearWeightedGrade?: string;
}
