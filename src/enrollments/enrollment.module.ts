import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnrollmentController } from './enrollment.controller';
import { EnrollmentService } from './enrollment.service';
import { Enrollment } from './entities/enrollment.entity';
import { Progress } from '../progress/entities/progress.entity';
import { Course } from '../courses/entities/course.entity';
import { NotificationModule } from '../notifications/notification.module';
import { NotificationService } from '../notifications/notification.service';
import { UsersModule } from '../users/users.module';
import { UsersService } from '../users/users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Enrollment, Progress, Course]),
    NotificationModule,
    UsersModule,
  ],
  controllers: [EnrollmentController],
  providers: [
    EnrollmentService,
    {
      provide: 'ENROLLMENT_SERVICE_SETUP',
      useFactory: (
        enrollmentService: EnrollmentService,
        notificationService: NotificationService,
        usersService: UsersService,
      ) => {
        enrollmentService.setNotificationService(notificationService as any);
        enrollmentService.setUsersService(usersService as any);
        return true;
      },
      inject: [EnrollmentService, NotificationService, UsersService],
    },
  ],
  exports: [EnrollmentService, TypeOrmModule],
})
export class EnrollmentModule {}
