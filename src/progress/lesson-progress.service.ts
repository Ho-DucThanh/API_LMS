import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LessonProgress } from './entities/lesson-progress.entity';
import { CreateLessonProgressDto } from './dto/create-lesson-progress.dto';
import { UpdateLessonProgressDto } from './dto/update-lesson-progress.dto';
import { ProgressService } from './progress.service';
import {
  Enrollment,
  EnrollmentStatus,
} from '../enrollments/entities/enrollment.entity';

@Injectable()
export class LessonProgressService {
  constructor(
    @InjectRepository(LessonProgress)
    private lessonProgressRepository: Repository<LessonProgress>,
    @Inject(forwardRef(() => ProgressService))
    private progressService: ProgressService,
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
  ) {}

  async create(
    createLessonProgressDto: CreateLessonProgressDto,
  ): Promise<LessonProgress> {
    const lessonProgress = this.lessonProgressRepository.create(
      createLessonProgressDto,
    );
    const saved = await this.lessonProgressRepository.save(lessonProgress);
    await this.recalculateProgress(saved.enrollment_id);
    return saved;
  }

  async findAll(
    enrollment_id?: number,
    lesson_id?: number,
  ): Promise<LessonProgress[]> {
    const where: any = {};
    if (enrollment_id) where.enrollment_id = enrollment_id;
    if (lesson_id) where.lesson_id = lesson_id;
    return this.lessonProgressRepository.find({ where });
  }

  async findOne(id: number): Promise<LessonProgress> {
    const lessonProgress = await this.lessonProgressRepository.findOne({
      where: { id },
    });
    if (!lessonProgress)
      throw new NotFoundException('LessonProgress not found');
    return lessonProgress;
  }

  async update(
    id: number,
    updateLessonProgressDto: UpdateLessonProgressDto,
  ): Promise<LessonProgress> {
    await this.lessonProgressRepository.update(id, updateLessonProgressDto);
    const updated = await this.findOne(id);
    await this.recalculateProgress(updated.enrollment_id);
    return updated;
  }

  /**
   * Tự động tính lại progress module và enrollment khi lesson-progress thay đổi
   */
  async recalculateProgress(enrollment_id: number) {
    // Tính phần trăm hoàn thành bài học
    const allLessons = await this.lessonProgressRepository.find({
      where: { enrollment_id },
    });
    const total = allLessons.length;
    const completed = allLessons.filter((l) => l.is_completed).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Cập nhật progress_percentage cho enrollment
    // If progress reached 100, mark as COMPLETED and set completed_at.
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: enrollment_id },
    });
    if (enrollment) {
      if (percent === 100 && enrollment.status !== EnrollmentStatus.COMPLETED) {
        await this.enrollmentRepository.update(enrollment_id, {
          progress_percentage: percent,
          status: EnrollmentStatus.COMPLETED,
          completed_at: new Date(),
        });
      } else {
        // Just update progress percentage
        await this.enrollmentRepository.update(enrollment_id, {
          progress_percentage: percent,
        });
      }
    } else {
      // fallback: update progress only
      await this.enrollmentRepository.update(enrollment_id, {
        progress_percentage: percent,
      });
    }
    // Có thể gọi thêm progressService.recalculateModuleProgress nếu muốn cập nhật module
  }

  async remove(id: number): Promise<void> {
    await this.lessonProgressRepository.delete(id);
  }
}
