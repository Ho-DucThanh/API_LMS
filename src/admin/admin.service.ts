import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/entities/user-role.entity';
import { Role } from '../users/entities/role.entity';
import { Course } from '../courses/entities/course.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { CourseStatus } from '../courses/entities/course.entity';
import { EnrollmentStatus } from '../enrollments/entities/enrollment.entity';
import { UserRoles } from '../common/enum/user-role.enum';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserRole)
    private userRoleRepository: Repository<UserRole>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Create user
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(user);

    // Assign role
    await this.assignRole(savedUser.id, createUserDto.role);

    return savedUser;
  }

  async assignRole(userId: number, roleName: string): Promise<void> {
    // Find or create role
    let role = await this.roleRepository.findOne({
      where: { role_name: roleName as UserRoles },
    });

    if (!role) {
      role = this.roleRepository.create({ role_name: roleName as UserRoles });
      role = await this.roleRepository.save(role);
    }

    // Check if user already has this role
    const existingUserRole = await this.userRoleRepository.findOne({
      where: { user_id: userId, role_id: role.id },
    });

    if (!existingUserRole) {
      const userRole = this.userRoleRepository.create({
        user_id: userId,
        role_id: role.id,
      });
      await this.userRoleRepository.save(userRole);
    }
  }

  async getAllUsers(page: number = 1, limit: number = 10): Promise<any> {
    const [users, total] = await this.userRepository.findAndCount({
      relations: ['userRoles', 'userRoles.role'],
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });

    return {
      data: users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async deleteUser(userId: number): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.update(userId, { status: 'BLOCKED' });
  }

  // async getSystemStatistics(): Promise<any> {
  //   const totalUsers = await this.userRepository.count();
  //   const totalCourses = await this.courseRepository.count();
  //   const totalEnrollments = await this.enrollmentRepository.count();

  //   const activeStudents = await this.userRepository
  //     .createQueryBuilder('user')
  //     .leftJoin('user.userRoles', 'userRole')
  //     .leftJoin('userRole.role', 'role')
  //     .where('role.name = :roleName', { roleName: 'STUDENT' })
  //     .andWhere('user.status = :status', { status: 'ACTIVE' })
  //     .getCount();

  //   const activeCourses = await this.courseRepository.count({
  //     where: { is_active: true, status: CourseStatus.PUBLISHED },
  //   });

  //   const completedEnrollments = await this.enrollmentRepository.count({
  //     where: { status: EnrollmentStatus.COMPLETED },
  //   });

  //   // Monthly enrollment trends (last 6 months)
  //   const enrollmentTrends = await this.getEnrollmentTrends();

  //   return {
  //     totalUsers,
  //     totalCourses,
  //     totalEnrollments,
  //     activeStudents,
  //     activeCourses,
  //     completedEnrollments,
  //     enrollmentTrends,
  //   };
  // }

  private async getEnrollmentTrends(): Promise<
    Array<{ month: string; enrollments: number }>
  > {
    const months: Array<{ month: string; enrollments: number }> = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const count = await this.enrollmentRepository.count({
        where: {
          enrolled_at: {
            gte: date,
            lt: nextDate,
          } as any,
        },
      });

      months.push({
        month: date.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        }),
        enrollments: count,
      });
    }

    return months;
  }

  async blockUser(userId: number): Promise<void> {
    await this.userRepository.update(userId, { status: 'BLOCKED' });
  }

  async unblockUser(userId: number): Promise<void> {
    await this.userRepository.update(userId, { status: 'ACTIVE' });
  }

  async getAllCourses(params: {
    page?: number;
    limit?: number;
    approval_status?: string;
    status?: string;
    search?: string;
  }): Promise<any> {
    const page = Number(params.page || 1);
    const limit = Number(params.limit || 10);
    const { approval_status, status, search } = params;

    const qb = this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.instructor', 'instructor')
      .leftJoinAndSelect('course.enrollments', 'enrollments');

    if (approval_status) {
      qb.andWhere('course.approval_status = :approval_status', {
        approval_status,
      });
    }

    if (status) {
      qb.andWhere('course.status = :status', { status });
    }

    if (search) {
      // ILIKE for case-insensitive contains (Postgres); adjust for your DB if needed
      qb.andWhere('course.title ILIKE :search', { search: `%${search}%` });
    }

    const total = await qb.getCount();
    const courses = await qb
      .orderBy('course.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data: courses,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // async deleteCourse(courseId: number): Promise<void> {
  //   await this.courseRepository.update(courseId, { is_active: false });
  // }
}
