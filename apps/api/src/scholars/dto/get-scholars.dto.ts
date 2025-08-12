import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GetScholarsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  program?: string;

  @IsOptional()
  @IsString()
  year?: string;

  @IsOptional()
  @IsString()
  university?: string;

  @IsOptional()
  @IsEnum(['active', 'inactive', 'on_hold'])
  status?: 'active' | 'inactive' | 'on_hold';

  @IsOptional()
  @IsEnum(['name', 'lastActivity', 'createdAt'])
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  @Transform(({ value }) => value?.toLowerCase())
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class ScholarGoalsStatsDto {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
}

export class ScholarTasksStatsDto {
  total: number;
  completed: number;
  overdue: number;
}

export class ScholarResponseDto {
  id: string;
  userId: string;
  name: string;
  email: string;
  image?: string | null;
  phone?: string | null;
  program: string;
  year: string;
  university: string;
  location?: string | null;
  bio?: string | null;
  status: 'active' | 'inactive' | 'on_hold';
  startDate: Date;
  lastActivity?: Date | null;
  goals: ScholarGoalsStatsDto;
  tasks: ScholarTasksStatsDto;
  createdAt: Date;
  updatedAt: Date;
}

export class PaginationMetaDto {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export class GetScholarsResponseDto {
  data: ScholarResponseDto[];
  pagination: PaginationMetaDto;
}
