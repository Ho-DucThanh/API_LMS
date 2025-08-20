import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { JWTAuthGuard } from '../common/guard/jwt-auth.guard';
import { RolesGuard } from '../common/guard/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRoles } from '../common/enum/user-role.enum';
import { Notification } from './entities/notification.entity';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JWTAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRoles.ROLE_ADMIN)
  @ApiOperation({ summary: 'Create a notification (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Notification created successfully',
    type: Notification,
  })
  create(
    @Body() createNotificationDto: CreateNotificationDto,
  ): Promise<Notification> {
    return this.notificationService.create(createNotificationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get current user notifications' })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
  })
  findUserNotifications(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.notificationService.findUserNotifications(
      req.user.sub,
      page,
      limit,
    );
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({
    status: 200,
    description: 'Unread count retrieved successfully',
  })
  getUnreadCount(@Request() req): Promise<number> {
    return this.notificationService.getUnreadCount(req.user.sub);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  markAsRead(@Param('id') id: string, @Request() req): Promise<void> {
    return this.notificationService.markAsRead(+id, req.user.sub);
  }

  @Patch('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  markAllAsRead(@Request() req): Promise<void> {
    return this.notificationService.markAllAsRead(req.user.sub);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiResponse({
    status: 200,
    description: 'Notification deleted successfully',
  })
  deleteNotification(@Param('id') id: string, @Request() req): Promise<void> {
    return this.notificationService.deleteNotification(+id, req.user.sub);
  }

  @Post('system-announcement')
  @UseGuards(RolesGuard)
  @Roles(UserRoles.ROLE_ADMIN)
  @ApiOperation({ summary: 'Send system-wide announcement' })
  @ApiResponse({ status: 200, description: 'Announcement sent successfully' })
  sendSystemAnnouncement(
    @Body() body: { userIds: number[]; title: string; message: string },
  ): Promise<void> {
    return this.notificationService.sendSystemAnnouncement(
      body.userIds,
      body.title,
      body.message,
    );
  }
}
