import { Transform, Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { AudienceFilterDto } from '../../common/audience-filters/audience-filter.dto';

export class AnnouncementFilterDto extends AudienceFilterDto {}

export class CreateAnnouncementDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnnouncementFilterDto)
  @Transform(({ value }) => (value === null ? [] : value))
  @IsOptional()
  filters?: AnnouncementFilterDto[];
}

export class ScholarFilterDto {
  id: string;
  userId: string;
  name: string;
  email: string;
  program: string;
  year: string;
  university: string;
  location?: string | null;
  status: 'active' | 'inactive' | 'on_hold' | 'archived';
}
