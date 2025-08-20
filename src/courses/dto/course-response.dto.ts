import { ApiProperty } from '@nestjs/swagger';
import {
  CourseLevel,
  CourseStatus,
  ApprovalStatus,
} from '../entities/course.entity';

export class CourseResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  thumbnail_url?: string;

  @ApiProperty()
  price: number;

  @ApiProperty()
  original_price: number;

  @ApiProperty()
  duration_hours: number;

  @ApiProperty()
  total_enrolled: number;

  @ApiProperty()
  rating: number;

  @ApiProperty()
  rating_count: number;

  @ApiProperty({ enum: CourseLevel })
  level: CourseLevel;

  @ApiProperty({ enum: CourseStatus })
  status: CourseStatus;

  @ApiProperty({ enum: ApprovalStatus })
  approval_status: ApprovalStatus;

  @ApiProperty()
  instructor_id: number;

  @ApiProperty()
  category_id: number;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;

  @ApiProperty({ required: false })
  instructor?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };

  @ApiProperty({ required: false })
  category?: {
    id: number;
    name: string;
    description: string;
  };

  @ApiProperty({ required: false })
  tags?: Array<{
    id: number;
    name: string;
  }>;
}
