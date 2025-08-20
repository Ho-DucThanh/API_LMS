import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Progress } from './entities/progress.entity';
import { CreateProgressDto } from './dto/create-progress.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(Progress)
    private progressRepository: Repository<Progress>,
  ) {}

  async create(createProgressDto: CreateProgressDto): Promise<Progress> {
    const progress = this.progressRepository.create(createProgressDto);
    return this.progressRepository.save(progress);
  }

  async findAll(
    enrollment_id?: number,
    module_id?: number,
  ): Promise<Progress[]> {
    const where: any = {};
    if (enrollment_id) where.enrollment_id = enrollment_id;
    if (module_id) where.module_id = module_id;
    return this.progressRepository.find({ where });
  }

  async findOne(id: number): Promise<Progress> {
    const progress = await this.progressRepository.findOne({ where: { id } });
    if (!progress) throw new NotFoundException('Progress not found');
    return progress;
  }

  async update(
    id: number,
    updateProgressDto: UpdateProgressDto,
  ): Promise<Progress> {
    await this.progressRepository.update(id, updateProgressDto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.progressRepository.delete(id);
  }
}
