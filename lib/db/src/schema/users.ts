import { relations } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { randomUUID } from 'node:crypto';
import { z } from 'zod/v4';
import type { Role } from '@workspace/auth-shared';
import { examsTable } from './exams';

/**
 * Auth tables. Column names follow Better Auth's core schema (+ twoFactor plugin) so its
 * Drizzle adapter works unchanged; ids are text UUIDs generated here.
 * Phase 02 extended this file ONLY with nullable / defaulted columns (users.status, users.last_seen_at,
 * sessions.impersonated_by, user_profiles.*) so Better Auth keeps working unchanged.
 */
const id = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID());
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const users = pgTable('users', {
  id: id(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  role: text('role').$type<Role>().notNull().default('learner'),
  twoFactorEnabled: boolean('two_factor_enabled').notNull().default(false),
  /** 'suspended' users cannot use the app (enforced from the admin phase). */
  status: text('status').$type<'active' | 'suspended'>().notNull().default('active'),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  /** Set when the user asked to delete their account; purged after the cooldown. */
  deletionScheduledAt: timestamp('deletion_scheduled_at', { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const sessions = pgTable(
  'sessions',
  {
    id: id(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    /** Set when a superadmin impersonates the user (audited). */
    impersonatedBy: text('impersonated_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('sessions_user_created_idx').on(t.userId, t.createdAt)],
);

export const accounts = pgTable(
  'accounts',
  {
    id: id(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
    scope: text('scope'),
    /** Password hash for the credential provider. Never exported or logged. */
    password: text('password'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('accounts_user_idx').on(t.userId)],
);

export const verifications = pgTable(
  'verifications',
  {
    id: id(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('verifications_identifier_idx').on(t.identifier)],
);

/** TOTP secrets and backup codes (Better Auth twoFactor plugin; stored encrypted by the plugin). */
export const twoFactors = pgTable(
  'two_factors',
  {
    id: id(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    secret: text('secret').notNull(),
    backupCodes: text('backup_codes').notNull(),
    verified: boolean('verified').notNull().default(true),
    failedVerificationCount: integer('failed_verification_count').notNull().default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
  },
  (t) => [index('two_factors_user_idx').on(t.userId)],
);

export const userProfiles = pgTable('user_profiles', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  country: text('country'),
  specialty: text('specialty'),
  targetExam: text('target_exam'),
  targetExamDate: date('target_exam_date', { mode: 'string' }),
  // --- phase 02 additions (all optional / defaulted) ---
  grade: text('grade'),
  /** Structured target exam. `targetExam` (free text) is kept for the phase 03 account form; migrate the UI in phase 04. */
  targetExamId: uuid('target_exam_id').references(() => examsTable.id, { onDelete: 'set null' }),
  dailyGoalQuestions: integer('daily_goal_questions').notNull().default(20),
  marketingOptIn: boolean('marketing_opt_in').notNull().default(false),
  preferences: jsonb('preferences').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Known devices per user (fingerprint = hash of the user agent) for new-device alerts. */
export const devices = pgTable(
  'devices',
  {
    id: id(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    fingerprint: text('fingerprint').notNull(),
    userAgent: text('user_agent'),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('devices_user_fingerprint_uq').on(t.userId, t.fingerprint)],
);

/** Failed sign-in counters keyed by normalised e-mail (also for unknown e-mails: no enumeration). */
export const authLockouts = pgTable('auth_lockouts', {
  email: text('email').primaryKey(),
  failedCount: integer('failed_count').notNull().default(0),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
  lastFailedAt: timestamp('last_failed_at', { withTimezone: true }).notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, { fields: [users.id], references: [userProfiles.userId] }),
  sessions: many(sessions),
  accounts: many(accounts),
  devices: many(devices),
}));

export const insertUserProfileSchema = createInsertSchema(userProfiles, {
  country: z.string().max(100).nullable(),
  specialty: z.string().max(100).nullable(),
  targetExam: z.string().max(100).nullable(),
}).omit({ createdAt: true, updatedAt: true });

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type Device = typeof devices.$inferSelect;
