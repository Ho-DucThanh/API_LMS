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
import { User } from '../../users/entities/user.entity';
import { Enrollment } from '../../enrollments/entities/enrollment.entity';
import { Module } from '../../modules/entities/module.entity';
import { ApiProperty } from '@nestjs/swagger';
import { CourseCategory } from './course_category';
import { CourseTag } from './course_tag';

export enum CourseStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum CourseLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('course')
export class Course {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column()
  title: string;

  @ApiProperty()
  @Column({ type: 'text' , nullable: true })
  description: string;

  @ApiProperty()
  @Column({ nullable: true })
  thumbnail_url: string;

  @ApiProperty()
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  @ApiProperty()
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  original_price: number;

  @ApiProperty()
  @Column({ default: 0 })
  duration_hours: number;

  @ApiProperty()
  @Column({ default: 0 })
  total_enrolled: number;

  @ApiProperty()
  @Column()
  rating: number;

  @ApiProperty()
  @Column()
  rating_count: number;

  @ApiProperty()
  @Column({
    type: 'enum',
    enum: CourseLevel,
    default: CourseLevel.BEGINNER,
  })
  level: CourseLevel;

  @ApiProperty()
  @Column({
    type: 'enum',
    enum: CourseStatus,
    default: CourseStatus.DRAFT,
  })
  status: CourseStatus;

  @ApiProperty()
  @Column({
    type: 'enum',
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING,
  })
  approval_status: ApprovalStatus;

  @ApiProperty()
  @Column()
  instructor_id: number;

  @ApiProperty()
  @Column()
  category_id: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.courses_taught, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'instructor_id' })
  instructor: User;

  @ManyToOne(() => CourseCategory, (category) => category.courses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category: CourseCategory;

  @OneToMany(() => CourseTag, (courseTag) => courseTag.course)
  courseTags?: CourseTag[];

  @OneToMany(() => Enrollment, (enrollment) => enrollment.course)
  enrollments: Enrollment[];

  @OneToMany(() => Module, (module) => module.course)
  modules: Module[];

  @OneToMany('ForumPost', 'course')
  forum_posts: any[];

  // @OneToMany('Review', 'course')
  // reviews: any[];
}
