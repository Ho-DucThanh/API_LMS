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
import { ModulesService } from './modules.service';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { JWTAuthGuard } from '../common/guard/jwt-auth.guard';
import { RolesGuard } from '../common/guard/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRoles } from '../common/enum/user-role.enum';
import { GetUser } from '../common/decorators/get-user.decorator';
import { JwtUserPayload } from '../auth/dto/jwt-user-payload.dto';

@Controller('modules')
export class ModulesController {
  constructor(private readonly modulesService: ModulesService) {}

  @Post()
  @UseGuards(JWTAuthGuard, RolesGuard)
  @Roles(UserRoles.ROLE_TEACHER, UserRoles.ROLE_ADMIN)
  create(
    @Body() createModuleDto: CreateModuleDto,
    @GetUser() user: JwtUserPayload,
  ) {
    return this.modulesService.create(createModuleDto, user);
  }

  @Get()
  findAll(@Query('course_id') course_id?: number) {
    return this.modulesService.findAll(
      course_id ? Number(course_id) : undefined,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.modulesService.findOne(Number(id));
  }

  @Patch(':id')
  @UseGuards(JWTAuthGuard, RolesGuard)
  @Roles(UserRoles.ROLE_TEACHER, UserRoles.ROLE_ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateModuleDto: UpdateModuleDto,
    @GetUser() user: JwtUserPayload,
  ) {
    return this.modulesService.update(Number(id), updateModuleDto, user);
  }

  @Delete(':id')
  @UseGuards(JWTAuthGuard, RolesGuard)
  @Roles(UserRoles.ROLE_TEACHER, UserRoles.ROLE_ADMIN)
  remove(@Param('id') id: string, @GetUser() user: JwtUserPayload) {
    return this.modulesService.remove(Number(id), user);
  }
}
