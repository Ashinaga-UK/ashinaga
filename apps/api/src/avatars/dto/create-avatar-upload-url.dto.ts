import { Type } from 'class-transformer';
import { Equals, IsInt, Max, Min } from 'class-validator';
import { AVATAR_CONTENT_TYPE, AVATAR_FILE_MAX_SIZE_BYTES } from '../avatar-files';

export class CreateAvatarUploadUrlDto {
  @Equals(AVATAR_CONTENT_TYPE)
  fileType: typeof AVATAR_CONTENT_TYPE;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(AVATAR_FILE_MAX_SIZE_BYTES)
  fileSize: number;
}
