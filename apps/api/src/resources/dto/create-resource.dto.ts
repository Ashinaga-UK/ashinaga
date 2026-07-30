import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';

const resourceTypes = ['Guide', 'Handbook', 'Template'] as const;
const resourceCategories = ['LDF', 'Handbook', 'Proposal', 'Support'] as const;
const resourceStatuses = ['draft', 'live'] as const;

export class ResourceFilterDto {
  @IsString()
  @IsNotEmpty()
  filterType: string;

  @IsString()
  @IsNotEmpty()
  filterValue: string;
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

  @IsUrl({ require_protocol: true, require_tld: false })
  url: string;

  @IsIn(resourceStatuses)
  @IsOptional()
  status?: (typeof resourceStatuses)[number];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResourceFilterDto)
  @IsOptional()
  filters?: ResourceFilterDto[];
}
