import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseController } from './course.controller';
import { CourseService } from './course.service';
import { Course } from './entities/course.entity';
import { Module as CourseModule } from '../modules/entities/module.entity';
import { CourseCategory } from './entities/course_category';
import { CourseTag } from './entities/course_tag';
import { Tag } from './entities/tag';
import { NotificationModule } from '../notifications/notification.module';
import { NotificationService } from '../notifications/notification.service';
import { UsersModule } from '../users/users.module';
import { UsersService } from '../users/users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Course,
      CourseModule,
      CourseCategory,
      CourseTag,
      Tag,
    ]),
    NotificationModule,
    UsersModule,
  ],
  controllers: [CourseController],
  providers: [
    CourseService,
    {
      provide: 'COURSE_SERVICE_SETUP',
      useFactory: (
        courseService: CourseService,
        notificationService: NotificationService,
        usersService: UsersService,
      ) => {
        courseService.setNotificationService(notificationService as any);
        // also expose usersService to courseService for admin lookups
        (courseService as any).usersService = usersService;
        return true;
      },
      inject: [CourseService, NotificationService, UsersService],
    },
  ],
  exports: [CourseService, TypeOrmModule],
})
export class CoursesModule {}
