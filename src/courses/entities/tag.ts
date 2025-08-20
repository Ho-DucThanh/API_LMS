import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  OneToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

import {} from './course.entity';
import { CourseTag } from './course_tag';

@Entity('tag')
export class Tag {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column({ unique: true })
  name: string;

  @ApiProperty()
  @OneToMany(() => CourseTag, (courseTag) => courseTag.tag)
  courseTags: CourseTag[];
}
