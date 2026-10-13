import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { bigint, boolean, index, integer, jsonb, pgEnum, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { pk, timestamps, softDelete, tstz } from "./_helpers";
import { users } from "./users";
import { examsTable, publishStatusEnum } from "./exams";
import { topicsTable } from "./taxonomy";

export const mediaKindEnum = pgEnum("media_kind", ["image", "video", "audio", "pdf", "file"]);
export const mediaProcessingEnum = pgEnum("media_processing", ["uploading", "processing", "ready", "errored"]);

export const mediaAssetsTable = pgTable(
  "media_assets",
  {
    id: pk(),
    kind: mediaKindEnum("kind").notNull(),
    filename: text("filename").notNull(),
    mimeType: text("mime_type"),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    storageKey: text("storage_key"), // S3-compatible key
    muxAssetId: text("mux_asset_id"),
    muxPlaybackId: text("mux_playback_id"),
    durationSeconds: integer("duration_seconds"),
    processing: mediaProcessingEnum("processing").notNull().default("ready"),
    captions: jsonb("captions").$type<{ lang: string; storageKey: string }[]>().notNull().default([]),
    altText: text("alt_text"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    uploadedBy: text("uploaded_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index("media_assets_kind_idx").on(t.kind), uniqueIndex("media_assets_mux_asset_uq").on(t.muxAssetId)],
);

export const coursesTable = pgTable(
  "courses",
  {
    id: pk(),
    examId: uuid("exam_id").references(() => examsTable.id, { onDelete: "set null" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    description: text("description").notNull().default(""),
    coverAssetId: uuid("cover_asset_id").references(() => mediaAssetsTable.id, { onDelete: "set null" }),
    instructorId: text("instructor_id").references(() => users.id, { onDelete: "set null" }),
    isFree: boolean("is_free").notNull().default(false),
    position: integer("position").notNull().default(0),
    status: publishStatusEnum("status").notNull().default("draft"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [uniqueIndex("courses_slug_uq").on(t.slug), index("courses_exam_status_idx").on(t.examId, t.status)],
);

export const modulesTable = pgTable(
  "modules",
  {
    id: pk(),
    courseId: uuid("course_id").notNull().references(() => coursesTable.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id").references(() => topicsTable.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    position: integer("position").notNull().default(0),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index("modules_course_position_idx").on(t.courseId, t.position), index("modules_topic_idx").on(t.topicId)],
);

export const lessonTypeEnum = pgEnum("lesson_type", ["video", "article", "pdf", "audio", "resource", "quiz"]);

export const lessonsTable = pgTable(
  "lessons",
  {
    id: pk(),
    moduleId: uuid("module_id").notNull().references(() => modulesTable.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    type: lessonTypeEnum("type").notNull().default("article"),
    body: text("body"), // Markdown for articles
    assetId: uuid("asset_id").references(() => mediaAssetsTable.id, { onDelete: "set null" }),
    chapters: jsonb("chapters").$type<{ at: number; title: string }[]>().notNull().default([]),
    durationSeconds: integer("duration_seconds"),
    isFreePreview: boolean("is_free_preview").notNull().default(false),
    position: integer("position").notNull().default(0),
    status: publishStatusEnum("status").notNull().default("draft"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    uniqueIndex("lessons_module_slug_uq").on(t.moduleId, t.slug),
    index("lessons_module_position_idx").on(t.moduleId, t.position),
  ],
);

export const lessonProgressTable = pgTable(
  "lesson_progress",
  {
    id: pk(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id").notNull().references(() => lessonsTable.id, { onDelete: "cascade" }),
    positionSeconds: integer("position_seconds").notNull().default(0),
    percent: integer("percent").notNull().default(0),
    completedAt: tstz("completed_at"),
    ...timestamps,
  },
  (t) => [uniqueIndex("lesson_progress_user_lesson_uq").on(t.userId, t.lessonId), index("lesson_progress_user_created_idx").on(t.userId, t.createdAt)],
);

export const lessonNotesTable = pgTable(
  "lesson_notes",
  {
    id: pk(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id").notNull().references(() => lessonsTable.id, { onDelete: "cascade" }),
    atSeconds: integer("at_seconds"),
    body: text("body").notNull(),
    ...timestamps,
  },
  (t) => [index("lesson_notes_user_lesson_idx").on(t.userId, t.lessonId)],
);

export const certificatesTable = pgTable(
  "certificates",
  {
    id: pk(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    courseId: uuid("course_id").notNull().references(() => coursesTable.id, { onDelete: "cascade" }),
    code: text("code").notNull(), // public verification code
    issuedAt: tstz("issued_at").notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [uniqueIndex("certificates_code_uq").on(t.code), uniqueIndex("certificates_user_course_uq").on(t.userId, t.courseId)],
);

export const liveSessionsTable = pgTable(
  "live_sessions",
  {
    id: pk(),
    courseId: uuid("course_id").references(() => coursesTable.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    startsAt: tstz("starts_at").notNull(),
    durationMinutes: integer("duration_minutes").notNull().default(60),
    joinUrl: text("join_url"),
    recordingLessonId: uuid("recording_lesson_id").references(() => lessonsTable.id, { onDelete: "set null" }),
    status: publishStatusEnum("status").notNull().default("draft"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index("live_sessions_starts_idx").on(t.startsAt)],
);

// ---- insert schemas & row types (generated pattern: one pair per table) ----
export const insertMediaAssetSchema = createInsertSchema(mediaAssetsTable).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export type InsertMediaAsset = z.infer<typeof insertMediaAssetSchema>;
export type MediaAsset = typeof mediaAssetsTable.$inferSelect;
export const insertCourseSchema = createInsertSchema(coursesTable).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Course = typeof coursesTable.$inferSelect;
export const insertModuleSchema = createInsertSchema(modulesTable).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export type InsertModule = z.infer<typeof insertModuleSchema>;
export type Module = typeof modulesTable.$inferSelect;
export const insertLessonSchema = createInsertSchema(lessonsTable).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type Lesson = typeof lessonsTable.$inferSelect;
export const insertLessonProgressSchema = createInsertSchema(lessonProgressTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLessonProgress = z.infer<typeof insertLessonProgressSchema>;
export type LessonProgress = typeof lessonProgressTable.$inferSelect;
export const insertLessonNoteSchema = createInsertSchema(lessonNotesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLessonNote = z.infer<typeof insertLessonNoteSchema>;
export type LessonNote = typeof lessonNotesTable.$inferSelect;
export const insertCertificateSchema = createInsertSchema(certificatesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCertificate = z.infer<typeof insertCertificateSchema>;
export type Certificate = typeof certificatesTable.$inferSelect;
export const insertLiveSessionSchema = createInsertSchema(liveSessionsTable).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export type InsertLiveSession = z.infer<typeof insertLiveSessionSchema>;
export type LiveSession = typeof liveSessionsTable.$inferSelect;
