import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { Course } from '../courses/entities/course.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review) private reviewRepo: Repository<Review>,
    @InjectRepository(Course) private courseRepo: Repository<Course>,
    @InjectRepository(Enrollment)
    private enrollmentRepo: Repository<Enrollment>,
  ) {}

  private async recalcCourseRating(courseId: number) {
    const reviews = await this.reviewRepo.find({
      where: { course_id: courseId },
    });
    const count = reviews.length;
    const avg = count
      ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / count
      : 0;
    await this.courseRepo.update(courseId, {
      rating: +avg.toFixed(2),
      rating_count: count,
    });
  }

  async createOrUpdate(dto: CreateReviewDto) {
    // check enrollment
    const enr = await this.enrollmentRepo.findOne({
      where: { course_id: dto.course_id, student_id: dto.student_id },
    });
    if (!enr)
      throw new BadRequestException(
        'You must be enrolled to review this course',
      );

    let review = await this.reviewRepo.findOne({
      where: { course_id: dto.course_id, student_id: dto.student_id },
    });
    if (review) {
      review.rating = dto.rating;
      review.review_text = dto.review_text ?? review.review_text;
      await this.reviewRepo.save(review);
    } else {
      const newReview = this.reviewRepo.create({
        course_id: dto.course_id,
        student_id: dto.student_id,
        rating: dto.rating,
        review_text: dto.review_text ?? null,
      } as any);
      review = await this.reviewRepo.save(newReview as any);
    }

    await this.recalcCourseRating(dto.course_id);
    return review;
  }

  async findForCourse(courseId: number) {
    try {
      return await this.reviewRepo.find({
        where: { course_id: courseId },
        relations: ['student'],
        order: { created_at: 'DESC' },
      });
    } catch (err) {
      // If DB table doesn't exist yet, return empty list instead of crashing the page.
      console.error(
        'Failed to load reviews for course',
        courseId,
        err.message || err,
      );
      return [];
    }
  }

  async findOne(id: number) {
    const r = await this.reviewRepo.findOne({
      where: { id },
      relations: ['student'],
    });
    if (!r) throw new NotFoundException('Review not found');
    return r;
  }

  async remove(id: number) {
    const r = await this.findOne(id);
    await this.reviewRepo.remove(r);
    await this.recalcCourseRating(r.course_id);
    return { deleted: true };
  }
}
