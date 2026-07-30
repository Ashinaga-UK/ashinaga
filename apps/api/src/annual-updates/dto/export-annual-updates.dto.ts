import { IsArray, IsOptional, IsUUID } from 'class-validator';

export class ExportAnnualUpdatesDto {
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  annualUpdateIds?: string[];
}
