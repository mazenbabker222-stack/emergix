import { and, asc, desc, eq, gte, isNotNull, isNull, or, sql, type SQL } from "drizzle-orm";
import {
  db,
  questionTopicsTable,
  questionsTable,
  quizAnswersTable,
  topicsTable,
  userProfiles,
} from "@workspace/db";

const dayExpression = sql<string>`to_char(${quizAnswersTable.answeredAt}::date, 'YYYY-MM-DD')`;

function percent(correct: number, answered: number): number {
  return answered === 0 ? 0 : Math.round((correct / answered) * 1000) / 10;
}

function utcDay(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export async function getAnalyticsOverview(userId: string) {
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const [summary, profile, activeDays] = await Promise.all([
    db.select({
      answered: sql<number>`count(*)`,
      correct: sql<number>`count(*) filter (where ${quizAnswersTable.isCorrect} = true)`,
      answeredToday: sql<number>`count(*) filter (where ${quizAnswersTable.answeredAt} >= ${todayStart})`,
    }).from(quizAnswersTable)
      .where(and(eq(quizAnswersTable.userId, userId), isNotNull(quizAnswersTable.answeredAt))),
    db.select({
      dailyGoalQuestions: userProfiles.dailyGoalQuestions,
      targetExamDate: userProfiles.targetExamDate,
    }).from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1),
    db.select({ day: dayExpression }).from(quizAnswersTable)
      .where(and(
        eq(quizAnswersTable.userId, userId),
        isNotNull(quizAnswersTable.answeredAt),
        gte(quizAnswersTable.answeredAt, new Date(todayStart.getTime() - 366 * 86_400_000)),
      ))
      .groupBy(sql`${quizAnswersTable.answeredAt}::date`)
      .orderBy(desc(dayExpression))
      .limit(366),
  ]);
  const row = summary[0];
  const answered = Number(row?.answered ?? 0);
  const correct = Number(row?.correct ?? 0);
  const answeredToday = Number(row?.answeredToday ?? 0);
  const activeSet = new Set(activeDays.map(({ day }) => day));
  const today = utcDay(now);
  const yesterdayDate = new Date(todayStart.getTime() - 86_400_000);
  let streakDays = 0;
  let streakCursor = activeSet.has(today) ? todayStart : yesterdayDate;
  while (activeSet.has(utcDay(streakCursor))) {
    streakDays += 1;
    streakCursor = new Date(streakCursor.getTime() - 86_400_000);
  }
  const targetExamDate = profile[0]?.targetExamDate ?? null;
  const daysToExam = targetExamDate
    ? Math.ceil((new Date(`${targetExamDate}T00:00:00.000Z`).getTime() - todayStart.getTime()) / 86_400_000)
    : null;

  return {
    questionsAnswered: answered,
    percentCorrect: percent(correct, answered),
    streakDays,
    dailyGoal: profile[0]?.dailyGoalQuestions ?? 20,
    answeredToday,
    readiness: answered >= 10 ? percent(correct, answered) : null,
    examDate: targetExamDate,
    daysToExam,
  };
}

export async function getTopicPerformance(userId: string, examId?: string) {
  const topicConditions: SQL[] = [isNull(topicsTable.deletedAt)];
  if (examId) topicConditions.push(or(eq(topicsTable.examId, examId), isNull(topicsTable.examId))!);
  const [topics, rows] = await Promise.all([
    db.select({
      id: topicsTable.id,
      name: topicsTable.name,
      position: topicsTable.position,
    }).from(topicsTable)
      .where(and(...topicConditions))
      .orderBy(asc(topicsTable.position), asc(topicsTable.name)),
    db.select({
      topicId: topicsTable.id,
      answered: sql<number>`count(*) filter (where ${quizAnswersTable.isCorrect} is not null)`,
      correct: sql<number>`count(*) filter (where ${quizAnswersTable.isCorrect} = true)`,
    }).from(quizAnswersTable)
      .innerJoin(questionsTable, eq(questionsTable.id, quizAnswersTable.questionId))
      .innerJoin(questionTopicsTable, eq(questionTopicsTable.questionId, questionsTable.id))
      .innerJoin(topicsTable, eq(topicsTable.id, questionTopicsTable.topicId))
      .where(and(
        eq(quizAnswersTable.userId, userId),
        isNotNull(quizAnswersTable.answeredAt),
        isNull(topicsTable.deletedAt),
        ...(examId
          ? [eq(questionsTable.examId, examId), or(eq(topicsTable.examId, examId), isNull(topicsTable.examId))!]
          : []),
      ))
      .groupBy(topicsTable.id),
  ]);
  const byTopic = new Map(rows.map((row) => [row.topicId, {
    answered: Number(row.answered),
    correct: Number(row.correct),
  }]));
  return topics.map((topic) => {
    const performance = byTopic.get(topic.id) ?? { answered: 0, correct: 0 };
    return {
      topicId: topic.id,
      topicName: topic.name,
      answered: performance.answered,
      percent: percent(performance.correct, performance.answered),
    };
  });
}

export async function getPerformanceTrend(userId: string, days: number) {
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const firstDay = new Date(todayStart.getTime() - (days - 1) * 86_400_000);
  const rows = await db.select({
    day: dayExpression,
    answered: sql<number>`count(*)`,
    correct: sql<number>`count(*) filter (where ${quizAnswersTable.isCorrect} = true)`,
  }).from(quizAnswersTable)
    .where(and(
      eq(quizAnswersTable.userId, userId),
      isNotNull(quizAnswersTable.answeredAt),
      gte(quizAnswersTable.answeredAt, firstDay),
    ))
    .groupBy(sql`${quizAnswersTable.answeredAt}::date`)
    .orderBy(asc(dayExpression));
  const byDay = new Map(rows.map((row) => [row.day, {
    answered: Number(row.answered),
    correct: Number(row.correct),
  }]));
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(firstDay.getTime() + index * 86_400_000);
    const day = utcDay(date);
    const aggregate = byDay.get(day) ?? { answered: 0, correct: 0 };
    return { day, answered: aggregate.answered, percent: percent(aggregate.correct, aggregate.answered) };
  });
}
