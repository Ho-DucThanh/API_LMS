import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { AiRecommendation } from './ai-recommendation.entity';
import { LearningPathItem } from 'src/OpenAI/entities/learning-path-item.entity';

@Entity('learning_path')
export class LearningPath {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => AiRecommendation, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'recommendation_id' })
  recommendation?: AiRecommendation | null;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'json', nullable: true })
  metadata?: any; // optional snapshot of goal/input/output_summary for convenience

  @OneToMany(() => LearningPathItem, (i: LearningPathItem) => i.path, {
    cascade: true,
  })
  items: LearningPathItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
