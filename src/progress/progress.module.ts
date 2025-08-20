import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Progress } from './entities/progress.entity';
import { LessonProgress } from './entities/lesson-progress.entity';
import { ProgressService } from './progress.service';
import { LessonProgressService } from './lesson-progress.service';
import { ProgressController } from './progress.controller';
import { LessonProgressController } from './lesson-progress.controller';
import { Enrollment } from 'src/enrollments/entities/enrollment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Progress, LessonProgress, Enrollment])],
  providers: [ProgressService, LessonProgressService],
  controllers: [ProgressController, LessonProgressController],
  exports: [ProgressService, LessonProgressService],
})
export class ProgressModule {}
