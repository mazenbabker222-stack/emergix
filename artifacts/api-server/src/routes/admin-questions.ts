import {
  AdminChangeQuestionStatusBody,
  AdminChangeQuestionStatusParams,
  AdminChangeQuestionStatusResponse,
  AdminCreateQuestionBody,
  AdminCreateQuestionResponse,
  AdminDeleteQuestionParams,
  AdminGetQuestionParams,
  AdminGetQuestionResponse,
  AdminListQuestionsQueryParams,
  AdminListQuestionsResponse,
  AdminListTagsQueryParams,
  AdminListTagsResponse,
  AdminUpdateQuestionBody,
  AdminUpdateQuestionParams,
  AdminUpdateQuestionResponse,
} from "@workspace/api-zod";
import {
  db,
  questionOptionsTable,
  questionTagsTable,
  questionTopicsTable,
  questionVersionsTable,
  questionsTable,
  tagsTable,
} from "@workspace/db";
import { hasPermission, hasRole } from "@workspace/auth-shared";
import {
  and,
  asc,
  desc,
  eq,
  exists,
  ilike,
  inArray,
  isNull,
  lt,
  not,
  or,
} from "drizzle-orm";
import { createHash } from "node:crypto";
import { Router, type IRouter } from "express";
import { sendError } from "../lib/errors";
import { writeAudit } from "../lib/audit";

const router: IRouter = Router();

function contentHash(stem: string, options: { text: string }[]) {
  const canonical = [
    stem.trim().toLocaleLowerCase(),
    ...options.map((option) => option.text.trim().toLocaleLowerCase()).sort(),
  ].join("\n");
  return createHash("sha256").update(canonical).digest("hex");
}

function validateQuestionInput(input: {
  stem: string;
  type?: string;
  options: { text: string; isCorrect: boolean }[];
}) {
  if (input.stem.trim().length < 10) return "Write a complete question stem (at least 10 characters).";
  if (input.options.some((option) => !option.text.trim())) return "Every answer option needs text.";
  const correctCount = input.options.filter((option) => option.isCorrect).length;
  if ((input.type ?? "sba") === "multi_select") {
    if (correctCount < 1) return "Select at least one correct answer.";
  } else if (correctCount !== 1) {
    return "Select exactly one correct answer for this question type.";
  }
  return null;
}

function normalizedOptions(options: {
  text: string;
  isCorrect: boolean;
  rationale?: string;
}[]) {
  return options.map((option, position) => ({
    label: String.fromCharCode(65 + position),
    text: option.text.trim(),
    isCorrect: option.isCorrect,
    rationale: option.rationale?.trim() ?? "",
    position,
  }));
}

async function questionDtos(rows: (typeof questionsTable.$inferSelect)[]) {
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);
  const [options, topics, tags] = await Promise.all([
    db.select().from(questionOptionsTable)
      .where(inArray(questionOptionsTable.questionId, ids))
      .orderBy(asc(questionOptionsTable.position), asc(questionOptionsTable.label)),
    db.select().from(questionTopicsTable).where(inArray(questionTopicsTable.questionId, ids)),
    db.select().from(questionTagsTable).where(inArray(questionTagsTable.questionId, ids)),
  ]);

  return rows.map((question) => ({
    ...question,
    references: question.references ?? [],
    topicIds: topics.filter((row) => row.questionId === question.id).map((row) => row.topicId),
    tagIds: tags.filter((row) => row.questionId === question.id).map((row) => row.tagId),
    options: options.filter((row) => row.questionId === question.id).map((row) => ({
      id: row.id,
      label: row.label,
      text: row.text,
      isCorrect: row.isCorrect,
      rationale: row.rationale,
      position: row.position,
    })),
  }));
}

async function getQuestionDto(id: string) {
  const [question] = await db.select().from(questionsTable)
    .where(and(eq(questionsTable.id, id), isNull(questionsTable.deletedAt)))
    .limit(1);
  if (!question) return null;
  return (await questionDtos([question]))[0] ?? null;
}

async function duplicateQuestion(hash: string, exceptId?: string) {
  const conditions = [eq(questionsTable.contentHash, hash), isNull(questionsTable.deletedAt)];
  if (exceptId) conditions.push(not(eq(questionsTable.id, exceptId)));
  const [duplicate] = await db.select({ id: questionsTable.id }).from(questionsTable)
    .where(and(...conditions))
    .limit(1);
  return duplicate ?? null;
}

router.get("/questions", async (req, res): Promise<void> => {
  const parsed = AdminListQuestionsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    sendError(res, 400, "validation_error", "Invalid question filters.", parsed.error.flatten());
    return;
  }
  const query = parsed.data;
  const conditions = [isNull(questionsTable.deletedAt)];
  if (query.q?.trim()) {
    const pattern = `%${query.q.trim().replace(/[\\%_]/g, "\\$&")}%`;
    conditions.push(or(
      ilike(questionsTable.stem, pattern),
      ilike(questionsTable.leadIn, pattern),
      ilike(questionsTable.explanation, pattern),
    )!);
  }
  if (query.examId) conditions.push(eq(questionsTable.examId, query.examId));
  if (query.status) conditions.push(eq(questionsTable.status, query.status));
  if (query.reviewerId) conditions.push(eq(questionsTable.reviewerId, query.reviewerId));
  if (query.topicId) {
    conditions.push(exists(db.select({ id: questionTopicsTable.questionId })
      .from(questionTopicsTable)
      .where(and(
        eq(questionTopicsTable.questionId, questionsTable.id),
        eq(questionTopicsTable.topicId, query.topicId),
      ))));
  }
  if (query.tagId) {
    conditions.push(exists(db.select({ id: questionTagsTable.questionId })
      .from(questionTagsTable)
      .where(and(
        eq(questionTagsTable.questionId, questionsTable.id),
        eq(questionTagsTable.tagId, query.tagId),
      ))));
  }
  if (query.cursor) {
    const [cursor] = await db.select({
      id: questionsTable.id,
      createdAt: questionsTable.createdAt,
    }).from(questionsTable)
      .where(and(eq(questionsTable.id, query.cursor), isNull(questionsTable.deletedAt)))
      .limit(1);
    if (!cursor) {
      sendError(res, 400, "invalid_cursor", "The question list cursor is no longer available.");
      return;
    }
    conditions.push(or(
      lt(questionsTable.createdAt, cursor.createdAt),
      and(eq(questionsTable.createdAt, cursor.createdAt), lt(questionsTable.id, cursor.id)),
    )!);
  }

  const limit = query.limit ?? 25;
  const rows = await db.select().from(questionsTable)
    .where(and(...conditions))
    .orderBy(desc(questionsTable.createdAt), desc(questionsTable.id))
    .limit(limit + 1);
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  const data = await questionDtos(page);
  res.json(AdminListQuestionsResponse.parse({
    data,
    nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
  }));
});

router.get("/tags", async (req, res): Promise<void> => {
  const parsed = AdminListTagsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    sendError(res, 400, "validation_error", "Invalid tag filters.", parsed.error.flatten());
    return;
  }
  const query = parsed.data;
  const conditions = [isNull(tagsTable.deletedAt)];
  if (query.q?.trim()) {
    const pattern = `%${query.q.trim().replace(/[\\%_]/g, "\\$&")}%`;
    conditions.push(or(ilike(tagsTable.name, pattern), ilike(tagsTable.slug, pattern))!);
  }
  if (query.cursor) {
    const [cursor] = await db.select({ id: tagsTable.id, createdAt: tagsTable.createdAt })
      .from(tagsTable)
      .where(and(eq(tagsTable.id, query.cursor), isNull(tagsTable.deletedAt)))
      .limit(1);
    if (!cursor) {
      sendError(res, 400, "invalid_cursor", "The tag list cursor is no longer available.");
      return;
    }
    conditions.push(or(
      lt(tagsTable.createdAt, cursor.createdAt),
      and(eq(tagsTable.createdAt, cursor.createdAt), lt(tagsTable.id, cursor.id)),
    )!);
  }
  const limit = query.limit ?? 100;
  const rows = await db.select().from(tagsTable)
    .where(and(...conditions))
    .orderBy(asc(tagsTable.name), asc(tagsTable.id))
    .limit(limit + 1);
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  res.json(AdminListTagsResponse.parse({
    data: page,
    nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
  }));
});

router.post("/questions", async (req, res): Promise<void> => {
  const parsed = AdminCreateQuestionBody.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, "validation_error", "Invalid question content.", parsed.error.flatten());
    return;
  }
  const input = parsed.data;
  const validationMessage = validateQuestionInput(input);
  if (validationMessage) {
    sendError(res, 400, "validation_error", validationMessage);
    return;
  }
  const hash = contentHash(input.stem, input.options);
  if (await duplicateQuestion(hash)) {
    sendError(res, 409, "duplicate_question", "A question with this stem and answer set already exists.");
    return;
  }
  const options = normalizedOptions(input.options);
  const actorId = req.auth!.user.id;
  const created = await db.transaction(async (tx) => {
    const [question] = await tx.insert(questionsTable).values({
      examId: input.examId,
      type: input.type ?? "sba",
      stem: input.stem.trim(),
      leadIn: input.leadIn?.trim() || null,
      explanation: input.explanation?.trim() ?? "",
      keyPoint: input.keyPoint?.trim() || null,
      references: input.references ?? [],
      difficultyId: input.difficultyId ?? null,
      year: input.year ?? null,
      sourceLabel: input.sourceLabel?.trim() || null,
      status: "draft",
      authorId: actorId,
      isSample: input.isSample ?? false,
      contentHash: hash,
    }).returning();
    if (options.length) {
      await tx.insert(questionOptionsTable).values(options.map((option) => ({ ...option, questionId: question.id })));
    }
    if (input.topicIds?.length) {
      await tx.insert(questionTopicsTable).values(input.topicIds.map((topicId) => ({ questionId: question.id, topicId })));
    }
    if (input.tagIds?.length) {
      await tx.insert(questionTagsTable).values(input.tagIds.map((tagId) => ({ questionId: question.id, tagId })));
    }
    await tx.insert(questionVersionsTable).values({
      questionId: question.id,
      version: question.version,
      snapshot: { ...question, options, topicIds: input.topicIds ?? [], tagIds: input.tagIds ?? [] },
      changeNote: input.changeNote?.trim() || "Initial draft",
      changedBy: actorId,
    });
    return question;
  });
  const result = await getQuestionDto(created.id);
  if (!result) {
    sendError(res, 500, "question_create_failed", "The question was saved but could not be loaded.");
    return;
  }
  await writeAudit({
    actorId,
    action: "question.created",
    entityType: "question",
    entityId: created.id,
    after: { status: created.status, version: created.version, examId: created.examId },
    ip: req.ip,
  });
  res.status(201).json(AdminCreateQuestionResponse.parse(result));
});

router.get("/questions/:id", async (req, res): Promise<void> => {
  const params = AdminGetQuestionParams.safeParse(req.params);
  if (!params.success) {
    sendError(res, 400, "validation_error", "Invalid question identifier.");
    return;
  }
  const result = await getQuestionDto(params.data.id);
  if (!result) {
    sendError(res, 404, "not_found", "Question not found.");
    return;
  }
  res.json(AdminGetQuestionResponse.parse(result));
});

router.patch("/questions/:id", async (req, res): Promise<void> => {
  const params = AdminUpdateQuestionParams.safeParse(req.params);
  const parsed = AdminUpdateQuestionBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    sendError(res, 400, "validation_error", "Invalid question details.", parsed.success ? undefined : parsed.error.flatten());
    return;
  }
  const { id } = params.data;
  const input = parsed.data;
  const validationMessage = validateQuestionInput(input);
  if (validationMessage) {
    sendError(res, 400, "validation_error", validationMessage);
    return;
  }
  const before = await getQuestionDto(id);
  if (!before) {
    sendError(res, 404, "not_found", "Question not found.");
    return;
  }
  const hash = contentHash(input.stem, input.options);
  if (await duplicateQuestion(hash, id)) {
    sendError(res, 409, "duplicate_question", "A question with this stem and answer set already exists.");
    return;
  }
  const actorId = req.auth!.user.id;
  const options = normalizedOptions(input.options);
  await db.transaction(async (tx) => {
    const nextVersion = before.version + 1;
    await tx.update(questionsTable).set({
      examId: input.examId,
      type: input.type ?? "sba",
      stem: input.stem.trim(),
      leadIn: input.leadIn?.trim() || null,
      explanation: input.explanation?.trim() ?? "",
      keyPoint: input.keyPoint?.trim() || null,
      references: input.references ?? [],
      difficultyId: input.difficultyId ?? null,
      year: input.year ?? null,
      sourceLabel: input.sourceLabel?.trim() || null,
      isSample: input.isSample ?? false,
      contentHash: hash,
      version: nextVersion,
      status: "draft",
      reviewerId: null,
      lastReviewedAt: null,
      updatedAt: new Date(),
    }).where(eq(questionsTable.id, id));
    await tx.delete(questionOptionsTable).where(eq(questionOptionsTable.questionId, id));
    await tx.delete(questionTopicsTable).where(eq(questionTopicsTable.questionId, id));
    await tx.delete(questionTagsTable).where(eq(questionTagsTable.questionId, id));
    if (options.length) {
      await tx.insert(questionOptionsTable).values(options.map((option) => ({ ...option, questionId: id })));
    }
    if (input.topicIds?.length) {
      await tx.insert(questionTopicsTable).values(input.topicIds.map((topicId) => ({ questionId: id, topicId })));
    }
    if (input.tagIds?.length) {
      await tx.insert(questionTagsTable).values(input.tagIds.map((tagId) => ({ questionId: id, tagId })));
    }
    await tx.insert(questionVersionsTable).values({
      questionId: id,
      version: nextVersion,
      snapshot: {
        ...input,
        type: input.type ?? "sba",
        options,
        status: "draft",
      },
      changeNote: input.changeNote?.trim() || "Updated question content",
      changedBy: actorId,
    });
  });
  const result = await getQuestionDto(id);
  if (!result) {
    sendError(res, 500, "question_update_failed", "The question was saved but could not be loaded.");
    return;
  }
  await writeAudit({
    actorId,
    action: "question.updated",
    entityType: "question",
    entityId: id,
    before: { status: before.status, version: before.version },
    after: { status: result.status, version: result.version },
    ip: req.ip,
  });
  res.json(AdminUpdateQuestionResponse.parse(result));
});

router.delete("/questions/:id", async (req, res): Promise<void> => {
  const params = AdminDeleteQuestionParams.safeParse(req.params);
  if (!params.success) {
    sendError(res, 400, "validation_error", "Invalid question identifier.");
    return;
  }
  const before = await getQuestionDto(params.data.id);
  if (!before) {
    sendError(res, 404, "not_found", "Question not found.");
    return;
  }
  const now = new Date();
  await db.update(questionsTable).set({ deletedAt: now, updatedAt: now })
    .where(and(eq(questionsTable.id, params.data.id), isNull(questionsTable.deletedAt)));
  await writeAudit({
    actorId: req.auth!.user.id,
    action: "question.deleted",
    entityType: "question",
    entityId: params.data.id,
    before: { status: before.status, version: before.version },
    after: { deleted: true },
    ip: req.ip,
  });
  res.status(204).end();
});

router.post("/questions/:id/status", async (req, res): Promise<void> => {
  const params = AdminChangeQuestionStatusParams.safeParse(req.params);
  const parsed = AdminChangeQuestionStatusBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    sendError(res, 400, "validation_error", "Invalid question status change.", parsed.success ? undefined : parsed.error.flatten());
    return;
  }
  const before = await getQuestionDto(params.data.id);
  if (!before) {
    sendError(res, 404, "not_found", "Question not found.");
    return;
  }
  const target = parsed.data.status;
  const actor = req.auth!.user;
  const allowed = target === "review"
    ? before.status === "draft"
    : target === "approved"
      ? before.status === "review"
      : target === "published"
        ? before.status === "approved"
        : target === "archived"
          ? before.status !== "archived"
          : target === "draft" && before.status === "archived";
  if (!allowed) {
    sendError(res, 409, "invalid_status_transition", `Cannot move a ${before.status} question to ${target}.`);
    return;
  }
  if (target === "approved" && (!hasPermission(actor.role, "content:publish") || actor.id === before.authorId)) {
    sendError(res, 403, "reviewer_required", "A different editor must review and approve this question.");
    return;
  }
  if (target === "published" && (
    !hasRole(actor.role, ["admin", "superadmin"])
    || !before.reviewerId
    || before.reviewerId === before.authorId
  )) {
    sendError(res, 403, "publisher_required", "Publishing requires an admin and approval from a reviewer other than the author.");
    return;
  }
  const [updated] = await db.update(questionsTable).set({
    status: target,
    ...(target === "approved" ? { reviewerId: actor.id, lastReviewedAt: new Date() } : {}),
    updatedAt: new Date(),
  }).where(and(eq(questionsTable.id, params.data.id), isNull(questionsTable.deletedAt)))
    .returning({ id: questionsTable.id });
  if (!updated) {
    sendError(res, 404, "not_found", "Question not found.");
    return;
  }
  const result = await getQuestionDto(updated.id);
  if (!result) {
    sendError(res, 500, "question_status_failed", "The question status changed but could not be loaded.");
    return;
  }
  await writeAudit({
    actorId: actor.id,
    action: "question.status_changed",
    entityType: "question",
    entityId: updated.id,
    before: { status: before.status },
    after: { status: target, note: parsed.data.note },
    ip: req.ip,
  });
  res.json(AdminChangeQuestionStatusResponse.parse(result));
});

export default router;
