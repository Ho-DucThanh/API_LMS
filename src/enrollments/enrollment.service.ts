import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment, EnrollmentStatus } from './entities/enrollment.entity';
import { Progress } from '../progress/entities/progress.entity';
import {
  Course,
  CourseStatus,
  ApprovalStatus,
} from '../courses/entities/course.entity';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { EnrollmentResponseDto } from './dto/enrollment-response.dto';

@Injectable()
export class EnrollmentService {
  constructor(
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Progress)
    private progressRepository: Repository<Progress>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
  ) {}

  // Realtime removed: only persistence via NotificationService

  // Inject NotificationService lazily to avoid circular deps
  // will be set by module provider via setter after construction
  private notificationService?: import('../notifications/notification.service').NotificationService;
  // Optional UsersService to look up user names / roles
  private usersService?: import('../users/users.service').UsersService;

  setNotificationService(
    notificationService: import('../notifications/notification.service').NotificationService,
  ) {
    this.notificationService = notificationService;
  }

  setUsersService(usersService: import('../users/users.service').UsersService) {
    this.usersService = usersService;
  }

  async enrollStudent(
    createEnrollmentDto: CreateEnrollmentDto,
    studentId: number,
  ): Promise<EnrollmentResponseDto> {
    // Check if course exists and is available for enrollment
    const course = await this.courseRepository.findOne({
      where: { id: createEnrollmentDto.course_id },
      relations: ['instructor'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.status !== CourseStatus.PUBLISHED) {
      throw new BadRequestException(
        'Course is not published and available for enrollment',
      );
    }

    if (course.approval_status !== ApprovalStatus.APPROVED) {
      throw new BadRequestException('Course is not approved for enrollment');
    }

    // Check if student is already enrolled
    const existingEnrollment = await this.enrollmentRepository.findOne({
      where: {
        student_id: studentId,
        course_id: createEnrollmentDto.course_id,
      },
    });

    if (existingEnrollment) {
      throw new ConflictException('Student is already enrolled in this course');
    }

    // Create enrollment
    const enrollment = this.enrollmentRepository.create({
      course_id: createEnrollmentDto.course_id,
      student_id: studentId,
      status: createEnrollmentDto.status || EnrollmentStatus.ACTIVE,
      progress_percentage: 0,
    });

    const savedEnrollment = await this.enrollmentRepository.save(enrollment);

    // Update course enrollment count
    await this.courseRepository.update(course.id, {
      total_enrolled: course.total_enrolled + 1,
    });

    // Notify the student about successful enrollment
    try {
      // persist notification via NotificationService if set
      await this.notificationService?.notifyEnrollment(
        studentId,
        course.title,
        course.id,
      );
    } catch (err) {
      console.debug(
        'Failed to send enrollment notification',
        err?.message || err,
      );
    }

    // Also notify the instructor that a new student registered
    try {
      if (this.notificationService) {
        const student = this.usersService
          ? await this.usersService.findOne(studentId)
          : undefined;
        const studentName = student
          ? `${student.first_name} ${student.last_name}`
          : 'A student';

        await this.notificationService.create({
          title: 'New Registration',
          message: `${studentName} has registered for your course "${course.title}"`,
          type: require('../notifications/entities/notification.entity')
            .NotificationType.COURSE_ENROLLMENT,
          user_id: course.instructor?.id || course.instructor_id,
          related_id: course.id,
          action_url: `/instructor/courses/${course.id}/enrollments`,
        } as any);
      }
    } catch (err) {
      console.debug(
        'Failed to send instructor enrollment notification',
        err?.message || err,
      );
    }

    return this.mapToResponseDto(savedEnrollment, course);
  }

  private mapToResponseDto(
    enrollment: Enrollment,
    course?: Course,
  ): EnrollmentResponseDto {
    // Coerce progress to number and if progress === 100, expose status as COMPLETED
    const progressNum = Number(enrollment.progress_percentage) || 0;
    const returnedStatus =
      progressNum === 100 ? EnrollmentStatus.COMPLETED : enrollment.status;

    return {
      id: enrollment.id,
      student_id: enrollment.student_id,
      course_id: enrollment.course_id,
      status: returnedStatus,
      progress_percentage: progressNum,
      enrolled_at: enrollment.enrolled_at,
      completed_at: enrollment.completed_at,
      created_at: enrollment.created_at,
      updated_at: enrollment.updated_at,
      student: enrollment.student
        ? {
            id: enrollment.student.id,
            first_name: enrollment.student.first_name,
            last_name: enrollment.student.last_name,
            email: enrollment.student.email,
          }
        : undefined,
      course:
        course || enrollment.course
          ? {
              id: (course || enrollment.course).id,
              title: (course || enrollment.course).title,
              description: (course || enrollment.course).description,
              thumbnail_url: (course || enrollment.course).thumbnail_url,
              price: (course || enrollment.course).price,
              level: (course || enrollment.course).level,
              status: (course || enrollment.course).status,
            }
          : undefined,
    };
  }

  async findStudentEnrollments(
    studentId: number,
  ): Promise<EnrollmentResponseDto[]> {
    const enrollments = await this.enrollmentRepository.find({
      where: { student_id: studentId },
      relations: ['course', 'course.instructor', 'student'],
      order: { enrolled_at: 'DESC' },
    });

    return enrollments.map((enrollment) => this.mapToResponseDto(enrollment));
  }

  async findCourseEnrollments(
    courseId: number,
  ): Promise<EnrollmentResponseDto[]> {
    const enrollments = await this.enrollmentRepository.find({
      where: { course_id: courseId },
      relations: ['student', 'course'],
      order: { enrolled_at: 'DESC' },
    });

    return enrollments.map((enrollment) => this.mapToResponseDto(enrollment));
  }

  async checkEnrollmentStatus(
    studentId: number,
    courseId: number,
  ): Promise<EnrollmentResponseDto | null> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: {
        student_id: studentId,
        course_id: courseId,
      },
      relations: ['student', 'course'],
    });

    return enrollment ? this.mapToResponseDto(enrollment) : null;
  }

  async updateEnrollmentStatus(
    enrollmentId: number,
    status: EnrollmentStatus,
  ): Promise<EnrollmentResponseDto> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: enrollmentId },
      relations: ['student', 'course'],
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    const previousStatus = enrollment.status;
    enrollment.status = status;
    if (status === EnrollmentStatus.COMPLETED) {
      enrollment.completed_at = new Date();
      enrollment.progress_percentage = 100;
    }

    const updatedEnrollment = await this.enrollmentRepository.save(enrollment);
    // If status transitioned to COMPLETED, notify the student about completion
    if (status === EnrollmentStatus.COMPLETED) {
      try {
        await this.notificationService?.create({
          title: 'Course Completed',
          message: `Congratulations! You completed ${(updatedEnrollment.course && (updatedEnrollment.course as any).title) || 'your course'}`,
          type: require('../notifications/entities/notification.entity')
            .NotificationType.COURSE_ENROLLMENT,
          user_id: updatedEnrollment.student_id,
          related_id: updatedEnrollment.course_id,
          action_url: `/learn/${updatedEnrollment.course_id}`,
        } as any);

        // persisted only
      } catch (err) {
        console.debug(
          'Failed to send completion notification',
          err?.message || err,
        );
      }
    }

    // If status changed from PENDING -> ACTIVE (accepted), notify the student
    if (
      previousStatus === EnrollmentStatus.PENDING &&
      status === EnrollmentStatus.ACTIVE
    ) {
      try {
        await this.notificationService?.create({
          title: 'Enrollment Accepted',
          message: `Your enrollment for ${(updatedEnrollment.course && (updatedEnrollment.course as any).title) || 'the course'} has been accepted.`,
          type: require('../notifications/entities/notification.entity')
            .NotificationType.COURSE_ENROLLMENT,
          user_id: updatedEnrollment.student_id,
          related_id: updatedEnrollment.course_id,
          action_url: `/learn/${updatedEnrollment.course_id}`,
        } as any);
      } catch (err) {
        console.debug(
          'Failed to send acceptance notification',
          err?.message || err,
        );
      }
    }
    return this.mapToResponseDto(updatedEnrollment);
  }

  async removeEnrollment(studentId: number, courseId: number): Promise<void> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: {
        student_id: studentId,
        course_id: courseId,
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    // Update status instead of hard delete
    await this.enrollmentRepository.update(enrollment.id, {
      status: EnrollmentStatus.DROPPED,
    });

    // Decrease course enrollment count
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });

    if (course && course.total_enrolled > 0) {
      await this.courseRepository.update(courseId, {
        total_enrolled: course.total_enrolled - 1,
      });
    }
  }

  async getEnrollmentStats(courseId: number): Promise<{
    total: number;
    active: number;
    completed: number;
    dropped: number;
  }> {
    const enrollments = await this.enrollmentRepository.find({
      where: { course_id: courseId },
    });

    return {
      total: enrollments.length,
      active: enrollments.filter((e) => e.status === EnrollmentStatus.ACTIVE)
        .length,
      completed: enrollments.filter(
        (e) => e.status === EnrollmentStatus.COMPLETED,
      ).length,
      dropped: enrollments.filter((e) => e.status === EnrollmentStatus.DROPPED)
        .length,
    };
  }

  // Return a single enrollment by id (with relations)
  async findEnrollmentById(id: number): Promise<EnrollmentResponseDto> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id },
      relations: ['course', 'student', 'course.instructor'],
    });

    if (!enrollment) throw new NotFoundException('Enrollment not found');
    return this.mapToResponseDto(enrollment);
  }
}
