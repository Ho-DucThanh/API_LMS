import { IsString, IsArray, IsOptional } from 'class-validator';

export class CreateRecommendationDto {
  @IsString()
  goal: string;

  @IsString()
  currentLevel: string;

  @IsArray()
  @IsOptional()
  preferences?: string[];

  @IsOptional()
  @IsString()
  verbosity?: 'short' | 'medium' | 'deep';

  @IsOptional()
  @IsString()
  guidanceMode?: 'novice' | 'guided' | 'standard';
}
