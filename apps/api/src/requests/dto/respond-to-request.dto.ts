import { ArrayMaxSize, IsArray, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class RespondToRequestDto {
  @IsString()
  @MinLength(1, { message: 'Add a short note about the additional information you are providing.' })
  comment: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMaxSize(20)
  @IsOptional()
  attachmentIds?: string[];
}

export class RespondToRequestResponseDto {
  id: string;
  status: string;
  updatedAt: Date;
}
