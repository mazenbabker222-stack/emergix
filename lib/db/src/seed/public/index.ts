/**
 * Public-site content for the seed (phase 04): exam texts, FAQs, dates, documents, banner, legal pages,
 * free demo, blog and the plan catalogue. Every row has a deterministic primary key and is inserted with
 * ON CONFLICT DO NOTHING, so running the seed again never duplicates rows or overwrites admin edits.
 * All fees, dates and prices are PLACEHOLDERS until the owner confirms them.
 */
import { and, eq, inArray, isNull } from "drizzle-orm";
import * as s from "../../schema";
import type { SeedDb } from "../index";
import { detId } from "../ids";
import { SEED_EXAMS } from "../exams";
import { banner, blogPosts, freeDemo, legalPages, plans } from "./content";
import { dates, documents, exams as publicExams, faqs, OFFICIAL_URL } from "./exams";

const examId = (slug: string) => detId("exam", slug);

/** Rows written by the phase 02 seed that the richer phase 04 content replaces (same exams, better text). */
function legacyPlaceholderIds() {
  return {
    faqs: SEED_EXAMS.flatMap((e) => Array.from({ length: 6 }, (_, i) => detId("faq", `${e.slug}:${i}`))),
    dates: SEED_EXAMS.flatMap((e) => e.dates.map((_, i) => detId("exam-date", `${e.slug}:${i}`))),
    plans: ["access-1-month", "access-3-months", "all-exams-12-months"].map((slug) => detId("plan", slug)),
  };
}

/** Plans are one row per duration (phase 02 model); a family key groups them into one pricing card. */
export function expandPlans() {
  return plans.flatMap((family) =>
    family.prices.map((price) => {
      const slug = family.prices.length === 1 ? family.slug : `${family.slug}-${price.intervalMonths}m`;
      return {
        slug,
        family,
        months: price.intervalMonths,
        prices: [
          { currency: "GBP", amountMinor: price.amountMinor },
          // PLACEHOLDER conversion, rounded to whole dollars.
          { currency: "USD", amountMinor: Math.round((price.amountMinor * 1.25) / 100) * 100 },
        ],
      };
    }),
  );
}

export async function seedPublicContent(tx: SeedDb): Promise<void> {
  const reviewedAt = new Date();

  // 0. Remove the generic phase 02 placeholders that this richer content replaces (exact deterministic ids only).
  const legacy = legacyPlaceholderIds();
  await tx.delete(s.examFaqsTable).where(inArray(s.examFaqsTable.id, legacy.faqs));
  await tx.delete(s.examDatesTable).where(inArray(s.examDatesTable.id, legacy.dates));
  await tx.delete(s.plansTable).where(inArray(s.plansTable.id, legacy.plans));

  // 1. Exam texts: fill only rows that have not been edited yet (exam_type is '' until then).
  for (const e of publicExams) {
    await tx
      .update(s.examsTable)
      .set({
        examType: e.examType,
        formatLabel: e.format,
        summary: e.summary,
        description: e.content,
        location: e.location,
        officialUrl: OFFICIAL_URL,
        lastReviewedAt: reviewedAt,
      })
      .where(and(eq(s.examsTable.id, examId(e.slug)), eq(s.examsTable.examType, ""), isNull(s.examsTable.deletedAt)));
  }

  // 2. FAQs (exam_id NULL = general FAQ)
  await tx
    .insert(s.examFaqsTable)
    .values(
      faqs.map((f, i) => ({
        id: detId("faq-public", f.key),
        examId: f.exam ? examId(f.exam) : null,
        category: f.category,
        question: f.q,
        answer: f.a,
        position: (i % 20) * 10,
        status: "published" as const,
      })),
    )
    .onConflictDoNothing();

  // 3. Dates (fee stored as decimal pounds in the phase 02 column)
  await tx
    .insert(s.examDatesTable)
    .values(
      dates.map((d) => ({
        id: detId("exam-date-public", d.key),
        examId: examId(d.exam),
        label: d.label,
        startsOn: d.start,
        endsOn: d.end,
        applicationOpensOn: d.opens,
        applicationClosesOn: d.closes,
        feeAmount: (d.fee / 100).toFixed(2),
        feeCurrency: "GBP",
        isPlaceholder: true,
        notes: "PLACEHOLDER: confirm on the official site.",
        status: "published" as const,
      })),
    )
    .onConflictDoNothing();

  // 4. Documents and the announcement banner
  await tx
    .insert(s.examDocumentsTable)
    .values(
      documents.map((d) => ({
        id: detId("exam-doc", d.key),
        examId: examId(d.exam),
        title: d.title,
        description: d.description,
        externalUrl: d.url,
        fileType: d.fileType,
        position: d.sortOrder,
        status: "published" as const,
      })),
    )
    .onConflictDoNothing();
  await tx
    .insert(s.bannersTable)
    .values({
      id: detId("banner", banner.key),
      examId: null,
      message: banner.message,
      linkUrl: banner.linkUrl,
      linkLabel: banner.linkLabel,
      tone: banner.variant,
      dismissible: true,
      status: "published",
    })
    .onConflictDoNothing();

  // 5. CMS pages (legal pages + free demo) and blog
  await tx
    .insert(s.pagesTable)
    .values([
      ...legalPages.map((p) => ({ ...p, kind: "legal", needsReview: true, data: null })),
      { ...freeDemo, kind: "demo", needsReview: false },
    ].map(({ description, ...p }) => ({
      id: detId("page", p.slug),
      ...p,
      seoDescription: description,
      status: "published" as const,
    })))
    .onConflictDoNothing();
  await tx
    .insert(s.blogPostsTable)
    .values(
      blogPosts.map((p) => ({
        id: detId("blog", p.slug),
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        body: p.body,
        tags: p.tags,
        authorName: "Emergix Academy team",
        publishedAt: new Date(p.publishedAt),
        status: "published" as const,
      })),
    )
    .onConflictDoNothing();

  // 6. Plans (one row per duration) and prices (GBP + USD, PLACEHOLDERS)
  const rows = expandPlans();
  await tx
    .insert(s.plansTable)
    .values(
      rows.map((r) => ({
        id: detId("plan", r.slug),
        slug: r.slug,
        name: `${r.family.name} (${r.months === 0 ? "free" : `${r.months} month${r.months === 1 ? "" : "s"}`})`,
        examId: r.family.exam ? examId(r.family.exam) : null,
        description: r.family.description,
        features: r.family.features,
        accessMonths: r.months,
        familyKey: r.family.slug,
        familyName: r.family.name,
        isFeatured: r.family.isFeatured,
        isPlaceholder: true,
        position: r.family.sortOrder + r.months,
        status: "published" as const,
      })),
    )
    .onConflictDoNothing();
  await tx
    .insert(s.planPricesTable)
    .values(
      rows.flatMap((r) =>
        r.prices.map((p) => ({
          id: detId("price", `${r.slug}:${p.currency}`),
          planId: detId("plan", r.slug),
          currency: p.currency,
          region: "ALL",
          amountMinor: p.amountMinor,
        })),
      ),
    )
    .onConflictDoNothing();
}

export const PUBLIC_SEED_COUNTS = {
  examFaqs: faqs.length,
  examDates: dates.length,
  examDocuments: documents.length,
  pages: legalPages.length + 1,
  blogPosts: blogPosts.length,
  plans: expandPlans().length,
  planPrices: expandPlans().length * 2,
} as const;
