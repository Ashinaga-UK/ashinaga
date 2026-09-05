import { IsOptional, IsString, IsUUID } from 'class-validator';

export class GetPrepYearReportQueryDto {
  @IsOptional()
  @IsString()
  phase?: string;

  @IsOptional()
  @IsUUID()
  scholarId?: string;
}
