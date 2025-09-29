// ai-recommendation.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Brackets } from 'typeorm';
import { AiRecommendation } from './entities/ai-recommendation.entity';
import { AiRecommendationCourse } from './entities/ai-recommendation-course.entity';
import {
  Course,
  CourseStatus,
  ApprovalStatus,
} from 'src/courses/entities/course.entity';
import OpenAI from 'openai';
import { LearningPath } from './entities/learning-path.entity';
import { LearningPathItem } from './entities/learning-path-item.entity';

@Injectable()
export class AiRecommendationService {
  private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  constructor(
    @InjectRepository(AiRecommendation)
    private recommendationRepo: Repository<AiRecommendation>,
    @InjectRepository(AiRecommendationCourse)
    private recCourseRepo: Repository<AiRecommendationCourse>,
    @InjectRepository(Course)
    private courseRepo: Repository<Course>,
    @InjectRepository(LearningPath)
    private pathRepo: Repository<LearningPath>,
    @InjectRepository(LearningPathItem)
    private pathItemRepo: Repository<LearningPathItem>,
  ) {}

  async generateRecommendation(
    userId: number,
    goal: string,
    currentLevel: string,
    preferences: string[],
    verbosity?: 'short' | 'medium' | 'deep',
    guidanceMode?: 'novice' | 'guided' | 'standard',
  ) {
    // 1. Prepare smarter prompt and preprocess preferences
    const prefs = (preferences || [])
      .flatMap((p) => (typeof p === 'string' ? p.split(',') : [p]))
      .map((s) => String(s).trim())
      .filter(Boolean);

    const mode = guidanceMode || 'standard';
    const detail = verbosity || 'medium';
    const wantDeep = detail === 'deep' || mode === 'novice';
    const explainLevel = wantDeep
      ? 'detailed'
      : detail === 'short'
        ? 'brief'
        : 'concise';

    const prompt = `You are an educational mentor/recommender.
User info:
- currentLevel: ${currentLevel}
- goal: ${goal}
- preferences: ${prefs.join(', ')}
- guidanceMode: ${mode} (novice|guided|standard)
- verbosity: ${detail} (short|medium|deep)

Task: Return JSON with four sections for a beginner-friendly journey:
1) concepts: core programming concepts for absolute beginners, each with short and long explanations (why it matters).
2) careers: main software career paths (Web, Mobile, App, Game, Data, DevOps, etc) with a short description and typical roles.
3) roadmap: grouped by stages FOUNDATION, INTERMEDIATE, ADVANCED. Each stage contains topics. Each topic has a name and keywords (for matching to course data). Optionally add a short tip/explanation.
4) notes: optional tips (may be empty).

Return strict JSON only in the following format (no extra commentary):
{
  "concepts": [
    { "name": "Programming Basics", "short": "What programming is.", "long": "Explain what programming is used for, algorithms, OOP basics, etc." }
  ],
  "careers": [
    { "name": "Web Development", "description": "Build websites and web apps.", "typicalRoles": ["Frontend", "Backend", "Fullstack"] }
  ],
  "roadmap": [
    { "stage": "FOUNDATION", "topics": [ { "name": "HTML", "keywords": ["html", "html5"], "tip": "Learn structure." } ] }
  ],
  "notes": []
}

If you cannot provide keywords, it's OK to return topics as strings. Use ${explainLevel} explanations, and if mode is novice, prefer clearer and more thorough explanations.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }, // request JSON
    });

    const content = response.choices[0].message?.content ?? '';
    let aiOutput: any = {};
    try {
      aiOutput = content ? JSON.parse(content) : {};
    } catch (e) {
      aiOutput = { roadmap: [] };
    }

    // Extract & normalize concepts and careers (optional)
    const concepts = Array.isArray(aiOutput.concepts)
      ? aiOutput.concepts
          .map((c: any) => ({
            name: String(c?.name || c?.title || '').trim(),
            short: String(c?.short || c?.summary || '').trim(),
            long: String(c?.long || c?.explanation || '').trim(),
          }))
          .filter((c: any) => c.name)
      : [];

    const careers = Array.isArray(aiOutput.careers)
      ? aiOutput.careers
          .map((c: any) => ({
            name: String(c?.name || '').trim(),
            description: String(c?.description || c?.desc || '').trim(),
            typicalRoles: Array.isArray(c?.typicalRoles)
              ? c.typicalRoles.map((r: any) => String(r)).filter(Boolean)
              : [],
          }))
          .filter((c: any) => c.name)
      : [];

    // Normalize roadmap to support both new (topics as objects) and legacy (topics as strings)
    const normalizedRoadmap: Array<{
      stage: string;
      topics: Array<{ name: string; keywords: string[] }>;
    }> = [];

    for (const stageObj of aiOutput.roadmap || []) {
      const stage =
        stageObj.stage || stageObj.stage?.toUpperCase() || 'FOUNDATION';
      const topics: Array<{ name: string; keywords: string[] }> = [];

      for (const t of stageObj.topics || []) {
        if (!t) continue;
        if (typeof t === 'string') {
          // allow comma-separated names (e.g., "HTML,CSS")
          const parts = t
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean);
          for (const p of parts) {
            topics.push({ name: p, keywords: [p.toLowerCase()] });
          }
        } else if (typeof t === 'object') {
          const name = t.name || (t.topic || '').toString();
          const kws = Array.isArray(t.keywords)
            ? t.keywords.map((k: any) => String(k).toLowerCase())
            : [String(name).toLowerCase()];
          topics.push({ name, keywords: kws });
        }
      }

      normalizedRoadmap.push({ stage: stage.toUpperCase(), topics });
    }

    // 2. Lưu vào ai_recommendation
    const rec = this.recommendationRepo.create({
      user: { id: userId } as any,
      goal_text: goal,
      input_json: { currentLevel, preferences },
      output_json: aiOutput,
    });
    const savedRec = await this.recommendationRepo.save(rec);

    // 3. Mapping course DB theo topic -> aggregate matches per course per stage
    // Track topic count per stage for later matchScore calculation
    const stageTopicCount = new Map<string, number>();
    const agg = new Map<
      string,
      {
        course?: Course | null;
        stage: string;
        matchedTopics: Set<string>;
        matchCount: number;
      }
    >();

    const placeholders: { stage: string; topic: string }[] = [];

    for (const stageObj of normalizedRoadmap) {
      stageTopicCount.set(
        stageObj.stage,
        (stageTopicCount.get(stageObj.stage) || 0) +
          (stageObj.topics?.length || 0),
      );
      for (const topicObj of stageObj.topics) {
        const keywords = Array.from(
          new Set([...topicObj.keywords, topicObj.name.toLowerCase()]),
        ).filter(Boolean);

        // Build query for all keywords
        const qb = this.courseRepo
          .createQueryBuilder('course')
          .leftJoin('course.courseTags', 'courseTag')
          .leftJoin('courseTag.tag', 'tag')
          .where('course.status = :pub', { pub: CourseStatus.PUBLISHED })
          .andWhere('course.approval_status = :approved', {
            approved: ApprovalStatus.APPROVED,
          })
          .andWhere(
            new Brackets((qb2) => {
              let first = true;
              keywords.forEach((kw, idx) => {
                const param = `kw${idx}`;
                const likeVal = `%${kw}%`;
                const cond = `LOWER(course.title) LIKE :${param} OR LOWER(course.description) LIKE :${param} OR LOWER(tag.name) LIKE :${param}`;
                if (first) {
                  qb2.where(cond, { [param]: likeVal });
                  first = false;
                } else {
                  qb2.orWhere(cond, { [param]: likeVal });
                }
              });
            }),
          );

        const matchedCourses = await qb.getMany();

        if (matchedCourses.length) {
          for (const mc of matchedCourses) {
            const key = `${mc.id}|${stageObj.stage}`;
            const existing = agg.get(key);
            if (existing) {
              existing.matchedTopics.add(topicObj.name);
              existing.matchCount += 1;
            } else {
              agg.set(key, {
                course: mc,
                stage: stageObj.stage,
                matchedTopics: new Set([topicObj.name]),
                matchCount: 1,
              });
            }
          }
        } else {
          placeholders.push({ stage: stageObj.stage, topic: topicObj.name });
        }
      }
    }

    // 4. For each stage pick up to 3 best matches and persist AiRecommendationCourse rows
    const byStage = new Map<string, Array<{ key: string; entry: any }>>();
    for (const [key, entry] of agg.entries()) {
      const stage = entry.stage || 'FOUNDATION';
      if (!byStage.has(stage)) byStage.set(stage, []);
      byStage.get(stage)!.push({ key, entry });
    }

    const savedEntries: AiRecommendationCourse[] = [];
    for (const [stage, list] of byStage.entries()) {
      // sort by matchCount desc, take top 3
      list.sort((a, b) => b.entry.matchCount - a.entry.matchCount);
      const take = list.slice(0, 3);
      for (const item of take) {
        const e = item.entry;
        const recCourse = new AiRecommendationCourse();
        recCourse.recommendation = savedRec;
        recCourse.course = e.course || null;
        recCourse.stage = stage as any;
        const topics = Array.from(e.matchedTopics || []);
        recCourse.rationale = `Matched topics: ${topics.join(', ')}`;
        const saved = await this.recCourseRepo.save(recCourse);
        savedEntries.push(saved);
      }
    }

    // persist placeholders (topics with no matches) as notes
    for (const p of placeholders) {
      const recCourse = new AiRecommendationCourse();
      recCourse.recommendation = savedRec;
      recCourse.course = null as any;
      recCourse.stage = p.stage as any;
      recCourse.rationale = `No matching course found for ${p.topic}`;
      const saved = await this.recCourseRepo.save(recCourse);
      savedEntries.push(saved);
    }

    // 5. Load saved rec courses with their course relation and return concise matched courses
    const recCourses = await this.recCourseRepo.find({
      where: { recommendation: { id: savedRec.id } },
      relations: [
        'course',
        'course.instructor',
        'course.category',
        'course.courseTags',
        'course.courseTags.tag',
      ],
      order: { id: 'ASC' },
    });

    // build a compact map per stage and include useful metadata per course
    const resultByStage: Record<string, any[]> = {};
    // dedupe: track which courseId was already assigned to an earlier stage
    const assignedCourseIds = new Set<number>();
    // desired stage priority
    const stagePriority = ['FOUNDATION', 'INTERMEDIATE', 'ADVANCED'];

    // sort recCourses by stage priority then by id
    recCourses.sort((a, b) => {
      const pa = stagePriority.indexOf(a.stage || 'FOUNDATION');
      const pb = stagePriority.indexOf(b.stage || 'FOUNDATION');
      if (pa !== pb) return pa - pb;
      return (a.course?.id || 0) - (b.course?.id || 0);
    });

    for (const rc of recCourses) {
      const stage = (rc.stage || 'FOUNDATION').toUpperCase();
      if (!resultByStage[stage]) resultByStage[stage] = [];

      if (rc.course) {
        const cid = rc.course.id;
        // skip if already assigned to an earlier stage
        if (assignedCourseIds.has(cid)) continue;
        assignedCourseIds.add(cid);
        const stageTotalTopics = Math.max(1, stageTopicCount.get(stage) || 1);
        const matchedTopics = (rc.rationale || '')
          .replace(/^Matched topics:\s*/i, '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        const matchCount = matchedTopics.length || 0;
        const matchScore = Math.min(
          100,
          Math.round((matchCount / stageTotalTopics) * 100),
        );
        const c: any = rc.course;
        const tags = Array.isArray(c.courseTags)
          ? c.courseTags
              .map((ct: any) => ({ id: ct?.tag?.id, name: ct?.tag?.name }))
              .filter((t: any) => t.id && t.name)
          : [];
        resultByStage[stage].push({
          id: cid,
          title: c.title,
          description: c.description || null,
          thumbnail_url: c.thumbnail_url || null,
          level: c.level || null,
          total_enrolled: c.total_enrolled || 0,
          price: Number(c.price ?? 0),
          original_price: Number(c.original_price ?? 0),
          duration_hours: Number(c.duration_hours ?? 0),
          rating: Number(c.rating ?? 0),
          rating_count: Number(c.rating_count ?? 0),
          status: c.status || null,
          approval_status: c.approval_status || null,
          instructor: c.instructor
            ? {
                id: c.instructor.id,
                first_name: c.instructor.first_name,
                last_name: c.instructor.last_name,
                email: c.instructor.email,
              }
            : null,
          category: c.category
            ? { id: c.category.id, name: c.category.name }
            : null,
          tags,
          matchedTopics,
          matchCount,
          matchScore,
        });
      } else {
        // Skip placeholders entirely (no "No matching course" cards in client)
        continue;
      }

      // limit to 3 per stage just in case
      if (resultByStage[stage].length > 3)
        resultByStage[stage] = resultByStage[stage].slice(0, 3);
    }

    // legacy 'courses' array for backward compatibility: flat list of matched courses (deduped)
    const legacyCourses: any[] = [];
    for (const stage of stagePriority) {
      const list = resultByStage[stage] || [];
      for (const item of list) {
        if (!item || !item.id) continue;
        legacyCourses.push({
          id: item.id,
          stage,
          rationale: `Matched topics: ${(item.matchedTopics || []).join(', ')}`,
        });
      }
    }

    // Build a lightweight output summary for client use (stages + topics count)
    const output_summary = (normalizedRoadmap || []).map((r) => ({
      stage: r.stage,
      topics: r.topics.map((t: any) => ({ name: t.name })),
      topicCount: (r.topics || []).length,
    }));

    return {
      id: savedRec.id,
      goal_text: savedRec.goal_text,
      input_json: savedRec.input_json,
      output_summary,
      concepts,
      careers,
      roadmap: normalizedRoadmap,
      user: { id: savedRec.user?.id },
      courses_by_stage: resultByStage,
      // legacy flat courses list kept for backward compatibility
      courses: legacyCourses,
    };
  }

  async saveRecommendation(id: number, userId: number, saved: boolean) {
    const rec = await this.recommendationRepo.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!rec || rec.user?.id !== userId) {
      throw new Error('Recommendation not found');
    }
    // store saved flag into input_json meta to avoid schema changes
    const input = rec.input_json || {};
    input.saved = !!saved;
    await this.recommendationRepo.update({ id }, { input_json: input });
    return { id, saved: !!saved };
  }

  async followUp(id: number, userId: number, question: string) {
    const rec = await this.recommendationRepo.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!rec || rec.user?.id !== userId) {
      throw new Error('Recommendation not found');
    }
    const context = {
      goal: rec.goal_text,
      input: rec.input_json,
      output: rec.output_json,
    };
    const messages = [
      {
        role: 'system' as const,
        content: 'You are a helpful mentor for programming learners.',
      },
      {
        role: 'user' as const,
        content: `Context (JSON): ${JSON.stringify(context)}\n\nUser follow-up question: ${question}\n\nAnswer briefly and suggest specific next steps.`,
      },
    ];
    const resp = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
    });
    const answer = resp.choices?.[0]?.message?.content || '';
    return { id, question, answer };
  }

  // Clarify beginner questions without creating a recommendation record
  async clarify(userId: number, question: string, context: any) {
    const safeQ = String(question || '').trim();
    const ctx = context || {};
    const sys = `You are a friendly, precise programming mentor. Answer in Vietnamese. Provide structured, helpful, and actionable answers for beginners. Use short paragraphs and bullet points when appropriate. Avoid hallucinating code unless necessary.`;
    const messages = [
      { role: 'system' as const, content: sys },
      {
        role: 'user' as const,
        content: `UserId: ${userId || 'guest'}
Context (optional JSON): ${JSON.stringify(ctx)}
Question: ${safeQ}

Requirements:
- If the question is a greeting or too vague, ask 2-3 clarifying questions AND provide 3-5 concrete next steps for beginners.
- Else, answer directly with concise steps, pitfalls, and a tiny practice idea.
- Keep it under ~250 words.`,
      },
    ];

    const resp = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
    });
    const answer = resp.choices?.[0]?.message?.content || '';
    return { question: safeQ, answer };
  }

  // Persist a learning path for the user based on an existing recommendation and client-selected course IDs
  async saveLearningPath(params: {
    userId: number;
    recommendationId: number;
    name?: string;
    selectedCourseIds?: number[]; // optional custom selection; if empty, use all matched courses by stage
  }) {
    const { userId, recommendationId, name, selectedCourseIds } = params;
    const rec = await this.recommendationRepo.findOne({
      where: { id: recommendationId },
      relations: ['user'],
    });
    if (!rec || rec.user?.id !== userId) {
      throw new Error('Recommendation not found');
    }

    // load courses linked to rec
    const recCourses = await this.recCourseRepo.find({
      where: { recommendation: { id: recommendationId } },
      relations: ['course'],
    });
    // Build items by stage with order
    const stageOrder: Record<string, number> = {
      FOUNDATION: 0,
      INTERMEDIATE: 1,
      ADVANCED: 2,
      SPECIALIZATION: 3,
    };
    const filtered = (recCourses || []).filter((rc) => {
      if (!rc.course) return false; // skip placeholders
      if (Array.isArray(selectedCourseIds) && selectedCourseIds.length > 0) {
        return selectedCourseIds.includes(rc.course.id);
      }
      return true;
    });
    filtered.sort((a, b) => {
      const sa = stageOrder[(a.stage || 'FOUNDATION').toUpperCase()] ?? 0;
      const sb = stageOrder[(b.stage || 'FOUNDATION').toUpperCase()] ?? 0;
      if (sa !== sb) return sa - sb;
      return (a.course?.id || 0) - (b.course?.id || 0);
    });

    // create path
    const path = this.pathRepo.create({
      user: { id: userId } as any,
      recommendation: { id: recommendationId } as any,
      name: name?.trim() || `Lộ trình từ đề xuất #${recommendationId}`,
      metadata: {
        goal_text: rec.goal_text,
        input_json: rec.input_json,
        created_from_recommendation: recommendationId,
      },
    });
    const savedPath = await this.pathRepo.save(path);

    // create items
    let idxByStage: Record<string, number> = {};
    const items: LearningPathItem[] = [];
    for (const rc of filtered) {
      const stage = (rc.stage || 'FOUNDATION').toUpperCase();
      const order_index = (idxByStage[stage] = (idxByStage[stage] ?? 0) + 1);
      const item = this.pathItemRepo.create({
        path: savedPath,
        course: rc.course,
        stage: stage as any,
        order_index,
        note: rc.rationale || null,
      });
      items.push(item);
    }
    if (items.length) await this.pathItemRepo.save(items);

    // return hydrated result
    const full = await this.pathRepo.findOne({
      where: { id: savedPath.id },
      relations: [
        'items',
        'items.course',
        'items.course.category',
        'items.course.instructor',
      ],
    });
    return full;
  }

  // List saved learning paths for a user
  async listLearningPaths(userId: number) {
    const paths = await this.pathRepo.find({
      where: { user: { id: userId } as any },
      relations: ['items', 'items.course'],
      order: { updatedAt: 'DESC' },
    });
    return paths;
  }
}
