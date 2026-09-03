import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum PlatformSetupStatus {
  YES = 'yes',
  NO = 'no',
  PENDING = 'pending',
}

export class UpdatePlatformSetupDto {
  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsEnum(PlatformSetupStatus)
  status: PlatformSetupStatus;
}
