import {
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserRole } from './user-role.entity';
import { Course } from 'src/courses/entities/course.entity';
import { Enrollment } from 'src/enrollments/entities/enrollment.entity';
import { Assignment } from 'src/assignments/entities/assignment.entity';
import { Submission } from 'src/submissions/entities/submission.entity';
import { Notification } from 'src/notifications/entities/notification.entity';

@Entity('user')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ name: 'avatar_url', nullable: true, length: 500 })
  avatar: string;

  @Column({ nullable: true, length: 11 })
  phone: string;

  @Column({ nullable: true })
  address: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ type: 'enum', enum: ['ACTIVE', 'BLOCKED'], default: 'ACTIVE' })
  status: 'ACTIVE' | 'BLOCKED';

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @OneToMany(() => UserRole, (ur) => ur.user)
  userRoles?: UserRole[];

  // Course relationships
  @OneToMany(() => Course, (course) => course.instructor)
  courses_taught?: Course[];

  @OneToMany(() => Enrollment, (enrollment) => enrollment.student)
  enrollments?: Enrollment[];

  // Assignment relationships
  @OneToMany(() => Assignment, (assignment) => assignment.instructor)
  assignments_created?: Assignment[];

  @OneToMany(() => Submission, (submission) => submission.student)
  submissions?: Submission[];

  // Forum relationships
  @OneToMany('ForumPost', 'author')
  forum_posts?: any[];

  @OneToMany('ForumComment', 'author')
  forum_comments?: any[];

  // Notification relationships
  @OneToMany(() => Notification, (notification) => notification.user)
  notifications?: Notification[];

  // Review relationships
  // @OneToMany('Review', 'student')
  // reviews?: any[];
}
