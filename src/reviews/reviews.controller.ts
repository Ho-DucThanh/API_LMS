import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Delete,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JWTAuthGuard } from '../common/guard/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRoles } from 'src/common/enum/user-role.enum';

@UseGuards(JWTAuthGuard, RolesGuard)
@Controller('reviews')
export class ReviewsController {
  constructor(private svc: ReviewsService) {}

  @Roles(UserRoles.ROLE_USER, UserRoles.ROLE_ADMIN)
  @Post()
  async create(@Body() dto: CreateReviewDto, @Req() req: any) {
    // JWT strategy returns payload with `sub` (user id); some flows may have `id`.
    const rawUserId = req.user?.sub ?? req.user?.id;
    if (!rawUserId) throw new BadRequestException('Unauthorized');
    const userId = Number(rawUserId);
    if (Number.isNaN(userId)) throw new BadRequestException('Unauthorized');
    dto.student_id = userId;
    return this.svc.createOrUpdate(dto);
  }

  @Roles(UserRoles.ROLE_USER, UserRoles.ROLE_ADMIN)
  @Get('/course/:id')
  async forCourse(@Param('id') id: string) {
    return this.svc.findForCourse(+id);
  }

  @Roles(UserRoles.ROLE_USER, UserRoles.ROLE_ADMIN)
  @Get('/:id')
  async one(@Param('id') id: string) {
    return this.svc.findOne(+id);
  }

  @Roles(UserRoles.ROLE_USER, UserRoles.ROLE_ADMIN)
  @Delete('/:id')
  async remove(@Param('id') id: string, @Req() req: any) {
    // TODO: only allow owner/admin - for now allow delete
    return this.svc.remove(+id);
  }
}
