import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GetRequestsQueryDto {
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
  @IsEnum([
    'extenuating_circumstances',
    'summer_funding_request',
    'summer_funding_report',
    'requirement_submission',
  ])
  type?:
    | 'extenuating_circumstances'
    | 'summer_funding_request'
    | 'summer_funding_report'
    | 'requirement_submission';

  @IsOptional()
  @IsEnum(['pending', 'approved', 'rejected', 'reviewed', 'commented'])
  status?: 'pending' | 'approved' | 'rejected' | 'reviewed' | 'commented';

  @IsOptional()
  @IsEnum(['high', 'medium', 'low'])
  priority?: 'high' | 'medium' | 'low';

  @IsOptional()
  @IsEnum(['submittedDate', 'status', 'priority', 'createdAt'])
  sortBy?: string = 'submittedDate';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  @Transform(({ value }) => value?.toLowerCase())
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class RequestAttachmentDto {
  id: string;
  name: string;
  size: string;
  url: string;
  mimeType: string;
  uploadedAt: Date;
}

export class RequestAuditLogDto {
  id: string;
  action: string;
  performedBy: string;
  previousStatus?: 'pending' | 'approved' | 'rejected' | 'reviewed' | 'commented';
  newStatus?: 'pending' | 'approved' | 'rejected' | 'reviewed' | 'commented';
  comment?: string | null;
  metadata?: string | null;
  createdAt: Date;
}

export class RequestResponseDto {
  id: string;
  scholarId: string;
  scholarName: string;
  scholarEmail: string;
  type:
    | 'extenuating_circumstances'
    | 'summer_funding_request'
    | 'summer_funding_report'
    | 'requirement_submission';
  description: string;
  formData?: Record<string, any> | null;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'approved' | 'rejected' | 'reviewed' | 'commented';
  submittedDate: Date;
  reviewedBy?: string | null;
  reviewComment?: string | null;
  reviewDate?: Date | null;
  attachments: RequestAttachmentDto[];
  auditLogs: RequestAuditLogDto[];
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

export class GetRequestsResponseDto {
  data: RequestResponseDto[];
  pagination: PaginationMetaDto;
}
