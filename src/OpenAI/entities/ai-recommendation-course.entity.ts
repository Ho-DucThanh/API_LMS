import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AiRecommendation } from './ai-recommendation.entity';
import { Course } from 'src/courses/entities/course.entity';

export enum Stage {
  FOUNDATION = 'FOUNDATION',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
}

@Entity('ai_recommendation_course')
export class AiRecommendationCourse {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => AiRecommendation, (rec) => rec.courses, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'recommendation_id' })
  recommendation: AiRecommendation;

  @ManyToOne(() => Course, { nullable: true })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column({ type: 'enum', enum: Stage })
  stage: Stage;

  @Column({ type: 'int', default: 0 })
  order_index: number;

  @Column({ type: 'text', nullable: true })
  rationale: string;
}
