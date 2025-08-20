import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export class UpdateStatusDto {
  @ApiProperty({
    example: 'ACTIVE',
    description: 'User status',
    enum: ['ACTIVE', 'BLOCKED'],
  })
  @IsEnum(['ACTIVE', 'BLOCKED'])
  status: 'ACTIVE' | 'BLOCKED';
}
