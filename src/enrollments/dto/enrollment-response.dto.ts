import { ApiProperty } from '@nestjs/swagger';
import { EnrollmentStatus } from '../entities/enrollment.entity';

export class EnrollmentResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  student_id: number;

  @ApiProperty()
  course_id: number;

  @ApiProperty({ enum: EnrollmentStatus })
  status: EnrollmentStatus;

  @ApiProperty()
  progress_percentage: number;

  @ApiProperty()
  enrolled_at: Date;

  @ApiProperty()
  completed_at?: Date;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;

  @ApiProperty({ required: false })
  student?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };

  @ApiProperty({ required: false })
  course?: {
    id: number;
    title: string;
    description: string;
    thumbnail_url: string;
    price: number;
    level: string;
    status: string;
  };
}
