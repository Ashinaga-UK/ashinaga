import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class UpdateRequestStatusDto {
  @IsIn(['approved', 'rejected', 'reviewed', 'commented'])
  status: 'approved' | 'rejected' | 'reviewed' | 'commented';

  @IsOptional()
  @IsString()
  comment?: string;

  /** Accepted and ignored. The reviewer is always the session user. */
  @IsOptional()
  @IsString()
  reviewedBy?: string;
}

export class BulkUpdateRequestStatusDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  ids: string[];

  @IsIn(['approved', 'rejected'])
  status: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  comment?: string;
}
