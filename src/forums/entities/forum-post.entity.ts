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
import { ForumComment } from './forum-comment.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('forum_posts')
export class ForumPost {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column()
  title: string;

  @ApiProperty()
  @Column('text')
  content: string;

  @ApiProperty()
  @Column()
  course_id: number;

  @ApiProperty()
  @Column()
  author_id: number;

  @ApiProperty()
  @Column({ default: 0 })
  views: number;

  @ApiProperty()
  @Column({ default: false })
  is_pinned: boolean;

  @ApiProperty()
  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

    // Relations
    @ManyToOne(() => Course, (course) => course.forum_posts)
    @JoinColumn({ name: 'course_id' })
    course: Course;

  @ManyToOne(() => User, (user) => user.forum_posts)
  @JoinColumn({ name: 'author_id' })
  author: User;

  @OneToMany(() => ForumComment, (comment) => comment.post)
  comments: ForumComment[];
}
