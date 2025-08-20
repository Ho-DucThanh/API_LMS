import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CourseLevel, CourseStatus } from '../entities/course.entity';
import { Type } from 'class-transformer';

export class CreateCourseDto {
  @ApiProperty({
    description: 'Course title',
    example: 'Introduction to React Development',
  })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Detailed course description',
    example: 'Learn React from basics to advanced concepts',
  })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Course thumbnail URL',
    required: false,
    example: 'https://example.com/thumbnail.jpg',
  })
  @IsOptional()
  @IsString()
  thumbnail_url?: string;

  @ApiProperty({
    description: 'Course price in USD',
    default: 0,
    example: 99.99,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;

  @ApiProperty({
    description: 'Original price before discount',
    required: false,
    example: 149.99,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  original_price?: number;

  @ApiProperty({
    description: 'Course duration in hours',
    default: 0,
    example: 40,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  duration_hours?: number;

  @ApiProperty({
    description: 'Course difficulty level',
    enum: CourseLevel,
    default: CourseLevel.BEGINNER,
  })
  @IsOptional()
  @IsEnum(CourseLevel)
  level?: CourseLevel;

  @ApiProperty({
    description: 'Course status',
    enum: CourseStatus,
    default: CourseStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;

  @ApiProperty({
    description: 'Course category ID',
    example: 1,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  category_id: number;

  @ApiProperty({
    description: 'Array of tag IDs for the course',
    required: false,
    type: [Number],
    example: [1, 2, 3],
  })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  tag_ids?: number[];
}
