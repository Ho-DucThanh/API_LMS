import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class SearchUsersDto {
  @ApiProperty({
    example: 'john',
    description: 'Search term for user first name, last name, or email',
  })
  @IsString()
  searchTerm: string;
}
