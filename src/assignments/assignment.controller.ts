import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AssignmentService } from './assignment.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import {
  SubmitAssignmentDto,
  GradeSubmissionDto,
} from './dto/submit-assignment.dto';
import { JWTAuthGuard } from '../common/guard/jwt-auth.guard';
import { RolesGuard } from '../common/guard/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRoles } from '../common/enum/user-role.enum';
import { Assignment } from './entities/assignment.entity';
import { Submission } from '../submissions/entities/submission.entity';

@ApiTags('assignments')
@ApiBearerAuth()
@UseGuards(JWTAuthGuard, RolesGuard)
@Controller('assignments')
export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Get()
  @ApiOperation({
    summary:
      'List assignments (optional filter by courseId) with paging/sorting',
  })
  async getAssignments(
    @Query('courseId') courseId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: string,
  ) {
    const opts: any = {
      courseId: courseId ? Number(courseId) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sortBy: sortBy || undefined,
      order: order || undefined,
    };
    return this.assignmentService.getAssignments(opts);
  }

  @Post()
  @Roles(UserRoles.ROLE_TEACHER, UserRoles.ROLE_ADMIN)
  @ApiOperation({ summary: 'Create a new assignment' })
  @ApiResponse({
    status: 201,
    description: 'Assignment created successfully',
    type: Assignment,
  })
  create(
    @Body() createAssignmentDto: CreateAssignmentDto,
    @Request() req,
  ): Promise<Assignment> {
    return this.assignmentService.create(createAssignmentDto, req.user.sub);
  }

  @Get('lesson/:lessonId')
  @ApiOperation({ summary: 'Get assignments for a lesson' })
  @ApiResponse({
    status: 200,
    description: 'Assignments retrieved successfully',
    type: [Assignment],
  })
  findByLesson(@Param('lessonId') lessonId: string): Promise<Assignment[]> {
    return this.assignmentService.findByLesson(+lessonId);
  }

  @Get('my-assignments')
  @Roles(UserRoles.ROLE_TEACHER)
  @ApiOperation({ summary: 'Get assignments created by current instructor' })
  @ApiResponse({
    status: 200,
    description: 'Instructor assignments retrieved successfully',
    type: [Assignment],
  })
  getMyAssignments(@Request() req): Promise<Assignment[]> {
    return this.assignmentService.getInstructorAssignments(req.user.sub);
  }

  @Get('my-submissions')
  @Roles(UserRoles.ROLE_USER)
  @ApiOperation({ summary: 'Get current student submissions' })
  @ApiResponse({
    status: 200,
    description: 'Student submissions retrieved successfully',
    type: [Submission],
  })
  getMySubmissions(@Request() req): Promise<Submission[]> {
    return this.assignmentService.getStudentSubmissions(req.user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get assignment by ID' })
  @ApiResponse({
    status: 200,
    description: 'Assignment retrieved successfully',
    type: Assignment,
  })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<any> {
    const a = await this.assignmentService.findOne(id);
    const due = (a as any)?.due_date ? new Date((a as any).due_date) : null;
    const overdue = !!(due && !isNaN(due.getTime()) && new Date() > due);
    return {
      ...(a as any),
      overdue,
      dueDate: due ? due.toISOString() : null,
    };
  }

  @Post(':id/submit')
  @Roles(UserRoles.ROLE_USER)
  @ApiOperation({ summary: 'Submit assignment' })
  @ApiResponse({
    status: 201,
    description: 'Assignment submitted successfully',
    type: Submission,
  })
  submitAssignment(
    @Param('id') id: string,
    @Body() submitDto: SubmitAssignmentDto,
    @Request() req,
  ): Promise<Submission | any> {
    return this.assignmentService.submitAssignment(
      +id,
      req.user.sub,
      submitDto,
    );
  }

  @Patch('submissions/:submissionId/grade')
  @Roles(UserRoles.ROLE_TEACHER, UserRoles.ROLE_ADMIN)
  @ApiOperation({ summary: 'Grade a submission' })
  @ApiResponse({
    status: 200,
    description: 'Submission graded successfully',
    type: Submission,
  })
  gradeSubmission(
    @Param('submissionId') submissionId: string,
    @Body() gradeDto: GradeSubmissionDto,
    @Request() req,
  ): Promise<Submission> {
    return this.assignmentService.gradeSubmission(
      +submissionId,
      req.user.sub,
      gradeDto,
    );
  }

  @Get(':id/submissions')
  @Roles(UserRoles.ROLE_TEACHER, UserRoles.ROLE_ADMIN)
  @ApiOperation({ summary: 'Get submissions for an assignment' })
  @ApiResponse({
    status: 200,
    description: 'Submissions retrieved successfully',
    type: [Submission],
  })
  getSubmissions(@Param('id') id: string): Promise<Submission[]> {
    return this.assignmentService.getSubmissionsByAssignment(+id);
  }

  @Patch(':id/status')
  @Roles(UserRoles.ROLE_TEACHER, UserRoles.ROLE_ADMIN)
  @ApiOperation({ summary: 'Update assignment status (active/inactive)' })
  updateStatus(
    @Param('id') id: string,
    @Body('is_active') is_active: boolean,
  ): Promise<Assignment> {
    return this.assignmentService.updateStatus(+id, is_active);
  }

  @Delete(':id')
  @Roles(UserRoles.ROLE_TEACHER, UserRoles.ROLE_ADMIN)
  @ApiOperation({ summary: 'Delete assignment' })
  deleteAssignment(@Param('id') id: string): Promise<void> {
    return this.assignmentService.deleteAssignment(+id);
  }

  @Patch(':id')
  @Roles(UserRoles.ROLE_TEACHER, UserRoles.ROLE_ADMIN)
  @ApiOperation({ summary: 'Update assignment' })
  update(@Param('id') id: string, @Body() updateDto: any, @Request() req) {
    return this.assignmentService.update(+id, updateDto, req.user.sub);
  }
}
