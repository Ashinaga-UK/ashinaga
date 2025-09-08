import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ required: false, description: 'User full name' })
  @IsOptional()
  @IsString()
  name?: string;
}
