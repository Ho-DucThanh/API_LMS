import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
  ParseIntPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CourseResponseDto } from './dto/course-response.dto';
import { JWTAuthGuard } from '../common/guard/jwt-auth.guard';
import { RolesGuard } from '../common/guard/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRoles } from '../common/enum/user-role.enum';
import {
  CourseStatus,
  CourseLevel,
  ApprovalStatus,
} from './entities/course.entity';

@ApiTags('courses')
@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Get('categories')
  @ApiOperation({ summary: 'Get all course categories' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of course categories',
    schema: {
      type: 'array',
      items: { $ref: '#/components/schemas/CourseCategory' },
    },
  })
  async getAllCategories() {
    return this.courseService.getAllCategories();
  }

  @Get('tags')
  @ApiOperation({ summary: 'Get all course tags' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of course tags',
    schema: {
      type: 'array',
      items: { $ref: '#/components/schemas/Tag' },
    },
  })
  async getAllTags() {
    return this.courseService.getAllTags();
  }

  @Post()
  @UseGuards(JWTAuthGuard, RolesGuard)
  @Roles(UserRoles.ROLE_TEACHER, UserRoles.ROLE_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new course (Teacher/Admin only)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Course created successfully',
    type: CourseResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Teacher or Admin role required',
  })
  async create(
    @Body() createCourseDto: CreateCourseDto,
    @Request() req,
  ): Promise<CourseResponseDto> {
    return this.courseService.create(createCourseDto, req.user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Get all courses with filters' })
  @ApiQuery({ name: 'status', enum: CourseStatus, required: false })
  @ApiQuery({ name: 'level', enum: CourseLevel, required: false })
  @ApiQuery({ name: 'category_id', type: Number, required: false })
  @ApiQuery({ name: 'tag_id', type: Number, required: false })
  @ApiQuery({ name: 'search', type: String, required: false })
  @ApiQuery({ name: 'instructor_id', type: Number, required: false })
  @ApiQuery({ name: 'approval_status', enum: ApprovalStatus, required: false })
  @ApiQuery({
    name: 'sort_by',
    required: false,
    description:
      'Sort by field: rating_count, rating, created_at, total_enrolled',
  })
  @ApiQuery({
    name: 'sort_order',
    required: false,
    description: 'Sort order: ASC or DESC',
  })
  @ApiQuery({
    name: 'page',
    type: Number,
    required: false,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: 'Items per page (default: 10)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of courses retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        courses: {
          type: 'array',
          items: { $ref: '#/components/schemas/CourseResponseDto' },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  async findAll(@Query() query: any) {
    return this.courseService.findAll({
      status: query.status,
      level: query.level,
      category_id: query.category_id ? parseInt(query.category_id) : undefined,
      tag_id: query.tag_id ? parseInt(query.tag_id) : undefined,
      search: query.search,
      instructor_id: query.instructor_id
        ? parseInt(query.instructor_id)
        : undefined,
      approval_status: query.approval_status,
      sort_by: query.sort_by,
      sort_order: query.sort_order,
      page: query.page ? parseInt(query.page) : 1,
      limit: query.limit ? parseInt(query.limit) : 10,
    });
  }

  @Get('published')
  @ApiOperation({
    summary: 'Get all published and approved courses (Public access)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of published courses',
    type: [CourseResponseDto],
  })
  async getPublishedCourses(): Promise<CourseResponseDto[]> {
    return this.courseService.getPublishedCourses();
  }

  @Get('my-courses')
  @UseGuards(JWTAuthGuard, RolesGuard)
  @Roles(UserRoles.ROLE_TEACHER, UserRoles.ROLE_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get instructor's own courses" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of instructor courses',
    type: [CourseResponseDto],
  })
  async getMyCoursesAsInstructor(@Request() req): Promise<CourseResponseDto[]> {
    return this.courseService.findMyCoursesAsInstructor(req.user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get course by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Course details retrieved successfully',
    type: CourseResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Course not found',
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CourseResponseDto> {
    return this.courseService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JWTAuthGuard, RolesGuard)
  @Roles(UserRoles.ROLE_TEACHER, UserRoles.ROLE_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update course (Owner/Admin only)' })
  @ApiParam({ name: 'id', type: Number, description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Course updated successfully',
    type: CourseResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Course not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to update this course',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCourseDto: UpdateCourseDto,
    @Request() req,
  ): Promise<CourseResponseDto> {
    return this.courseService.update(id, updateCourseDto, req.user.sub);
  }

  @Delete(':id')
  @UseGuards(JWTAuthGuard, RolesGuard)
  @Roles(UserRoles.ROLE_TEACHER, UserRoles.ROLE_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete course (Owner/Admin only)' })
  @ApiParam({ name: 'id', type: Number, description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Course archived (soft-deleted) successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Course not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to delete this course',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ): Promise<void> {
    return this.courseService.remove(id, req.user.sub);
  }

  @Patch(':id/publish')
  @UseGuards(JWTAuthGuard, RolesGuard)
  @Roles(UserRoles.ROLE_TEACHER, UserRoles.ROLE_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish course (Owner/Admin only)' })
  @ApiParam({ name: 'id', type: Number, description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Course published successfully',
    type: CourseResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Course not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to publish this course',
  })
  async publishCourse(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ): Promise<CourseResponseDto> {
    return this.courseService.publishCourse(id, req.user.sub);
  }

  @Patch(':id/approve')
  @UseGuards(JWTAuthGuard, RolesGuard)
  @Roles(UserRoles.ROLE_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve course (Admin only)' })
  @ApiParam({ name: 'id', type: Number, description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Course approved successfully',
    type: CourseResponseDto,
  })
  async approveCourse(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CourseResponseDto> {
    return this.courseService.approveCourse(id);
  }

  @Patch(':id/reject')
  @UseGuards(JWTAuthGuard, RolesGuard)
  @Roles(UserRoles.ROLE_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject course (Admin only)' })
  @ApiParam({ name: 'id', type: Number, description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Course rejected successfully',
    type: CourseResponseDto,
  })
  async rejectCourse(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CourseResponseDto> {
    return this.courseService.rejectCourse(id);
  }

  @Get(':id/student-count')
  @ApiOperation({ summary: 'Get number of enrolled students for a course' })
  @ApiParam({ name: 'id', type: Number, description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Student count retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number' },
      },
    },
  })
  async getStudentCount(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ count: number }> {
    const count = await this.courseService.getStudentCount(id);
    return { count };
  }

  @Get(':id/statistics')
  @ApiOperation({
    summary: 'Get course statistics (students, rating, rating count)',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Course statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        total_students: { type: 'number' },
        average_rating: { type: 'number' },
        rating_count: { type: 'number' },
      },
    },
  })
  async getStatistics(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{
    total_students: number;
    average_rating: number;
    rating_count: number;
  }> {
    return this.courseService.getCourseStatistics(id);
  }
}
