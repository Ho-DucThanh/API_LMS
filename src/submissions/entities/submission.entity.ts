import {
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Assignment } from '../../assignments/entities/assignment.entity';
import { User } from '../../users/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';

export enum SubmissionStatus {
  SUBMITTED = 'SUBMITTED',
  GRADED = 'GRADED',
  RETURNED = 'RETURNED',
}

@Entity('submissions')
@Unique(['assignment_id', 'student_id'])
export class Submission {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column()
  assignment_id: number;

  @ApiProperty()
  @Column()
  student_id: number;

  @ApiProperty()
  @Column('text', { nullable: true })
  content: string;

  @ApiProperty()
  @Column({ nullable: true })
  file_url: string;

  @ApiProperty()
  @Column({
    type: 'enum',
    enum: SubmissionStatus,
    default: SubmissionStatus.SUBMITTED,
  })
  status: SubmissionStatus;

  @ApiProperty()
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  grade: number;

  @ApiProperty()
  @Column('text', { nullable: true })
  feedback: string;

  @ApiProperty()
  @ApiProperty()
  @Column({ nullable: true })
  graded_by?: number;

  @ApiProperty()
  @Column({ type: 'timestamp', nullable: true })
  graded_at: Date;

  @CreateDateColumn({ type: 'timestamp' })
  submitted_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  // Relations
  @ManyToOne(() => Assignment, (assignment) => assignment.submissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'assignment_id' })
  assignment: Assignment;

  @ManyToOne(() => User, (user) => user.submissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'graded_by' })
  grader?: User;
}
