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
} from '@nestjs/common';
import { LessonProgressService } from './lesson-progress.service';
import { CreateLessonProgressDto } from './dto/create-lesson-progress.dto';
import { UpdateLessonProgressDto } from './dto/update-lesson-progress.dto';
import { JWTAuthGuard } from '../common/guard/jwt-auth.guard';
import { RolesGuard } from '../common/guard/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRoles } from '../common/enum/user-role.enum';

@Controller('lesson-progress')
export class LessonProgressController {
  constructor(private readonly lessonProgressService: LessonProgressService) {}

  @Post()
  @UseGuards(JWTAuthGuard, RolesGuard)
  @Roles(UserRoles.ROLE_USER)
  create(@Body() createLessonProgressDto: CreateLessonProgressDto) {
    return this.lessonProgressService.create(createLessonProgressDto);
  }

  @Get()
  @UseGuards(JWTAuthGuard)
  findAll(
    @Query('enrollment_id') enrollment_id?: number,
    @Query('lesson_id') lesson_id?: number,
  ) {
    return this.lessonProgressService.findAll(
      enrollment_id ? Number(enrollment_id) : undefined,
      lesson_id ? Number(lesson_id) : undefined,
    );
  }

  @Get(':id')
  @UseGuards(JWTAuthGuard)
  findOne(@Param('id') id: string) {
    return this.lessonProgressService.findOne(Number(id));
  }

  @Patch(':id')
  @UseGuards(JWTAuthGuard, RolesGuard)
  @Roles(UserRoles.ROLE_USER)
  update(
    @Param('id') id: string,
    @Body() updateLessonProgressDto: UpdateLessonProgressDto,
  ) {
    return this.lessonProgressService.update(
      Number(id),
      updateLessonProgressDto,
    );
  }

  @Delete(':id')
  @UseGuards(JWTAuthGuard, RolesGuard)
  @Roles(UserRoles.ROLE_USER)
  remove(@Param('id') id: string) {
    return this.lessonProgressService.remove(Number(id));
  }
}
