import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { AiRecommendationService } from './ai-recommendation.service';
import { JWTAuthGuard } from '../common/guard/jwt-auth.guard';
import { CreateRecommendationDto } from './dto/create-recommendation.dto';

@Controller('recommendations')
export class AiRecommendationController {
  constructor(
    private readonly aiRecommendationService: AiRecommendationService,
  ) {}

  @UseGuards(JWTAuthGuard)
  @Post()
  async create(@Body() body: CreateRecommendationDto, @Request() req: any) {
    const userId = req.user?.sub;
    const { goal, currentLevel, preferences, verbosity, guidanceMode } = body;
    return this.aiRecommendationService.generateRecommendation(
      userId,
      goal,
      currentLevel,
      preferences || [],
      verbosity,
      guidanceMode,
    );
  }

  @UseGuards(JWTAuthGuard)
  @Post(':id/save')
  async save(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { saved?: boolean },
    @Request() req: any,
  ) {
    const userId = req.user?.sub;
    return this.aiRecommendationService.saveRecommendation(
      id,
      userId,
      !!body?.saved,
    );
  }

  @UseGuards(JWTAuthGuard)
  @Post(':id/followup')
  async followUp(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { question: string },
    @Request() req: any,
  ) {
    const userId = req.user?.sub;
    return this.aiRecommendationService.followUp(
      id,
      userId,
      String(body?.question || ''),
    );
  }

  // Beginner Q&A clarification without creating a full recommendation upfront
  @UseGuards(JWTAuthGuard)
  @Post('clarify')
  async clarify(
    @Body()
    body: {
      question: string;
      context?: any; // { goal?, currentLevel?, preferences?, history? }
    },
    @Request() req: any,
  ) {
    const userId = req.user?.sub;
    const { question, context } = body || ({} as any);
    return this.aiRecommendationService.clarify(
      userId,
      String(question || ''),
      context || {},
    );
  }

  // Save learning path created from an existing recommendation
  @UseGuards(JWTAuthGuard)
  @Post(':id/save-path')
  async savePath(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; selectedCourseIds?: number[] },
    @Request() req: any,
  ) {
    const userId = req.user?.sub;
    return this.aiRecommendationService.saveLearningPath({
      userId,
      recommendationId: id,
      name: body?.name,
      selectedCourseIds: Array.isArray(body?.selectedCourseIds)
        ? body!.selectedCourseIds
            .map((n) => Number(n))
            .filter((x) => Number.isFinite(x))
        : [],
    });
  }

  // List current user's saved learning paths
  @UseGuards(JWTAuthGuard)
  @Post('my-paths')
  async myPaths(@Request() req: any) {
    const userId = req.user?.sub;
    return this.aiRecommendationService.listLearningPaths(userId);
  }
}
