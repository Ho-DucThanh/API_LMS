import { Injectable } from '@nestjs/common';
// WebSocket support removed: notifications are persisted only
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {}

  async create(
    createNotificationDto: CreateNotificationDto,
  ): Promise<Notification> {
    const notification = this.notificationRepository.create(
      createNotificationDto,
    );
    const saved = await this.notificationRepository.save(notification);
    // persisted only; realtime websockets removed
    return saved;
  }

  async findUserNotifications(
    userId: number,
    page: number = 1,
    limit: number = 20,
  ): Promise<any> {
    const [notifications, total] =
      await this.notificationRepository.findAndCount({
        where: { user_id: userId },
        skip: (page - 1) * limit,
        take: limit,
        order: { created_at: 'DESC' },
      });

    return {
      data: notifications,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      unreadCount: await this.getUnreadCount(userId),
    };
  }

  async markAsRead(notificationId: number, userId: number): Promise<void> {
    await this.notificationRepository.update(
      { id: notificationId, user_id: userId },
      { is_read: true },
    );
  }

  async markAllAsRead(userId: number): Promise<void> {
    await this.notificationRepository.update(
      { user_id: userId, is_read: false },
      { is_read: true },
    );
  }

  async getUnreadCount(userId: number): Promise<number> {
    return await this.notificationRepository.count({
      where: { user_id: userId, is_read: false },
    });
  }

  async deleteNotification(
    notificationId: number,
    userId: number,
  ): Promise<void> {
    await this.notificationRepository.delete({
      id: notificationId,
      user_id: userId,
    });
  }

  // Helper methods for creating specific notifications
  async notifyEnrollment(
    userId: number,
    courseName: string,
    courseId: number,
  ): Promise<void> {
    await this.create({
      title: 'Course Enrollment',
      message: `You have successfully enrolled in ${courseName}`,
      type: NotificationType.COURSE_ENROLLMENT,
      user_id: userId,
      related_id: courseId,
      action_url: `/courses/${courseId}`,
    });
  }

  async notifyAssignmentDue(
    userId: number,
    assignmentTitle: string,
    assignmentId: number,
    dueDate: Date,
  ): Promise<void> {
    await this.create({
      title: 'Assignment Due Soon',
      message: `Assignment "${assignmentTitle}" is due on ${dueDate.toLocaleDateString()}`,
      type: NotificationType.ASSIGNMENT_DUE,
      user_id: userId,
      related_id: assignmentId,
      action_url: `/assignments/${assignmentId}`,
    });
  }

  async notifyGradePublished(
    userId: number,
    assignmentTitle: string,
    grade: number,
    assignmentId: number,
  ): Promise<void> {
    await this.create({
      title: 'Grade Published',
      message: `Your grade for "${assignmentTitle}" has been published: ${grade}%`,
      type: NotificationType.GRADE_PUBLISHED,
      user_id: userId,
      related_id: assignmentId,
      action_url: `/assignments/${assignmentId}`,
    });
  }

  async notifyForumReply(
    userId: number,
    postTitle: string,
    postId: number,
  ): Promise<void> {
    await this.create({
      title: 'New Forum Reply',
      message: `Someone replied to your post "${postTitle}"`,
      type: NotificationType.FORUM_REPLY,
      user_id: userId,
      related_id: postId,
      action_url: `/forum/posts/${postId}`,
    });
  }

  async notifyCourseUpdate(
    userId: number,
    courseName: string,
    courseId: number,
  ): Promise<void> {
    await this.create({
      title: 'Course Updated',
      message: `${courseName} has been updated with new content`,
      type: NotificationType.COURSE_UPDATE,
      user_id: userId,
      related_id: courseId,
      action_url: `/courses/${courseId}`,
    });
  }

  async sendSystemAnnouncement(
    userIds: number[],
    title: string,
    message: string,
  ): Promise<void> {
    const notifications = userIds.map((userId) => ({
      title,
      message,
      type: NotificationType.SYSTEM_ANNOUNCEMENT,
      user_id: userId,
    }));

    await this.notificationRepository.save(notifications);
  }
}
