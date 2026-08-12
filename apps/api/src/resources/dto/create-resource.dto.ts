import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { audienceFilterTypes } from '../../common/audience-filters/audience-filter';
import { AudienceFilterDto } from '../../common/audience-filters/audience-filter.dto';
import {
  resourceCategoryEnum,
  resourceStatusEnum,
  resourceTypeEnum,
} from '../../db/schema/resources';

const resourceTypes = resourceTypeEnum.enumValues;
const resourceCategories = resourceCategoryEnum.enumValues;
const resourceStatuses = resourceStatusEnum.enumValues;
export const resourceFilterTypes = audienceFilterTypes;

export class ResourceFilterDto extends AudienceFilterDto {}

export class CreateResourceDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsIn(resourceTypes)
  type: (typeof resourceTypes)[number];

  @IsIn(resourceCategories)
  category: (typeof resourceCategories)[number];

  @IsUrl({ require_protocol: true, require_tld: false })
  url: string;

  @IsIn(resourceStatuses)
  @IsOptional()
  status?: (typeof resourceStatuses)[number];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResourceFilterDto)
  @Transform(({ value }) => (value === null ? [] : value))
  @IsOptional()
  filters?: ResourceFilterDto[];
}
