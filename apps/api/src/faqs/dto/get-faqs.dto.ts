import { IsIn, IsOptional } from 'class-validator';
import { programStageEnum } from '../../db/schema/scholars';

const faqAudiences = programStageEnum.enumValues;

export class GetFaqsQueryDto {
  @IsOptional()
  @IsIn(faqAudiences)
  audience?: (typeof faqAudiences)[number];
}
