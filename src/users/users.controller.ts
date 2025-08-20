import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { SearchUsersDto } from './dto/search-users.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JWTAuthGuard } from '../common/guard/jwt-auth.guard';
import { RolesGuard } from '../common/guard/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import { JwtUserPayload } from '../auth/dto/jwt-user-payload.dto';
import { ServiceResponse } from 'src/common/model/service-respone';
import { UserRoles } from 'src/common/enum/user-role.enum';

@ApiTags('users')
@Controller('users')
@UseGuards(JWTAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRoles.ROLE_ADMIN)
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiResponse({ type: ServiceResponse })
  async findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ type: ServiceResponse })
  async getProfile(@GetUser() user: JwtUserPayload): Promise<User> {
    return this.usersService.findOne(user.sub);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ type: ServiceResponse })
  async updateProfile(
    @GetUser() user: JwtUserPayload,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<User> {
    return this.usersService.updateProfile(user.sub, updateProfileDto);
  }

  @Get('stats')
  @Roles(UserRoles.ROLE_ADMIN)
  @ApiOperation({ summary: 'Get user statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Returns user statistics' })
  async getUserStats(): Promise<any> {
    return this.usersService.getUserStats();
  }

  @Get('search')
  @Roles(UserRoles.ROLE_ADMIN, UserRoles.ROLE_TEACHER)
  @ApiOperation({ summary: 'Search users (Admin and Teacher only)' })
  @ApiQuery({
    name: 'searchTerm',
    description: 'Search term for user first name, last name, or email',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns matching users',
    type: [User],
  })
  async searchUsers(@Query('searchTerm') searchTerm: string): Promise<User[]> {
    return this.usersService.searchUsers(searchTerm);
  }

  @Get('by-role/:roleName')
  @Roles(UserRoles.ROLE_ADMIN)
  @ApiOperation({ summary: 'Get users by role (Admin only)' })
  @ApiParam({ name: 'roleName', description: 'Role name to filter by' })
  @ApiResponse({
    status: 200,
    description: 'Returns users with specified role',
    type: [User],
  })
  async getUsersByRole(@Param('roleName') roleName: string): Promise<User[]> {
    return this.usersService.getUsersByRole(roleName);
  }

  @Get(':id')
  @Roles(UserRoles.ROLE_ADMIN, UserRoles.ROLE_TEACHER)
  @ApiOperation({ summary: 'Get user by ID (Admin and Teacher only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Returns user by ID', type: User })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<User> {
    return this.usersService.findOne(id);
  }

  @Put(':id/status')
  @Roles(UserRoles.ROLE_ADMIN)
  @ApiOperation({ summary: 'Update user status (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Status updated successfully',
    type: User,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateStatusDto,
  ): Promise<User> {
    return this.usersService.updateStatus(id, updateStatusDto.status);
  }

  @Post(':id/roles')
  @Roles(UserRoles.ROLE_ADMIN)
  @ApiOperation({ summary: 'Assign role to user (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 201, description: 'Role assigned successfully' })
  @ApiResponse({ status: 404, description: 'User or role not found' })
  @ApiResponse({ status: 409, description: 'User already has this role' })
  @HttpCode(HttpStatus.CREATED)
  async assignRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() assignRoleDto: AssignRoleDto,
  ): Promise<void> {
    return this.usersService.assignRole(id, assignRoleDto.roleId);
  }

  @Delete(':id/roles/:roleId')
  @Roles(UserRoles.ROLE_ADMIN)
  @ApiOperation({ summary: 'Remove role from user (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiParam({ name: 'roleId', description: 'Role ID' })
  @ApiResponse({ status: 200, description: 'Role removed successfully' })
  @ApiResponse({ status: 404, description: 'User role assignment not found' })
  @HttpCode(HttpStatus.OK)
  async removeRole(
    @Param('id', ParseIntPipe) id: number,
    @Param('roleId', ParseIntPipe) roleId: number,
  ): Promise<void> {
    return this.usersService.removeRole(id, roleId);
  }

  @Put('change-password')
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ type: ServiceResponse })
  async changePassword(
    @GetUser() user: JwtUserPayload,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    await this.usersService.changePassword(user.sub, changePasswordDto);
    return { message: 'Password changed successfully' };
  }

  @Delete(':id')
  @Roles(UserRoles.ROLE_ADMIN)
  @ApiOperation({ summary: 'Delete user (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @HttpCode(HttpStatus.OK)
  async deleteUser(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.usersService.deleteUser(id);
  }
}
