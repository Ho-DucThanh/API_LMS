import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import typeOrmConfig from './config/typeOrmConfig';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { ReportsModule } from './reports/reports.module';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import * as path from 'path';
import { UsersModule } from './users/users.module';
import { CoursesModule } from './courses/courses.module';
import { ModulesModule } from './modules/modules.module';
import { LessonsModule } from './lessons/lessons.module';
import { EnrollmentModule } from './enrollments/enrollment.module';
import { AssignmentModule } from './assignments/assignment.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { ProgressModule } from './progress/progress.module';
import { AdminModule } from './admin/admin.module';
import { ForumModule } from './forums/forum.module';
import { NotificationModule } from './notifications/notification.module';
import { UploadModule } from './upload/upload.module';
import { EventsModule } from './events/events.module';
import { ReviewsModule } from './reviews/reviews.module';
import { AiRecommendationModule } from './OpenAI/ai-recommendation.module';
import * as morgan from 'morgan';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    TypeOrmModule.forRoot(typeOrmConfig),
    ScheduleModule.forRoot(),
    AuthModule,
    MailerModule.forRoot({
      transport: {
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_FROM,
          pass: process.env.EMAIL_PASS,
        },
      },
      defaults: {
        from: `"${process.env.EMAIL_NAME}" <${process.env.EMAIL_FROM}>`,
      },
      template: {
        dir: path.join(__dirname, '..', 'templates'),
        adapter: new HandlebarsAdapter(),
        options: {
          strict: true,
        },
      },
    }),
    UsersModule,
    CoursesModule,
    EnrollmentModule,
    AssignmentModule,
    SubmissionsModule,
    ProgressModule,
    AdminModule,
    ForumModule,
    NotificationModule,
    UploadModule,
    EventsModule,
    ModulesModule,
    LessonsModule,
    ReviewsModule,
    AiRecommendationModule,
    ReportsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(morgan('dev')).forRoutes('*');
  }
}
