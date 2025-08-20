import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { RolesGuard } from 'src/common/guard/roles.guard';
import { JWTAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRoles } from 'src/common/enum/user-role.enum';

@Controller('submissions')
@UseGuards(JWTAuthGuard, RolesGuard)
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post()
  create(@Request() req, @Body() createSubmissionDto: CreateSubmissionDto) {
    // forward authenticated user id so students can submit without passing student_id in body
    return this.submissionsService.create(createSubmissionDto, req.user?.sub);
  }

  @Get()
  findAll(
    @Query('assignment_id') assignment_id?: number,
    @Query('student_id') student_id?: number,
  ) {
    return this.submissionsService.findAll(
      assignment_id ? Number(assignment_id) : undefined,
      student_id ? Number(student_id) : undefined,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.submissionsService.findOne(Number(id));
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateSubmissionDto: UpdateSubmissionDto,
  ) {
    return this.submissionsService.update(Number(id), updateSubmissionDto);
  }

  @Patch(':id/grade')
  @Roles(UserRoles.ROLE_TEACHER, UserRoles.ROLE_ADMIN)
  grade(
    @Param('id') id: string,
    @Body() gradeDto: GradeSubmissionDto,
    @Request() req,
  ) {
    // pass full user payload so service can check roles/ownership
    return this.submissionsService.gradeSubmission(
      Number(id),
      req.user,
      gradeDto.grade,
      gradeDto.feedback,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.submissionsService.remove(Number(id));
  }
}
