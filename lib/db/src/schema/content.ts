import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { boolean, index, jsonb, pgEnum, pgTable, text, uniqueIndex, uuid, integer } from "drizzle-orm/pg-core";
import { pk, timestamps, softDelete, tstz } from "./_helpers";
import { users } from "./users";
import { publishStatusEnum } from "./exams";
import { mediaAssetsTable } from "./courses";

export const pagesTable = pgTable(
  "pages",
  {
    id: pk(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""), // Markdown
    kind: text("kind").notNull().default("page"), // page | legal | help | demo
    /** Structured content (e.g. free-demo questions). */
    data: jsonb("data").$type<Record<string, unknown>>(),
    /** Shows the "REVIEW BY LEGAL COUNSEL" notice while true. */
    needsReview: boolean("needs_review").notNull().default(false),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    status: publishStatusEnum("status").notNull().default("draft"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [uniqueIndex("pages_slug_uq").on(t.slug), index("pages_kind_status_idx").on(t.kind, t.status)],
);

export const blogPostsTable = pgTable(
  "blog_posts",
  {
    id: pk(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull().default(""),
    body: text("body").notNull().default(""),
    coverAssetId: uuid("cover_asset_id").references(() => mediaAssetsTable.id, { onDelete: "set null" }),
    authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
    /** Public byline and cover URL (phase 04); authorId/coverAssetId take over when accounts and the media library are used. */
    authorName: text("author_name").notNull().default("Exam Platform team"),
    coverImageUrl: text("cover_image_url"),
    tags: text("tags").array().notNull().default([]),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    publishedAt: tstz("published_at"),
    status: publishStatusEnum("status").notNull().default("draft"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [uniqueIndex("blog_posts_slug_uq").on(t.slug), index("blog_posts_status_published_idx").on(t.status, t.publishedAt)],
);

export const testimonialsTable = pgTable(
  "testimonials",
  {
    id: pk(),
    authorName: text("author_name").notNull(),
    authorRole: text("author_role"),
    quote: text("quote").notNull(),
    consentRecorded: boolean("consent_recorded").notNull().default(false), // real, consented only
    position: integer("position").notNull().default(0),
    status: publishStatusEnum("status").notNull().default("draft"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index("testimonials_status_position_idx").on(t.status, t.position)],
);

export const contactStatusEnum = pgEnum("contact_status", ["new", "in_progress", "resolved", "spam"]);

export const contactMessagesTable = pgTable(
  "contact_messages",
  {
    id: pk(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    subject: text("subject"),
    message: text("message").notNull(),
    /** Salted SHA-256 of the sender IP; the raw IP is never stored. */
    ipHash: text("ip_hash"),
    emailedAt: tstz("emailed_at"),
    status: contactStatusEnum("status").notNull().default("new"),
    internalNotes: jsonb("internal_notes").$type<{ at: string; by: string; note: string }[]>().notNull().default([]),
    ...timestamps,
  },
  (t) => [index("contact_messages_status_created_idx").on(t.status, t.createdAt)],
);

export const emailTemplatesTable = pgTable(
  "email_templates",
  {
    id: pk(),
    key: text("key").notNull(),
    subject: text("subject").notNull(),
    bodyHtml: text("body_html").notNull(),
    bodyText: text("body_text"),
    ...timestamps,
  },
  (t) => [uniqueIndex("email_templates_key_uq").on(t.key)],
);

export const emailLogTable = pgTable(
  "email_log",
  {
    id: pk(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    toEmail: text("to_email").notNull(),
    templateKey: text("template_key"),
    subject: text("subject").notNull(),
    providerMessageId: text("provider_message_id"),
    status: text("status").notNull().default("queued"),
    error: text("error"),
    ...timestamps,
  },
  (t) => [index("email_log_user_created_idx").on(t.userId, t.createdAt)],
);

export const featureFlagsTable = pgTable(
  "feature_flags",
  {
    id: pk(),
    key: text("key").notNull(),
    description: text("description"),
    enabled: boolean("enabled").notNull().default(false),
    rollout: jsonb("rollout").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps,
  },
  (t) => [uniqueIndex("feature_flags_key_uq").on(t.key)],
);

export const settingsTable = pgTable(
  "settings",
  {
    id: pk(),
    key: text("key").notNull(),
    value: jsonb("value").$type<unknown>().notNull(),
    isPublic: boolean("is_public").notNull().default(false),
    ...timestamps,
  },
  (t) => [uniqueIndex("settings_key_uq").on(t.key)],
);

// ---- insert schemas & row types (generated pattern: one pair per table) ----
export const insertPageSchema = createInsertSchema(pagesTable).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export type InsertPage = z.infer<typeof insertPageSchema>;
export type Page = typeof pagesTable.$inferSelect;
export const insertBlogPostSchema = createInsertSchema(blogPostsTable).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPostsTable.$inferSelect;
export const insertTestimonialSchema = createInsertSchema(testimonialsTable).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export type InsertTestimonial = z.infer<typeof insertTestimonialSchema>;
export type Testimonial = typeof testimonialsTable.$inferSelect;
export const insertContactMessageSchema = createInsertSchema(contactMessagesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;
export type ContactMessage = typeof contactMessagesTable.$inferSelect;
export const insertEmailTemplateSchema = createInsertSchema(emailTemplatesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type EmailTemplate = typeof emailTemplatesTable.$inferSelect;
export const insertEmailLogSchema = createInsertSchema(emailLogTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;
export type EmailLog = typeof emailLogTable.$inferSelect;
export const insertFeatureFlagSchema = createInsertSchema(featureFlagsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFeatureFlag = z.infer<typeof insertFeatureFlagSchema>;
export type FeatureFlag = typeof featureFlagsTable.$inferSelect;
export const insertSettingSchema = createInsertSchema(settingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Setting = typeof settingsTable.$inferSelect;
