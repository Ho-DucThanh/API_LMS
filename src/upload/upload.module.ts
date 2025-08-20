import { Module, forwardRef } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { LessonsModule } from '../lessons/lessons.module';
import { CoursesModule } from '../courses/courses.module';
import { AssignmentModule } from '../assignments/assignment.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    forwardRef(() => LessonsModule),
    CoursesModule,
    AssignmentModule,
    UsersModule,
  ],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
