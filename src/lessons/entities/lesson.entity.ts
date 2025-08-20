import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Module } from '../../modules/entities/module.entity';
import { Assignment } from '../../assignments/entities/assignment.entity';
import { LessonProgress } from 'src/progress/entities/lesson-progress.entity';

export enum LessonType {
  VIDEO = 'VIDEO',
  TEXT = 'TEXT',
  QUIZ = 'QUIZ',
  PDF = 'PDF',
  LINK = 'LINK',
}

@Entity('lessons')
export class Lesson {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: LessonType })
  type: LessonType;

  @Column({ type: 'longtext', nullable: true })
  content: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  video_url: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  file_url: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  external_url: string;

  @Column()
  module_id: number;

  @ManyToOne(() => Module, (module) => module.lessons, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'module_id' })
  module: Module;

  @Column({ type: 'int', default: 0 })
  order_index: number;

  @Column({ type: 'int', default: 0 })
  duration_minutes: number;

  @Column({ type: 'boolean', default: false })
  is_free: boolean;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @OneToMany(() => Assignment, (assignment) => assignment.lesson)
  assignments: Assignment[];

  @OneToMany(() => LessonProgress, (lessonProgress) => lessonProgress.lesson)
  lessonProgress: LessonProgress[];
}
