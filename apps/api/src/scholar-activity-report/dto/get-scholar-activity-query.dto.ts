import { Transform, Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import type {
  ScholarActivitySortBy,
  ScholarActivitySortOrder,
  ScholarActivityStage,
  ScholarActivityStatus,
} from '../scholar-activity-report';

export class GetScholarActivityQueryDto {
  @IsOptional()
  @IsString()
  program?: string;

  @IsOptional()
  @IsString()
  year?: string;

  @IsOptional()
  @IsEnum(['prep_year', 'scholar'])
  programStage?: ScholarActivityStage;

  @IsOptional()
  @IsString()
  nationality?: string;

  /** Programme status. Omitted means active. `all` includes every status. */
  @IsOptional()
  @IsEnum(['active', 'inactive', 'on_hold', 'archived', 'all'])
  status?: ScholarActivityStatus | 'all';

  /** Inclusive start. Applies to tasks.completed_at and goals.updated_at, not last seen. */
  @IsOptional()
  @IsDateString()
  from?: string;

  /** Inclusive end for a date-only value. Applies to tasks.completed_at and goals.updated_at. */
  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsEnum(['name', 'lastActivity', 'taskCompletionRate'])
  sortBy?: ScholarActivitySortBy;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase() : value))
  sortOrder?: ScholarActivitySortOrder;

  /** JSON page. CSV export ignores this and returns every matching scholar. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  /** JSON page size. CSV export ignores this. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
