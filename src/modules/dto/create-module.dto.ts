import { IsString, IsOptional, IsInt, IsBoolean } from 'class-validator';

export class CreateModuleDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  course_id: number;

  @IsOptional()
  @IsInt()
  order_index?: number;

  @IsOptional()
  @IsInt()
  duration_minutes?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
