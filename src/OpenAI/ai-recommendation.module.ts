import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiRecommendation } from './entities/ai-recommendation.entity';
import { AiRecommendationCourse } from './entities/ai-recommendation-course.entity';
import { AiRecommendationService } from './ai-recommendation.service';
import { AiRecommendationController } from './ai-recommendation.controller';
import { Course } from 'src/courses/entities/course.entity';
import { LearningPath } from './entities/learning-path.entity';
import { LearningPathItem } from './entities/learning-path-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AiRecommendation,
      AiRecommendationCourse,
      Course,
      LearningPath,
      LearningPathItem,
    ]),
  ],
  providers: [AiRecommendationService],
  controllers: [AiRecommendationController],
  exports: [AiRecommendationService],
})
export class AiRecommendationModule {}
