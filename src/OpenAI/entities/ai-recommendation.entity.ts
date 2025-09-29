import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { AiRecommendationCourse } from './ai-recommendation-course.entity';

@Entity('ai_recommendation')
export class AiRecommendation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  goal_text: string;

  @Column({ type: 'json' })
  input_json: any;

  @Column({ type: 'json', nullable: true })
  output_json: any;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(
    () => AiRecommendationCourse,
    (recCourse) => recCourse.recommendation,
  )
  courses: AiRecommendationCourse[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
