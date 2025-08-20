import { IsInt, IsBoolean, IsOptional, IsNumber } from 'class-validator';

export class CreateLessonProgressDto {
  @IsInt()
  enrollment_id: number;

  @IsInt()
  lesson_id: number;

  @IsOptional()
  @IsBoolean()
  is_completed?: boolean;

  @IsOptional()
  completed_at?: Date;

  @IsOptional()
  @IsNumber()
  progress_percent?: number;

  @IsOptional()
  @IsInt()
  time_spent_minutes?: number;
}
