import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course, CourseStatus, ApprovalStatus } from './entities/course.entity';
import { CourseCategory } from './entities/course_category';
import { CourseTag } from './entities/course_tag';
import { Tag } from './entities/tag';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CourseResponseDto } from './dto/course-response.dto';

@Injectable()
export class CourseService {
  constructor(
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(CourseCategory)
    private categoryRepository: Repository<CourseCategory>,
    @InjectRepository(CourseTag)
    private courseTagRepository: Repository<CourseTag>,
    @InjectRepository(Tag)
    private tagRepository: Repository<Tag>,
  ) {}

  // optional NotificationService (set by module to avoid circular dep)
  private notificationService?: import('../notifications/notification.service').NotificationService;

  setNotificationService(
    notificationService: import('../notifications/notification.service').NotificationService,
  ) {
    this.notificationService = notificationService;
  }

  // Realtime removed: notifications persisted only via NotificationService

  async getAllCategories(): Promise<CourseCategory[]> {
    return this.categoryRepository.find({ order: { name: 'ASC' } });
  }

  async getAllTags(): Promise<Tag[]> {
    return this.tagRepository.find({ order: { name: 'ASC' } });
  }

  async create(
    createCourseDto: CreateCourseDto,
    instructorId: number,
  ): Promise<CourseResponseDto> {
    // Verify category exists
    const category = await this.categoryRepository.findOne({
      where: { id: createCourseDto.category_id },
    });
    if (!category) {
      throw new BadRequestException('Category not found');
    }

    // Verify tags exist if provided
    if (createCourseDto.tag_ids && createCourseDto.tag_ids.length > 0) {
      const tags = await this.tagRepository.findByIds(createCourseDto.tag_ids);
      if (tags.length !== createCourseDto.tag_ids.length) {
        throw new BadRequestException('One or more tags not found');
      }
    }

    // Create course
    const course = this.courseRepository.create({
      title: createCourseDto.title,
      description: createCourseDto.description,
      thumbnail_url: createCourseDto.thumbnail_url,
      price: createCourseDto.price || 0,
      original_price:
        createCourseDto.original_price || createCourseDto.price || 0,
      level: createCourseDto.level,
      duration_hours: createCourseDto.duration_hours || 0,
      category_id: createCourseDto.category_id,
      instructor_id: instructorId,
      status: CourseStatus.DRAFT,
      approval_status: ApprovalStatus.PENDING,
      rating: 0,
      rating_count: 0,
      total_enrolled: 0,
    });

    const savedCourse = await this.courseRepository.save(course);

    // Create course-tag relationships
    if (createCourseDto.tag_ids && createCourseDto.tag_ids.length > 0) {
      const courseTags = createCourseDto.tag_ids.map((tagId) =>
        this.courseTagRepository.create({
          course_id: savedCourse.id,
          tag_id: tagId,
        }),
      );
      await this.courseTagRepository.save(courseTags);
    }

    // Notify admins that a new course was created by an instructor
    try {
      if (this.notificationService && (this as any).usersService) {
        // find admin users
        const usersService: import('../users/users.service').UsersService = (
          this as any
        ).usersService;
        const admins = await usersService.getUsersByRole('ROLE_ADMIN');
        const adminIds = admins.map((a) => a.id);
        if (adminIds.length > 0) {
          await this.notificationService.sendSystemAnnouncement(
            adminIds,
            'New Course Created',
            `Instructor created a new course "${savedCourse.title}" awaiting approval`,
          );
        }
      }
    } catch (err) {
      console.debug(
        'Failed to notify admins about new course',
        err?.message || err,
      );
    }

    return this.findOneWithDetails(savedCourse.id);
  }

  async findOneWithDetails(id: number): Promise<CourseResponseDto> {
    const course = await this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.instructor', 'instructor')
      .leftJoinAndSelect('course.category', 'category')
      .leftJoinAndSelect('course.courseTags', 'courseTags')
      .leftJoinAndSelect('courseTags.tag', 'tag')
      .where('course.id = :id', { id })
      .getOne();

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return this.mapToResponseDto(course);
  }

  private mapToResponseDto(course: Course): CourseResponseDto {
    return {
      id: course.id,
      title: course.title,
      description: course.description,
      thumbnail_url: course.thumbnail_url,
      price: course.price,
      original_price: course.original_price,
      duration_hours: course.duration_hours,
      total_enrolled: course.total_enrolled,
      rating: course.rating,
      rating_count: course.rating_count,
      level: course.level,
      status: course.status,
      approval_status: course.approval_status,
      instructor_id: course.instructor_id,
      category_id: course.category_id,
      created_at: course.created_at,
      updated_at: course.updated_at,
      instructor: course.instructor
        ? {
            id: course.instructor.id,
            first_name: course.instructor.first_name,
            last_name: course.instructor.last_name,
            email: course.instructor.email,
          }
        : undefined,
      category: course.category
        ? {
            id: course.category.id,
            name: course.category.name,
            description: course.category.description,
          }
        : undefined,
      tags:
        course.courseTags?.map((ct) => ({
          id: ct.tag.id,
          name: ct.tag.name,
        })) || [],
    };
  }

  async findAll(filters?: {
    status?: CourseStatus;
    level?: string;
    category_id?: number;
    tag_id?: number;
    search?: string;
    instructor_id?: number;
    approval_status?: ApprovalStatus;
    sort_by?: 'rating_count' | 'rating' | 'created_at' | 'total_enrolled';
    sort_order?: 'ASC' | 'DESC';
    page?: number;
    limit?: number;
  }): Promise<{
    courses: CourseResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.instructor', 'instructor')
      .leftJoinAndSelect('course.category', 'category')
      .leftJoinAndSelect('course.courseTags', 'courseTags')
      .leftJoinAndSelect('courseTags.tag', 'tag');

    // Apply filters
    if (filters?.status) {
      queryBuilder.andWhere('course.status = :status', {
        status: filters.status,
      });
    }

    if (filters?.level) {
      queryBuilder.andWhere('course.level = :level', { level: filters.level });
    }

    if (filters?.category_id) {
      queryBuilder.andWhere('course.category_id = :categoryId', {
        categoryId: filters.category_id,
      });
    }

    if (filters?.tag_id) {
      queryBuilder.andWhere('courseTags.tag_id = :tagId', {
        tagId: filters.tag_id,
      });
    }

    if (filters?.instructor_id) {
      queryBuilder.andWhere('course.instructor_id = :instructorId', {
        instructorId: filters.instructor_id,
      });
    }

    if (filters?.approval_status) {
      queryBuilder.andWhere('course.approval_status = :approvalStatus', {
        approvalStatus: filters.approval_status,
      });
    }

    if (filters?.search) {
      queryBuilder.andWhere(
        '(course.title LIKE :search OR course.description LIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    // Sorting
    if (filters?.sort_by) {
      const order: 'ASC' | 'DESC' = filters.sort_order || 'DESC';
      switch (filters.sort_by) {
        case 'rating_count':
          queryBuilder.addOrderBy('course.rating_count', order);
          break;
        case 'rating':
          queryBuilder.addOrderBy('course.rating', order);
          break;
        case 'total_enrolled':
          queryBuilder.addOrderBy('course.total_enrolled', order);
          break;
        case 'created_at':
        default:
          queryBuilder.addOrderBy('course.created_at', order);
          break;
      }
    } else {
      queryBuilder.addOrderBy('course.created_at', 'DESC');
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    queryBuilder.skip(skip).take(limit);

    const courses = await queryBuilder.getMany();
    const coursesDto = courses.map((course) => this.mapToResponseDto(course));

    return {
      courses: coursesDto,
      total,
      page,
      limit,
    };
  }

  async findOne(id: number): Promise<CourseResponseDto> {
    return this.findOneWithDetails(id);
  }

  async findMyCoursesAsInstructor(
    instructorId: number,
  ): Promise<CourseResponseDto[]> {
    const courses = await this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.instructor', 'instructor')
      .leftJoinAndSelect('course.category', 'category')
      .leftJoinAndSelect('course.courseTags', 'courseTags')
      .leftJoinAndSelect('courseTags.tag', 'tag')
      .where('course.instructor_id = :instructorId', { instructorId })
      .orderBy('course.created_at', 'DESC')
      .getMany();

    return courses.map((course) => this.mapToResponseDto(course));
  }

  async update(
    id: number,
    updateCourseDto: UpdateCourseDto,
    userId: number,
  ): Promise<CourseResponseDto> {
    // Find the course entity (not DTO) to check ownership
    const course = await this.courseRepository.findOne({ where: { id } });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.instructor_id !== userId) {
      throw new ForbiddenException('You can only update your own courses');
    }

    // Verify category exists if provided
    if (updateCourseDto.category_id) {
      const category = await this.categoryRepository.findOne({
        where: { id: updateCourseDto.category_id },
      });
      if (!category) {
        throw new BadRequestException('Category not found');
      }
    }

    // Verify tags exist if provided
    if (updateCourseDto.tag_ids && updateCourseDto.tag_ids.length > 0) {
      const tags = await this.tagRepository.findByIds(updateCourseDto.tag_ids);
      if (tags.length !== updateCourseDto.tag_ids.length) {
        throw new BadRequestException('One or more tags not found');
      }
    }

    // Extract tag_ids from updateDto to handle separately
    const { tag_ids, ...courseUpdateData } = updateCourseDto;

    // Update course data (without tag_ids)
    await this.courseRepository.update(id, courseUpdateData);

    // Handle tag updates if provided
    if (tag_ids !== undefined) {
      // Remove existing tag relationships
      await this.courseTagRepository.delete({ course_id: id });

      // Add new tag relationships
      if (tag_ids.length > 0) {
        const courseTags = tag_ids.map((tagId) =>
          this.courseTagRepository.create({
            course_id: id,
            tag_id: tagId,
          }),
        );
        await this.courseTagRepository.save(courseTags);
      }
    }

    return await this.findOneWithDetails(id);
  }

  async remove(id: number, userId: number): Promise<void> {
    const course = await this.findOneWithDetails(id);

    if (course.instructor_id !== userId) {
      throw new ForbiddenException('You can only delete your own courses');
    }

    // Soft delete by updating status
    await this.courseRepository.update(id, { status: CourseStatus.ARCHIVED });
  }

  async findByInstructor(instructorId: number): Promise<CourseResponseDto[]> {
    return this.findMyCoursesAsInstructor(instructorId);
  }

  async publishCourse(id: number, userId: number): Promise<CourseResponseDto> {
    const course = await this.findOneWithDetails(id);

    if (course.instructor_id !== userId) {
      throw new ForbiddenException('You can only publish your own courses');
    }

    await this.courseRepository.update(id, { status: CourseStatus.PUBLISHED });
    return await this.findOneWithDetails(id);
  }

  async approveCourse(id: number): Promise<CourseResponseDto> {
    const course = await this.findOneWithDetails(id);

    await this.courseRepository.update(id, {
      approval_status: ApprovalStatus.APPROVED,
    });

    // Notify instructor about approval
    try {
      if (this.notificationService) {
        await this.notificationService.create({
          title: 'Course Approved',
          message: `Your course "${course.title}" has been approved`,
          type: require('../notifications/entities/notification.entity')
            .NotificationType.COURSE_APPROVAL_REQUEST,
          user_id: course.instructor_id,
          related_id: course.id,
          action_url: `/instructor/courses/${course.id}`,
        } as any);
      }
      // persisted only
    } catch (err) {
      console.debug(
        'Failed to send course approval notification',
        err?.message || err,
      );
    }

    return await this.findOneWithDetails(id);
  }

  async rejectCourse(id: number): Promise<CourseResponseDto> {
    const course = await this.findOneWithDetails(id);

    await this.courseRepository.update(id, {
      approval_status: ApprovalStatus.REJECTED,
    });

    // Notify instructor about rejection
    try {
      if (this.notificationService) {
        await this.notificationService.create({
          title: 'Course Rejected',
          message: `Your course "${course.title}" has been rejected`,
          type: require('../notifications/entities/notification.entity')
            .NotificationType.COURSE_APPROVAL_REQUEST,
          user_id: course.instructor_id,
          related_id: course.id,
          action_url: `/instructor/courses/${course.id}`,
        } as any);
      }
      // persisted only
    } catch (err) {
      console.debug(
        'Failed to send course rejection notification',
        err?.message || err,
      );
    }

    return await this.findOneWithDetails(id);
  }

  async getPublishedCourses(): Promise<CourseResponseDto[]> {
    const courses = await this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.instructor', 'instructor')
      .leftJoinAndSelect('course.category', 'category')
      .leftJoinAndSelect('course.courseTags', 'courseTags')
      .leftJoinAndSelect('courseTags.tag', 'tag')
      .where('course.status = :status', { status: CourseStatus.PUBLISHED })
      .andWhere('course.approval_status = :approvalStatus', {
        approvalStatus: ApprovalStatus.APPROVED,
      })
      .orderBy('course.created_at', 'DESC')
      .getMany();

    return courses.map((course) => this.mapToResponseDto(course));
  }

  async getStudentCount(courseId: number): Promise<number> {
    const enrollmentCount = await this.courseRepository
      .createQueryBuilder('course')
      .leftJoin('course.enrollments', 'enrollment')
      .where('course.id = :courseId', { courseId })
      .andWhere('enrollment.status = :status', { status: 'ACTIVE' })
      .getCount();

    return enrollmentCount;
  }

  async getCourseStatistics(id: number): Promise<{
    total_students: number;
    average_rating: number;
    rating_count: number;
  }> {
    const course = await this.courseRepository.findOne({ where: { id } });
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    return {
      total_students: course.total_enrolled || 0,
      average_rating: course.rating || 0,
      rating_count: course.rating_count || 0,
    };
  }
}
