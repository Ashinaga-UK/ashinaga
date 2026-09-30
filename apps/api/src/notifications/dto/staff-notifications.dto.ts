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
import type { StaffFeedKind } from '../notification-kinds';

export class GetStaffFeedQueryDto {
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

export class MarkStaffNotificationsReadDto {
  @ValidateIf((o) => !o.all)
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  ids?: string[];

  @ValidateIf((o) => !o.ids?.length)
  @IsBoolean()
  all?: boolean;
}

export class StaffNotificationDto {
  id: string;
  kind: StaffFeedKind;
  title: string;
  body: string;
  scholarId: string | null;
  scholarName: string | null;
  entityType: string;
  entityId: string;
  href: string;
  requestType: string | null;
  readAt: Date | null;
  createdAt: Date;
}

export class StaffFeedResponseDto {
  items: StaffNotificationDto[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
}

export type CreateStaffNotificationInput = {
  recipientUserId: string;
  kind: StaffFeedKind;
  title: string;
  body: string;
  scholarId?: string | null;
  scholarName?: string | null;
  entityType: string;
  entityId: string;
  href: string;
  requestType?: string | null;
  dedupeSuffix?: string;
};
