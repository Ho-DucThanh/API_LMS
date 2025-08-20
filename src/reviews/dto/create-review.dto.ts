import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';

export class CreateReviewDto {
  @IsInt()
  course_id: number;

  @IsInt()
  @IsOptional()
  student_id?: number;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  review_text?: string;
}
