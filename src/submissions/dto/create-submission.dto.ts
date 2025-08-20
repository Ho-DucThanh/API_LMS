import { IsInt, IsOptional, IsString, IsEnum, IsNumber } from 'class-validator';
import { SubmissionStatus } from '../entities/submission.entity';

export class CreateSubmissionDto {
  @IsInt()
  assignment_id: number;

  @IsOptional()
  @IsInt()
  student_id?: number;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  file_url?: string;

  @IsOptional()
  @IsEnum(SubmissionStatus)
  status?: SubmissionStatus;

  @IsOptional()
  @IsNumber()
  grade?: number;

  @IsOptional()
  @IsString()
  feedback?: string;

  @IsOptional()
  submitted_at?: Date;

  @IsOptional()
  graded_at?: Date;
}
