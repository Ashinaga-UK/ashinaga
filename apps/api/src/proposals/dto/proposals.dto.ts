import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export const PROPOSAL_TEXT_MAX_LENGTH = 20_000;

export class ProposalBodyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(PROPOSAL_TEXT_MAX_LENGTH)
  body: string;
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
