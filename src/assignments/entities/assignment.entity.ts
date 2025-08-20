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
import { Lesson } from '../../lessons/entities/lesson.entity';
import { User } from '../../users/entities/user.entity';
import { Submission } from '../../submissions/entities/submission.entity';
import { ApiProperty } from '@nestjs/swagger';

export enum AssignmentType {
  ESSAY = 'ESSAY',
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  FILE_UPLOAD = 'FILE_UPLOAD',
  CODE = 'CODE',
}

@Entity('assignments')
export class Assignment {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column()
  title: string;

  @ApiProperty()
  @ApiProperty({ required: false })
  @Column('text', { default: '' })
  description: string;

  @ApiProperty()
  @Column({ type: 'enum', enum: AssignmentType })
  type: AssignmentType;

  @ApiProperty()
  @Column('json', { nullable: true })
  content: any; // For storing quiz questions, code templates, etc.

  @ApiProperty()
  @Column()
  lesson_id: number;

  @ApiProperty()
  @Column()
  instructor_id: number;

  @ApiProperty()
  @Column({ type: 'timestamp', nullable: true })
  due_date: Date | null;

  @ApiProperty()
  @Column({
    name: 'max_score',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 100,
  })
  max_points: number;

  @ApiProperty()
  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  // Relations
  @ManyToOne(() => Lesson, (lesson) => lesson.assignments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson;

  @ManyToOne(() => User, (user) => user.assignments_created, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'instructor_id' })
  instructor: User;

  @OneToMany(() => Submission, (submission) => submission.assignment)
  submissions: Submission[];
}
