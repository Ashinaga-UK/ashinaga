import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { programStageEnum } from '../../db/schema/scholars';

const faqAudiences = programStageEnum.enumValues;
export type FaqAudience = (typeof faqAudiences)[number];

function trimToUndefined(value: unknown) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

export class CreateFaqDto {
  @IsIn(faqAudiences)
  audience: FaqAudience;

  @IsOptional()
  @Transform(({ value }) => trimToUndefined(value))
  @IsString()
  @MaxLength(80)
  category?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  question: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  answer: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  sortOrder?: number;
}
