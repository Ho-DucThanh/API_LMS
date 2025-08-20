import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateForumPostDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  course_id: number;

  @ApiProperty({ default: false })
  @IsOptional()
  @IsBoolean()
  is_pinned?: boolean;
}

export class CreateForumCommentDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  post_id: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  parent_comment_id?: number;
}
