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
import { ForumPost } from './forum-post.entity';
import { User } from '../../users/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('forum_comments')
export class ForumComment {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column('text')
  content: string;

  @ApiProperty()
  @Column()
  post_id: number;

  @ApiProperty()
  @Column()
  author_id: number;

  @ApiProperty()
  @Column({ nullable: true })
  parent_comment_id: number;

  @ApiProperty()
  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  // Relations
  @ManyToOne(() => ForumPost, (post) => post.comments)
  @JoinColumn({ name: 'post_id' })
  post: ForumPost;

  @ManyToOne(() => User, (user) => user.forum_comments)
  @JoinColumn({ name: 'author_id' })
  author: User;

  @ManyToOne(() => ForumComment, (comment) => comment.replies)
  @JoinColumn({ name: 'parent_comment_id' })
  parent_comment: ForumComment;

  @OneToMany(() => ForumComment, (comment) => comment.parent_comment)
  replies: ForumComment[];
}
