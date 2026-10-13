import {
  AdminCreateCourseBody,
  AdminCreateCourseResponse,
  AdminCreateLessonBody,
  AdminCreateLessonParams,
  AdminCreateLessonResponse,
  AdminCreateModuleBody,
  AdminCreateModuleParams,
  AdminCreateModuleResponse,
  AdminDeleteCourseParams,
  AdminDeleteLessonParams,
  AdminDeleteModuleParams,
  AdminGetCourseOutlineParams,
  AdminGetCourseOutlineResponse,
  AdminGetCourseParams,
  AdminGetCourseResponse,
  AdminListCoursesQueryParams,
  AdminListCoursesResponse,
  AdminReorderCourseBody,
  AdminReorderCourseParams,
  AdminReorderCourseResponse,
  AdminUpdateCourseBody,
  AdminUpdateCourseParams,
  AdminUpdateCourseResponse,
  AdminUpdateLessonBody,
  AdminUpdateLessonParams,
  AdminUpdateLessonResponse,
  AdminUpdateModuleBody,
  AdminUpdateModuleParams,
  AdminUpdateModuleResponse,
} from "@workspace/api-zod";
import {
  coursesTable,
  db,
  examsTable,
  lessonsTable,
  mediaAssetsTable,
  modulesTable,
} from "@workspace/db";
import {
  and,
  asc,
  count,
  eq,
  gt,
  ilike,
  inArray,
  isNull,
  max,
  or,
  type SQL,
} from "drizzle-orm";
import { Router, type IRouter } from "express";
import { writeAudit } from "../lib/audit";
import { sendError } from "../lib/errors";

const router: IRouter = Router();

class OrderValidationError extends Error {}

function likePattern(value: string) {
  return `%${value.replace(/[\\%_]/g, "\\$&")}%`;
}

async function lessonCounts(courseIds: string[]) {
  if (courseIds.length === 0) return new Map<string, number>();
  const rows = await db
    .select({ courseId: modulesTable.courseId, value: count() })
    .from(modulesTable)
    .innerJoin(lessonsTable, eq(lessonsTable.moduleId, modulesTable.id))
    .where(
      and(
        inArray(modulesTable.courseId, courseIds),
        isNull(modulesTable.deletedAt),
        isNull(lessonsTable.deletedAt),
      ),
    )
    .groupBy(modulesTable.courseId);
  return new Map(rows.map((row) => [row.courseId, Number(row.value)]));
}

function courseDto(course: typeof coursesTable.$inferSelect, lessonCount: number) {
  return {
    id: course.id,
    examId: course.examId,
    slug: course.slug,
    title: course.title,
    summary: course.summary,
    description: course.description,
    coverAssetId: course.coverAssetId,
    coverUrl: null,
    isFree: course.isFree,
    lessonCount,
    position: course.position,
    status: course.status,
  };
}

async function findCourse(id: string) {
  const [course] = await db
    .select()
    .from(coursesTable)
    .where(and(eq(coursesTable.id, id), isNull(coursesTable.deletedAt)))
    .limit(1);
  return course ?? null;
}

async function ensureExamExists(examId: string | null | undefined) {
  if (!examId) return true;
  const [exam] = await db
    .select({ id: examsTable.id })
    .from(examsTable)
    .where(and(eq(examsTable.id, examId), isNull(examsTable.deletedAt)))
    .limit(1);
  return Boolean(exam);
}

async function ensurePublishable(courseId: string) {
  const [lesson] = await db
    .select({ id: lessonsTable.id })
    .from(lessonsTable)
    .innerJoin(modulesTable, eq(modulesTable.id, lessonsTable.moduleId))
    .where(
      and(
        eq(modulesTable.courseId, courseId),
        eq(lessonsTable.status, "published"),
        isNull(modulesTable.deletedAt),
        isNull(lessonsTable.deletedAt),
      ),
    )
    .limit(1);
  return Boolean(lesson);
}

router.get("/courses", async (req, res) => {
  const query = AdminListCoursesQueryParams.safeParse(req.query);
  if (!query.success) {
    return void sendError(res, 400, "validation_error", "Invalid course filters.", query.error.flatten());
  }

  const limit = query.data.limit ?? 25;
  const conditions: SQL[] = [isNull(coursesTable.deletedAt)];
  const q = query.data.q?.trim();
  if (q) {
    const pattern = likePattern(q);
    conditions.push(
      or(
        ilike(coursesTable.title, pattern),
        ilike(coursesTable.slug, pattern),
        ilike(coursesTable.summary, pattern),
      )!,
    );
  }
  if (query.data.cursor) {
    const [cursor] = await db
      .select({ id: coursesTable.id, position: coursesTable.position, title: coursesTable.title })
      .from(coursesTable)
      .where(and(eq(coursesTable.id, query.data.cursor), isNull(coursesTable.deletedAt)))
      .limit(1);
    if (!cursor) return void sendError(res, 400, "invalid_cursor", "The course cursor is not valid.");
    conditions.push(
      or(
        gt(coursesTable.position, cursor.position),
        and(
          eq(coursesTable.position, cursor.position),
          gt(coursesTable.title, cursor.title),
        ),
        and(
          eq(coursesTable.position, cursor.position),
          eq(coursesTable.title, cursor.title),
          gt(coursesTable.id, cursor.id),
        ),
      )!,
    );
  }

  const rows = await db
    .select()
    .from(coursesTable)
    .where(and(...conditions))
    .orderBy(asc(coursesTable.position), asc(coursesTable.title), asc(coursesTable.id))
    .limit(limit + 1);
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  const counts = await lessonCounts(page.map((course) => course.id));
  const response = AdminListCoursesResponse.parse({
    data: page.map((course) => courseDto(course, counts.get(course.id) ?? 0)),
    nextCursor: hasMore ? page.at(-1)?.id ?? null : null,
  });
  return res.json(response);
});

router.post("/courses", async (req, res) => {
  const body = AdminCreateCourseBody.safeParse(req.body);
  if (!body.success) return void sendError(res, 400, "validation_error", "Invalid course details.", body.error.flatten());
  if (!body.data.slug.trim() || !body.data.title.trim()) {
    return void sendError(res, 400, "invalid_course", "Course title and URL slug are required.");
  }
  if (!(await ensureExamExists(body.data.examId))) {
    return void sendError(res, 400, "invalid_exam", "Select an existing exam or leave the exam unselected.");
  }
  if (body.data.status === "published") {
    return void sendError(res, 409, "course_has_no_published_lessons", "Add and publish at least one lesson before publishing this course.");
  }

  const [positionRow] = await db.select({ value: max(coursesTable.position) }).from(coursesTable)
    .where(isNull(coursesTable.deletedAt));
  const [course] = await db
    .insert(coursesTable)
    .values({
      examId: body.data.examId ?? null,
      slug: body.data.slug.trim(),
      title: body.data.title.trim(),
      summary: body.data.summary?.trim() ?? "",
      description: body.data.description ?? "",
      isFree: body.data.isFree ?? false,
      position: body.data.position ?? (Number(positionRow?.value ?? -1) + 1),
      status: body.data.status ?? "draft",
      instructorId: req.auth!.user.id,
    })
    .returning();
  if (!course) return void sendError(res, 500, "course_create_failed", "The course could not be created.");

  await writeAudit({
    actorId: req.auth!.user.id,
    action: "admin.course_created",
    entityType: "course",
    entityId: course.id,
    after: { slug: course.slug, title: course.title, status: course.status },
    ip: req.ip,
  });
  const [dto] = [courseDto(course, 0)];
  return res.status(201).json(AdminCreateCourseResponse.parse(dto));
});

router.get("/courses/:id", async (req, res) => {
  const params = AdminGetCourseParams.safeParse(req.params);
  if (!params.success) return void sendError(res, 400, "invalid_request", "Invalid course identifier.");
  const course = await findCourse(params.data.id);
  if (!course) return void sendError(res, 404, "not_found", "Course not found.");
  const counts = await lessonCounts([course.id]);
  return res.json(AdminGetCourseResponse.parse(courseDto(course, counts.get(course.id) ?? 0)));
});

router.patch("/courses/:id", async (req, res) => {
  const params = AdminUpdateCourseParams.safeParse(req.params);
  const body = AdminUpdateCourseBody.safeParse(req.body);
  if (!params.success || !body.success) {
    return void sendError(res, 400, "validation_error", "Invalid course details.", body.success ? undefined : body.error.flatten());
  }
  if (!body.data.slug.trim() || !body.data.title.trim()) {
    return void sendError(res, 400, "invalid_course", "Course title and URL slug are required.");
  }
  const course = await findCourse(params.data.id);
  if (!course) return void sendError(res, 404, "not_found", "Course not found.");
  if (!(await ensureExamExists(body.data.examId))) {
    return void sendError(res, 400, "invalid_exam", "Select an existing exam or leave the exam unselected.");
  }
  const nextStatus = body.data.status ?? course.status;
  if (nextStatus === "published" && !(await ensurePublishable(course.id))) {
    return void sendError(res, 409, "course_has_no_published_lessons", "Publish at least one lesson before publishing this course.");
  }

  const [updated] = await db
    .update(coursesTable)
    .set({
      examId: body.data.examId === undefined ? course.examId : body.data.examId,
      slug: body.data.slug.trim(),
      title: body.data.title.trim(),
      summary: body.data.summary?.trim() ?? course.summary,
      description: body.data.description ?? course.description,
      isFree: body.data.isFree ?? course.isFree,
      position: body.data.position ?? course.position,
      status: nextStatus,
      updatedAt: new Date(),
    })
    .where(and(eq(coursesTable.id, course.id), isNull(coursesTable.deletedAt)))
    .returning();
  if (!updated) return void sendError(res, 404, "not_found", "Course not found.");

  await writeAudit({
    actorId: req.auth!.user.id,
    action: "admin.course_updated",
    entityType: "course",
    entityId: course.id,
    before: { slug: course.slug, title: course.title, status: course.status },
    after: { slug: updated.slug, title: updated.title, status: updated.status },
    ip: req.ip,
  });
  const counts = await lessonCounts([updated.id]);
  return res.json(AdminUpdateCourseResponse.parse(courseDto(updated, counts.get(updated.id) ?? 0)));
});

router.delete("/courses/:id", async (req, res) => {
  const params = AdminDeleteCourseParams.safeParse(req.params);
  if (!params.success) return void sendError(res, 400, "invalid_request", "Invalid course identifier.");
  const course = await findCourse(params.data.id);
  if (!course) return void sendError(res, 404, "not_found", "Course not found.");
  await db.update(coursesTable).set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(coursesTable.id, course.id), isNull(coursesTable.deletedAt)));
  await writeAudit({
    actorId: req.auth!.user.id,
    action: "admin.course_deleted",
    entityType: "course",
    entityId: course.id,
    before: { slug: course.slug, title: course.title, status: course.status },
    ip: req.ip,
  });
  return res.sendStatus(204);
});

router.get("/courses/:id/outline", async (req, res) => {
  const params = AdminGetCourseOutlineParams.safeParse(req.params);
  if (!params.success) return void sendError(res, 400, "invalid_request", "Invalid course identifier.");
  const course = await findCourse(params.data.id);
  if (!course) return void sendError(res, 404, "not_found", "Course not found.");

  const [rows, counts] = await Promise.all([
    db
      .select({ module: modulesTable, lesson: lessonsTable, assetFilename: mediaAssetsTable.filename })
      .from(modulesTable)
      .leftJoin(
        lessonsTable,
        and(eq(lessonsTable.moduleId, modulesTable.id), isNull(lessonsTable.deletedAt)),
      )
      .leftJoin(mediaAssetsTable, and(eq(mediaAssetsTable.id, lessonsTable.assetId), isNull(mediaAssetsTable.deletedAt)))
      .where(and(eq(modulesTable.courseId, course.id), isNull(modulesTable.deletedAt)))
      .orderBy(asc(modulesTable.position), asc(lessonsTable.position), asc(lessonsTable.id)),
    lessonCounts([course.id]),
  ]);

  const moduleMap = new Map<string, {
    id: string;
    title: string;
    topicId: string | null;
    position: number;
    lessons: Array<{
      id: string;
      slug: string;
      title: string;
      type: string;
      body: string | null;
      assetId: string | null;
      assetFilename: string | null;
      durationSeconds: number | null;
      isFreePreview: boolean;
      position: number;
      status: string;
    }>;
  }>();
  for (const row of rows) {
    if (!moduleMap.has(row.module.id)) {
      moduleMap.set(row.module.id, {
        id: row.module.id,
        title: row.module.title,
        topicId: row.module.topicId,
        position: row.module.position,
        lessons: [],
      });
    }
    if (row.lesson) {
      moduleMap.get(row.module.id)!.lessons.push({
        id: row.lesson.id,
        slug: row.lesson.slug,
        title: row.lesson.title,
        type: row.lesson.type,
        body: row.lesson.body,
        assetId: row.lesson.assetId,
        assetFilename: row.assetFilename ?? null,
        durationSeconds: row.lesson.durationSeconds,
        isFreePreview: row.lesson.isFreePreview,
        position: row.lesson.position,
        status: row.lesson.status,
      });
    }
  }
  return res.json(AdminGetCourseOutlineResponse.parse({
    course: courseDto(course, counts.get(course.id) ?? 0),
    description: course.description,
    modules: [...moduleMap.values()],
  }));
});

router.post("/courses/:courseId/modules", async (req, res) => {
  const params = AdminCreateModuleParams.safeParse(req.params);
  const body = AdminCreateModuleBody.safeParse(req.body);
  if (!params.success || !body.success) return void sendError(res, 400, "validation_error", "Invalid module details.");
  const course = await findCourse(params.data.courseId);
  if (!course) return void sendError(res, 404, "not_found", "Course not found.");
  const [lastPosition] = await db.select({ value: max(modulesTable.position) }).from(modulesTable)
    .where(and(eq(modulesTable.courseId, course.id), isNull(modulesTable.deletedAt)));
  const [module] = await db.insert(modulesTable).values({
    courseId: course.id,
    title: body.data.title.trim(),
    topicId: body.data.topicId ?? null,
    position: body.data.position ?? Number(lastPosition?.value ?? -1) + 1,
  }).returning();
  if (!module) return void sendError(res, 500, "module_create_failed", "The module could not be created.");
  await writeAudit({
    actorId: req.auth!.user.id,
    action: "admin.course_module_created",
    entityType: "module",
    entityId: module.id,
    after: { courseId: course.id, title: module.title },
    ip: req.ip,
  });
  return res.status(201).json(AdminCreateModuleResponse.parse(module));
});

router.patch("/modules/:id", async (req, res) => {
  const params = AdminUpdateModuleParams.safeParse(req.params);
  const body = AdminUpdateModuleBody.safeParse(req.body);
  if (!params.success || !body.success) return void sendError(res, 400, "validation_error", "Invalid module details.");
  const [module] = await db.select().from(modulesTable)
    .where(and(eq(modulesTable.id, params.data.id), isNull(modulesTable.deletedAt))).limit(1);
  if (!module) return void sendError(res, 404, "not_found", "Module not found.");
  const [updated] = await db.update(modulesTable).set({
    title: body.data.title.trim(),
    topicId: body.data.topicId === undefined ? module.topicId : body.data.topicId,
    position: body.data.position ?? module.position,
    updatedAt: new Date(),
  }).where(eq(modulesTable.id, module.id)).returning();
  if (!updated) return void sendError(res, 404, "not_found", "Module not found.");
  await writeAudit({
    actorId: req.auth!.user.id,
    action: "admin.course_module_updated",
    entityType: "module",
    entityId: module.id,
    before: { title: module.title },
    after: { title: updated.title },
    ip: req.ip,
  });
  return res.json(AdminUpdateModuleResponse.parse(updated));
});

router.delete("/modules/:id", async (req, res) => {
  const params = AdminDeleteModuleParams.safeParse(req.params);
  if (!params.success) return void sendError(res, 400, "invalid_request", "Invalid module identifier.");
  const [module] = await db.select().from(modulesTable)
    .where(and(eq(modulesTable.id, params.data.id), isNull(modulesTable.deletedAt))).limit(1);
  if (!module) return void sendError(res, 404, "not_found", "Module not found.");
  await db.update(modulesTable).set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(modulesTable.id, module.id));
  await writeAudit({
    actorId: req.auth!.user.id,
    action: "admin.course_module_deleted",
    entityType: "module",
    entityId: module.id,
    before: { courseId: module.courseId, title: module.title },
    ip: req.ip,
  });
  return res.sendStatus(204);
});

async function activeModule(moduleId: string) {
  const [module] = await db
    .select({ module: modulesTable, course: coursesTable })
    .from(modulesTable)
    .innerJoin(coursesTable, eq(coursesTable.id, modulesTable.courseId))
    .where(
      and(
        eq(modulesTable.id, moduleId),
        isNull(modulesTable.deletedAt),
        isNull(coursesTable.deletedAt),
      ),
    )
    .limit(1);
  return module ?? null;
}

async function validateAsset(assetId: string | null | undefined) {
  if (!assetId) return true;
  const [asset] = await db.select({ id: mediaAssetsTable.id, processing: mediaAssetsTable.processing })
    .from(mediaAssetsTable)
    .where(and(eq(mediaAssetsTable.id, assetId), isNull(mediaAssetsTable.deletedAt)))
    .limit(1);
  return asset?.processing === "ready";
}

async function lessonDto(lessonId: string) {
  const [row] = await db
    .select({ lesson: lessonsTable, assetFilename: mediaAssetsTable.filename })
    .from(lessonsTable)
    .leftJoin(mediaAssetsTable, and(eq(mediaAssetsTable.id, lessonsTable.assetId), isNull(mediaAssetsTable.deletedAt)))
    .where(and(eq(lessonsTable.id, lessonId), isNull(lessonsTable.deletedAt)))
    .limit(1);
  if (!row) return null;
  return {
    id: row.lesson.id,
    slug: row.lesson.slug,
    title: row.lesson.title,
    type: row.lesson.type,
    body: row.lesson.body,
    assetId: row.lesson.assetId,
    assetFilename: row.assetFilename ?? null,
    durationSeconds: row.lesson.durationSeconds,
    isFreePreview: row.lesson.isFreePreview,
    position: row.lesson.position,
    status: row.lesson.status,
  };
}

router.post("/modules/:moduleId/lessons", async (req, res) => {
  const params = AdminCreateLessonParams.safeParse(req.params);
  const body = AdminCreateLessonBody.safeParse(req.body);
  if (!params.success || !body.success) return void sendError(res, 400, "validation_error", "Invalid lesson details.");
  const parent = await activeModule(params.data.moduleId);
  if (!parent) return void sendError(res, 404, "not_found", "Module not found.");
  if (!(await validateAsset(body.data.assetId))) {
    return void sendError(res, 409, "asset_not_ready", "Wait for the media upload to finish before attaching it.");
  }
  const [lastPosition] = await db.select({ value: max(lessonsTable.position) }).from(lessonsTable)
    .where(and(eq(lessonsTable.moduleId, parent.module.id), isNull(lessonsTable.deletedAt)));
  const [lesson] = await db.insert(lessonsTable).values({
    moduleId: parent.module.id,
    slug: body.data.slug.trim(),
    title: body.data.title.trim(),
    type: body.data.type,
    body: body.data.body ?? null,
    assetId: body.data.assetId ?? null,
    durationSeconds: body.data.durationSeconds ?? null,
    isFreePreview: body.data.isFreePreview ?? false,
    position: body.data.position ?? Number(lastPosition?.value ?? -1) + 1,
    status: body.data.status ?? "draft",
  }).returning();
  if (!lesson) return void sendError(res, 500, "lesson_create_failed", "The lesson could not be created.");
  await writeAudit({
    actorId: req.auth!.user.id,
    action: "admin.course_lesson_created",
    entityType: "lesson",
    entityId: lesson.id,
    after: { moduleId: parent.module.id, slug: lesson.slug, title: lesson.title, type: lesson.type },
    ip: req.ip,
  });
  const dto = await lessonDto(lesson.id);
  return res.status(201).json(AdminCreateLessonResponse.parse(dto));
});

router.patch("/lessons/:id", async (req, res) => {
  const params = AdminUpdateLessonParams.safeParse(req.params);
  const body = AdminUpdateLessonBody.safeParse(req.body);
  if (!params.success || !body.success) return void sendError(res, 400, "validation_error", "Invalid lesson details.");
  const [lesson] = await db.select().from(lessonsTable)
    .where(and(eq(lessonsTable.id, params.data.id), isNull(lessonsTable.deletedAt))).limit(1);
  if (!lesson || !(await activeModule(lesson.moduleId))) return void sendError(res, 404, "not_found", "Lesson not found.");
  const assetId = body.data.assetId === undefined ? lesson.assetId : body.data.assetId;
  if (!(await validateAsset(assetId))) {
    return void sendError(res, 409, "asset_not_ready", "Wait for the media upload to finish before attaching it.");
  }
  const [updated] = await db.update(lessonsTable).set({
    slug: body.data.slug.trim(),
    title: body.data.title.trim(),
    type: body.data.type,
    body: body.data.body === undefined ? lesson.body : body.data.body,
    assetId: assetId ?? null,
    durationSeconds: body.data.durationSeconds === undefined ? lesson.durationSeconds : body.data.durationSeconds,
    isFreePreview: body.data.isFreePreview ?? lesson.isFreePreview,
    position: body.data.position ?? lesson.position,
    status: body.data.status ?? lesson.status,
    updatedAt: new Date(),
  }).where(eq(lessonsTable.id, lesson.id)).returning();
  if (!updated) return void sendError(res, 404, "not_found", "Lesson not found.");
  await writeAudit({
    actorId: req.auth!.user.id,
    action: "admin.course_lesson_updated",
    entityType: "lesson",
    entityId: lesson.id,
    before: { slug: lesson.slug, title: lesson.title, status: lesson.status },
    after: { slug: updated.slug, title: updated.title, status: updated.status },
    ip: req.ip,
  });
  const dto = await lessonDto(lesson.id);
  return res.json(AdminUpdateLessonResponse.parse(dto));
});

router.delete("/lessons/:id", async (req, res) => {
  const params = AdminDeleteLessonParams.safeParse(req.params);
  if (!params.success) return void sendError(res, 400, "invalid_request", "Invalid lesson identifier.");
  const [lesson] = await db.select().from(lessonsTable)
    .where(and(eq(lessonsTable.id, params.data.id), isNull(lessonsTable.deletedAt))).limit(1);
  if (!lesson) return void sendError(res, 404, "not_found", "Lesson not found.");
  await db.update(lessonsTable).set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(lessonsTable.id, lesson.id));
  await writeAudit({
    actorId: req.auth!.user.id,
    action: "admin.course_lesson_deleted",
    entityType: "lesson",
    entityId: lesson.id,
    before: { moduleId: lesson.moduleId, slug: lesson.slug, title: lesson.title },
    ip: req.ip,
  });
  return res.sendStatus(204);
});

router.post("/courses/:courseId/reorder", async (req, res) => {
  const params = AdminReorderCourseParams.safeParse(req.params);
  const body = AdminReorderCourseBody.safeParse(req.body);
  if (!params.success || !body.success) return void sendError(res, 400, "validation_error", "Invalid course order.");
  if (body.data.moduleIds === undefined && body.data.lessonOrder === undefined) {
    return void sendError(res, 400, "empty_order", "Provide modules, lessons or both to reorder.");
  }
  const course = await findCourse(params.data.courseId);
  if (!course) return void sendError(res, 404, "not_found", "Course not found.");

  try {
    await db.transaction(async (tx) => {
    if (body.data.moduleIds) {
      const current = await tx.select({ id: modulesTable.id }).from(modulesTable)
        .where(and(eq(modulesTable.courseId, course.id), isNull(modulesTable.deletedAt)));
      const requested = body.data.moduleIds;
      if (new Set(requested).size !== requested.length ||
          current.length !== requested.length ||
          current.some(({ id }) => !requested.includes(id))) {
        throw new OrderValidationError("The module order does not match this course.");
      }
      for (const [position, id] of requested.entries()) {
        await tx.update(modulesTable).set({ position, updatedAt: new Date() }).where(eq(modulesTable.id, id));
      }
    }
    if (body.data.lessonOrder) {
      const moduleIds = Object.keys(body.data.lessonOrder);
      if (moduleIds.length > 0) {
        const modules = await tx.select({ id: modulesTable.id }).from(modulesTable)
          .where(and(
            eq(modulesTable.courseId, course.id),
            isNull(modulesTable.deletedAt),
            inArray(modulesTable.id, moduleIds),
          ));
        if (modules.length !== moduleIds.length) {
          throw new OrderValidationError("A lesson order references a module outside this course.");
        }
      }
      for (const [moduleId, requested] of Object.entries(body.data.lessonOrder)) {
        const current = await tx.select({ id: lessonsTable.id }).from(lessonsTable)
          .where(and(eq(lessonsTable.moduleId, moduleId), isNull(lessonsTable.deletedAt)));
        if (new Set(requested).size !== requested.length ||
            current.length !== requested.length ||
            current.some(({ id }) => !requested.includes(id))) {
          throw new OrderValidationError("A lesson order does not match its module.");
        }
        for (const [position, id] of requested.entries()) {
          await tx.update(lessonsTable).set({ position, updatedAt: new Date() }).where(eq(lessonsTable.id, id));
        }
      }
    }
    });
  } catch (error) {
    if (error instanceof OrderValidationError) {
      return void sendError(res, 400, "invalid_order", error.message);
    }
    throw error;
  }
  await writeAudit({
    actorId: req.auth!.user.id,
    action: "admin.course_reordered",
    entityType: "course",
    entityId: course.id,
    after: { moduleIds: body.data.moduleIds, lessonOrder: body.data.lessonOrder },
    ip: req.ip,
  });
  return res.json(AdminReorderCourseResponse.parse({ ok: true }));
});

export default router;
