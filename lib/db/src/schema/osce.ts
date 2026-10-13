import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgEnum, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { pk, timestamps, softDelete, tstz } from "./_helpers";
import { users } from "./users";
import { examsTable } from "./exams";
import { topicsTable } from "./taxonomy";
import { questionStatusEnum } from "./questions";

/** Structured station content stored in osce_stations.content (full model in phase 06). */
export type StationContent = {
  [key: string]: unknown;
  aim?: string;
  learningOutcomes?: string[];
  candidateInstructions?: string;
  actorBrief?: string;
  examinerExpectations?: { do?: string[]; find?: string[]; ask?: string[]; manage?: string[]; react?: string[] };
  reactions?: { trigger: string; reaction: string }[];
  plainLanguage?: { term: string; plain: string }[];
  patientQuestions?: { question: string; reply: string }[];
  examinerQuestions?: { question: string; modelAnswer: string }[];
  redFlags?: string[];
  commonErrors?: string[];
};

export const osceModeEnum = pgEnum("osce_mode", ["learning", "exam"]);
export const osceRoleEnum = pgEnum("osce_role", ["candidate", "examiner"]);
export const globalRatingEnum = pgEnum("osce_global_rating", ["clear_pass", "pass", "borderline", "fail"]);
export const osceStatusEnum = pgEnum("osce_attempt_status", [
  "in_progress",
  "completed",
  "abandoned",
  "draft",
  "saved",
  "planned",
  "running",
]);
export const roomStatusEnum = pgEnum("osce_room_status", ["waiting", "active", "closed"]);

export const osceStationsTable = pgTable(
  "osce_stations",
  {
    id: pk(),
    examId: uuid("exam_id").references(() => examsTable.id, { onDelete: "set null" }),
    topicId: uuid("topic_id").references(() => topicsTable.id, { onDelete: "set null" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    specialty: text("specialty"),
    topicGroup: text("topic_group"),
    topicGroupSlug: text("topic_group_slug"),
    summary: text("summary").notNull().default(""),
    image: text("image"),
    difficulty: text("difficulty").notNull().default("core"),
    stationStatus: text("station_status").notNull().default("draft"),
    sortOrder: integer("sort_order").notNull().default(0),
    readingMinutes: integer("reading_minutes").notNull().default(1),
    stationMinutes: integer("station_minutes").notNull().default(8),
    readingSeconds: integer("reading_seconds").notNull().default(60),
    historySeconds: integer("history_seconds").notNull().default(480),
    examinerSeconds: integer("examiner_seconds").notNull().default(120),
    totalMarks: integer("total_marks").notNull().default(20),
    contentVersion: integer("content_version").notNull().default(1),
    content: jsonb("content").$type<StationContent>().notNull().default({}),
    legacyFile: text("legacy_file"), // public/neurology/*.html until phase 06 migrates it
    status: questionStatusEnum("status").notNull().default("draft"),
    version: integer("version").notNull().default(1),
    reviewerId: text("reviewer_id").references(() => users.id, { onDelete: "set null" }),
    lastReviewedAt: tstz("last_reviewed_at"),
    isSample: boolean("is_sample").notNull().default(false),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    uniqueIndex("osce_stations_slug_uq").on(t.slug),
    index("osce_stations_exam_status_idx").on(t.examId, t.status),
    index("osce_stations_topic_idx").on(t.topicId),
    index("osce_stations_library_status_idx").on(t.stationStatus, t.sortOrder),
    index("osce_stations_topic_group_idx").on(t.topicGroupSlug),
  ],
);

export const osceMarkingDomainsTable = pgTable(
  "osce_marking_domains",
  {
    id: pk(),
    stationId: uuid("station_id").notNull().references(() => osceStationsTable.id, { onDelete: "cascade" }),
    domain: text("name").notNull(),
    maxMarks: integer("max_score").notNull().default(4),
    descriptor: text("descriptor").notNull().default(""),
    descriptors: jsonb("descriptors").$type<{ score: number; text: string }[]>().notNull().default([]),
    position: integer("position").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index("osce_marking_domains_station_idx").on(t.stationId, t.position),
    uniqueIndex("osce_marking_domains_station_position_uq").on(t.stationId, t.position),
  ],
);

export const osceAttemptsTable = pgTable(
  "osce_attempts",
  {
    id: pk(),
    ownerId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    stationId: uuid("station_id").notNull().references(() => osceStationsTable.id, { onDelete: "restrict" }),
    circuitId: uuid("circuit_id").references(() => osceCircuitsTable.id, { onDelete: "set null" }),
    roomId: uuid("room_id").references(() => osceRoomsTable.id, { onDelete: "set null" }),
    mode: osceModeEnum("mode").notNull(),
    role: osceRoleEnum("role").notNull().default("candidate"),
    status: osceStatusEnum("status").notNull().default("in_progress"),
    marks: jsonb("domain_scores").$type<Record<string, number>>().notNull().default({}),
    totalMarks: integer("total_score"),
    maxMarks: integer("max_marks").notNull().default(20),
    globalRating: globalRatingEnum("global_rating"),
    durationSeconds: integer("duration_seconds"),
    notes: text("notes"),
    savedAt: tstz("saved_at"),
    ...timestamps,
  },
  (t) => [
    index("osce_attempts_user_created_idx").on(t.ownerId, t.createdAt),
    index("osce_attempts_station_idx").on(t.stationId),
    index("osce_attempts_circuit_idx").on(t.circuitId),
    uniqueIndex("osce_attempts_one_draft_uq")
      .on(t.ownerId, t.stationId)
      .where(sql`${t.status} = 'draft' and ${t.circuitId} is null and ${t.roomId} is null`),
    uniqueIndex("osce_attempts_room_draft_uq")
      .on(t.ownerId, t.roomId)
      .where(sql`${t.status} = 'draft' and ${t.roomId} is not null`),
    uniqueIndex("osce_attempts_circuit_station_uq")
      .on(t.circuitId, t.stationId)
      .where(sql`${t.circuitId} is not null`),
  ],
);

export const osceCircuitsTable = pgTable(
  "osce_circuits",
  {
    id: pk(),
    ownerId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    examId: uuid("exam_id").references(() => examsTable.id, { onDelete: "set null" }),
    title: text("title").notNull().default("Practice circuit"),
    plan: jsonb("plan").$type<Record<string, unknown>>().notNull().default({}),
    config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
    stationOrder: jsonb("station_order").$type<(string | null)[]>().notNull().default([]), // null = rest station
    currentIndex: integer("current_index").notNull().default(0),
    status: osceStatusEnum("status").notNull().default("in_progress"),
    startedAt: tstz("started_at"),
    finishedAt: tstz("finished_at"),
    completedAt: tstz("completed_at"),
    ...timestamps,
  },
  (t) => [index("osce_circuits_user_created_idx").on(t.ownerId, t.createdAt)],
);

export const osceRoomsTable = pgTable(
  "osce_rooms",
  {
    id: pk(),
    code: text("code").notNull(), // shareable room link code
    stationId: uuid("station_id").notNull().references(() => osceStationsTable.id, { onDelete: "cascade" }),
    hostId: text("host_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    candidateId: text("candidate_id").references(() => users.id, { onDelete: "set null" }),
    examinerId: text("examiner_id").references(() => users.id, { onDelete: "set null" }),
    status: roomStatusEnum("status").notNull().default("waiting"),
    expiresAt: tstz("expires_at").notNull(),
    clock: jsonb("clock").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps,
  },
  (t) => [uniqueIndex("osce_rooms_code_uq").on(t.code), index("osce_rooms_host_created_idx").on(t.hostId, t.createdAt)],
);

// ---- insert schemas & row types (generated pattern: one pair per table) ----
export const insertOsceStationSchema = createInsertSchema(osceStationsTable).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export type InsertOsceStation = z.infer<typeof insertOsceStationSchema>;
export type OsceStation = typeof osceStationsTable.$inferSelect;
export const insertOsceMarkingDomainSchema = createInsertSchema(osceMarkingDomainsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOsceMarkingDomain = z.infer<typeof insertOsceMarkingDomainSchema>;
export type OsceMarkingDomain = typeof osceMarkingDomainsTable.$inferSelect;
export const insertOsceAttemptSchema = createInsertSchema(osceAttemptsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOsceAttempt = z.infer<typeof insertOsceAttemptSchema>;
export type OsceAttempt = typeof osceAttemptsTable.$inferSelect;
export const insertOsceCircuitSchema = createInsertSchema(osceCircuitsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOsceCircuit = z.infer<typeof insertOsceCircuitSchema>;
export type OsceCircuit = typeof osceCircuitsTable.$inferSelect;
export const insertOsceRoomSchema = createInsertSchema(osceRoomsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOsceRoom = z.infer<typeof insertOsceRoomSchema>;
export type OsceRoom = typeof osceRoomsTable.$inferSelect;
