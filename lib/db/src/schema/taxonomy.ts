import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { type AnyPgColumn, index, integer, pgEnum, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { pk, timestamps, softDelete } from "./_helpers";
import { examsTable } from "./exams";

/** Topic tree: self-referencing (parent_id). Optionally scoped to an exam (null = shared). */
export const topicsTable = pgTable(
  "topics",
  {
    id: pk(),
    parentId: uuid("parent_id").references((): AnyPgColumn => topicsTable.id, { onDelete: "restrict" }),
    examId: uuid("exam_id").references(() => examsTable.id, { onDelete: "set null" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    syllabusRef: text("syllabus_ref"),
    position: integer("position").notNull().default(0),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    uniqueIndex("topics_slug_uq").on(t.slug),
    index("topics_parent_idx").on(t.parentId),
    index("topics_exam_idx").on(t.examId),
  ],
);

export const difficultyLevelsTable = pgTable(
  "difficulty_levels",
  {
    id: pk(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    rank: integer("rank").notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("difficulty_levels_slug_uq").on(t.slug)],
);

export const tagKindEnum = pgEnum("tag_kind", ["general", "source", "year"]);

export const tagsTable = pgTable(
  "tags",
  {
    id: pk(),
    kind: tagKindEnum("kind").notNull().default("general"),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    ...timestamps,
    ...softDelete,
  },
  (t) => [uniqueIndex("tags_kind_slug_uq").on(t.kind, t.slug)],
);

// ---- insert schemas & row types (generated pattern: one pair per table) ----
export const insertTopicSchema = createInsertSchema(topicsTable).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export type InsertTopic = z.infer<typeof insertTopicSchema>;
export type Topic = typeof topicsTable.$inferSelect;
export const insertDifficultyLevelSchema = createInsertSchema(difficultyLevelsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDifficultyLevel = z.infer<typeof insertDifficultyLevelSchema>;
export type DifficultyLevel = typeof difficultyLevelsTable.$inferSelect;
export const insertTagSchema = createInsertSchema(tagsTable).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export type InsertTag = z.infer<typeof insertTagSchema>;
export type Tag = typeof tagsTable.$inferSelect;
