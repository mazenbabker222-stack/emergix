import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { index, integer, jsonb, numeric, pgEnum, pgTable, text, uniqueIndex, uuid, date } from "drizzle-orm/pg-core";
import { pk, timestamps, softDelete, tstz } from "./_helpers";
import { users } from "./users";
import { examsTable } from "./exams";
import { topicsTable } from "./taxonomy";
import { questionsTable } from "./questions";

export const flashcardsTable = pgTable(
  "flashcards",
  {
    id: pk(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    questionId: uuid("question_id").references(() => questionsTable.id, { onDelete: "set null" }), // auto-generated from key points
    topicId: uuid("topic_id").references(() => topicsTable.id, { onDelete: "set null" }),
    front: text("front").notNull(),
    back: text("back").notNull(),
    // SM-2 scheduling state
    easeFactor: numeric("ease_factor", { precision: 4, scale: 2 }).notNull().default("2.50"),
    intervalDays: integer("interval_days").notNull().default(0),
    repetitions: integer("repetitions").notNull().default(0),
    dueAt: tstz("due_at").notNull().defaultNow(),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index("flashcards_user_due_idx").on(t.userId, t.dueAt), index("flashcards_question_idx").on(t.questionId), index("flashcards_topic_idx").on(t.topicId)],
);

export const cardReviewsTable = pgTable(
  "card_reviews",
  {
    id: pk(),
    flashcardId: uuid("flashcard_id").notNull().references(() => flashcardsTable.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    quality: integer("quality").notNull(), // SM-2 grade 0-5
    intervalDays: integer("interval_days").notNull(),
    ...timestamps,
  },
  (t) => [index("card_reviews_user_created_idx").on(t.userId, t.createdAt), index("card_reviews_card_idx").on(t.flashcardId)],
);

export const studyPlansTable = pgTable(
  "study_plans",
  {
    id: pk(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    examId: uuid("exam_id").notNull().references(() => examsTable.id, { onDelete: "cascade" }),
    examDate: date("exam_date").notNull(),
    hoursPerWeek: integer("hours_per_week").notNull().default(10),
    settings: jsonb("settings").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index("study_plans_user_created_idx").on(t.userId, t.createdAt)],
);

export const planItemKindEnum = pgEnum("plan_item_kind", ["qbank", "lesson", "osce", "flashcards", "revision", "rest"]);

export const studyPlanItemsTable = pgTable(
  "study_plan_items",
  {
    id: pk(),
    studyPlanId: uuid("study_plan_id").notNull().references(() => studyPlansTable.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id").references(() => topicsTable.id, { onDelete: "set null" }),
    kind: planItemKindEnum("kind").notNull(),
    title: text("title").notNull(),
    scheduledFor: date("scheduled_for").notNull(),
    estimatedMinutes: integer("estimated_minutes").notNull().default(30),
    completedAt: tstz("completed_at"),
    ...timestamps,
  },
  (t) => [index("study_plan_items_plan_date_idx").on(t.studyPlanId, t.scheduledFor)],
);

export const bookmarkTargetEnum = pgEnum("bookmark_target", ["question", "lesson", "osce_station"]);

export const bookmarksTable = pgTable(
  "bookmarks",
  {
    id: pk(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    targetType: bookmarkTargetEnum("target_type").notNull(),
    targetId: uuid("target_id").notNull(), // polymorphic by design; validated in the service layer
    note: text("note"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("bookmarks_user_target_uq").on(t.userId, t.targetType, t.targetId),
    index("bookmarks_user_created_idx").on(t.userId, t.createdAt),
  ],
);

// ---- insert schemas & row types (generated pattern: one pair per table) ----
export const insertFlashcardSchema = createInsertSchema(flashcardsTable).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export type InsertFlashcard = z.infer<typeof insertFlashcardSchema>;
export type Flashcard = typeof flashcardsTable.$inferSelect;
export const insertCardReviewSchema = createInsertSchema(cardReviewsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCardReview = z.infer<typeof insertCardReviewSchema>;
export type CardReview = typeof cardReviewsTable.$inferSelect;
export const insertStudyPlanSchema = createInsertSchema(studyPlansTable).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export type InsertStudyPlan = z.infer<typeof insertStudyPlanSchema>;
export type StudyPlan = typeof studyPlansTable.$inferSelect;
export const insertStudyPlanItemSchema = createInsertSchema(studyPlanItemsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStudyPlanItem = z.infer<typeof insertStudyPlanItemSchema>;
export type StudyPlanItem = typeof studyPlanItemsTable.$inferSelect;
export const insertBookmarkSchema = createInsertSchema(bookmarksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBookmark = z.infer<typeof insertBookmarkSchema>;
export type Bookmark = typeof bookmarksTable.$inferSelect;
