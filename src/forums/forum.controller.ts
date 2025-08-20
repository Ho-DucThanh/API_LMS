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
import { ForumService } from './forum.service';
import {
  CreateForumPostDto,
  CreateForumCommentDto,
} from './dto/create-forum-post.dto';
import { JWTAuthGuard } from '../common/guard/jwt-auth.guard';
import { RolesGuard } from '../common/guard/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRoles } from '../common/enum/user-role.enum';
import { ForumPost } from './entities/forum-post.entity';
import { ForumComment } from './entities/forum-comment.entity';

@ApiTags('forum')
@ApiBearerAuth()
@UseGuards(JWTAuthGuard)
@Controller('forum')
export class ForumController {
  constructor(private readonly forumService: ForumService) {}

  @Post('posts')
  @ApiOperation({ summary: 'Create a new forum post' })
  @ApiResponse({
    status: 201,
    description: 'Post created successfully',
    type: ForumPost,
  })
  createPost(
    @Body() createPostDto: CreateForumPostDto,
    @Request() req,
  ): Promise<ForumPost> {
    return this.forumService.createPost(createPostDto, req.user.sub);
  }

  @Get('courses/:courseId/posts')
  @ApiOperation({ summary: 'Get all posts for a course' })
  @ApiResponse({
    status: 200,
    description: 'Posts retrieved successfully',
    type: [ForumPost],
  })
  findPostsByCourse(@Param('courseId') courseId: string): Promise<ForumPost[]> {
    return this.forumService.findPostsByCourse(+courseId);
  }

  @Get('posts/:id')
  @ApiOperation({ summary: 'Get a forum post by ID' })
  @ApiResponse({
    status: 200,
    description: 'Post retrieved successfully',
    type: ForumPost,
  })
  findPost(@Param('id') id: string): Promise<ForumPost> {
    return this.forumService.findPostById(+id);
  }

  @Post('comments')
  @ApiOperation({ summary: 'Create a comment on a post' })
  @ApiResponse({
    status: 201,
    description: 'Comment created successfully',
    type: ForumComment,
  })
  createComment(
    @Body() createCommentDto: CreateForumCommentDto,
    @Request() req,
  ): Promise<ForumComment> {
    return this.forumService.createComment(createCommentDto, req.user.sub);
  }

  @Get('posts/:postId/comments')
  @ApiOperation({ summary: 'Get comments for a post' })
  @ApiResponse({
    status: 200,
    description: 'Comments retrieved successfully',
    type: [ForumComment],
  })
  findComments(@Param('postId') postId: string): Promise<ForumComment[]> {
    return this.forumService.findCommentsByPost(+postId);
  }

  @Delete('posts/:id')
  @ApiOperation({ summary: 'Delete a forum post' })
  @ApiResponse({ status: 200, description: 'Post deleted successfully' })
  deletePost(@Param('id') id: string, @Request() req): Promise<void> {
    return this.forumService.deletePost(+id, req.user.sub);
  }

  @Delete('comments/:id')
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiResponse({ status: 200, description: 'Comment deleted successfully' })
  deleteComment(@Param('id') id: string, @Request() req): Promise<void> {
    return this.forumService.deleteComment(+id, req.user.sub);
  }

  @Patch('posts/:id/pin')
  @UseGuards(RolesGuard)
  @Roles(UserRoles.ROLE_TEACHER, UserRoles.ROLE_ADMIN)
  @ApiOperation({ summary: 'Pin/unpin a forum post' })
  @ApiResponse({
    status: 200,
    description: 'Post pin status updated',
    type: ForumPost,
  })
  pinPost(@Param('id') id: string, @Request() req): Promise<ForumPost> {
    return this.forumService.pinPost(+id, req.user.sub);
  }

  @Get('courses/:courseId/search')
  @ApiOperation({ summary: 'Search posts in a course' })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved',
    type: [ForumPost],
  })
  searchPosts(
    @Param('courseId') courseId: string,
    @Query('q') query: string,
  ): Promise<ForumPost[]> {
    return this.forumService.searchPosts(+courseId, query);
  }
}
