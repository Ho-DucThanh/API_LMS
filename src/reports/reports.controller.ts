import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guard/roles.guard';
import { JWTAuthGuard } from '../common/guard/jwt-auth.guard';

@Controller('reports')
@UseGuards(JWTAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('admin/overview')
  @Roles('ROLE_ADMIN')
  adminOverview() {
    return this.reportsService.getAdminOverview();
  }

  @Get('admin/courses')
  @Roles('ROLE_ADMIN')
  adminCourses(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.reportsService.getAdminCoursePerformance({
      page: Number(page) || 1,
      limit: Math.min(Number(limit) || 20, 100),
    });
  }

  @Get('admin/trends')
  @Roles('ROLE_ADMIN')
  adminTrends(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('interval') interval?: 'day' | 'month',
  ) {
    return this.reportsService.getAdminTrends({ from, to, interval });
  }

  @Get('teacher/overview')
  @Roles('ROLE_TEACHER')
  teacherOverview(@Query('teacherId') teacherId?: string) {
    return this.reportsService.getTeacherOverview(Number(teacherId));
  }

  @Get('teacher/courses')
  @Roles('ROLE_TEACHER')
  teacherCourses(
    @Query('teacherId') teacherId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reportsService.getTeacherCoursePerformance(Number(teacherId), {
      page: Number(page) || 1,
      limit: Math.min(Number(limit) || 20, 100),
    });
  }

  @Get('teacher/trends')
  @Roles('ROLE_TEACHER')
  teacherTrends(
    @Query('teacherId') teacherId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('interval') interval?: 'day' | 'month',
  ) {
    return this.reportsService.getTeacherTrends(Number(teacherId), {
      from,
      to,
      interval,
    });
  }
}
