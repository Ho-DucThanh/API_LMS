import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LessonsService } from './lessons.service';
import { LessonsController } from './lessons.controller';
import { Lesson } from './entities/lesson.entity';
import { Module as ModuleEntity } from '../modules/entities/module.entity';
import { Course } from '../courses/entities/course.entity';
import { UploadModule } from '../upload/upload.module';
import { EnrollmentModule } from '../enrollments/enrollment.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lesson, ModuleEntity, Course]),
    forwardRef(() => UploadModule),
    EnrollmentModule,
  ],
  controllers: [LessonsController],
  providers: [LessonsService],
  exports: [LessonsService],
})
export class LessonsModule {}
