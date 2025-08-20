import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

interface AuthenticatedSocket extends Socket {
  userId?: number;
  userRole?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'events',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private connectedUsers = new Map<number, string[]>(); // userId -> socketIds

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from handshake auth
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(token);
      client.userId = payload.userId;
      client.userRole = payload.role;

      // Track connected user
      if (client.userId) {
        const userSockets = this.connectedUsers.get(client.userId) || [];
        userSockets.push(client.id);
        this.connectedUsers.set(client.userId, userSockets);

        // Join user to their personal room
        client.join(`user:${client.userId}`);

        // Join role-based rooms
        if (client.userRole) {
          client.join(`role:${client.userRole.toLowerCase()}`);
        }
      }

      this.logger.log(
        `Client connected: ${client.id} (User: ${client.userId})`,
      );

      // Notify user of successful connection
      client.emit('connected', {
        userId: client.userId,
        message: 'Connected successfully',
      });
    } catch (error) {
      this.logger.error('Connection authentication failed:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      const userSockets = this.connectedUsers.get(client.userId) || [];
      const updatedSockets = userSockets.filter(
        (socketId) => socketId !== client.id,
      );

      if (updatedSockets.length > 0) {
        this.connectedUsers.set(client.userId, updatedSockets);
      } else {
        this.connectedUsers.delete(client.userId);
      }
    }

    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Send notification to specific user
  sendNotificationToUser(userId: number, notification: any) {
    this.server.to(`user:${userId}`).emit('notification', notification);
  }

  // Send notification to all users with specific role
  sendNotificationToRole(role: string, notification: any) {
    this.server
      .to(`role:${role.toLowerCase()}`)
      .emit('notification', notification);
  }

  // Send notification to all users
  sendGlobalNotification(notification: any) {
    this.server.emit('globalNotification', notification);
  }

  // Course-related events
  @SubscribeMessage('joinCourse')
  handleJoinCourse(
    @MessageBody() data: { courseId: number },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const roomName = `course:${data.courseId}`;
    client.join(roomName);
    client.emit('joinedCourse', { courseId: data.courseId, room: roomName });
    this.logger.log(`User ${client.userId} joined course ${data.courseId}`);
  }

  @SubscribeMessage('leaveCourse')
  handleLeaveCourse(
    @MessageBody() data: { courseId: number },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const roomName = `course:${data.courseId}`;
    client.leave(roomName);
    client.emit('leftCourse', { courseId: data.courseId });
    this.logger.log(`User ${client.userId} left course ${data.courseId}`);
  }

  // Send update to all users in a course
  sendCourseUpdate(courseId: number, update: any) {
    this.server.to(`course:${courseId}`).emit('courseUpdate', update);
  }

  // Assignment-related events
  @SubscribeMessage('joinAssignment')
  handleJoinAssignment(
    @MessageBody() data: { assignmentId: number },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const roomName = `assignment:${data.assignmentId}`;
    client.join(roomName);
    client.emit('joinedAssignment', { assignmentId: data.assignmentId });
  }

  sendAssignmentUpdate(assignmentId: number, update: any) {
    this.server
      .to(`assignment:${assignmentId}`)
      .emit('assignmentUpdate', update);
  }

  // Forum-related events
  @SubscribeMessage('joinForum')
  handleJoinForum(
    @MessageBody() data: { forumId: number },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const roomName = `forum:${data.forumId}`;
    client.join(roomName);
    client.emit('joinedForum', { forumId: data.forumId });
  }

  sendForumUpdate(forumId: number, update: any) {
    this.server.to(`forum:${forumId}`).emit('forumUpdate', update);
  }

  // Live chat for courses
  @SubscribeMessage('sendMessage')
  handleMessage(
    @MessageBody() data: { courseId: number; message: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const messageData = {
      userId: client.userId,
      message: data.message,
      timestamp: new Date(),
      courseId: data.courseId,
    };

    // Broadcast to all users in the course
    this.server.to(`course:${data.courseId}`).emit('newMessage', messageData);
  }

  // Typing indicators
  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { courseId: number; isTyping: boolean },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    client.to(`course:${data.courseId}`).emit('userTyping', {
      userId: client.userId,
      isTyping: data.isTyping,
    });
  }

  // Progress tracking
  @SubscribeMessage('progressUpdate')
  handleProgressUpdate(
    @MessageBody()
    data: { courseId: number; lessonId: number; progress: number },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    // Notify instructors about student progress
    this.server.to('role:lecturer').emit('studentProgress', {
      userId: client.userId,
      courseId: data.courseId,
      lessonId: data.lessonId,
      progress: data.progress,
      timestamp: new Date(),
    });
  }

  // System announcements
  sendSystemAnnouncement(announcement: any) {
    this.server.emit('systemAnnouncement', announcement);
  }

  // Get online users count
  getOnlineUsersCount(): number {
    return this.connectedUsers.size;
  }

  // Get online users for a specific course
  getOnlineUsersInCourse(courseId: number): number {
    const room = this.server.sockets.adapter.rooms.get(`course:${courseId}`);
    return room ? room.size : 0;
  }

  // Utility method to check if user is online
  isUserOnline(userId: number): boolean {
    return this.connectedUsers.has(userId);
  }
}
