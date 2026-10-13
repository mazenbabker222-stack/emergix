import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { boolean, index, integer, jsonb, pgEnum, pgTable, text, uniqueIndex, uuid, date, numeric } from "drizzle-orm/pg-core";
import { pk, timestamps, softDelete, tstz } from "./_helpers";

export const publishStatusEnum = pgEnum("publish_status", ["draft", "published", "archived"]);

/** Format is data, not code, so admins can edit official figures. */
export type ExamSection = { name: string; questions?: number; durationMinutes: number; breakAfterMinutes?: number };
export type ExamFormat = {
  kind: "sba" | "osce" | "other";
  totalQuestions?: number;
  sections: ExamSection[];
  stations?: number;
  restStations?: number;
  stationMinutes?: number;
  readingMinutes?: number;
  totalMinutes?: number;
};

export const examsTable = pgTable(
  "exams",
  {
    id: pk(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    shortName: text("short_name").notNull(),
    summary: text("summary").notNull().default(""),
    description: text("description").notNull().default(""),
    format: jsonb("format").$type<ExamFormat>().notNull(),
    location: text("location"),
    officialUrl: text("official_url"),
    /** Public site (phase 04): short label such as "Written exam (SBA)", one-line format summary, last review date. */
    examType: text("exam_type").notNull().default(""),
    formatLabel: text("format_label").notNull().default(""),
    lastReviewedAt: tstz("last_reviewed_at"),
    simulatorPreset: jsonb("simulator_preset").$type<Record<string, unknown>>().notNull().default({}),
    position: integer("position").notNull().default(0),
    status: publishStatusEnum("status").notNull().default("draft"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [uniqueIndex("exams_slug_uq").on(t.slug), index("exams_status_position_idx").on(t.status, t.position)],
);

export const examFaqsTable = pgTable(
  "exam_faqs",
  {
    id: pk(),
    /** NULL = general FAQ (pricing, account, help centre). */
    examId: uuid("exam_id").references(() => examsTable.id, { onDelete: "cascade" }),
    category: text("category"),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    position: integer("position").notNull().default(0),
    status: publishStatusEnum("status").notNull().default("published"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index("exam_faqs_exam_status_idx").on(t.examId, t.status)],
);

export const examDatesTable = pgTable(
  "exam_dates",
  {
    id: pk(),
    examId: uuid("exam_id").notNull().references(() => examsTable.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on"),
    applicationOpensOn: date("application_opens_on"),
    applicationClosesOn: date("application_closes_on"),
    location: text("location"),
    feeAmount: numeric("fee_amount", { precision: 10, scale: 2 }),
    feeCurrency: text("fee_currency").notNull().default("GBP"),
    isPlaceholder: boolean("is_placeholder").notNull().default(false),
    notes: text("notes"),
    status: publishStatusEnum("status").notNull().default("published"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index("exam_dates_exam_status_idx").on(t.examId, t.status), index("exam_dates_starts_idx").on(t.startsOn)],
);

export const examDocumentsTable = pgTable(
  "exam_documents",
  {
    id: pk(),
    /** NULL = applies to every exam. */
    examId: uuid("exam_id").references(() => examsTable.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    storageKey: text("storage_key"),
    externalUrl: text("external_url"),
    fileType: text("file_type").notNull().default("pdf"),
    sizeBytes: integer("size_bytes"),
    position: integer("position").notNull().default(0),
    status: publishStatusEnum("status").notNull().default("published"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index("exam_documents_exam_idx").on(t.examId)],
);

export const bannersTable = pgTable(
  "banners",
  {
    id: pk(),
    examId: uuid("exam_id").references(() => examsTable.id, { onDelete: "cascade" }), // null = site-wide
    message: text("message").notNull(),
    linkUrl: text("link_url"),
    linkLabel: text("link_label"),
    tone: text("tone").notNull().default("info"),
    dismissible: boolean("dismissible").notNull().default(true),
    startsAt: tstz("starts_at"),
    endsAt: tstz("ends_at"),
    status: publishStatusEnum("status").notNull().default("draft"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index("banners_exam_status_idx").on(t.examId, t.status)],
);

// ---- insert schemas & row types (generated pattern: one pair per table) ----
export const insertExamSchema = createInsertSchema(examsTable).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export type InsertExam = z.infer<typeof insertExamSchema>;
export type Exam = typeof examsTable.$inferSelect;
export const insertExamFaqSchema = createInsertSchema(examFaqsTable).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export type InsertExamFaq = z.infer<typeof insertExamFaqSchema>;
export type ExamFaq = typeof examFaqsTable.$inferSelect;
export const insertExamDateSchema = createInsertSchema(examDatesTable).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export type InsertExamDate = z.infer<typeof insertExamDateSchema>;
export type ExamDate = typeof examDatesTable.$inferSelect;
export const insertExamDocumentSchema = createInsertSchema(examDocumentsTable).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export type InsertExamDocument = z.infer<typeof insertExamDocumentSchema>;
export type ExamDocument = typeof examDocumentsTable.$inferSelect;
export const insertBannerSchema = createInsertSchema(bannersTable).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export type InsertBanner = z.infer<typeof insertBannerSchema>;
export type Banner = typeof bannersTable.$inferSelect;
