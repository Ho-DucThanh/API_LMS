import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson } from './entities/lesson.entity';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { Module as ModuleEntity } from '../modules/entities/module.entity';
import { Course } from '../courses/entities/course.entity';
import { JwtUserPayload } from '../auth/dto/jwt-user-payload.dto';
import { UserRoles } from '../common/enum/user-role.enum';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class LessonsService {
  constructor(
    @InjectRepository(Lesson)
    private lessonRepository: Repository<Lesson>,
    @InjectRepository(ModuleEntity)
    private moduleRepository: Repository<ModuleEntity>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    private uploadService: UploadService,
  ) {}

  private isAdmin(user: JwtUserPayload) {
    return user?.roles?.includes(UserRoles.ROLE_ADMIN);
  }

  async create(
    createLessonDto: CreateLessonDto,
    user: JwtUserPayload,
  ): Promise<Lesson> {
    if (!this.isAdmin(user)) {
      const module = await this.moduleRepository.findOne({
        where: { id: createLessonDto.module_id },
      });
      if (!module) throw new NotFoundException('Module not found');
      const course = await this.courseRepository.findOne({
        where: { id: module.course_id },
      });
      if (!course) throw new NotFoundException('Course not found');
      if (course.instructor_id !== user.sub)
        throw new ForbiddenException('You do not own this course');
    }
    const lesson = this.lessonRepository.create(createLessonDto);
    return this.lessonRepository.save(lesson);
  }

  async findAll(module_id?: number): Promise<Lesson[]> {
    if (module_id) {
      return this.lessonRepository.find({
        where: { module_id },
        order: { order_index: 'ASC' },
      });
    }
    return this.lessonRepository.find({ order: { order_index: 'ASC' } });
  }

  async findOne(id: number): Promise<Lesson> {
    const lesson = await this.lessonRepository.findOne({ where: { id } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    return lesson;
  }

  async update(
    id: number,
    updateLessonDto: UpdateLessonDto,
    user: JwtUserPayload,
  ): Promise<Lesson> {
    if (!this.isAdmin(user)) {
      const existing = await this.findOne(id);
      const moduleIdToCheck = updateLessonDto.module_id ?? existing.module_id;
      const module = await this.moduleRepository.findOne({
        where: { id: moduleIdToCheck },
      });
      if (!module) throw new NotFoundException('Module not found');
      const course = await this.courseRepository.findOne({
        where: { id: module.course_id },
      });
      if (!course) throw new NotFoundException('Course not found');
      if (course.instructor_id !== user.sub)
        throw new ForbiddenException('You do not own this course');
    }
    await this.lessonRepository.update(id, updateLessonDto);
    return this.findOne(id);
  }

  async remove(id: number, user: JwtUserPayload): Promise<void> {
    if (!this.isAdmin(user)) {
      const existing = await this.findOne(id);
      const module = await this.moduleRepository.findOne({
        where: { id: existing.module_id },
      });
      if (!module) throw new NotFoundException('Module not found');
      const course = await this.courseRepository.findOne({
        where: { id: module.course_id },
      });
      if (!course) throw new NotFoundException('Course not found');
      if (course.instructor_id !== user.sub)
        throw new ForbiddenException('You do not own this course');
    }
    // Attempt to delete associated cloud video (if present) before removing DB record
    const lesson = await this.findOne(id);
    if (lesson.video_url) {
      try {
        const publicId = this.uploadService.extractPublicIdFromUrl(
          lesson.video_url,
        );
        if (publicId) {
          await this.uploadService.deleteByPublicId(publicId, {
            resourceType: 'video',
            type: 'authenticated',
          });
        } else {
          // fallback: search by context key lesson_id
          const found = await this.uploadService.searchPublicIdsByContext(
            'lesson_id',
            String(id),
            'eduplatform/lesson-videos',
          );
          for (const pid of found) {
            try {
              await this.uploadService.deleteByPublicId(pid, {
                resourceType: 'video',
                type: 'authenticated',
              });
            } catch (e) {
              console.warn(
                'Failed to delete video by public id',
                pid,
                e?.message || e,
              );
            }
          }
        }
      } catch (e) {
        // best-effort: log and continue with DB deletion to avoid blocking user action
        console.warn(
          'Failed to remove lesson video from cloud (continuing):',
          e?.message || e,
        );
      }
    }
    await this.lessonRepository.delete(id);
  }
}
