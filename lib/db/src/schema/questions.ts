import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { boolean, index, integer, jsonb, pgEnum, pgTable, primaryKey, text, uniqueIndex, uuid, date } from "drizzle-orm/pg-core";
import { pk, timestamps, softDelete, tstz } from "./_helpers";
import { users } from "./users";
import { examsTable } from "./exams";
import { topicsTable, difficultyLevelsTable, tagsTable } from "./taxonomy";
import { lessonsTable, mediaAssetsTable } from "./courses";

export const questionTypeEnum = pgEnum("question_type", ["sba", "image", "emq", "multi_select"]);
export const questionStatusEnum = pgEnum("question_status", ["draft", "review", "approved", "published", "archived"]);
export const reportStatusEnum = pgEnum("question_report_status", ["open", "investigating", "resolved", "dismissed"]);

export const questionsTable = pgTable(
  "questions",
  {
    id: pk(),
    examId: uuid("exam_id").notNull().references(() => examsTable.id, { onDelete: "restrict" }),
    type: questionTypeEnum("type").notNull().default("sba"),
    stem: text("stem").notNull(),
    leadIn: text("lead_in"),
    mediaAssetId: uuid("media_asset_id").references(() => mediaAssetsTable.id, { onDelete: "set null" }),
    explanation: text("explanation").notNull().default(""), // teaching notes
    keyPoint: text("key_point"), // key learning point (also feeds flashcards)
    references: jsonb("references").$type<{ title: string; url?: string }[]>().notNull().default([]),
    difficultyId: uuid("difficulty_id").references(() => difficultyLevelsTable.id, { onDelete: "set null" }),
    year: integer("year"),
    sourceLabel: text("source_label"),
    status: questionStatusEnum("status").notNull().default("draft"),
    version: integer("version").notNull().default(1),
    authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
    reviewerId: text("reviewer_id").references(() => users.id, { onDelete: "set null" }),
    lastReviewedAt: tstz("last_reviewed_at"),
    isSample: boolean("is_sample").notNull().default(false), // SAMPLE content, not clinical advice
    contentHash: text("content_hash"), // duplicate detection
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    index("questions_exam_status_idx").on(t.examId, t.status),
    index("questions_difficulty_idx").on(t.difficultyId),
    index("questions_content_hash_idx").on(t.contentHash),
  ],
);

export const questionOptionsTable = pgTable(
  "question_options",
  {
    id: pk(),
    questionId: uuid("question_id").notNull().references(() => questionsTable.id, { onDelete: "cascade" }),
    label: text("label").notNull(), // A, B, C...
    text: text("text").notNull(),
    isCorrect: boolean("is_correct").notNull().default(false),
    rationale: text("rationale").notNull().default(""),
    position: integer("position").notNull().default(0),
    ...timestamps,
  },
  (t) => [uniqueIndex("question_options_q_label_uq").on(t.questionId, t.label), index("question_options_question_idx").on(t.questionId)],
);

export const questionVersionsTable = pgTable(
  "question_versions",
  {
    id: pk(),
    questionId: uuid("question_id").notNull().references(() => questionsTable.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
    changeNote: text("change_note"),
    changedBy: text("changed_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [uniqueIndex("question_versions_q_version_uq").on(t.questionId, t.version)],
);

export const questionTopicsTable = pgTable(
  "question_topics",
  {
    questionId: uuid("question_id").notNull().references(() => questionsTable.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id").notNull().references(() => topicsTable.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.questionId, t.topicId] }), index("question_topics_topic_idx").on(t.topicId)],
);

export const questionTagsTable = pgTable(
  "question_tags",
  {
    questionId: uuid("question_id").notNull().references(() => questionsTable.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id").notNull().references(() => tagsTable.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.questionId, t.tagId] }), index("question_tags_tag_idx").on(t.tagId)],
);

export const questionLessonsTable = pgTable(
  "question_lessons",
  {
    questionId: uuid("question_id").notNull().references(() => questionsTable.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id").notNull().references(() => lessonsTable.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.questionId, t.lessonId] }), index("question_lessons_lesson_idx").on(t.lessonId)],
);

export const questionReportsTable = pgTable(
  "question_reports",
  {
    id: pk(),
    questionId: uuid("question_id").notNull().references(() => questionsTable.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    category: text("category").notNull().default("other"),
    message: text("message").notNull(),
    status: reportStatusEnum("status").notNull().default("open"),
    internalNote: text("internal_note"),
    resolvedBy: text("resolved_by").references(() => users.id, { onDelete: "set null" }),
    resolvedAt: tstz("resolved_at"),
    ...timestamps,
  },
  (t) => [index("question_reports_question_idx").on(t.questionId), index("question_reports_status_created_idx").on(t.status, t.createdAt)],
);

/** Daily rollup written by a background job (phase 05). */
export const questionStatsTable = pgTable(
  "question_stats",
  {
    id: pk(),
    questionId: uuid("question_id").notNull().references(() => questionsTable.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    attempts: integer("attempts").notNull().default(0),
    correct: integer("correct").notNull().default(0),
    totalTimeMs: integer("total_time_ms").notNull().default(0),
    optionCounts: jsonb("option_counts").$type<Record<string, number>>().notNull().default({}),
    ...timestamps,
  },
  (t) => [uniqueIndex("question_stats_q_day_uq").on(t.questionId, t.day), index("question_stats_question_idx").on(t.questionId)],
);

// ---- insert schemas & row types (generated pattern: one pair per table) ----
export const insertQuestionSchema = createInsertSchema(questionsTable).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questionsTable.$inferSelect;
export const insertQuestionOptionSchema = createInsertSchema(questionOptionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertQuestionOption = z.infer<typeof insertQuestionOptionSchema>;
export type QuestionOption = typeof questionOptionsTable.$inferSelect;
export const insertQuestionVersionSchema = createInsertSchema(questionVersionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertQuestionVersion = z.infer<typeof insertQuestionVersionSchema>;
export type QuestionVersion = typeof questionVersionsTable.$inferSelect;
export const insertQuestionTopicSchema = createInsertSchema(questionTopicsTable);
export type InsertQuestionTopic = z.infer<typeof insertQuestionTopicSchema>;
export type QuestionTopic = typeof questionTopicsTable.$inferSelect;
export const insertQuestionTagSchema = createInsertSchema(questionTagsTable);
export type InsertQuestionTag = z.infer<typeof insertQuestionTagSchema>;
export type QuestionTag = typeof questionTagsTable.$inferSelect;
export const insertQuestionLessonSchema = createInsertSchema(questionLessonsTable);
export type InsertQuestionLesson = z.infer<typeof insertQuestionLessonSchema>;
export type QuestionLesson = typeof questionLessonsTable.$inferSelect;
export const insertQuestionReportSchema = createInsertSchema(questionReportsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertQuestionReport = z.infer<typeof insertQuestionReportSchema>;
export type QuestionReport = typeof questionReportsTable.$inferSelect;
export const insertQuestionStatSchema = createInsertSchema(questionStatsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertQuestionStat = z.infer<typeof insertQuestionStatSchema>;
export type QuestionStat = typeof questionStatsTable.$inferSelect;
