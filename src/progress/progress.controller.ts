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
import { ProgressService } from './progress.service';
import { CreateProgressDto } from './dto/create-progress.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { JWTAuthGuard } from '../common/guard/jwt-auth.guard';
import { RolesGuard } from '../common/guard/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRoles } from '../common/enum/user-role.enum';

@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Post()
  @UseGuards(JWTAuthGuard, RolesGuard)
  @Roles(UserRoles.ROLE_USER)
  create(@Body() createProgressDto: CreateProgressDto) {
    return this.progressService.create(createProgressDto);
  }

  @Get()
  @UseGuards(JWTAuthGuard)
  findAll(
    @Query('enrollment_id') enrollment_id?: number,
    @Query('module_id') module_id?: number,
  ) {
    return this.progressService.findAll(
      enrollment_id ? Number(enrollment_id) : undefined,
      module_id ? Number(module_id) : undefined,
    );
  }

  @Get(':id')
  @UseGuards(JWTAuthGuard)
  findOne(@Param('id') id: string) {
    return this.progressService.findOne(Number(id));
  }

  @Patch(':id')
  @UseGuards(JWTAuthGuard, RolesGuard)
  @Roles(UserRoles.ROLE_USER)
  update(
    @Param('id') id: string,
    @Body() updateProgressDto: UpdateProgressDto,
  ) {
    return this.progressService.update(Number(id), updateProgressDto);
  }

  @Delete(':id')
  @UseGuards(JWTAuthGuard, RolesGuard)
  @Roles(UserRoles.ROLE_USER)
  remove(@Param('id') id: string) {
    return this.progressService.remove(Number(id));
  }
}
