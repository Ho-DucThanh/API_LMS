import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Assignment } from './entities/assignment.entity';
import { Lesson } from '../lessons/entities/lesson.entity';
import { Module as ModuleEntity } from '../modules/entities/module.entity';
import { Course } from '../courses/entities/course.entity';
import {
  Submission,
  SubmissionStatus,
} from '../submissions/entities/submission.entity';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import {
  SubmitAssignmentDto,
  GradeSubmissionDto,
} from './dto/submit-assignment.dto';
import { JwtUserPayload } from '../auth/dto/jwt-user-payload.dto';
import { UserRoles } from '../common/enum/user-role.enum';

@Injectable()
export class AssignmentService {
  constructor(
    @InjectRepository(Assignment)
    private assignmentRepository: Repository<Assignment>,
    @InjectRepository(Submission)
    private submissionRepository: Repository<Submission>,
    @InjectRepository(Lesson)
    private lessonRepository: Repository<Lesson>,
    @InjectRepository(ModuleEntity)
    private moduleRepository: Repository<ModuleEntity>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
  ) {}

  async create(
    createAssignmentDto: CreateAssignmentDto,
    instructorId: number,
    user?: JwtUserPayload,
  ): Promise<Assignment> {
    // Ownership check: only admin or instructor of the course can create assignment for lesson
    const lesson = await this.lessonRepository.findOne({
      where: { id: createAssignmentDto.lesson_id },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    const module = await this.moduleRepository.findOne({
      where: { id: lesson.module_id },
    });
    if (!module) throw new NotFoundException('Module not found');
    const course = await this.courseRepository.findOne({
      where: { id: module.course_id },
    });
    if (!course) throw new NotFoundException('Course not found');
    const isAdmin = user?.roles?.includes(UserRoles.ROLE_ADMIN);
    if (!isAdmin && course.instructor_id !== instructorId) {
      throw new ForbiddenException('You do not own this course');
    }
    const assignmentPayload: any = {
      ...createAssignmentDto,
      instructor_id: instructorId,
      // ensure description is present for DB column which has NO default
      description: createAssignmentDto.description ?? '',
      // convert due_date safely when provided
      due_date: createAssignmentDto.due_date
        ? new Date(createAssignmentDto.due_date)
        : null,
    };

    const saved = await this.assignmentRepository.save(
      assignmentPayload as any,
    );
    return saved as Assignment;
  }

  async getAssignments(opts?: {
    courseId?: number;
    page?: number;
    limit?: number;
    sortBy?: string;
    order?: 'ASC' | 'DESC' | string;
  }): Promise<any> {
    const {
      courseId,
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      order = 'DESC',
    } = opts || {};

    const qb = this.assignmentRepository
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.lesson', 'lesson')
      .leftJoinAndSelect('lesson.module', 'module')
      .leftJoinAndSelect('module.course', 'course')
      .leftJoinAndSelect('a.instructor', 'instructor');

    if (courseId) {
      // 'module' and 'course' are already joined above via leftJoinAndSelect;
      // avoid joining them again which causes duplicate alias errors.
      qb.andWhere('course.id = :courseId', { courseId });
    }

    // sorting
    const safeSort = ['created_at', 'due_date', 'title'];
    const orderBy = safeSort.includes(sortBy) ? sortBy : 'created_at';
    qb.orderBy(`a.${orderBy}`, (order as 'ASC' | 'DESC') || 'DESC');

    // paging
    const skip = (page - 1) * limit;
    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByLesson(lessonId: number): Promise<Assignment[]> {
    return await this.assignmentRepository.find({
      where: { lesson_id: lessonId, is_active: true },
      relations: ['instructor', 'submissions'],
    });
  }

  async findOne(id: number): Promise<Assignment> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id },
      relations: ['lesson', 'instructor', 'submissions', 'submissions.student'],
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment with ID ${id} not found`);
    }

    return assignment;
  }

  async submitAssignment(
    assignmentId: number,
    studentId: number,
    submitDto: SubmitAssignmentDto,
  ): Promise<Submission> {
    const assignment = await this.findOne(assignmentId);

    // Check if assignment is still open
    if (!assignment.due_date) {
      throw new ForbiddenException('Assignment due date is not set');
    }
    if (new Date() > assignment.due_date) {
      throw new ForbiddenException('Assignment submission deadline has passed');
    }

    // Check if student already submitted
    const existingSubmission = await this.submissionRepository.findOne({
      where: { assignment_id: assignmentId, student_id: studentId },
    });

    if (existingSubmission) {
      // Update existing submission
      await this.submissionRepository.update(existingSubmission.id, {
        ...submitDto,
        status: SubmissionStatus.SUBMITTED,
      });
      const updatedSubmission = await this.submissionRepository.findOne({
        where: { id: existingSubmission.id },
        relations: ['assignment', 'student'],
      });
      return updatedSubmission!;
    }

    // Create new submission
    const submission = this.submissionRepository.create({
      assignment_id: assignmentId,
      student_id: studentId,
      ...submitDto,
      status: SubmissionStatus.SUBMITTED,
    });

    return await this.submissionRepository.save(submission);
  }

  async gradeSubmission(
    submissionId: number,
    instructorId: number,
    gradeDto: GradeSubmissionDto,
  ): Promise<Submission> {
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
      relations: ['assignment'],
    });

    if (!submission) {
      throw new NotFoundException(
        `Submission with ID ${submissionId} not found`,
      );
    }

    if (submission.assignment.instructor_id !== instructorId) {
      throw new ForbiddenException(
        'You can only grade submissions for your assignments',
      );
    }

    await this.submissionRepository.update(submissionId, {
      grade: gradeDto.grade,
      feedback: gradeDto.feedback,
      graded_by: instructorId,
      graded_at: new Date(),
      status: SubmissionStatus.GRADED,
    });

    const updatedSubmission = await this.submissionRepository.findOne({
      where: { id: submissionId },
      relations: ['assignment', 'student', 'grader'],
    });

    return updatedSubmission!;
  }

  async getSubmissionsByAssignment(
    assignmentId: number,
  ): Promise<Submission[]> {
    return await this.submissionRepository.find({
      where: { assignment_id: assignmentId },
      relations: ['student'],
      order: { submitted_at: 'DESC' },
    });
  }

  async getStudentSubmissions(studentId: number): Promise<Submission[]> {
    return await this.submissionRepository.find({
      where: { student_id: studentId },
      relations: ['assignment', 'assignment.lesson'],
      order: { submitted_at: 'DESC' },
    });
  }

  async getInstructorAssignments(instructorId: number): Promise<Assignment[]> {
    return await this.assignmentRepository.find({
      where: { instructor_id: instructorId },
      relations: ['lesson', 'submissions'],
      order: { created_at: 'DESC' },
    });
  }

  async updateStatus(id: number, is_active: boolean): Promise<Assignment> {
    await this.assignmentRepository.update(id, { is_active });
    return this.findOne(id);
  }

  async deleteAssignment(id: number): Promise<void> {
    await this.assignmentRepository.delete(id);
  }

  async update(
    id: number,
    updateDto: any,
    userId: number,
  ): Promise<Assignment> {
    const a = await this.assignmentRepository.findOne({
      where: { id },
      relations: ['lesson', 'lesson.module', 'lesson.module.course'],
    });
    if (!a) throw new NotFoundException('Assignment not found');
    const courseOwnerId = (a.lesson?.module?.course as any)?.instructor_id;
    // allow admins
    if (courseOwnerId && courseOwnerId !== userId) {
      throw new ForbiddenException('Not allowed to edit this assignment');
    }

    // patch allowed fields
    const allowed = [
      'title',
      'description',
      'due_date',
      'max_points',
      'content',
      'type',
    ];
    for (const k of Object.keys(updateDto)) {
      if (allowed.includes(k)) {
        (a as any)[k] = updateDto[k];
      }
    }

    return this.assignmentRepository.save(a);
  }

  /**
   * Add an attachment URL to the assignment's content.attachments array.
   * Creates the content/attachments structure if missing. Only the assignment's
   * instructor or an admin may modify attachments.
   */
  async addAttachmentUrl(
    assignmentId: number,
    url: string,
    user: JwtUserPayload,
  ): Promise<Assignment> {
    const assignment = await this.findOne(assignmentId);

    const isAdmin = user?.roles?.includes(UserRoles.ROLE_ADMIN);
    if (!isAdmin && assignment.instructor_id !== user?.sub) {
      throw new ForbiddenException(
        'You can only modify attachments for your assignments',
      );
    }

    const content: any = assignment.content ?? {};
    const attachments = Array.isArray(content.attachments)
      ? content.attachments
      : [];
    attachments.push({ url, uploaded_at: new Date().toISOString() });
    assignment.content = { ...content, attachments };

    await this.assignmentRepository.save(assignment);
    return this.findOne(assignmentId);
  }
}
