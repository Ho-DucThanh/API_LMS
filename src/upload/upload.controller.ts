import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  UseGuards,
  Body,
  Delete,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
// Swagger imports removed
import { JWTAuthGuard } from '../common/guard/jwt-auth.guard';
import { UploadService } from './upload.service';
import { RolesGuard } from '../common/guard/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRoles } from '../common/enum/user-role.enum';
import { LessonsService } from '../lessons/lessons.service';
import { GetUser } from '../common/decorators/get-user.decorator';
import { JwtUserPayload } from '../auth/dto/jwt-user-payload.dto';
import { LessonType } from '../lessons/entities/lesson.entity';
import { CourseService } from '../courses/course.service';
import { AssignmentService } from '../assignments/assignment.service';
import { UsersService } from '../users/users.service';

@UseGuards(JWTAuthGuard, RolesGuard)
@Controller('upload')
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly lessonsService: LessonsService,
    private readonly courseService: CourseService,
    private readonly assignmentService: AssignmentService,
    private readonly usersService: UsersService,
  ) {}

  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        const allowedMimeTypes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp',
        ];
        if (allowedMimeTypes.includes(file.mimetype)) cb(null, true);
        else
          cb(
            new BadRequestException('Only image files are allowed for avatar'),
            false,
          );
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @GetUser() user?: JwtUserPayload,
  ) {
    if (!file) {
      throw new BadRequestException('No avatar file uploaded');
    }
    const result = await this.uploadService.uploadImage(
      file.buffer,
      'eduplatform/avatars',
    );
    // One-step: persist avatar_url to current user
    if (user?.sub) {
      try {
        const updated = await this.usersService.updateProfile(user.sub, {
          avatar: result.secure_url,
        } as any);
        return {
          url: result.secure_url,
          public_id: result.public_id,
          user: { id: updated.id, avatar: updated.avatar },
        };
      } catch (e) {
        // fall through and still return upload info if persist fails
      }
    }
    return { url: result.secure_url, public_id: result.public_id };
  }

  // Cloudinary: course thumbnail
  @Post('cloudinary/course-thumbnail')
  @Roles(UserRoles.ROLE_TEACHER, UserRoles.ROLE_ADMIN)
  @UseInterceptors(
    FileInterceptor('thumbnail', {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new BadRequestException('Only image files are allowed'), false);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadCourseThumbnailCloud(
    @UploadedFile() file: Express.Multer.File,
    @Body('course_id') course_id?: string,
    @GetUser() user?: JwtUserPayload,
  ) {
    if (!file) throw new BadRequestException('No thumbnail uploaded');
    const result = await this.uploadService.uploadImage(
      file.buffer,
      'eduplatform/course-thumbnails',
    );
    if (course_id) {
      // Persist thumbnail to course (ownership enforced in service)
      const updated = await this.courseService.update(
        Number(course_id),
        { thumbnail_url: result.secure_url },
        user!.sub,
      );
      return {
        url: result.secure_url,
        public_id: result.public_id,
        course: updated,
      };
    }
    return { url: result.secure_url, public_id: result.public_id };
  }

  // Cloudinary: lesson video
  @Post('cloudinary/lesson-video')
  @Roles(UserRoles.ROLE_TEACHER, UserRoles.ROLE_ADMIN)
  @UseInterceptors(
    FileInterceptor('video', {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('video/')) cb(null, true);
        else cb(new BadRequestException('Only video files are allowed'), false);
      },
      limits: { fileSize: 500 * 1024 * 1024 },
    }),
  )
  async uploadLessonVideoCloud(
    @UploadedFile() file: Express.Multer.File,
    @Body('lesson_id') lesson_id?: string,
    @GetUser() user?: JwtUserPayload,
  ) {
    if (!file) throw new BadRequestException('No video uploaded');
    const result = await this.uploadService.uploadVideo(
      file.buffer,
      'eduplatform/lesson-videos',
      {
        context: {
          uploaded_by: user?.sub ? String(user.sub) : 'unknown',
          ...(lesson_id ? { lesson_id: String(lesson_id) } : {}),
        },
      },
    );
    // If lesson_id provided, persist to DB (one-step association)
    if (lesson_id) {
      const updated = await this.lessonsService.update(
        Number(lesson_id),
        { type: LessonType.VIDEO, video_url: result.secure_url },
        user as JwtUserPayload,
      );
      return {
        url: result.secure_url,
        public_id: result.public_id,
        lesson: updated,
      };
    }
    // Fallback: two-step flow
    return { url: result.secure_url, public_id: result.public_id };
  }

  // DELETE lesson video: remove cloud asset and clear lesson.video_url
  @Delete('cloudinary/lesson-video')
  @Roles(UserRoles.ROLE_TEACHER, UserRoles.ROLE_ADMIN)
  async deleteLessonVideo(
    @Query('lesson_id') lesson_id: string,
    @GetUser() user?: JwtUserPayload,
  ) {
    if (!lesson_id) throw new BadRequestException('lesson_id required');
    const lesson = await this.lessonsService.findOne(Number(lesson_id));
    if (!lesson || !lesson.video_url)
      throw new BadRequestException('Lesson has no video');
    // Try extract public id; if not possible (signed url), search by context lesson_id
    const publicId = this.uploadService.extractPublicIdFromUrl(
      lesson.video_url,
    );
    let deletedAny = false;
    if (publicId) {
      await this.uploadService.deleteByPublicId(publicId, {
        resourceType: 'video',
        type: 'authenticated',
      });
      deletedAny = true;
    } else {
      // fallback: search by context for lesson_id
      const found = await this.uploadService.searchPublicIdsByContext(
        'lesson_id',
        String(lesson_id),
        'eduplatform/lesson-videos',
      );
      for (const pid of found) {
        await this.uploadService.deleteByPublicId(pid, {
          resourceType: 'video',
          type: 'authenticated',
        });
        deletedAny = true;
      }
    }
    // clear lesson.video_url (ownership enforced in service.update)
    const updated = await this.lessonsService.update(
      Number(lesson_id),
      { video_url: undefined, type: undefined },
      user as JwtUserPayload,
    );
    return { ok: true, deleted: deletedAny, lesson: updated };
  }

  // Cloudinary: assignment document/raw
  @Post('cloudinary/assignment-file')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  async uploadAssignmentFileCloud(
    @UploadedFile() file: Express.Multer.File,
    @Body('assignment_id') assignment_id?: string,
    @GetUser() user?: JwtUserPayload,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const result = await this.uploadService.uploadRaw(
      file.buffer,
      'eduplatform/assignments',
    );
    // For instructor-side assets (e.g., assignment attachments), we could persist on assignment entity if needed
    // For student submissions, prefer a dedicated submissions controller.
    if (assignment_id) {
      try {
        const updated = await this.assignmentService.addAttachmentUrl?.(
          Number(assignment_id),
          result.secure_url,
          user as JwtUserPayload,
        );
        return {
          url: result.secure_url,
          public_id: result.public_id,
          assignment: updated,
        };
      } catch {
        // If not implemented, just return the upload info
      }
    }
    return { url: result.secure_url, public_id: result.public_id };
  }
}
