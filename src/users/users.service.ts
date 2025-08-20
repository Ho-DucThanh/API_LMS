import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { UserRole } from './entities/user-role.entity';
import { Role } from './entities/role.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(UserRole) private userRoleRepo: Repository<UserRole>,
    @InjectRepository(Role) private roleRepo: Repository<Role>,
  ) {}

  async findAll(): Promise<User[]> {
    return await this.userRepo.find({
      relations: ['userRoles', 'userRoles.role'],
    });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['userRoles', 'userRoles.role'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepo.findOne({
      where: { email },
      relations: ['userRoles', 'userRoles.role'],
    });
  }

  async updateProfile(id: number, updateDto: UpdateProfileDto): Promise<User> {
    console.log('Received updateDto:', updateDto);
    const user = await this.userRepo.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    Object.assign(user, {
      first_name: updateDto.firstName ?? user.first_name,
      last_name: updateDto.lastName ?? user.last_name,
      avatar: updateDto.avatar ?? user.avatar,
      phone: updateDto.phone ?? user.phone,
      address: updateDto.address ?? user.address,
      bio: updateDto.bio ?? user.bio,
    });

    await this.userRepo.save(user);
    return this.findOne(id);
  }

  async updateStatus(id: number, status: 'ACTIVE' | 'BLOCKED'): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    user.status = status;
    await this.userRepo.save(user);
    return this.findOne(id);
  }

  async assignRole(userId: number, roleId: number): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const role = await this.roleRepo.findOne({ where: { id: roleId } });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    // Check if user already has this role
    const existingUserRole = await this.userRoleRepo.findOne({
      where: { user_id: userId, role_id: roleId },
    });

    if (existingUserRole) {
      throw new ConflictException('User already has this role');
    }

    const userRole = this.userRoleRepo.create({
      user_id: userId,
      role_id: roleId,
    });

    await this.userRoleRepo.save(userRole);
  }

  async removeRole(userId: number, roleId: number): Promise<void> {
    const userRole = await this.userRoleRepo.findOne({
      where: { user_id: userId, role_id: roleId },
    });

    if (!userRole) {
      throw new NotFoundException('User role assignment not found');
    }

    await this.userRoleRepo.remove(userRole);
  }

  async getUsersByRole(roleName: string): Promise<User[]> {
    return await this.userRepo
      .createQueryBuilder('user')
      .innerJoin('user.userRoles', 'userRole')
      .innerJoin('userRole.role', 'role')
      .where('role.role_name = :roleName', { roleName })
      .getMany();
  }

  async deleteUser(id: number): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Remove all user roles first
    await this.userRoleRepo.delete({ user_id: id });

    // Then remove the user
    await this.userRepo.remove(user);
  }

  async searchUsers(searchTerm: string): Promise<User[]> {
    return await this.userRepo
      .createQueryBuilder('user')
      .where('user.first_name ILIKE :searchTerm', {
        searchTerm: `%${searchTerm}%`,
      })
      .orWhere('user.last_name ILIKE :searchTerm', {
        searchTerm: `%${searchTerm}%`,
      })
      .orWhere('user.email ILIKE :searchTerm', {
        searchTerm: `%${searchTerm}%`,
      })
      .leftJoinAndSelect('user.userRoles', 'userRole')
      .leftJoinAndSelect('userRole.role', 'role')
      .getMany();
  }

  async getUserStats(): Promise<any> {
    const totalUsers = await this.userRepo.count();
    const activeUsers = await this.userRepo.count({
      where: { status: 'ACTIVE' },
    });
    const blockedUsers = await this.userRepo.count({
      where: { status: 'BLOCKED' },
    });

    const studentCount = await this.userRepo
      .createQueryBuilder('user')
      .innerJoin('user.userRoles', 'userRole')
      .innerJoin('userRole.role', 'role')
      .where('role.role_name = :roleName', { roleName: 'ROLE_STUDENT' })
      .getCount();

    const teacherCount = await this.userRepo
      .createQueryBuilder('user')
      .innerJoin('user.userRoles', 'userRole')
      .innerJoin('userRole.role', 'role')
      .where('role.role_name = :roleName', { roleName: 'ROLE_TEACHER' })
      .getCount();

    const adminCount = await this.userRepo
      .createQueryBuilder('user')
      .innerJoin('user.userRoles', 'userRole')
      .innerJoin('userRole.role', 'role')
      .where('role.role_name = :roleName', { roleName: 'ROLE_ADMIN' })
      .getCount();

    return {
      totalUsers,
      activeUsers,
      blockedUsers,
      studentCount,
      teacherCount,
      adminCount,
    };
  }

  async changePassword(
    userId: number,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const { currentPassword, newPassword } = changePasswordDto;

    // Find user
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await this.userRepo.update(userId, { password: hashedNewPassword });
  }
}
