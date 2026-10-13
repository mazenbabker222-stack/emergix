import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { boolean, index, integer, jsonb, numeric, pgEnum, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { pk, timestamps, softDelete, tstz } from "./_helpers";
import { users } from "./users";
import { examsTable, publishStatusEnum } from "./exams";

export const plansTable = pgTable(
  "plans",
  {
    id: pk(),
    examId: uuid("exam_id").references(() => examsTable.id, { onDelete: "set null" }), // null = bundle / all exams
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    features: jsonb("features").$type<string[]>().notNull().default([]),
    accessMonths: integer("access_months").notNull(),
    trialDays: integer("trial_days").notNull().default(0),
    isPlaceholder: boolean("is_placeholder").notNull().default(false),
    /** Public pricing page (phase 04): plans sharing a family key render as one card with a duration picker. */
    familyKey: text("family_key"),
    familyName: text("family_name"),
    isFeatured: boolean("is_featured").notNull().default(false),
    stripeProductId: text("stripe_product_id"),
    position: integer("position").notNull().default(0),
    status: publishStatusEnum("status").notNull().default("draft"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [uniqueIndex("plans_slug_uq").on(t.slug), index("plans_exam_status_idx").on(t.examId, t.status)],
);

export const planPricesTable = pgTable(
  "plan_prices",
  {
    id: pk(),
    planId: uuid("plan_id").notNull().references(() => plansTable.id, { onDelete: "cascade" }),
    currency: text("currency").notNull(),
    region: text("region").notNull().default("ALL"), // "ALL" = default; ISO country code for regional pricing (NOT NULL so the unique index works)
    amountMinor: integer("amount_minor").notNull(), // pence/cents
    stripePriceId: text("stripe_price_id"),
    ...timestamps,
  },
  (t) => [uniqueIndex("plan_prices_plan_currency_region_uq").on(t.planId, t.currency, t.region), index("plan_prices_plan_idx").on(t.planId)],
);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trialing", "active", "past_due", "canceled", "incomplete", "expired", "refunded",
]);

export const subscriptionsTable = pgTable(
  "subscriptions",
  {
    id: pk(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    planId: uuid("plan_id").notNull().references(() => plansTable.id, { onDelete: "restrict" }),
    status: subscriptionStatusEnum("status").notNull(),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    currentPeriodStart: tstz("current_period_start"),
    currentPeriodEnd: tstz("current_period_end"),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    canceledAt: tstz("canceled_at"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("subscriptions_stripe_sub_uq").on(t.stripeSubscriptionId),
    index("subscriptions_user_created_idx").on(t.userId, t.createdAt),
    index("subscriptions_user_status_idx").on(t.userId, t.status),
  ],
);

export const entitlementSourceEnum = pgEnum("entitlement_source", ["subscription", "manual", "licence", "coupon", "free"]);

/** What a user may access. Content checks read this table, never Stripe directly. */
export const entitlementsTable = pgTable(
  "entitlements",
  {
    id: pk(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    examId: uuid("exam_id").notNull().references(() => examsTable.id, { onDelete: "cascade" }),
    source: entitlementSourceEnum("source").notNull(),
    subscriptionId: uuid("subscription_id").references(() => subscriptionsTable.id, { onDelete: "set null" }),
    grantedBy: text("granted_by").references(() => users.id, { onDelete: "set null" }),
    startsAt: tstz("starts_at").notNull().defaultNow(),
    endsAt: tstz("ends_at"),
    revokedAt: tstz("revoked_at"),
    ...timestamps,
  },
  (t) => [index("entitlements_user_exam_idx").on(t.userId, t.examId), index("entitlements_subscription_idx").on(t.subscriptionId)],
);

export const couponKindEnum = pgEnum("coupon_kind", ["percent", "amount"]);

export const couponsTable = pgTable(
  "coupons",
  {
    id: pk(),
    code: text("code").notNull(),
    kind: couponKindEnum("kind").notNull(),
    percentOff: numeric("percent_off", { precision: 5, scale: 2 }),
    amountOffMinor: integer("amount_off_minor"),
    currency: text("currency"),
    maxRedemptions: integer("max_redemptions"),
    redeemedCount: integer("redeemed_count").notNull().default(0),
    validFrom: tstz("valid_from"),
    validUntil: tstz("valid_until"),
    stripeCouponId: text("stripe_coupon_id"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
    ...softDelete,
  },
  (t) => [uniqueIndex("coupons_code_uq").on(t.code)],
);

export const couponRedemptionsTable = pgTable(
  "coupon_redemptions",
  {
    id: pk(),
    couponId: uuid("coupon_id").notNull().references(() => couponsTable.id, { onDelete: "restrict" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    subscriptionId: uuid("subscription_id").references(() => subscriptionsTable.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [uniqueIndex("coupon_redemptions_coupon_user_uq").on(t.couponId, t.userId), index("coupon_redemptions_user_created_idx").on(t.userId, t.createdAt)],
);

export const invoicesTable = pgTable(
  "invoices",
  {
    id: pk(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    subscriptionId: uuid("subscription_id").references(() => subscriptionsTable.id, { onDelete: "set null" }),
    stripeInvoiceId: text("stripe_invoice_id"),
    number: text("number"),
    currency: text("currency").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    status: text("status").notNull(),
    hostedUrl: text("hosted_url"),
    pdfUrl: text("pdf_url"),
    paidAt: tstz("paid_at"),
    refundedMinor: integer("refunded_minor").notNull().default(0),
    ...timestamps,
  },
  (t) => [uniqueIndex("invoices_stripe_invoice_uq").on(t.stripeInvoiceId), index("invoices_user_created_idx").on(t.userId, t.createdAt)],
);

export const licencesTable = pgTable(
  "licences",
  {
    id: pk(),
    organisation: text("organisation").notNull(),
    ownerId: text("owner_id").references(() => users.id, { onDelete: "set null" }),
    examId: uuid("exam_id").references(() => examsTable.id, { onDelete: "set null" }),
    seats: integer("seats").notNull(),
    startsAt: tstz("starts_at").notNull(),
    endsAt: tstz("ends_at").notNull(),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index("licences_exam_idx").on(t.examId)],
);

export const licenceSeatsTable = pgTable(
  "licence_seats",
  {
    id: pk(),
    licenceId: uuid("licence_id").notNull().references(() => licencesTable.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    inviteEmail: text("invite_email"),
    ...timestamps,
  },
  (t) => [uniqueIndex("licence_seats_licence_user_uq").on(t.licenceId, t.userId), index("licence_seats_licence_idx").on(t.licenceId)],
);

/** Idempotency table: a Stripe event is processed at most once. */
export const webhookEventsTable = pgTable(
  "webhook_events",
  {
    id: pk(),
    stripeEventId: text("stripe_event_id").notNull(),
    type: text("type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    processedAt: tstz("processed_at"),
    error: text("error"),
    ...timestamps,
  },
  (t) => [uniqueIndex("webhook_events_stripe_event_uq").on(t.stripeEventId), index("webhook_events_type_created_idx").on(t.type, t.createdAt)],
);

// ---- insert schemas & row types (generated pattern: one pair per table) ----
export const insertPlanSchema = createInsertSchema(plansTable).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type Plan = typeof plansTable.$inferSelect;
export const insertPlanPriceSchema = createInsertSchema(planPricesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlanPrice = z.infer<typeof insertPlanPriceSchema>;
export type PlanPrice = typeof planPricesTable.$inferSelect;
export const insertSubscriptionSchema = createInsertSchema(subscriptionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptionsTable.$inferSelect;
export const insertEntitlementSchema = createInsertSchema(entitlementsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEntitlement = z.infer<typeof insertEntitlementSchema>;
export type Entitlement = typeof entitlementsTable.$inferSelect;
export const insertCouponSchema = createInsertSchema(couponsTable).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export type InsertCoupon = z.infer<typeof insertCouponSchema>;
export type Coupon = typeof couponsTable.$inferSelect;
export const insertCouponRedemptionSchema = createInsertSchema(couponRedemptionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCouponRedemption = z.infer<typeof insertCouponRedemptionSchema>;
export type CouponRedemption = typeof couponRedemptionsTable.$inferSelect;
export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoicesTable.$inferSelect;
export const insertLicenceSchema = createInsertSchema(licencesTable).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export type InsertLicence = z.infer<typeof insertLicenceSchema>;
export type Licence = typeof licencesTable.$inferSelect;
export const insertLicenceSeatSchema = createInsertSchema(licenceSeatsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLicenceSeat = z.infer<typeof insertLicenceSeatSchema>;
export type LicenceSeat = typeof licenceSeatsTable.$inferSelect;
export const insertWebhookEventSchema = createInsertSchema(webhookEventsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWebhookEvent = z.infer<typeof insertWebhookEventSchema>;
export type WebhookEvent = typeof webhookEventsTable.$inferSelect;
