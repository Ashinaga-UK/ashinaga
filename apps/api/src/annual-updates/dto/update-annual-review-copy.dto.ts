import { IsInt, IsObject, Min } from 'class-validator';

export class UpdateAnnualReviewCopyDto {
  @IsInt()
  @Min(0)
  version: number;

  @IsObject()
  strings: Record<string, unknown>;
}
