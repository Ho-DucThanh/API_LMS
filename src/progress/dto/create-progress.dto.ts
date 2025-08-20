import { IsInt, IsBoolean, IsOptional, IsNumber } from 'class-validator';

export class CreateProgressDto {
  @IsInt()
  enrollment_id: number;

  @IsInt()
  module_id: number;

  @IsOptional()
  @IsBoolean()
  is_completed?: boolean;

  @IsOptional()
  @IsNumber()
  completion_percentage?: number;

  @IsOptional()
  completed_at?: Date;

  @IsOptional()
  @IsInt()
  time_spent_minutes?: number;
}
