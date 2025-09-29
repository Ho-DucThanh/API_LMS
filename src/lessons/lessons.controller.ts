import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { JWTAuthGuard } from '../common/guard/jwt-auth.guard';
import { RolesGuard } from '../common/guard/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRoles } from '../common/enum/user-role.enum';
import { GetUser } from '../common/decorators/get-user.decorator';
import { JwtUserPayload } from '../auth/dto/jwt-user-payload.dto';
import { UploadService } from '../upload/upload.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson } from './entities/lesson.entity';
import { EnrollmentService } from '../enrollments/enrollment.service';
import { Course } from '../courses/entities/course.entity';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Req,
} from '@nestjs/common';
import { Module as ModuleEntity } from '../modules/entities/module.entity';

@Controller('lessons')
export class LessonsController {
  constructor(
    private readonly lessonsService: LessonsService,
    private readonly uploadService: UploadService,
    private readonly enrollmentService: EnrollmentService,
    @InjectRepository(Lesson) private readonly lessonRepo: Repository<Lesson>,
    @InjectRepository(Course) private readonly courseRepo: Repository<Course>,
    @InjectRepository(ModuleEntity)
    private readonly moduleRepo: Repository<ModuleEntity>,
  ) {}

  @Post()
  @UseGuards(JWTAuthGuard, RolesGuard)
  @Roles(UserRoles.ROLE_TEACHER, UserRoles.ROLE_ADMIN)
  create(
    @Body() createLessonDto: CreateLessonDto,
    @GetUser() user: JwtUserPayload,
  ) {
    return this.lessonsService.create(createLessonDto, user);
  }

  @Get()
  findAll(@Query('module_id') module_id?: number) {
    return this.lessonsService.findAll(
      module_id ? Number(module_id) : undefined,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.lessonsService.findOne(Number(id));
  }

  /**
   * Get a signed video URL for a lesson if the user has access.
   * Access rules:
   * - If lesson.is_free is true and course is published+approved: allow anonymous/public
   * - Else: user must be authenticated and enrolled in the course
   */
  @Get(':id/signed-video')
  async getSignedVideo(@Param('id') id: string, @Req() req: any) {
    const lessonId = Number(id);
    const lesson = await this.lessonRepo.findOne({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    if (!lesson.video_url) {
      return { url: null, reason: 'NO_VIDEO' };
    }
    // Load course for publish/approval status and enrollment check
    const module = await this.moduleRepo.findOne({
      where: { id: lesson.module_id },
    });
    if (!module) throw new NotFoundException('Module not found');
    const course = await this.courseRepo.findOne({
      where: { id: module.course_id },
    });
    if (!course) throw new NotFoundException('Course not found');

    // Free lesson still should be in approved+published course
    const isCoursePublic =
      course.status === 'PUBLISHED' && course.approval_status === 'APPROVED';
    if (lesson.is_free && isCoursePublic) {
      // Free lesson: still sign the URL to avoid hotlinking, but no enrollment required
      const publicId = this.uploadService.extractPublicIdFromUrl(
        lesson.video_url,
      );
      if (!publicId) return { url: null, reason: 'INVALID_URL' };
      const url = this.uploadService.generateSignedUrl(publicId, {
        resourceType: 'video',
        deliveryType: 'authenticated',
        expiresInSec: 60 * 60,
      });
      return { url };
    }

    // Require enrollment
    const user: JwtUserPayload | undefined = req?.user;
    if (!user?.sub) throw new ForbiddenException('Authentication required');
    const enrollment = await this.enrollmentService.checkEnrollmentStatus(
      user.sub,
      course.id,
    );
    if (!enrollment || enrollment.status === 'DROPPED') {
      throw new ForbiddenException('You are not enrolled in this course');
    }
    const publicId = this.uploadService.extractPublicIdFromUrl(
      lesson.video_url,
    );
    if (!publicId) return { url: null, reason: 'INVALID_URL' };
    const url = this.uploadService.generateSignedUrl(publicId, {
      resourceType: 'video',
      deliveryType: 'authenticated',
      expiresInSec: 60 * 60,
    });
    return { url };
  }

  @Patch(':id')
  @UseGuards(JWTAuthGuard, RolesGuard)
  @Roles(UserRoles.ROLE_TEACHER, UserRoles.ROLE_ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateLessonDto: UpdateLessonDto,
    @GetUser() user: JwtUserPayload,
  ) {
    return this.lessonsService.update(Number(id), updateLessonDto, user);
  }

  @Delete(':id')
  @UseGuards(JWTAuthGuard, RolesGuard)
  @Roles(UserRoles.ROLE_TEACHER, UserRoles.ROLE_ADMIN)
  remove(@Param('id') id: string, @GetUser() user: JwtUserPayload) {
    return this.lessonsService.remove(Number(id), user);
  }
}
