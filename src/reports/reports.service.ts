import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Course } from '../courses/entities/course.entity';
import {
  Enrollment,
  EnrollmentStatus,
} from '../enrollments/entities/enrollment.entity';
import { Submission } from '../submissions/entities/submission.entity';
import { Review } from '../reviews/entities/review.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(Course) private coursesRepo: Repository<Course>,
    @InjectRepository(Enrollment) private enrollRepo: Repository<Enrollment>,
    @InjectRepository(Submission) private subsRepo: Repository<Submission>,
    @InjectRepository(Review) private reviewsRepo: Repository<Review>,
  ) {}

  async getAdminOverview() {
    const [totalUsers, totalCourses] = await Promise.all([
      this.usersRepo.count(),
      this.coursesRepo.count(),
    ]);

    const byStatus = await this.enrollRepo
      .createQueryBuilder('e')
      .select('e.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('e.status')
      .getRawMany();

    const enrollSummary = {
      total: await this.enrollRepo.count(),
      active: Number(
        byStatus.find((r) => r.status === EnrollmentStatus.ACTIVE)?.count || 0,
      ),
      completed: Number(
        byStatus.find((r) => r.status === EnrollmentStatus.COMPLETED)?.count ||
          0,
      ),
      dropped: Number(
        byStatus.find((r) => r.status === EnrollmentStatus.DROPPED)?.count || 0,
      ),
      pending: Number(
        byStatus.find((r) => r.status === EnrollmentStatus.PENDING)?.count || 0,
      ),
    };

    const totalSubmissions = await this.subsRepo.count();
    const totalReviews = await this.reviewsRepo.count();

    // Compute revenue as sum of course price for active/completed enrollments
    const revenueRow = await this.enrollRepo
      .createQueryBuilder('e')
      .leftJoin(Course, 'c', 'c.id = e.course_id')
      .select('COALESCE(SUM(c.price), 0)', 'revenue')
      .where('e.status IN (:...statuses)', {
        statuses: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED],
      })
      .getRawOne<{ revenue: string | number }>();
    const totalRevenue = Number((revenueRow as any)?.revenue || 0);

    return {
      totals: {
        users: totalUsers,
        courses: totalCourses,
        enrollments: enrollSummary.total,
        revenue: totalRevenue,
        submissions: totalSubmissions,
        reviews: totalReviews,
      },
      enrollments: enrollSummary,
    };
  }

  async getAdminCoursePerformance({
    page = 1,
    limit = 20,
  }: {
    page?: number;
    limit?: number;
  }) {
    const qb = this.coursesRepo
      .createQueryBuilder('c')
      .leftJoin('c.enrollments', 'e')
      .leftJoin(Review, 'r', 'r.course_id = c.id')
      .select('c.id', 'id')
      .addSelect('c.title', 'title')
      .addSelect('COUNT(DISTINCT e.id)', 'enrollments')
      .addSelect('AVG(r.rating)', 'avg_rating')
      .groupBy('c.id');

    const [rows, total] = await Promise.all([
      qb
        .offset((page - 1) * limit)
        .limit(limit)
        .getRawMany(),
      this.coursesRepo.count(),
    ]);

    return { data: rows, total, page, limit };
  }

  async getTeacherOverview(teacherId?: number) {
    // Support optional teacherId override; otherwise rely on authenticated user in controller if needed
    const qb = this.coursesRepo.createQueryBuilder('c');
    if (teacherId) qb.where('c.instructor_id = :tid', { tid: teacherId });

    const courses = await qb.getMany();
    const courseIds = courses.map((c) => c.id);
    if (courseIds.length === 0) {
      return {
        totals: { courses: 0, students: 0 },
        enrollments: { active: 0, completed: 0, dropped: 0 },
      };
    }

    const byStatus = await this.enrollRepo
      .createQueryBuilder('e')
      .select('e.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('e.course_id IN (:...ids)', { ids: courseIds })
      .groupBy('e.status')
      .getRawMany();

    const students = await this.enrollRepo
      .createQueryBuilder('e')
      .where('e.course_id IN (:...ids)', { ids: courseIds })
      .getCount();

    return {
      totals: { courses: courses.length, students },
      enrollments: {
        active: Number(
          byStatus.find((r) => r.status === EnrollmentStatus.ACTIVE)?.count ||
            0,
        ),
        completed: Number(
          byStatus.find((r) => r.status === EnrollmentStatus.COMPLETED)
            ?.count || 0,
        ),
        dropped: Number(
          byStatus.find((r) => r.status === EnrollmentStatus.DROPPED)?.count ||
            0,
        ),
      },
    };
  }

  async getTeacherCoursePerformance(
    teacherId: number | undefined,
    { page = 1, limit = 20 }: { page?: number; limit?: number },
  ) {
    const qb = this.coursesRepo
      .createQueryBuilder('c')
      .leftJoin('c.enrollments', 'e')
      .leftJoin(Review, 'r', 'r.course_id = c.id')
      .select('c.id', 'id')
      .addSelect('c.title', 'title')
      .addSelect('COUNT(DISTINCT e.id)', 'enrollments')
      .addSelect('AVG(r.rating)', 'avg_rating');

    if (teacherId) qb.where('c.instructor_id = :tid', { tid: teacherId });
    qb.groupBy('c.id');

    const [rows, total] = await Promise.all([
      qb
        .offset((page - 1) * limit)
        .limit(limit)
        .getRawMany(),
      qb.getCount(),
    ]);

    return { data: rows, total, page, limit };
  }

  private buildDateBounds(from?: string, to?: string) {
    const start = from
      ? new Date(from)
      : new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const end = to ? new Date(to) : new Date();
    // normalize times
    const startIso = new Date(start.getTime())
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ');
    const endIso = new Date(end.getTime())
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ');
    return { startIso, endIso };
  }

  async getAdminTrends({ from, to, interval = 'day' as 'day' | 'month' }) {
    const { startIso, endIso } = this.buildDateBounds(from, to);
    const fmt = interval === 'month' ? '%Y-%m' : '%Y-%m-%d';

    const enrollTrend = await this.enrollRepo
      .createQueryBuilder('e')
      .select(`DATE_FORMAT(e.enrolled_at, '${fmt}')`, 'bucket')
      .addSelect('COUNT(*)', 'count')
      .where('e.enrolled_at BETWEEN :start AND :end', {
        start: startIso,
        end: endIso,
      })
      .groupBy('bucket')
      .orderBy('bucket', 'ASC')
      .getRawMany();

    const subTrend = await this.subsRepo
      .createQueryBuilder('s')
      .select(`DATE_FORMAT(s.submitted_at, '${fmt}')`, 'bucket')
      .addSelect('COUNT(*)', 'count')
      .where('s.submitted_at BETWEEN :start AND :end', {
        start: startIso,
        end: endIso,
      })
      .groupBy('bucket')
      .orderBy('bucket', 'ASC')
      .getRawMany();

    const reviewTrend = await this.reviewsRepo
      .createQueryBuilder('r')
      .select(`DATE_FORMAT(r.created_at, '${fmt}')`, 'bucket')
      .addSelect('COUNT(*)', 'count')
      .where('r.created_at BETWEEN :start AND :end', {
        start: startIso,
        end: endIso,
      })
      .groupBy('bucket')
      .orderBy('bucket', 'ASC')
      .getRawMany();

    return {
      range: { from: startIso, to: endIso, interval },
      enrollments: enrollTrend,
      submissions: subTrend,
      reviews: reviewTrend,
    };
  }

  async getTeacherTrends(
    teacherId: number | undefined,
    { from, to, interval = 'day' as 'day' | 'month' },
  ) {
    const { startIso, endIso } = this.buildDateBounds(from, to);
    const fmt = interval === 'month' ? '%Y-%m' : '%Y-%m-%d';

    // fetch teacher course ids
    const cqb = this.coursesRepo.createQueryBuilder('c');
    if (teacherId) cqb.where('c.instructor_id = :tid', { tid: teacherId });
    const courses = await cqb.select(['c.id']).getMany();
    const ids = courses.map((c) => c.id);
    if (ids.length === 0) {
      return {
        range: { from: startIso, to: endIso, interval },
        enrollments: [],
        submissions: [],
        reviews: [],
      };
    }

    const enrollTrend = await this.enrollRepo
      .createQueryBuilder('e')
      .select(`DATE_FORMAT(e.enrolled_at, '${fmt}')`, 'bucket')
      .addSelect('COUNT(*)', 'count')
      .where('e.course_id IN (:...ids)', { ids })
      .andWhere('e.enrolled_at BETWEEN :start AND :end', {
        start: startIso,
        end: endIso,
      })
      .groupBy('bucket')
      .orderBy('bucket', 'ASC')
      .getRawMany();

    const subTrend = await this.subsRepo
      .createQueryBuilder('s')
      .leftJoin('s.assignment', 'a')
      .leftJoin('a.lesson', 'l')
      .leftJoin('l.module', 'm')
      .leftJoin('m.course', 'c')
      .select(`DATE_FORMAT(s.submitted_at, '${fmt}')`, 'bucket')
      .addSelect('COUNT(*)', 'count')
      .where('c.id IN (:...ids)', { ids })
      .andWhere('s.submitted_at BETWEEN :start AND :end', {
        start: startIso,
        end: endIso,
      })
      .groupBy('bucket')
      .orderBy('bucket', 'ASC')
      .getRawMany();

    const reviewTrend = await this.reviewsRepo
      .createQueryBuilder('r')
      .select(`DATE_FORMAT(r.created_at, '${fmt}')`, 'bucket')
      .addSelect('COUNT(*)', 'count')
      .where('r.course_id IN (:...ids)', { ids })
      .andWhere('r.created_at BETWEEN :start AND :end', {
        start: startIso,
        end: endIso,
      })
      .groupBy('bucket')
      .orderBy('bucket', 'ASC')
      .getRawMany();

    return {
      range: { from: startIso, to: endIso, interval },
      enrollments: enrollTrend,
      submissions: subTrend,
      reviews: reviewTrend,
    };
  }
}
