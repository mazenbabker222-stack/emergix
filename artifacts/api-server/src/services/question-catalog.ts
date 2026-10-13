import { and, asc, desc, eq, inArray, isNull, lt, or, type SQL } from "drizzle-orm";
import {
  db,
  difficultyLevelsTable,
  questionFlagsTable,
  questionNotesTable,
  questionOptionsTable,
  questionReportsTable,
  questionTopicsTable,
  questionsTable,
  topicsTable,
} from "@workspace/db";
import { notFound } from "../lib/http-error";

export async function listTopics(examId?: string) {
  const conditions: SQL[] = [isNull(topicsTable.deletedAt)];
  if (examId) conditions.push(or(eq(topicsTable.examId, examId), isNull(topicsTable.examId))!);
  const rows = await db.select({
    id: topicsTable.id,
    parentId: topicsTable.parentId,
    examId: topicsTable.examId,
    slug: topicsTable.slug,
    name: topicsTable.name,
    description: topicsTable.description,
    syllabusRef: topicsTable.syllabusRef,
    position: topicsTable.position,
  }).from(topicsTable)
    .where(and(...conditions))
    .orderBy(asc(topicsTable.position), asc(topicsTable.name));
  return rows;
}

export async function listDifficultyLevels() {
  return db.select({
    id: difficultyLevelsTable.id,
    slug: difficultyLevelsTable.slug,
    name: difficultyLevelsTable.name,
    rank: difficultyLevelsTable.rank,
  }).from(difficultyLevelsTable).orderBy(asc(difficultyLevelsTable.rank));
}

export async function listDemoQuestions() {
  const questions = await db.select({
    id: questionsTable.id,
    examId: questionsTable.examId,
    type: questionsTable.type,
    stem: questionsTable.stem,
    leadIn: questionsTable.leadIn,
    mediaAssetId: questionsTable.mediaAssetId,
    difficultyId: questionsTable.difficultyId,
    isSample: questionsTable.isSample,
  }).from(questionsTable)
    .where(and(
      eq(questionsTable.isSample, true),
      eq(questionsTable.status, "published"),
      isNull(questionsTable.deletedAt),
    ))
    .orderBy(asc(questionsTable.createdAt))
    .limit(5);
  const ids = questions.map((question) => question.id);
  if (!ids.length) return [];

  const [options, topics] = await Promise.all([
    db.select({
      id: questionOptionsTable.id,
      questionId: questionOptionsTable.questionId,
      label: questionOptionsTable.label,
      text: questionOptionsTable.text,
      position: questionOptionsTable.position,
    }).from(questionOptionsTable)
      .where(inArray(questionOptionsTable.questionId, ids))
      .orderBy(asc(questionOptionsTable.position)),
    db.select({
      questionId: questionTopicsTable.questionId,
      topicId: questionTopicsTable.topicId,
    }).from(questionTopicsTable).where(inArray(questionTopicsTable.questionId, ids)),
  ]);

  return questions.map((question) => ({
    id: question.id,
    examId: question.examId,
    type: question.type,
    stem: question.stem,
    leadIn: question.leadIn,
    mediaUrl: null,
    difficultyId: question.difficultyId,
    topicIds: topics.filter((topic) => topic.questionId === question.id).map((topic) => topic.topicId),
    options: options.filter((option) => option.questionId === question.id)
      .map(({ id, label, text }) => ({ id, label, text })),
    isSample: question.isSample,
  }));
}

export async function setQuestionFlag(userId: string, questionId: string, flagged: boolean) {
  const [question] = await db.select({ id: questionsTable.id }).from(questionsTable)
    .where(and(
      eq(questionsTable.id, questionId),
      eq(questionsTable.status, "published"),
      isNull(questionsTable.deletedAt),
    ))
    .limit(1);
  if (!question) throw notFound("Question not found");
  if (flagged) {
    await db.insert(questionFlagsTable).values({ userId, questionId }).onConflictDoNothing();
  } else {
    await db.delete(questionFlagsTable)
      .where(and(eq(questionFlagsTable.userId, userId), eq(questionFlagsTable.questionId, questionId)));
  }
  return { flagged };
}

export async function setQuestionNote(userId: string, questionId: string, body: string) {
  const [question] = await db.select({ id: questionsTable.id }).from(questionsTable)
    .where(and(
      eq(questionsTable.id, questionId),
      eq(questionsTable.status, "published"),
      isNull(questionsTable.deletedAt),
    ))
    .limit(1);
  if (!question) throw notFound("Question not found");
  const now = new Date();
  const [note] = await db.insert(questionNotesTable).values({ userId, questionId, body })
    .onConflictDoUpdate({
      target: [questionNotesTable.userId, questionNotesTable.questionId],
      set: { body, updatedAt: now },
    })
    .returning();
  return {
    id: note.id,
    questionId: note.questionId,
    lessonId: null,
    atSeconds: null,
    body: note.body,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}

export async function reportQuestion(userId: string, questionId: string, body: { category: string; message: string }) {
  const [question] = await db.select({ id: questionsTable.id }).from(questionsTable)
    .where(and(
      eq(questionsTable.id, questionId),
      eq(questionsTable.status, "published"),
      isNull(questionsTable.deletedAt),
    ))
    .limit(1);
  if (!question) throw notFound("Question not found");
  const [report] = await db.insert(questionReportsTable).values({
    questionId,
    userId,
    category: body.category,
    message: body.message,
  }).returning();
  return { id: report.id };
}

export async function listMyQuestionNotes(userId: string, input: { cursor?: string; limit: number }) {
  const conditions: SQL[] = [eq(questionNotesTable.userId, userId)];
  if (input.cursor) {
    const [cursorNote] = await db.select({
      id: questionNotesTable.id,
      createdAt: questionNotesTable.createdAt,
    }).from(questionNotesTable)
      .where(and(eq(questionNotesTable.id, input.cursor), eq(questionNotesTable.userId, userId)))
      .limit(1);
    if (!cursorNote) throw notFound("Notes cursor not found");
    conditions.push(or(
      lt(questionNotesTable.createdAt, cursorNote.createdAt),
      and(
        eq(questionNotesTable.createdAt, cursorNote.createdAt),
        lt(questionNotesTable.id, cursorNote.id),
      ),
    )!);
  }
  const rows = await db.select().from(questionNotesTable)
    .where(and(...conditions))
    .orderBy(desc(questionNotesTable.createdAt), desc(questionNotesTable.id))
    .limit(input.limit + 1);
  const hasMore = rows.length > input.limit;
  const page = rows.slice(0, input.limit);
  return {
    data: page.map((note) => ({
      id: note.id,
      questionId: note.questionId,
      lessonId: null,
      atSeconds: null,
      body: note.body,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    })),
    nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
  };
}
