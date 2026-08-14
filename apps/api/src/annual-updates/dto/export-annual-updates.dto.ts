import { IsArray, IsUUID } from 'class-validator';

export class ExportAnnualUpdatesDto {
  @IsArray()
  @IsUUID('4', { each: true })
  annualUpdateIds: string[];
}
