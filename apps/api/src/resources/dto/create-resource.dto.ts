import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { audienceFilterTypes } from '../../common/audience-filters/audience-filter';
import { AudienceFilterDto } from '../../common/audience-filters/audience-filter.dto';
import {
  resourceCategoryEnum,
  resourceSourceTypeEnum,
  resourceStatusEnum,
  resourceTypeEnum,
} from '../../db/schema/resources';
import { ALLOWED_RESOURCE_MIME_TYPES, RESOURCE_FILE_MAX_SIZE_BYTES } from '../resource-files';

const resourceTypes = resourceTypeEnum.enumValues;
const resourceCategories = resourceCategoryEnum.enumValues;
const resourceStatuses = resourceStatusEnum.enumValues;
const resourceSourceTypes = resourceSourceTypeEnum.enumValues;
export const resourceFilterTypes = audienceFilterTypes;

export class ResourceFilterDto extends AudienceFilterDto {}

export class CreateResourceUploadUrlDto {
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsIn(ALLOWED_RESOURCE_MIME_TYPES)
  fileType: (typeof ALLOWED_RESOURCE_MIME_TYPES)[number];

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(RESOURCE_FILE_MAX_SIZE_BYTES)
  fileSize: number;
}

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

  @IsIn(resourceSourceTypes)
  @IsOptional()
  sourceType?: (typeof resourceSourceTypes)[number];

  @ValidateIf((dto: CreateResourceDto) => (dto.sourceType ?? 'url') === 'url')
  @IsUrl({ require_protocol: true, require_tld: false })
  url?: string;

  @ValidateIf((dto: CreateResourceDto) => dto.sourceType === 'file')
  @IsString()
  @IsNotEmpty()
  pendingFileKey?: string;

  @ValidateIf((dto: CreateResourceDto) => dto.sourceType === 'file')
  @IsString()
  @IsNotEmpty()
  fileName?: string;

  @ValidateIf((dto: CreateResourceDto) => dto.sourceType === 'file')
  @IsIn(ALLOWED_RESOURCE_MIME_TYPES)
  fileMimeType?: (typeof ALLOWED_RESOURCE_MIME_TYPES)[number];

  @ValidateIf((dto: CreateResourceDto) => dto.sourceType === 'file')
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(RESOURCE_FILE_MAX_SIZE_BYTES)
  fileSizeBytes?: number;

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
