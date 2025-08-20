import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ParseIntPipe,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { EnrollmentService } from './enrollment.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { EnrollmentResponseDto } from './dto/enrollment-response.dto';
import { JWTAuthGuard } from '../common/guard/jwt-auth.guard';
import { RolesGuard } from '../common/guard/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRoles } from '../common/enum/user-role.enum';
import { EnrollmentStatus } from './entities/enrollment.entity';

@ApiTags('enrollments')
@Controller('enrollments')
@UseGuards(JWTAuthGuard, RolesGuard)
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Post()
  @Roles(UserRoles.ROLE_USER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enroll in a course (Student only)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Enrollment created successfully',
    type: EnrollmentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Course not available for enrollment or invalid data',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Student already enrolled in this course',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Student role required',
  })
  async enrollInCourse(
    @Body() createEnrollmentDto: CreateEnrollmentDto,
    @Request() req,
  ): Promise<EnrollmentResponseDto> {
    return this.enrollmentService.enrollStudent(
      createEnrollmentDto,
      req.user.sub,
    );
  }

  @Get('my-enrollments')
  @Roles(UserRoles.ROLE_USER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user's enrollments" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Student enrollments retrieved successfully',
    type: [EnrollmentResponseDto],
  })
  async getMyEnrollments(@Request() req): Promise<EnrollmentResponseDto[]> {
    return this.enrollmentService.findStudentEnrollments(req.user.sub);
  }

  @Get('course/:courseId')
  @UseGuards(JWTAuthGuard, RolesGuard)
  @Roles(UserRoles.ROLE_TEACHER, UserRoles.ROLE_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get course enrollments (Teacher/Admin only)' })
  @ApiParam({ name: 'courseId', type: Number, description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Course enrollments retrieved successfully',
    type: [EnrollmentResponseDto],
  })
  async getCourseEnrollments(
    @Param('courseId', ParseIntPipe) courseId: number,
  ): Promise<EnrollmentResponseDto[]> {
    return this.enrollmentService.findCourseEnrollments(courseId);
  }

  @Get('check/:courseId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if current user is enrolled in a course' })
  @ApiParam({ name: 'courseId', type: Number, description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Enrollment status checked',
    schema: {
      oneOf: [
        { $ref: '#/components/schemas/EnrollmentResponseDto' },
        { type: 'null' },
      ],
    },
  })
  async checkEnrollmentStatus(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Request() req,
  ): Promise<EnrollmentResponseDto | null> {
    return this.enrollmentService.checkEnrollmentStatus(req.user.sub, courseId);
  }

  @Patch(':id/status')
  @Roles(UserRoles.ROLE_TEACHER, UserRoles.ROLE_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update enrollment status (Teacher/Admin only)' })
  @ApiParam({ name: 'id', type: Number, description: 'Enrollment ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Enrollment status updated successfully',
    type: EnrollmentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Enrollment not found',
  })
  async updateEnrollmentStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: EnrollmentStatus,
  ): Promise<EnrollmentResponseDto> {
    return this.enrollmentService.updateEnrollmentStatus(id, status);
  }

  @Delete('course/:courseId')
  @Roles(UserRoles.ROLE_USER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Drop enrollment from a course (Student only)' })
  @ApiParam({ name: 'courseId', type: Number, description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Enrollment dropped successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Enrollment not found',
  })
  async dropEnrollment(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Request() req,
  ): Promise<void> {
    return this.enrollmentService.removeEnrollment(req.user.sub, courseId);
  }

  @Get(':id/progress')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get enrollment progress and status' })
  async getEnrollmentProgress(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ): Promise<EnrollmentResponseDto> {
    // Fetch enrollment
    const enr = await this.enrollmentService.findEnrollmentById(id);

    // Allow if requester is the student owner or has teacher/admin role
    const isOwner = req.user?.sub === enr.student_id;
    const roles = req.user?.roles || [];
    const isPrivileged =
      roles.includes(UserRoles.ROLE_TEACHER) ||
      roles.includes(UserRoles.ROLE_ADMIN);

    if (!isOwner && !isPrivileged) {
      // Forbid access if not owner or privileged
      throw new (require('@nestjs/common').ForbiddenException)();
    }

    return enr;
  }

  @Get('course/:courseId/stats')
  @Roles(UserRoles.ROLE_TEACHER, UserRoles.ROLE_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get enrollment statistics for a course (Teacher/Admin only)',
  })
  @ApiParam({ name: 'courseId', type: Number, description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Enrollment statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        active: { type: 'number' },
        completed: { type: 'number' },
        dropped: { type: 'number' },
      },
    },
  })
  async getEnrollmentStats(
    @Param('courseId', ParseIntPipe) courseId: number,
  ): Promise<{
    total: number;
    active: number;
    completed: number;
    dropped: number;
  }> {
    return this.enrollmentService.getEnrollmentStats(courseId);
  }
}
