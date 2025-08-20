import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class AssignRoleDto {
  @ApiProperty({ example: 1, description: 'ID of the role to assign' })
  @IsInt()
  @IsPositive()
  roleId: number;
}
