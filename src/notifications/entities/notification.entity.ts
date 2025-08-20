import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';

export enum NotificationType {
  COURSE_ENROLLMENT = 'COURSE_ENROLLMENT',
  ASSIGNMENT_DUE = 'ASSIGNMENT_DUE',
  GRADE_PUBLISHED = 'GRADE_PUBLISHED',
  FORUM_REPLY = 'FORUM_REPLY',
  COURSE_UPDATE = 'COURSE_UPDATE',
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT',
  COURSE_APPROVAL_REQUEST = 'COURSE_APPROVAL_REQUEST',
}

@Entity('notifications')
export class Notification {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column()
  title: string;

  @ApiProperty()
  @Column('text')
  message: string;

  @ApiProperty()
  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @ApiProperty()
  @Column()
  user_id: number;

  @ApiProperty()
  @Column({ default: false })
  is_read: boolean;

  @ApiProperty()
  @Column({ nullable: true })
  related_id: number; // ID of related entity (course, assignment, etc.)

  @ApiProperty()
  @Column({ nullable: true })
  action_url: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.notifications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
