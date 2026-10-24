import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsObject,
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

  /**
   * The status the reviewer was looking at. If the request has changed since
   * (e.g. the scholar replied), the update is rejected with 409.
   */
  @IsOptional()
  @IsIn(['pending', 'approved', 'rejected', 'reviewed', 'commented'])
  expectedStatus?: 'pending' | 'approved' | 'rejected' | 'reviewed' | 'commented';

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

  /** id => status the reviewer saw. Any mismatch rejects the batch with 409. */
  @IsOptional()
  @IsObject()
  expectedStatuses?: Record<string, string>;

  @IsOptional()
  @IsString()
  comment?: string;
}
