import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Submission } from './entities/submission.entity';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';
import { Assignment } from '../assignments/entities/assignment.entity';
import { User } from '../users/entities/user.entity';
import { NotificationService } from '../notifications/notification.service';

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectRepository(Submission)
    private submissionRepository: Repository<Submission>,
    private notificationService: NotificationService,
  ) {}

  async create(
    createSubmissionDto: CreateSubmissionDto,
    authenticatedUserId?: number,
  ): Promise<Submission> {
    // Validate referenced assignment
    const assignmentRepo =
      this.submissionRepository.manager.getRepository(Assignment);
    const assignment = await assignmentRepo.findOne({
      where: { id: createSubmissionDto.assignment_id },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');

    // Ensure assignment is active and not past due (if due_date is set)
    if (!assignment.is_active)
      throw new ForbiddenException('Assignment is not active');
    if (assignment.due_date && new Date() > new Date(assignment.due_date)) {
      throw new ForbiddenException('Assignment submission deadline has passed');
    }

    // Validate student exists
    const userRepo = this.submissionRepository.manager.getRepository(User);
    const effectiveStudentId =
      authenticatedUserId ?? createSubmissionDto.student_id;
    if (!effectiveStudentId)
      throw new ForbiddenException('student_id is required');
    const student = await userRepo.findOne({
      where: { id: effectiveStudentId },
    });
    if (!student) throw new NotFoundException('Student not found');

    // Prevent duplicate submission (unique constraint) — prefer update flow handled elsewhere
    const existing = await this.submissionRepository.findOne({
      where: {
        assignment_id: createSubmissionDto.assignment_id,
        student_id: effectiveStudentId,
      },
    });
    if (existing)
      throw new ConflictException('Submission already exists for this student');

    // Map DTO to entity fields (use grade field name)
    const payload: any = {
      assignment_id: createSubmissionDto.assignment_id,
      student_id: effectiveStudentId,
      content: createSubmissionDto.content,
      file_url: createSubmissionDto.file_url,
      status: createSubmissionDto.status,
      grade: createSubmissionDto.grade,
      feedback: createSubmissionDto.feedback,
      submitted_at: createSubmissionDto.submitted_at,
      graded_at: createSubmissionDto.graded_at,
    };

    const submission = this.submissionRepository.create(payload);
    const saved = await this.submissionRepository.save(submission);

    // notify assignment instructor about new submission
    try {
      const assignmentFull = await assignmentRepo.findOne({
        where: { id: createSubmissionDto.assignment_id },
      });
      if (assignmentFull) {
        const { NotificationType } = await import(
          '../notifications/entities/notification.entity'
        );
        await this.notificationService.create({
          title: 'New Assignment Submission',
          message: `Student ${student.first_name ?? student.id} submitted for assignment "${
            assignmentFull.title || assignmentFull.id
          }"`,
          type: NotificationType.COURSE_UPDATE,
          user_id: assignmentFull.instructor_id,
          related_id: createSubmissionDto.assignment_id,
          action_url: `/assignments/${createSubmissionDto.assignment_id}`,
        } as any);
      }
    } catch (e) {
      // don't block submission if notification fails
      // console.warn('notify failed', e);
    }
    return saved as unknown as Submission;
  }

  async findAll(
    assignment_id?: number,
    student_id?: number,
  ): Promise<Submission[]> {
    const where: any = {};
    if (assignment_id) where.assignment_id = assignment_id;
    if (student_id) where.student_id = student_id;
    return this.submissionRepository.find({ where });
  }

  async findOne(id: number): Promise<Submission> {
    const submission = await this.submissionRepository.findOne({
      where: { id },
    });
    if (!submission) throw new NotFoundException('Submission not found');
    return submission;
  }

  async update(
    id: number,
    updateSubmissionDto: UpdateSubmissionDto,
  ): Promise<Submission> {
    await this.submissionRepository.update(id, updateSubmissionDto);
    return this.findOne(id);
  }

  /**
   * Grade a submission: set grade, feedback, graded_by and graded_at, and mark status GRADED
   */
  async gradeSubmission(
    submissionId: number,
    graderUser: any,
    grade: number,
    feedback?: string,
  ): Promise<Submission> {
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
      relations: ['assignment'],
    });
    if (!submission) throw new NotFoundException('Submission not found');

    const isAdmin = (graderUser?.roles || []).includes(
      // lazy import to avoid circular
      require('../common/enum/user-role.enum').UserRoles.ROLE_ADMIN,
    );

    if (!isAdmin && submission.assignment.instructor_id !== graderUser?.sub) {
      throw new ForbiddenException(
        'You can only grade submissions for your assignments',
      );
    }

    submission.grade = grade;
    submission.feedback = feedback ?? submission.feedback;
    submission.graded_by = graderUser?.sub;
    submission.graded_at = new Date();
    submission.status = (submission.status as any) || 'GRADED';

    const saved = await this.submissionRepository.save(submission);
    // notify student about published grade
    try {
      const assignmentTitle =
        submission.assignment?.title ?? submission.assignment_id;
      await this.notificationService.notifyGradePublished(
        submission.student_id,
        assignmentTitle,
        submission.grade ?? Number(grade),
        submission.assignment_id,
      );
    } catch (e) {
      // ignore notification failures
    }

    return saved as unknown as Submission;
  }

  async remove(id: number): Promise<void> {
    await this.submissionRepository.delete(id);
  }
}
