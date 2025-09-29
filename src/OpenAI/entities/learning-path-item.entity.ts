import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { LearningPath } from './learning-path.entity';
import { Course } from 'src/courses/entities/course.entity';

@Entity('learning_path_item')
export class LearningPathItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => LearningPath, (p) => p.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'path_id' })
  path: LearningPath;

  @ManyToOne(() => Course, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'course_id' })
  course: Course | null;

  @Column({ type: 'varchar', length: 32 })
  stage: 'FOUNDATION' | 'INTERMEDIATE' | 'ADVANCED' | 'SPECIALIZATION';

  @Column({ type: 'int', default: 0 })
  order_index: number;

  @Column({ type: 'text', nullable: true })
  note?: string | null;
}
