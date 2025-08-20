import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Module } from './entities/module.entity';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { Course } from '../courses/entities/course.entity';
import { JwtUserPayload } from '../auth/dto/jwt-user-payload.dto';
import { UserRoles } from '../common/enum/user-role.enum';

@Injectable()
export class ModulesService {
  constructor(
    @InjectRepository(Module)
    private moduleRepository: Repository<Module>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
  ) {}

  private isAdmin(user: JwtUserPayload) {
    return user?.roles?.includes(UserRoles.ROLE_ADMIN);
  }

  async create(
    createModuleDto: CreateModuleDto,
    user: JwtUserPayload,
  ): Promise<Module> {
    if (!this.isAdmin(user)) {
      const course = await this.courseRepository.findOne({
        where: { id: createModuleDto.course_id },
      });
      if (!course) throw new NotFoundException('Course not found');
      if (course.instructor_id !== user.sub)
        throw new ForbiddenException('You do not own this course');
    }
    const module = this.moduleRepository.create(createModuleDto);
    return this.moduleRepository.save(module);
  }

  async findAll(course_id?: number): Promise<Module[]> {
    if (course_id) {
      return this.moduleRepository.find({
        where: { course_id },
        order: { order_index: 'ASC' },
      });
    }
    return this.moduleRepository.find({ order: { order_index: 'ASC' } });
  }

  async findOne(id: number): Promise<Module> {
    const module = await this.moduleRepository.findOne({ where: { id } });
    if (!module) throw new NotFoundException('Module not found');
    return module;
  }

  async update(
    id: number,
    updateModuleDto: UpdateModuleDto,
    user: JwtUserPayload,
  ): Promise<Module> {
    if (!this.isAdmin(user)) {
      const existing = await this.findOne(id);
      const courseIdToCheck = updateModuleDto.course_id ?? existing.course_id;
      const course = await this.courseRepository.findOne({
        where: { id: courseIdToCheck },
      });
      if (!course) throw new NotFoundException('Course not found');
      if (course.instructor_id !== user.sub)
        throw new ForbiddenException('You do not own this course');
    }
    await this.moduleRepository.update(id, updateModuleDto);
    return this.findOne(id);
  }

  async remove(id: number, user: JwtUserPayload): Promise<void> {
    if (!this.isAdmin(user)) {
      const existing = await this.findOne(id);
      const course = await this.courseRepository.findOne({
        where: { id: existing.course_id },
      });
      if (!course) throw new NotFoundException('Course not found');
      if (course.instructor_id !== user.sub)
        throw new ForbiddenException('You do not own this course');
    }
    await this.moduleRepository.delete(id);
  }
}
