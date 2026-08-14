import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import {
  type AudienceFilterType,
  audienceFilterTypes,
  normalizeAudienceValue,
} from './audience-filter';

export class AudienceFilterDto {
  @IsIn(audienceFilterTypes)
  filterType: AudienceFilterType;

  @Transform(({ value }) => (typeof value === 'string' ? normalizeAudienceValue(value) : value))
  @IsString()
  @IsNotEmpty()
  filterValue: string;
}
