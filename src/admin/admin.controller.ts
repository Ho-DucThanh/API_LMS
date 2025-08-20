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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JWTAuthGuard } from '../common/guard/jwt-auth.guard';
import { RolesGuard } from '../common/guard/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRoles } from '../common/enum/user-role.enum';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JWTAuthGuard, RolesGuard)
@Roles(UserRoles.ROLE_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('users')
  @ApiOperation({ summary: 'Create a new user account' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  createUser(@Body() createUserDto: CreateUserDto) {
    return this.adminService.createUser(createUserDto);
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all users with pagination' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  getAllUsers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.adminService.getAllUsers(page, limit);
  }

  @Patch('users/:id/block')
  @ApiOperation({ summary: 'Block a user' })
  @ApiResponse({ status: 200, description: 'User blocked successfully' })
  blockUser(@Param('id') id: string): Promise<void> {
    return this.adminService.blockUser(+id);
  }

  @Patch('users/:id/unblock')
  @ApiOperation({ summary: 'Unblock a user' })
  @ApiResponse({ status: 200, description: 'User unblocked successfully' })
  unblockUser(@Param('id') id: string): Promise<void> {
    return this.adminService.unblockUser(+id);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete a user account' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  deleteUser(@Param('id') id: string): Promise<void> {
    return this.adminService.deleteUser(+id);
  }

  @Get('courses')
  @ApiOperation({ summary: 'Get all courses with pagination' })
  @ApiResponse({ status: 200, description: 'Courses retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'approval_status', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  getAllCourses(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('approval_status') approval_status?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAllCourses({
      page,
      limit,
      approval_status,
      status,
      search,
    });
  }

  // @Delete('courses/:id')
  // @ApiOperation({ summary: 'Delete a course' })
  // @ApiResponse({ status: 200, description: 'Course deleted successfully' })
  // deleteCourse(@Param('id') id: string): Promise<void> {
  //   return this.adminService.deleteCourse(+id);
  // }

  // @Get('statistics')
  // @ApiOperation({ summary: 'Get system statistics and reports' })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Statistics retrieved successfully',
  // })
  // getStatistics() {
  //   return this.adminService.getSystemStatistics();
  // }

  @Post('users/:userId/roles/:roleName')
  @ApiOperation({ summary: 'Assign role to user' })
  @ApiResponse({ status: 200, description: 'Role assigned successfully' })
  assignRole(
    @Param('userId') userId: string,
    @Param('roleName') roleName: string,
  ): Promise<void> {
    return this.adminService.assignRole(+userId, roleName);
  }
}
