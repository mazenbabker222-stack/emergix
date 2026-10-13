import { and, asc, eq, ilike, isNotNull, isNull, or, sql, type SQL } from "drizzle-orm";
import type { Exam, ExamFormat } from "@workspace/db/schema";
import { loadDb } from "../lib/database";

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

/** Escape LIKE wildcards so user input is matched literally. */
const likePattern = (q: string) => `%${q.replace(/[\\%_]/g, "\\$&")}%`;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Public "Exam structure" rows, derived from the exam format that admins edit (phase 02 `exams.format`). */
export function examSections(format: ExamFormat) {
  if (format.kind === "osce" && format.stations) {
    const reading = format.readingMinutes ?? 0;
    const per = format.stationMinutes ?? null;
    const sections = [
      {
        name: "Assessed stations",
        itemCount: format.stations,
        itemLabel: "stations",
        minutes: per === null ? null : per * format.stations,
        notes:
          per === null
            ? null
            : `${plural(per, "minute", "minutes")} per station${reading ? `, plus ${plural(reading, "minute", "minutes")} reading time before each` : ""}`,
      },
    ];
    if (format.restStations) {
      sections.push({ name: "Rest stations", itemCount: format.restStations, itemLabel: "rest stations", minutes: null, notes: null });
    }
    return sections;
  }
  const label = format.kind === "sba" ? "SBA questions" : "questions";
  return format.sections.map((s) => ({
    name: s.name,
    itemCount: s.questions ?? null,
    itemLabel: label,
    minutes: s.durationMinutes ?? null,
    notes: s.breakAfterMinutes ? `${plural(s.breakAfterMinutes, "minute", "minutes")} break afterwards` : null,
  }));
}

function examFacts(e: Exam) {
  const format = e.format;
  const breakMinutes = format.sections.reduce((sum, s) => sum + (s.breakAfterMinutes ?? 0), 0);
  return {
    id: e.id,
    slug: e.slug,
    name: e.name,
    shortName: e.shortName,
    examType: e.examType || (format.kind === "osce" ? "Clinical exam (OSCE)" : "Written exam (SBA)"),
    summary: e.summary,
    format: e.formatLabel || e.summary,
    totalQuestions: format.totalQuestions ?? null,
    totalMinutes: format.totalMinutes ?? null,
    breakMinutes: breakMinutes > 0 ? breakMinutes : null,
    location: e.location,
    sortOrder: e.position,
  };
}

export async function listExams() {
  const { db, examsTable } = await loadDb();
  const rows = await db
    .select()
    .from(examsTable)
    .where(and(eq(examsTable.status, "published"), isNull(examsTable.deletedAt)))
    .orderBy(asc(examsTable.position), asc(examsTable.name));
  return rows.map(examFacts);
}

export async function listFaqs(filter: { exam?: string; category?: string; q?: string }) {
  const { db, examFaqsTable, examsTable } = await loadDb();
  const where: (SQL | undefined)[] = [eq(examFaqsTable.status, "published"), isNull(examFaqsTable.deletedAt)];
  if (filter.exam) where.push(eq(examsTable.slug, filter.exam));
  if (filter.category) where.push(eq(examFaqsTable.category, filter.category));
  if (filter.q) {
    const pattern = likePattern(filter.q);
    where.push(or(ilike(examFaqsTable.question, pattern), ilike(examFaqsTable.answer, pattern)));
  }
  const rows = await db
    .select({ faq: examFaqsTable, examSlug: examsTable.slug })
    .from(examFaqsTable)
    .leftJoin(examsTable, eq(examFaqsTable.examId, examsTable.id))
    .where(and(...where))
    .orderBy(asc(examFaqsTable.position), asc(examFaqsTable.createdAt));
  return rows.map(({ faq, examSlug }) => ({
    id: faq.id,
    examSlug: examSlug ?? null,
    category: faq.category ?? "general",
    question: faq.question,
    answer: faq.answer,
    sortOrder: faq.position,
  }));
}

/** The phase 02 column stores the fee as a decimal string ("100.00"); the public API uses minor units. */
const toMinor = (amount: string | null) => (amount === null ? null : Math.round(Number(amount) * 100));

export async function listExamDates(examSlug?: string) {
  const { db, examDatesTable, examsTable } = await loadDb();
  const where: (SQL | undefined)[] = [
    eq(examDatesTable.status, "published"),
    isNull(examDatesTable.deletedAt),
    eq(examsTable.status, "published"),
    isNull(examsTable.deletedAt),
    // Keep the table useful: hide sittings that finished more than 60 days ago.
    sql`${examDatesTable.startsOn} >= current_date - interval '60 days'`,
  ];
  if (examSlug) where.push(eq(examsTable.slug, examSlug));
  const rows = await db
    .select({ d: examDatesTable, examSlug: examsTable.slug, examName: examsTable.name })
    .from(examDatesTable)
    .innerJoin(examsTable, eq(examDatesTable.examId, examsTable.id))
    .where(and(...where))
    .orderBy(asc(examDatesTable.startsOn), asc(examsTable.position));
  const lastUpdated = rows.reduce<Date | null>((acc, { d }) => (!acc || d.updatedAt > acc ? d.updatedAt : acc), null);
  const items = rows.map(({ d, examSlug: slug, examName }) => ({
    id: d.id,
    examSlug: slug,
    examName,
    label: d.label,
    startDate: d.startsOn,
    endDate: d.endsOn,
    location: d.location,
    applicationOpens: d.applicationOpensOn,
    applicationCloses: d.applicationClosesOn,
    feeMinor: toMinor(d.feeAmount),
    feeCurrency: d.feeCurrency,
    isPlaceholder: d.isPlaceholder,
    notes: d.notes,
  }));
  return { items, lastUpdated: iso(lastUpdated) };
}

export async function listDocuments(examSlug?: string) {
  const { db, examDocumentsTable, examsTable } = await loadDb();
  const where: (SQL | undefined)[] = [
    eq(examDocumentsTable.status, "published"),
    isNull(examDocumentsTable.deletedAt),
    // Uploaded files need signed URLs (phase 07); until then only documents with an external link are public.
    isNotNull(examDocumentsTable.externalUrl),
  ];
  // Documents with no exam apply to every exam, so they are included for an exam filter too.
  if (examSlug) where.push(or(eq(examsTable.slug, examSlug), isNull(examDocumentsTable.examId)));
  const rows = await db
    .select({ doc: examDocumentsTable, examSlug: examsTable.slug })
    .from(examDocumentsTable)
    .leftJoin(examsTable, eq(examDocumentsTable.examId, examsTable.id))
    .where(and(...where))
    .orderBy(asc(examDocumentsTable.position), asc(examDocumentsTable.title));
  return rows.map(({ doc, examSlug: slug }) => ({
    id: doc.id,
    examSlug: slug ?? null,
    title: doc.title,
    description: doc.description,
    url: doc.externalUrl ?? "",
    fileType: doc.fileType,
    sizeBytes: doc.sizeBytes,
  }));
}

export async function getExamBySlug(slug: string) {
  const { db, examsTable } = await loadDb();
  const [exam] = await db
    .select()
    .from(examsTable)
    .where(and(eq(examsTable.slug, slug), eq(examsTable.status, "published"), isNull(examsTable.deletedAt)))
    .limit(1);
  if (!exam) return null;
  const [faqs, dates, documents] = await Promise.all([
    // Only this exam's own FAQs on its page (general FAQs live in the Help Centre).
    listFaqs({ exam: slug }),
    listExamDates(slug),
    listDocuments(slug),
  ]);
  return {
    ...examFacts(exam),
    sections: examSections(exam.format),
    content: exam.description,
    officialUrl: exam.officialUrl,
    lastReviewedAt: iso(exam.lastReviewedAt),
    faqs,
    dates: dates.items,
    documents,
  };
}
