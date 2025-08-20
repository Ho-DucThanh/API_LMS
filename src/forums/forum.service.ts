import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForumPost } from './entities/forum-post.entity';
import { ForumComment } from './entities/forum-comment.entity';
import {
  CreateForumPostDto,
  CreateForumCommentDto,
} from './dto/create-forum-post.dto';

@Injectable()
export class ForumService {
  constructor(
    @InjectRepository(ForumPost)
    private forumPostRepository: Repository<ForumPost>,
    @InjectRepository(ForumComment)
    private forumCommentRepository: Repository<ForumComment>,
  ) {}

  async createPost(
    createPostDto: CreateForumPostDto,
    authorId: number,
  ): Promise<ForumPost> {
    const post = this.forumPostRepository.create({
      ...createPostDto,
      author_id: authorId,
    });
    return await this.forumPostRepository.save(post);
  }

  async findPostsByCourse(courseId: number): Promise<ForumPost[]> {
    return await this.forumPostRepository.find({
      where: { course_id: courseId, is_active: true },
      relations: ['author', 'comments', 'comments.author'],
      order: { is_pinned: 'DESC', created_at: 'DESC' },
    });
  }

  async findPostById(postId: number): Promise<ForumPost> {
    const post = await this.forumPostRepository.findOne({
      where: { id: postId },
      relations: [
        'author',
        'course',
        'comments',
        'comments.author',
        'comments.replies',
      ],
    });

    if (!post) {
      throw new NotFoundException(`Forum post with ID ${postId} not found`);
    }

    // Increment view count
    await this.forumPostRepository.update(postId, { views: post.views + 1 });

    return post;
  }

  async createComment(
    createCommentDto: CreateForumCommentDto,
    authorId: number,
  ): Promise<ForumComment> {
    const comment = this.forumCommentRepository.create({
      ...createCommentDto,
      author_id: authorId,
    });
    return await this.forumCommentRepository.save(comment);
  }

  async findCommentsByPost(postId: number): Promise<ForumComment[]> {
    return await this.forumCommentRepository.find({
      where: { post_id: postId, is_active: true },
      relations: ['author', 'replies', 'replies.author'],
      order: { created_at: 'ASC' },
    });
  }

  async deletePost(postId: number, userId: number): Promise<void> {
    const post = await this.forumPostRepository.findOne({
      where: { id: postId },
      relations: ['author'],
    });

    if (!post) {
      throw new NotFoundException(`Forum post with ID ${postId} not found`);
    }

    if (post.author_id !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    await this.forumPostRepository.update(postId, { is_active: false });
  }

  async deleteComment(commentId: number, userId: number): Promise<void> {
    const comment = await this.forumCommentRepository.findOne({
      where: { id: commentId },
      relations: ['author'],
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    if (comment.author_id !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.forumCommentRepository.update(commentId, { is_active: false });
  }

  async pinPost(postId: number, userId: number): Promise<ForumPost> {
    const post = await this.findPostById(postId);

    // Only course instructor or admin can pin posts
    // This would need additional authorization logic in the controller

    await this.forumPostRepository.update(postId, {
      is_pinned: !post.is_pinned,
    });
    return await this.findPostById(postId);
  }

  async searchPosts(courseId: number, query: string): Promise<ForumPost[]> {
    return await this.forumPostRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .where('post.course_id = :courseId', { courseId })
      .andWhere('post.is_active = :isActive', { isActive: true })
      .andWhere('(post.title LIKE :query OR post.content LIKE :query)', {
        query: `%${query}%`,
      })
      .orderBy('post.created_at', 'DESC')
      .getMany();
  }
}
