import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  JoinColumn,
} from 'typeorm';
import { Enrollment } from '../../enrollments/entities/enrollment.entity';
import { Lesson } from '../../lessons/entities/lesson.entity';

@Entity('lesson_progress')
@Unique(['enrollment_id', 'lesson_id'])
export class LessonProgress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  enrollment_id: number;

  @ManyToOne(() => Enrollment, (enrollment) => enrollment.lessonProgress, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'enrollment_id' })
  enrollment: Enrollment;

  @Column()
  lesson_id: number;

  @ManyToOne(() => Lesson, (lesson) => lesson.lessonProgress, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson;

  @Column({ type: 'boolean', default: false })
  is_completed: boolean;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  progress_percent: number;

  @Column({ type: 'int', default: 0 })
  time_spent_minutes: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
