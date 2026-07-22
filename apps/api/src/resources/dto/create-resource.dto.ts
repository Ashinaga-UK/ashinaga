import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

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

  @IsUrl({ require_tld: false })
  url: string;

  @IsIn(resourceStatuses)
  @IsOptional()
  status?: (typeof resourceStatuses)[number];

  @IsArray()
  @IsOptional()
  filters?: ResourceFilterDto[];
}
