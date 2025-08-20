import {
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Course } from '../../courses/entities/course.entity';
import { User } from '../../users/entities/user.entity';
import { Progress } from '../../progress/entities/progress.entity';
import { ApiProperty } from '@nestjs/swagger';
import { LessonProgress } from 'src/progress/entities/lesson-progress.entity';

export enum EnrollmentStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  DROPPED = 'DROPPED',
  PENDING = 'PENDING',
}

@Entity('enrollment')
export class Enrollment {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column()
  student_id: number;

  @ApiProperty()
  @Column()
  course_id: number;

  @ApiProperty()
  @Column({
    type: 'enum',
    enum: EnrollmentStatus,
    default: EnrollmentStatus.PENDING,
  })
  status: EnrollmentStatus;

  @ApiProperty()
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  progress_percentage: number;

  @CreateDateColumn({ type: 'timestamp' })
  enrolled_at: Date;

  @ApiProperty()
  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.enrollments, {onDelete: 'CASCADE'})
  @JoinColumn({ name: 'student_id' })
  student: User;

  @ManyToOne(() => Course, (course) => course.enrollments, {onDelete: 'CASCADE'})
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @OneToMany(() => Progress, (progress) => progress.enrollment)
  progress: Progress[];

  @OneToMany(
    () => LessonProgress,
    (lessonProgress) => lessonProgress.enrollment,
  )
  lessonProgress: LessonProgress[];
}
