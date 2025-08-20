import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { UserRole as UserRoleEntity } from 'src/users/entities/user-role.entity';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { UserStatus } from 'src/common/enum/user-status.enum';
import { JwtUserPayload } from './dto/jwt-user-payload.dto';
import { instanceToPlain } from 'class-transformer';
import { ForgotPasswordDto } from './dto/password.dto';
import { Role } from 'src/users/entities/role.entity';
import { UserRoles } from 'src/common/enum/user-role.enum';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(UserRoleEntity)
    private userRoleRepo: Repository<UserRoleEntity>,
    @InjectRepository(Role) private roleRepo: Repository<Role>,
    private jwtService: JwtService,
    private mailerService: MailerService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.userRepo.findOneBy({ email: dto.email });
    if (existing) throw new ConflictException('Email already exists');

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      ...dto,
      password: hashed,
    });
    const saved = await this.userRepo.save(user);

    // Assign default STUDENT role
    const studentRole = await this.roleRepo.findOne({
      where: { role_name: UserRoles.ROLE_USER },
    });
    if (studentRole) {
      const userRole = this.userRoleRepo.create({
        user_id: saved.id,
        role_id: studentRole.id,
      });
      await this.userRoleRepo.save(userRole);
    }

    return saved;
  }

  async registerTeacher(dto: RegisterDto) {
    const existing = await this.userRepo.findOneBy({ email: dto.email });
    if (existing) throw new ConflictException('Email already exists');

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      ...dto,
      password: hashed,
    });
    const saved = await this.userRepo.save(user);

    // Assign LECTURER role
    const teacherRole = await this.roleRepo.findOne({
      where: { role_name: UserRoles.ROLE_TEACHER },
    });
    if (teacherRole) {
      const userRole = this.userRoleRepo.create({
        user_id: saved.id,
        role_id: teacherRole.id,
      });
      await this.userRoleRepo.save(userRole);
    }

    return saved;
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
      relations: ['userRoles', 'userRoles.role'],
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    if (user.status === UserStatus.BLOCKED)
      throw new ForbiddenException(`Email ${user.email} is blocked`);

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    const roles = (user.userRoles ?? []).map((ur) => ur.role.role_name);

    const payload = new JwtUserPayload(user.id, user.email, roles);
    const token = this.jwtService.sign(instanceToPlain(payload));

    const userData = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      status: user.status,
      roles,
    };

    return {
      token,
      user: userData,
    };
  }

  async validateUser(payload: JwtUserPayload): Promise<User | null> {
    const user = await this.userRepo.findOne({
      where: { id: payload.sub },
      relations: ['userRoles', 'userRoles.role'],
    });

    if (!user || user.status === UserStatus.BLOCKED) {
      return null;
    }

    return user;
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new NotFoundException('User not found');

    const token = this.jwtService.sign(
      { sub: user.id, email: user.email },
      {
        expiresIn: '15m',
        secret: process.env.JWT_SECRET_KEY!,
      },
    );

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Reset Password',
      template: 'reset-password', // Path to your email template
      context: {
        name: user.first_name || user.email,
        resetLink,
      },
    });

    console.log(`Reset password email sent to ${user.email}`);
  }

  // async refreshToken(userId: number): Promise<string> {
  //   const user = await this.userRepo.findOne({
  //     where: { id: userId },
  //     relations: ['userRoles', 'userRoles.role'],
  //   });

  //   if (!user || user.status === UserStatus.BLOCKED) {
  //     throw new UnauthorizedException('User not found or blocked');
  //   }

  //   const payload = new JwtUserPayload(
  //     user.id,
  //     user.email,
  //     user.userRoles!.map((ur) => ur.role.role_name),
  //   );

  //   return this.jwtService.sign(instanceToPlain(payload));
  // }
}
