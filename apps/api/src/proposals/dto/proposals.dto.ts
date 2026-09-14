import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  ALLOWED_PROPOSAL_MIME_TYPES,
  PROPOSAL_DOWNLOAD_DISPOSITIONS,
  PROPOSAL_FILE_MAX_SIZE_BYTES,
} from '../proposal-files';

export const PROPOSAL_TEXT_MAX_LENGTH = 20_000;

export class ProposalBodyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(PROPOSAL_TEXT_MAX_LENGTH)
  body: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  @Matches(/^(\d{1,2})([a-zA-Z])?$/, {
    message: 'Use a step like 1, 1a, or 1b',
  })
  stageLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(PROPOSAL_TEXT_MAX_LENGTH)
  note?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  pendingFileKey?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName?: string;

  @IsOptional()
  @IsIn(ALLOWED_PROPOSAL_MIME_TYPES)
  fileMimeType?: (typeof ALLOWED_PROPOSAL_MIME_TYPES)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PROPOSAL_FILE_MAX_SIZE_BYTES)
  fileSizeBytes?: number;
}

export class CreateProposalUploadUrlDto {
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsIn(ALLOWED_PROPOSAL_MIME_TYPES)
  fileType: (typeof ALLOWED_PROPOSAL_MIME_TYPES)[number];

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PROPOSAL_FILE_MAX_SIZE_BYTES)
  fileSize: number;
}

export class ProposalDownloadQueryDto {
  @IsOptional()
  @IsIn(PROPOSAL_DOWNLOAD_DISPOSITIONS)
  disposition?: (typeof PROPOSAL_DOWNLOAD_DISPOSITIONS)[number];
}

export class ReviewProposalStepDto {
  @IsIn(['approve', 'request_changes'])
  action: 'approve' | 'request_changes';

  @IsOptional()
  @IsString()
  @MaxLength(PROPOSAL_TEXT_MAX_LENGTH)
  comment?: string;
}

export class AttachProposalResourceDto {
  @IsUUID()
  resourceId: string;
}
