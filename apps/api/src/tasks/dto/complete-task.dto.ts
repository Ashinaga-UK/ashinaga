import { IsArray, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';

export class CompleteTaskDto {
  @IsOptional()
  @IsString()
  responseText?: string;

  @ValidateIf((o) => o.attachmentIds !== undefined)
  @IsArray()
  @IsUUID('4', { each: true })
  attachmentIds?: string[]; // Array of file IDs from the file upload system
}
