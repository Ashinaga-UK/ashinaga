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

// New DTOs for detailed scholar profile
export class GoalDto {
  id: string;
  title: string;
  description?: string | null;
  category: 'academic' | 'career' | 'leadership' | 'personal' | 'community';
  targetDate: Date;
  progress: number;
  status: 'pending' | 'in_progress' | 'completed';
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class TaskDto {
  id: string;
  title: string;
  description?: string | null;
  type:
    | 'document_upload'
    | 'form_completion'
    | 'meeting_attendance'
    | 'goal_update'
    | 'feedback_submission'
    | 'other';
  priority: 'high' | 'medium' | 'low';
  dueDate: Date;
  status: 'pending' | 'in_progress' | 'completed';
  assignedBy: string;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class DocumentDto {
  id: string;
  name: string;
  type: string;
  mimeType: string;
  size: string;
  url: string;
  uploadedBy: string;
  uploadDate: Date;
  createdAt: Date;
  updatedAt: Date;
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

// New DTO for detailed scholar profile
export class ScholarProfileDto {
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
  goals: GoalDto[];
  tasks: TaskDto[];
  documents: DocumentDto[];
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
