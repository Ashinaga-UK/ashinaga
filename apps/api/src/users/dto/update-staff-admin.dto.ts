import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateStaffAdminDto {
  @ApiProperty({ description: 'true to grant super-admin access, false to revoke it' })
  @IsBoolean()
  isSuperAdmin: boolean;
}
