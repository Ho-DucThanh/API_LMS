import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsDateString,
  IsNumberString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AssignmentType } from '../entities/assignment.entity';

export class CreateAssignmentDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty()
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: AssignmentType })
  @IsNotEmpty()
  @IsEnum(AssignmentType)
  type: AssignmentType;

  @ApiProperty({ required: false })
  @IsOptional()
  content?: any;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  lesson_id: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsDateString()
  due_date: string;

  @ApiProperty({ default: 100 })
  @IsOptional()
  @IsNumber()
  max_points?: number;
}
