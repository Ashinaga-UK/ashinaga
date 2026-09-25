import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import type { ScholarFeedKind } from '../notification-kinds';

export class GetScholarFeedQueryDto {
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
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;
}

export class MarkScholarNotificationsReadDto {
  @ValidateIf((o) => !o.all)
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  ids?: string[];

  @ValidateIf((o) => !o.ids?.length)
  @IsBoolean()
  all?: boolean;
}

export class ScholarNotificationDto {
  id: string;
  kind: ScholarFeedKind;
  title: string;
  body: string;
  entityType: string;
  entityId: string;
  href: string;
  readAt: Date | null;
  createdAt: Date;
}

export class ScholarFeedResponseDto {
  items: ScholarNotificationDto[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
}

export type CreateScholarNotificationInput = {
  recipientUserId: string;
  kind: ScholarFeedKind;
  title: string;
  body: string;
  entityType: string;
  entityId: string;
  href: string;
  dedupeSuffix?: string;
};
