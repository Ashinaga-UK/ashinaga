import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAnnouncementDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsArray()
  @IsOptional()
  filters?: Array<{
    filterType: string;
    filterValue: string;
  }>;
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
  status: 'active' | 'inactive' | 'on_hold';
}
