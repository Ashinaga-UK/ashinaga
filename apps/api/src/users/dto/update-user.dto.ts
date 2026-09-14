import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ required: false, description: 'User full name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    required: false,
    description: 'Pending avatar S3 key from POST /api/avatars/upload-url, or null to remove',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  image?: string | null;
}
