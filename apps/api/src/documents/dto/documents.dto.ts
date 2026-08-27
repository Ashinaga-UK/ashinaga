import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  DOCUMENT_DOWNLOAD_DISPOSITIONS,
  DOCUMENT_FILE_MAX_SIZE_BYTES,
} from '../document-files';

export class CreateDocumentUploadUrlDto {
  @IsUUID()
  typeId: string;

  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsIn(ALLOWED_DOCUMENT_MIME_TYPES)
  fileType: (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number];

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(DOCUMENT_FILE_MAX_SIZE_BYTES)
  fileSize: number;
}

export class ConfirmDocumentUploadDto {
  @IsUUID()
  typeId: string;

  @IsString()
  @IsNotEmpty()
  pendingFileKey: string;

  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsIn(ALLOWED_DOCUMENT_MIME_TYPES)
  fileMimeType: (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number];

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(DOCUMENT_FILE_MAX_SIZE_BYTES)
  fileSizeBytes: number;
}

export class CreateRequiredDocumentTypeDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateRequiredDocumentTypeDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  label?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class DocumentDownloadQueryDto {
  @IsOptional()
  @IsIn(DOCUMENT_DOWNLOAD_DISPOSITIONS)
  disposition?: (typeof DOCUMENT_DOWNLOAD_DISPOSITIONS)[number];
}

export class GetCohortQueryDto {
  @IsOptional()
  @IsUUID()
  missingTypeId?: string;
}
