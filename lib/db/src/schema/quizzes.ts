import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { boolean, index, integer, jsonb, pgEnum, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { pk, timestamps, tstz } from "./_helpers";
import { users } from "./users";
import { examsTable } from "./exams";
import { questionsTable, questionOptionsTable } from "./questions";

export const quizModeEnum = pgEnum("quiz_mode", ["tutor", "timed", "custom", "review"]);
export const quizStatusEnum = pgEnum("quiz_status", ["in_progress", "completed", "expired", "abandoned"]);

export const quizSessionsTable = pgTable(
  "quiz_sessions",
  {
    id: pk(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    examId: uuid("exam_id").references(() => examsTable.id, { onDelete: "set null" }),
    mode: quizModeEnum("mode").notNull(),
    status: quizStatusEnum("status").notNull().default("in_progress"),
    config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
    questionCount: integer("question_count").notNull().default(0),
    currentSection: integer("current_section").notNull().default(0),
    startedAt: tstz("started_at").notNull().defaultNow(),
    /** Server-authoritative deadline; the client only displays it. */
    deadlineAt: tstz("deadline_at"),
    finishedAt: tstz("finished_at"),
    scoreCorrect: integer("score_correct"),
    ...timestamps,
  },
  (t) => [
    index("quiz_sessions_user_created_idx").on(t.userId, t.createdAt),
    index("quiz_sessions_user_status_idx").on(t.userId, t.status),
    index("quiz_sessions_exam_status_idx").on(t.examId, t.status),
  ],
);

export const quizSessionQuestionsTable = pgTable(
  "quiz_session_questions",
  {
    id: pk(),
    sessionId: uuid("session_id").notNull().references(() => quizSessionsTable.id, { onDelete: "cascade" }),
    questionId: uuid("question_id").notNull().references(() => questionsTable.id, { onDelete: "restrict" }),
    position: integer("position").notNull(),
    section: integer("section").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("quiz_session_questions_session_pos_uq").on(t.sessionId, t.position),
    uniqueIndex("quiz_session_questions_session_q_uq").on(t.sessionId, t.questionId),
    index("quiz_session_questions_question_idx").on(t.questionId),
  ],
);

export const quizAnswersTable = pgTable(
  "quiz_answers",
  {
    id: pk(),
    sessionQuestionId: uuid("session_question_id").notNull().references(() => quizSessionQuestionsTable.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    questionId: uuid("question_id").notNull().references(() => questionsTable.id, { onDelete: "restrict" }),
    selectedOptionId: uuid("selected_option_id").references(() => questionOptionsTable.id, { onDelete: "set null" }),
    isCorrect: boolean("is_correct"),
    timeSpentMs: integer("time_spent_ms").notNull().default(0),
    struckOptionIds: jsonb("struck_option_ids").$type<string[]>().notNull().default([]),
    answeredAt: tstz("answered_at"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("quiz_answers_session_question_uq").on(t.sessionQuestionId),
    index("quiz_answers_user_created_idx").on(t.userId, t.createdAt),
    index("quiz_answers_question_idx").on(t.questionId),
  ],
);

export const questionFlagsTable = pgTable(
  "question_flags",
  {
    id: pk(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    questionId: uuid("question_id").notNull().references(() => questionsTable.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [uniqueIndex("question_flags_user_q_uq").on(t.userId, t.questionId), index("question_flags_question_idx").on(t.questionId)],
);

export const questionNotesTable = pgTable(
  "question_notes",
  {
    id: pk(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    questionId: uuid("question_id").notNull().references(() => questionsTable.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("question_notes_user_q_uq").on(t.userId, t.questionId), index("question_notes_question_idx").on(t.questionId)],
);

// ---- insert schemas & row types (generated pattern: one pair per table) ----
export const insertQuizSessionSchema = createInsertSchema(quizSessionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertQuizSession = z.infer<typeof insertQuizSessionSchema>;
export type QuizSession = typeof quizSessionsTable.$inferSelect;
export const insertQuizSessionQuestionSchema = createInsertSchema(quizSessionQuestionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertQuizSessionQuestion = z.infer<typeof insertQuizSessionQuestionSchema>;
export type QuizSessionQuestion = typeof quizSessionQuestionsTable.$inferSelect;
export const insertQuizAnswerSchema = createInsertSchema(quizAnswersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertQuizAnswer = z.infer<typeof insertQuizAnswerSchema>;
export type QuizAnswer = typeof quizAnswersTable.$inferSelect;
export const insertQuestionFlagSchema = createInsertSchema(questionFlagsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertQuestionFlag = z.infer<typeof insertQuestionFlagSchema>;
export type QuestionFlag = typeof questionFlagsTable.$inferSelect;
export const insertQuestionNoteSchema = createInsertSchema(questionNotesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertQuestionNote = z.infer<typeof insertQuestionNoteSchema>;
export type QuestionNote = typeof questionNotesTable.$inferSelect;
