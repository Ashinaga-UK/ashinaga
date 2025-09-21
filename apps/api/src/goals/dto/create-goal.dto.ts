import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateGoalDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(['academic', 'career', 'leadership', 'personal', 'community'])
  category: 'academic' | 'career' | 'leadership' | 'personal' | 'community';

  @IsDateString()
  targetDate: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number;

  @IsOptional()
  @IsEnum(['pending', 'in_progress', 'completed'])
  status?: 'pending' | 'in_progress' | 'completed';
}
