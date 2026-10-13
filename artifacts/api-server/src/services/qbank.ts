import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNull,
  lt,
  notInArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import {
  db,
  examsTable,
  questionFlagsTable,
  questionOptionsTable,
  questionTopicsTable,
  questionsTable,
  quizAnswersTable,
  quizSessionQuestionsTable,
  quizSessionsTable,
  topicsTable,
} from "@workspace/db";
import type { generatedTypes } from "@workspace/api-zod";
import { conflict, notFound } from "../lib/http-error";
import { calculateScore, getQuizTiming, shouldRevealFeedback, type QuizConfig } from "../lib/qbank-rules";

type CreateQuizRequest = generatedTypes.CreateQuizRequest;
type SubmitAnswerRequest = generatedTypes.SubmitAnswerRequest;
type QuizSessionDto = generatedTypes.QuizSession;
type QuizDetailDto = generatedTypes.QuizDetail;
type QuizItemDto = generatedTypes.QuizItem;
type QuizFeedbackDto = generatedTypes.QuestionFeedback;

const sessionStatuses = ["in_progress", "completed", "expired", "abandoned"] as const;
type SessionStatus = (typeof sessionStatuses)[number];

function sessionDto(session: typeof quizSessionsTable.$inferSelect, now = new Date()): QuizSessionDto {
  const config = session.config as QuizConfig;
  const timing = getQuizTiming(session.startedAt, session.deadlineAt, config, now);
  return {
    id: session.id,
    examId: session.examId,
    mode: session.mode,
    status: session.status,
    questionCount: session.questionCount,
    currentSection: timing.currentSection,
    startedAt: session.startedAt,
    deadlineAt: timing.deadlineAt,
    serverTime: now,
    finishedAt: session.finishedAt,
  };
}

function makeQuestionFeedback(
  options: Array<{ id: string; isCorrect: boolean; rationale: string }>,
  explanation: string,
  keyPoint: string | null,
  references: Array<{ title: string; url?: string }>,
): QuizFeedbackDto {
  return {
    correctOptionIds: options.filter((option) => option.isCorrect).map((option) => option.id),
    options: options.map((option) => ({
      optionId: option.id,
      isCorrect: option.isCorrect,
      rationale: option.rationale,
    })),
    explanation,
    keyPoint,
    references,
  };
}

async function loadQuizItems(
  session: typeof quizSessionsTable.$inferSelect,
  userId: string,
  now = new Date(),
): Promise<QuizItemDto[]> {
  const timing = getQuizTiming(session.startedAt, session.deadlineAt, session.config as QuizConfig, now);
  const reveal = shouldRevealFeedback(session.mode, session.status);
  const rows = await db
    .select({
      sessionQuestionId: quizSessionQuestionsTable.id,
      position: quizSessionQuestionsTable.position,
      section: quizSessionQuestionsTable.section,
      questionId: questionsTable.id,
      examId: questionsTable.examId,
      type: questionsTable.type,
      stem: questionsTable.stem,
      leadIn: questionsTable.leadIn,
      difficultyId: questionsTable.difficultyId,
      isSample: questionsTable.isSample,
      explanation: questionsTable.explanation,
      keyPoint: questionsTable.keyPoint,
      references: questionsTable.references,
      optionId: questionOptionsTable.id,
      optionLabel: questionOptionsTable.label,
      optionText: questionOptionsTable.text,
      optionCorrect: questionOptionsTable.isCorrect,
      optionRationale: questionOptionsTable.rationale,
      topicId: questionTopicsTable.topicId,
      selectedOptionId: quizAnswersTable.selectedOptionId,
      answerIsCorrect: quizAnswersTable.isCorrect,
      timeSpentMs: quizAnswersTable.timeSpentMs,
      struckOptionIds: quizAnswersTable.struckOptionIds,
      answeredAt: quizAnswersTable.answeredAt,
      flaggedId: questionFlagsTable.id,
    })
    .from(quizSessionQuestionsTable)
    .innerJoin(questionsTable, eq(questionsTable.id, quizSessionQuestionsTable.questionId))
    .leftJoin(questionOptionsTable, eq(questionOptionsTable.questionId, questionsTable.id))
    .leftJoin(questionTopicsTable, eq(questionTopicsTable.questionId, questionsTable.id))
    .leftJoin(
      quizAnswersTable,
      and(
        eq(quizAnswersTable.sessionQuestionId, quizSessionQuestionsTable.id),
        eq(quizAnswersTable.userId, userId),
      ),
    )
    .leftJoin(
      questionFlagsTable,
      and(
        eq(questionFlagsTable.questionId, questionsTable.id),
        eq(questionFlagsTable.userId, userId),
      ),
    )
    .where(eq(quizSessionQuestionsTable.sessionId, session.id))
    .orderBy(asc(quizSessionQuestionsTable.position), asc(questionOptionsTable.position));

  const grouped = new Map<string, {
    sessionQuestionId: string;
    position: number;
    section: number;
    question: {
      id: string;
      examId: string;
      type: "sba" | "image" | "emq" | "multi_select";
      stem: string;
      leadIn: string | null;
      mediaUrl: null;
      difficultyId: string | null;
      topicIds: Set<string>;
      options: Array<{ id: string; label: string; text: string; isCorrect: boolean; rationale: string }>;
      isSample: boolean;
      explanation: string;
      keyPoint: string | null;
      references: Array<{ title: string; url?: string }>;
    };
    answer: {
      selectedOptionId: string | null;
      isCorrect: boolean | null;
      timeSpentMs: number;
      struckOptionIds: string[];
    } | null;
    flagged: boolean;
    hadAnswer: boolean;
  }>();

  for (const row of rows) {
    let item = grouped.get(row.sessionQuestionId);
    if (!item) {
      item = {
        sessionQuestionId: row.sessionQuestionId,
        position: row.position,
        section: row.section,
        question: {
          id: row.questionId,
          examId: row.examId,
          type: row.type,
          stem: row.stem,
          leadIn: row.leadIn,
          mediaUrl: null,
          difficultyId: row.difficultyId,
          topicIds: new Set(),
          options: [],
          isSample: row.isSample,
          explanation: row.explanation,
          keyPoint: row.keyPoint,
          references: row.references,
        },
        answer: row.answeredAt
          ? {
              selectedOptionId: row.selectedOptionId,
              isCorrect: row.answerIsCorrect,
              timeSpentMs: row.timeSpentMs ?? 0,
              struckOptionIds: row.struckOptionIds ?? [],
            }
          : null,
        flagged: Boolean(row.flaggedId),
        hadAnswer: Boolean(row.answeredAt),
      };
      grouped.set(row.sessionQuestionId, item);
    }
    if (!item) continue;
    if (row.topicId) item.question.topicIds.add(row.topicId);
    if (row.optionId && !item.question.options.some((option) => option.id === row.optionId)) {
      item.question.options.push({
        id: row.optionId,
        label: row.optionLabel!,
        text: row.optionText!,
        isCorrect: row.optionCorrect!,
        rationale: row.optionRationale!,
      });
    }
  }

  return [...grouped.values()]
    .filter((item) => session.status !== "in_progress" || item.section <= timing.currentSection)
    .sort((a, b) => a.position - b.position)
    .map((item) => {
      const { options, explanation, keyPoint, references, topicIds, ...question } = item.question;
      const canShowFeedback = reveal && (item.hadAnswer || session.status !== "in_progress");
      const answer = item.answer
        ? {
            selectedOptionId: item.answer.selectedOptionId,
            timeSpentMs: item.answer.timeSpentMs,
            struckOptionIds: item.answer.struckOptionIds,
            isCorrect: reveal ? item.answer.isCorrect : null,
          }
        : undefined;
      return {
        sessionQuestionId: item.sessionQuestionId,
        position: item.position,
        section: item.section,
        question: {
          ...question,
          topicIds: [...topicIds],
          options: options.map(({ id, label, text }) => ({ id, label, text })),
          isSample: item.question.isSample,
        },
        ...(answer ? { answer } : {}),
        flagged: item.flagged,
        ...(canShowFeedback
          ? { feedback: makeQuestionFeedback(options, explanation, keyPoint, references) }
          : {}),
      };
    });
}

async function detailDto(
  session: typeof quizSessionsTable.$inferSelect,
  userId: string,
  now = new Date(),
): Promise<QuizDetailDto> {
  const currentSection = sessionDto(session, now).currentSection;
  if (session.currentSection !== currentSection || session.deadlineAt) {
    const timing = getQuizTiming(session.startedAt, session.deadlineAt, session.config as QuizConfig, now);
    await db.update(quizSessionsTable)
      .set({ currentSection, ...(timing.deadlineAt ? { deadlineAt: timing.deadlineAt } : {}) })
      .where(eq(quizSessionsTable.id, session.id));
  }
  return { session: sessionDto(session, now), items: await loadQuizItems(session, userId, now) };
}

async function getOwnedSession(sessionId: string, userId: string) {
  const [session] = await db.select().from(quizSessionsTable)
    .where(and(eq(quizSessionsTable.id, sessionId), eq(quizSessionsTable.userId, userId)))
    .limit(1);
  if (!session) throw notFound("Quiz session not found");
  return session;
}

function makeCandidateConditions(
  request: CreateQuizRequest,
  userId: string,
  explicitIds?: string[],
): SQL[] {
  const conditions: SQL[] = [
    eq(questionsTable.examId, request.examId),
    eq(questionsTable.status, "published"),
    isNull(questionsTable.deletedAt),
  ];
  if (explicitIds) {
    conditions.push(inArray(questionsTable.id, explicitIds));
    return conditions;
  }
  if (request.topicIds?.length) {
    conditions.push(inArray(
      questionsTable.id,
      db.select({ questionId: questionTopicsTable.questionId })
        .from(questionTopicsTable)
        .where(inArray(questionTopicsTable.topicId, request.topicIds)),
    ));
  }
  if (request.difficultyIds?.length) {
    conditions.push(inArray(questionsTable.difficultyId, request.difficultyIds));
  }
  if (request.filter === "unseen") {
    const previouslyIncluded = db.select({ questionId: quizSessionQuestionsTable.questionId })
      .from(quizSessionQuestionsTable)
      .innerJoin(quizSessionsTable, eq(quizSessionsTable.id, quizSessionQuestionsTable.sessionId))
      .where(eq(quizSessionsTable.userId, userId));
    conditions.push(notInArray(questionsTable.id, previouslyIncluded));
  } else if (request.filter === "incorrect") {
    const previouslyMissed = db.select({ questionId: quizAnswersTable.questionId })
      .from(quizAnswersTable)
      .where(and(eq(quizAnswersTable.userId, userId), eq(quizAnswersTable.isCorrect, false)));
    conditions.push(inArray(questionsTable.id, previouslyMissed));
  } else if (request.filter === "flagged") {
    const flagged = db.select({ questionId: questionFlagsTable.questionId })
      .from(questionFlagsTable)
      .where(eq(questionFlagsTable.userId, userId));
    conditions.push(inArray(questionsTable.id, flagged));
  }
  return conditions;
}

async function insertQuizSession(
  userId: string,
  examId: string | null,
  mode: "tutor" | "timed" | "custom" | "review",
  questionIds: string[],
  config: Record<string, unknown>,
  sectionSize: number,
): Promise<QuizDetailDto> {
  const now = new Date();
  const timeLimitMinutes = typeof config.timeLimitMinutes === "number" ? config.timeLimitMinutes : null;
  const sectionDurationMinutes = typeof config.sectionDurationMinutes === "number"
    ? config.sectionDurationMinutes
    : null;
  const deadlineMinutes = sectionDurationMinutes ?? timeLimitMinutes;
  const deadlineAt = (mode === "timed" || mode === "custom") && deadlineMinutes
    ? new Date(now.getTime() + deadlineMinutes * 60_000)
    : null;
  const [session] = await db.transaction(async (tx) => {
    const [created] = await tx.insert(quizSessionsTable).values({
      userId,
      examId,
      mode,
      config,
      questionCount: questionIds.length,
      currentSection: 0,
      startedAt: now,
      deadlineAt,
    }).returning();
    await tx.insert(quizSessionQuestionsTable).values(questionIds.map((questionId, index) => ({
      sessionId: created.id,
      questionId,
      position: index + 1,
      section: sectionSize > 0 && index >= sectionSize ? 1 : 0,
    })));
    return [created];
  });
  return detailDto(session, userId, now);
}

export async function createQuiz(userId: string, request: CreateQuizRequest): Promise<QuizDetailDto> {
  const [exam] = await db.select({ id: examsTable.id, slug: examsTable.slug })
    .from(examsTable)
    .where(and(eq(examsTable.id, request.examId), isNull(examsTable.deletedAt)))
    .limit(1);
  if (!exam) throw notFound("Exam not found");

  const preset = request.preset ?? "custom";
  const sbaPreset = preset === "mrcem_sba_2x90";
  const fixedPresetCount = preset === "mrcem_primary_180" || sbaPreset ? 180 : null;
  const wantedCount = fixedPresetCount ?? request.questionCount ?? 20;
  const sectionSize = sbaPreset ? 90 : 0;
  const sectionDurationMinutes = sbaPreset ? 120 : null;
  const timeLimitMinutes = preset === "mrcem_primary_180"
    ? 180
    : request.timeLimitMinutes ?? (request.mode === "timed" ? wantedCount : null);
  const candidateRows = await db.select({ id: questionsTable.id })
    .from(questionsTable)
    .where(and(...makeCandidateConditions(request, userId)))
    .orderBy(sql`random()`)
    .limit(wantedCount);

  if (candidateRows.length < wantedCount) {
    throw conflict(
      `This session needs ${wantedCount} questions, but only ${candidateRows.length} eligible published questions are currently available. Choose a smaller custom session or add reviewed questions to this exam.`,
      "insufficient_question_bank",
    );
  }

  return insertQuizSession(
    userId,
    request.examId,
    request.mode,
    candidateRows.map((row) => row.id),
    {
      preset,
      filter: request.filter ?? "all",
      topicIds: request.topicIds ?? [],
      difficultyIds: request.difficultyIds ?? [],
      timeLimitMinutes,
      ...(sectionSize ? { sectionSize, sectionDurationMinutes, breakMinutes: 60 } : {}),
    },
    sectionSize,
  );
}

export async function listQuizzes(userId: string, input: { limit?: number; cursor?: string; status?: SessionStatus }) {
  const limit = input.limit ?? 25;
  const conditions: SQL[] = [eq(quizSessionsTable.userId, userId)];
  if (input.status) conditions.push(eq(quizSessionsTable.status, input.status));
  if (input.cursor) {
    const [cursorSession] = await db.select({
      id: quizSessionsTable.id,
      createdAt: quizSessionsTable.createdAt,
    }).from(quizSessionsTable)
      .where(and(eq(quizSessionsTable.id, input.cursor), eq(quizSessionsTable.userId, userId)))
      .limit(1);
    if (!cursorSession) throw notFound("Quiz cursor not found");
    conditions.push(or(
      lt(quizSessionsTable.createdAt, cursorSession.createdAt),
      and(
        eq(quizSessionsTable.createdAt, cursorSession.createdAt),
        lt(quizSessionsTable.id, cursorSession.id),
      ),
    )!);
  }
  const sessions = await db.select().from(quizSessionsTable)
    .where(and(...conditions))
    .orderBy(desc(quizSessionsTable.createdAt), desc(quizSessionsTable.id))
    .limit(limit + 1);
  const hasMore = sessions.length > limit;
  const page = sessions.slice(0, limit);
  const now = new Date();
  return {
    data: page.map((session) => sessionDto(session, now)),
    nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
  };
}

export async function getQuiz(sessionId: string, userId: string): Promise<QuizDetailDto> {
  const session = await getOwnedSession(sessionId, userId);
  return detailDto(session, userId);
}

export async function submitQuizAnswer(
  sessionId: string,
  questionId: string,
  userId: string,
  request: SubmitAnswerRequest,
) {
  const session = await getOwnedSession(sessionId, userId);
  if (session.status !== "in_progress") throw conflict("This quiz is no longer accepting answers", "quiz_closed");
  const now = new Date();
  const timing = getQuizTiming(session.startedAt, session.deadlineAt, session.config as QuizConfig, now);
  const hasServerDeadline = session.deadlineAt !== null;
  if (hasServerDeadline && !timing.canAnswer) {
    throw conflict(
      timing.isOnBreak ? "The next exam section is locked until the break ends" : "The exam time has ended",
      timing.isOnBreak ? "section_locked" : "session_expired",
    );
  }
  const [item] = await db.select().from(quizSessionQuestionsTable)
    .where(and(
      eq(quizSessionQuestionsTable.questionId, questionId),
      eq(quizSessionQuestionsTable.sessionId, sessionId),
    ))
    .limit(1);
  if (!item) throw notFound("Question is not part of this quiz");
  const quizConfig = session.config as QuizConfig;
  if (session.mode === "timed" && (quizConfig.sectionSize ?? 0) > 0 && item.section !== timing.currentSection) {
    throw conflict("This question belongs to a locked exam section", "section_locked");
  }

  const selectedOptions = await db.select({
    id: questionOptionsTable.id,
    isCorrect: questionOptionsTable.isCorrect,
  }).from(questionOptionsTable)
    .where(and(
      eq(questionOptionsTable.questionId, item.questionId),
      eq(questionOptionsTable.id, request.selectedOptionId),
    ))
    .limit(1);
  const selected = selectedOptions[0];
  if (!selected) throw notFound("Answer option not found for this question");

  const struckOptionIds = request.struckOptionIds ?? [];
  if (struckOptionIds.length) {
    const struck = await db.select({ id: questionOptionsTable.id })
      .from(questionOptionsTable)
      .where(and(
        eq(questionOptionsTable.questionId, item.questionId),
        inArray(questionOptionsTable.id, struckOptionIds),
      ));
    if (struck.length !== struckOptionIds.length) {
      throw notFound("One or more struck options do not belong to this question");
    }
  }

  const elapsedMs = Math.max(0, now.getTime() - session.startedAt.getTime());
  const boundedTimeSpentMs = Math.min(request.timeSpentMs, elapsedMs);
  const sessionQuestionId = item.id;
  await db.insert(quizAnswersTable).values({
    sessionQuestionId,
    userId,
    questionId: item.questionId,
    selectedOptionId: request.selectedOptionId,
    isCorrect: selected.isCorrect,
    timeSpentMs: boundedTimeSpentMs,
    struckOptionIds,
    answeredAt: now,
  }).onConflictDoUpdate({
    target: quizAnswersTable.sessionQuestionId,
    set: {
      selectedOptionId: request.selectedOptionId,
      isCorrect: selected.isCorrect,
      timeSpentMs: boundedTimeSpentMs,
      struckOptionIds: request.struckOptionIds,
      answeredAt: now,
      updatedAt: now,
    },
  });

  if (session.mode !== "tutor" && session.mode !== "review") return { saved: true };
  const detail = await getQuiz(sessionId, userId);
  const savedItem = detail.items.find((quizItem) => quizItem.sessionQuestionId === sessionQuestionId);
  return {
    saved: true,
    isCorrect: selected.isCorrect,
    ...(savedItem?.feedback ? { feedback: savedItem.feedback } : {}),
  };
}

async function getSessionAnswers(sessionId: string, userId: string) {
  return db.select({
    isCorrect: quizAnswersTable.isCorrect,
    timeSpentMs: quizAnswersTable.timeSpentMs,
  })
    .from(quizSessionQuestionsTable)
    .leftJoin(
      quizAnswersTable,
      and(
        eq(quizAnswersTable.sessionQuestionId, quizSessionQuestionsTable.id),
        eq(quizAnswersTable.userId, userId),
      ),
    )
    .where(eq(quizSessionQuestionsTable.sessionId, sessionId));
}

async function completeSession(sessionId: string, userId: string) {
  const session = await getOwnedSession(sessionId, userId);
  if (session.status === "in_progress") {
    const answers = await getSessionAnswers(sessionId, userId);
    const score = calculateScore(answers.map((answer) => ({ isCorrect: answer.isCorrect })));
    const now = new Date();
    const timing = getQuizTiming(session.startedAt, session.deadlineAt, session.config as QuizConfig, now);
    const status = session.deadlineAt !== null && !timing.canAnswer && !timing.isOnBreak
      ? "expired"
      : "completed";
    await db.update(quizSessionsTable)
      .set({ status, finishedAt: now, scoreCorrect: score.correct, currentSection: timing.currentSection })
      .where(and(eq(quizSessionsTable.id, sessionId), eq(quizSessionsTable.userId, userId), eq(quizSessionsTable.status, "in_progress")));
  }
  return buildQuizResult(await getOwnedSession(sessionId, userId), userId);
}

export async function finishQuiz(sessionId: string, userId: string) {
  return completeSession(sessionId, userId);
}

async function buildQuizResult(session: typeof quizSessionsTable.$inferSelect, userId: string) {
  if (session.status === "in_progress") throw conflict("Finish the quiz before viewing your results", "quiz_not_finished");
  const [itemRows, answers] = await Promise.all([
    db.select({
      questionId: quizSessionQuestionsTable.questionId,
      isCorrect: quizAnswersTable.isCorrect,
    })
      .from(quizSessionQuestionsTable)
      .leftJoin(quizAnswersTable, and(
        eq(quizAnswersTable.sessionQuestionId, quizSessionQuestionsTable.id),
        eq(quizAnswersTable.userId, userId),
      ))
      .where(eq(quizSessionQuestionsTable.sessionId, session.id)),
    getSessionAnswers(session.id, userId),
  ]);
  const score = calculateScore(itemRows.map((row) => ({ isCorrect: row.isCorrect })));
  const totalTimeSeconds = Math.round(answers.reduce((total, answer) => total + (answer.timeSpentMs ?? 0), 0) / 1000);
  const topicRows = await db.select({
    topicId: topicsTable.id,
    topicName: topicsTable.name,
    isCorrect: quizAnswersTable.isCorrect,
  })
    .from(quizSessionQuestionsTable)
    .innerJoin(questionTopicsTable, eq(questionTopicsTable.questionId, quizSessionQuestionsTable.questionId))
    .innerJoin(topicsTable, eq(topicsTable.id, questionTopicsTable.topicId))
    .leftJoin(quizAnswersTable, and(
      eq(quizAnswersTable.sessionQuestionId, quizSessionQuestionsTable.id),
      eq(quizAnswersTable.userId, userId),
    ))
    .where(eq(quizSessionQuestionsTable.sessionId, session.id));
  const topicScores = new Map<string, { topicId: string; topicName: string; answered: number; correct: number }>();
  for (const row of topicRows) {
    const topic = topicScores.get(row.topicId) ?? {
      topicId: row.topicId,
      topicName: row.topicName,
      answered: 0,
      correct: 0,
    };
    if (row.isCorrect !== null) {
      topic.answered += 1;
      if (row.isCorrect) topic.correct += 1;
    }
    topicScores.set(row.topicId, topic);
  }
  const detail = await detailDto(session, userId);
  return {
    session: detail.session,
    total: score.total,
    answered: score.answered,
    correct: score.correct,
    percent: score.percent,
    totalTimeSeconds,
    byTopic: [...topicScores.values()].map((topic) => ({
      ...topic,
      percent: topic.answered === 0 ? 0 : Math.round((topic.correct / topic.answered) * 1000) / 10,
    })),
    items: detail.items,
  };
}

export async function getQuizResult(sessionId: string, userId: string) {
  return buildQuizResult(await getOwnedSession(sessionId, userId), userId);
}

export async function retryIncorrect(sessionId: string, userId: string): Promise<QuizDetailDto> {
  const session = await getOwnedSession(sessionId, userId);
  if (session.status === "in_progress") throw conflict("Finish this quiz before retrying incorrect answers", "quiz_not_finished");
  const incorrectRows = await db.select({ questionId: quizSessionQuestionsTable.questionId })
    .from(quizSessionQuestionsTable)
    .innerJoin(quizAnswersTable, eq(quizAnswersTable.sessionQuestionId, quizSessionQuestionsTable.id))
    .where(and(
      eq(quizSessionQuestionsTable.sessionId, sessionId),
      eq(quizAnswersTable.userId, userId),
      eq(quizAnswersTable.isCorrect, false),
    ))
    .orderBy(asc(quizSessionQuestionsTable.position));
  const questionIds = incorrectRows.map((row) => row.questionId);
  if (!questionIds.length) throw conflict("There are no incorrect answers to retry", "no_incorrect_answers");
  return insertQuizSession(userId, session.examId, "review", questionIds, { sourceSessionId: session.id }, 0);
}
