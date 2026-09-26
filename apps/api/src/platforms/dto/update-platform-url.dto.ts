import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePlatformUrlDto {
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  signpostingUrl?: string | null;
}
