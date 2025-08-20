import { IsNotEmpty, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EnrollmentStatus } from '../entities/enrollment.entity';

export class CreateEnrollmentDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  course_id: number;

  @ApiProperty({ enum: EnrollmentStatus, default: EnrollmentStatus.PENDING })
  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;
}
