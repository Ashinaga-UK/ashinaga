import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class AttachmentDto {
  @IsOptional()
  @IsUUID('4')
  attachmentId?: string;

  @IsNotEmpty()
  @IsString()
  fileName: string;

  @IsNotEmpty()
  @IsString()
  fileKey: string;

  @IsOptional()
  @IsString()
  fileSize?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;
}

export class CompleteTaskDto {
  @IsOptional()
  @IsString()
  responseText?: string;

  @ValidateIf((dto: CompleteTaskDto) => dto.linkUrl != null && dto.linkUrl !== '')
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'], require_tld: false })
  linkUrl?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachmentIds?: AttachmentDto[];
}
