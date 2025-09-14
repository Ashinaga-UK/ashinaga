import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateRequestDto {
  @IsEnum(['financial_support', 'extenuating_circumstances', 'academic_support'])
  @IsNotEmpty()
  type: 'financial_support' | 'extenuating_circumstances' | 'academic_support';

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(['high', 'medium', 'low'])
  @IsOptional()
  priority?: 'high' | 'medium' | 'low';
}

export class CreateRequestResponseDto {
  id: string;
  scholarId: string;
  type: string;
  description: string;
  priority: string;
  status: string;
  submittedDate: Date;
  createdAt: Date;
  updatedAt: Date;
}