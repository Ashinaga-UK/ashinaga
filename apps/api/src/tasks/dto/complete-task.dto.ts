import { IsArray, IsOptional, IsString, ValidateIf } from 'class-validator';

export class AttachmentDto {
  attachmentId: string;
  fileName?: string;
  fileSize?: string;
  mimeType?: string;
  fileKey?: string;
}

export class CompleteTaskDto {
  @IsOptional()
  @IsString()
  responseText?: string;

  @ValidateIf((o) => o.attachmentIds !== undefined)
  @IsArray()
  attachmentIds?: (string | AttachmentDto)[]; // Array of file IDs or attachment objects
}
