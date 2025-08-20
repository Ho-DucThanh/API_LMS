import { Entity, PrimaryColumn, JoinColumn, ManyToOne } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Course } from './course.entity';
import { Tag } from './tag';

@Entity('course_tag')
export class CourseTag {
  @ApiProperty()
  @PrimaryColumn()
  course_id: number;

  @ApiProperty()
  @PrimaryColumn()
  tag_id: number;

  @ManyToOne(() => Course, (course) => course.courseTags, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @ManyToOne(() => Tag, (tag) => tag.courseTags, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tag_id' })
  tag: Tag;
}
