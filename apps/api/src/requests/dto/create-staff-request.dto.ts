import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateStaffRequestDto {
  @IsUUID()
  scholarId: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  @MaxLength(2000)
  description: string;

  @IsIn(['high', 'medium', 'low'])
  @IsOptional()
  priority?: 'high' | 'medium' | 'low';
}
