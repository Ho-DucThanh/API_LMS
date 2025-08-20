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
import { Module } from '../../modules/entities/module.entity';

@Entity('progress')
@Unique(['enrollment_id', 'module_id'])
export class Progress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  enrollment_id: number;

  @ManyToOne(() => Enrollment, (enrollment) => enrollment.progress, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'enrollment_id' })
  enrollment: Enrollment;

  @Column()
  module_id: number;

  @ManyToOne(() => Module, (module) => module.progress, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'module_id' })
  module: Module;

  @Column({ type: 'boolean', default: false })
  is_completed: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  completion_percentage: number;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date;

  @Column({ type: 'int', default: 0 })
  time_spent_minutes: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
