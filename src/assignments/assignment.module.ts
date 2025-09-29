import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssignmentController } from './assignment.controller';
import { AssignmentService } from './assignment.service';
import { Assignment } from './entities/assignment.entity';
import { Submission } from '../submissions/entities/submission.entity';
import { Lesson } from 'src/lessons/entities/lesson.entity';
import { Module as ModuleEntity } from '../modules/entities/module.entity';
import { Course } from '../courses/entities/course.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { NotificationModule } from '../notifications/notification.module';
import { NotificationService } from '../notifications/notification.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Assignment,
      Submission,
      Lesson,
      ModuleEntity,
      Course,
      Enrollment,
      Notification,
    ]),
    NotificationModule,
  ],
  controllers: [AssignmentController],
  providers: [
    AssignmentService,
    {
      provide: 'ASSIGNMENT_SERVICE_SETUP',
      useFactory: (
        assignmentService: AssignmentService,
        notificationService: NotificationService,
      ) => {
        (assignmentService as any).setNotificationService(
          notificationService as any,
        );
        return true;
      },
      inject: [AssignmentService, NotificationService],
    },
  ],
  exports: [AssignmentService],
})
export class AssignmentModule {}
