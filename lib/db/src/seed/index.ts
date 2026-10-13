import { createHash } from "node:crypto";
import { count, like } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as s from "../schema";
import { detId } from "./ids";
import { hashPassword, randomPassword } from "./password";
import { EXAM_DISCLAIMER, SEED_EXAMS } from "./exams";
import { SEED_DIFFICULTY, SEED_TOPICS } from "./taxonomy";
import { SEED_QUESTIONS } from "./questions";
import { DEMO_EMAIL_DOMAIN, DEMO_USERS, SAMPLE_LESSON_BODY, SEED_COURSES } from "./catalog";
import { PUBLIC_SEED_COUNTS, seedPublicContent } from "./public";

export type SeedDb = NodePgDatabase<typeof s>;
export type NewCredential = { email: string; role: string; password: string };
export type SeedResult = { newCredentials: NewCredential[] };
export { EXAM_DISCLAIMER, seedPublicContent };

const LABELS = ["A", "B", "C", "D"] as const;

/**
 * Idempotent seed. Every row has a deterministic primary key (or a natural unique key) and is inserted with
 * ON CONFLICT DO NOTHING, so running it repeatedly neither duplicates rows nor overwrites edits made in the admin panel.
 */
export async function runSeed(db: SeedDb): Promise<SeedResult> {
  const newCredentials: NewCredential[] = [];

  await db.transaction(async (tx) => {
    // ---- difficulty levels
    await tx.insert(s.difficultyLevelsTable).values(
      SEED_DIFFICULTY.map((d) => ({ id: detId("difficulty", d.slug), ...d })),
    ).onConflictDoNothing();

    // ---- exams, FAQs, dates
    const examId = (slug: string) => detId("exam", slug);
    await tx.insert(s.examsTable).values(SEED_EXAMS.map((e) => ({
      id: examId(e.slug), slug: e.slug, name: e.name, shortName: e.shortName, summary: e.summary, description: e.description,
      format: e.format, simulatorPreset: e.simulatorPreset, position: e.position, status: "published" as const,
      location: "PLACEHOLDER location", officialUrl: "https://www.rcem.ac.uk/",
    }))).onConflictDoNothing();

    // FAQs, dates, documents, banner, CMS pages, blog and plans: see ./public (phase 04) — called after the exams above.

    // ---- topics (6 parents, 2 children each)
    const topicId = (slug: string) => detId("topic", slug);
    await tx.insert(s.topicsTable).values(SEED_TOPICS.map((t, i) => ({ id: topicId(t.slug), slug: t.slug, name: t.name, parentId: null, position: i }))).onConflictDoNothing();
    await tx.insert(s.topicsTable).values(SEED_TOPICS.flatMap((t) =>
      t.subs.map((c, i) => ({ id: topicId(c.slug), slug: c.slug, name: c.name, parentId: topicId(t.slug), position: i })))).onConflictDoNothing();

    // ---- 60 SAMPLE SBA questions with option rationales
    const rows = SEED_QUESTIONS.map((sq, i) => {
      const qid = detId("question", String(i + 1));
      const exam = SEED_EXAMS[i % 2]!.slug; // alternate Primary / SBA: 30 each
      const opts: { text: string; rationale: string; isCorrect: boolean }[] = [];
      const pos = i % 4;
      const wrong = [...sq.wrong];
      for (let k = 0; k < 4; k++) {
        if (k === pos) opts.push({ text: sq.correct[0], rationale: sq.correct[1], isCorrect: true });
        else { const w = wrong.shift()!; opts.push({ text: w[0], rationale: w[1], isCorrect: false }); }
      }
      return { sq, qid, exam, opts };
    });
    await tx.insert(s.questionsTable).values(rows.map(({ sq, qid, exam }) => ({
      id: qid, examId: examId(exam), type: "sba" as const, stem: sq.stem,
      explanation: `SAMPLE (not clinical advice). ${sq.kp}`, keyPoint: sq.kp, status: "published" as const, isSample: true,
      sourceLabel: "SAMPLE", difficultyId: detId("difficulty", sq.d), contentHash: createHash("sha1").update(sq.stem).digest("hex"),
    }))).onConflictDoNothing();
    await tx.insert(s.questionOptionsTable).values(rows.flatMap(({ qid, opts }) =>
      opts.map((o, k) => ({ id: detId("option", `${qid}:${k}`), questionId: qid, label: LABELS[k]!, text: o.text, rationale: o.rationale, isCorrect: o.isCorrect, position: k })))).onConflictDoNothing();
    await tx.insert(s.questionTopicsTable).values(rows.map(({ sq, qid }) => ({ questionId: qid, topicId: topicId(sq.sub) }))).onConflictDoNothing();

    await seedPublicContent(tx);

    // ---- demo users (random passwords, printed once, never stored in plain text)
    for (const u of DEMO_USERS) {
      const email = `${u.key}@${DEMO_EMAIL_DOMAIN}`;
      const id = detId("user", u.key);
      const inserted = await tx.insert(s.users).values({ id, email, name: u.name, role: u.role, emailVerified: true }).onConflictDoNothing().returning({ id: s.users.id });
      if (inserted.length === 0) continue;
      const password = randomPassword();
      await tx.insert(s.accounts).values({ id: detId("account", u.key), userId: id, providerId: "credential", accountId: id, password: hashPassword(password) }).onConflictDoNothing();
      await tx.insert(s.userProfiles).values({ userId: id, specialty: "Emergency medicine", targetExamId: u.key === "learner" ? examId("mrcem-primary") : null }).onConflictDoNothing();
      newCredentials.push({ email, role: u.role, password });
    }

    // ---- sample courses (2) with modules and placeholder lessons
    const instructorId = detId("user", "instructor");
    for (const [ci, c] of SEED_COURSES.entries()) {
      const courseId = detId("course", c.slug);
      await tx.insert(s.coursesTable).values({ id: courseId, slug: c.slug, title: c.title, summary: c.summary, description: "SAMPLE course.", examId: examId(c.exam), instructorId, position: ci, status: "published" }).onConflictDoNothing();
      for (const [mi, m] of c.modules.entries()) {
        const moduleId = detId("module", `${c.slug}:${mi}`);
        await tx.insert(s.modulesTable).values({ id: moduleId, courseId, title: m.title, topicId: m.topic ? topicId(m.topic) : null, position: mi }).onConflictDoNothing();
        await tx.insert(s.lessonsTable).values(m.lessons.map((l, li) => ({
          id: detId("lesson", `${c.slug}:${mi}:${l.slug}`), moduleId, slug: l.slug, title: l.title, type: "article" as const,
          body: SAMPLE_LESSON_BODY, isFreePreview: l.preview, position: li, status: "published" as const,
        }))).onConflictDoNothing();
      }
    }
  });

  return { newCredentials };
}

/** Row counts used by the acceptance checks. */
export async function seedCounts(db: SeedDb) {
  const c = async (t: PgTable) => Number((await db.select({ n: count() }).from(t))[0]!.n);
  return {
    exams: await c(s.examsTable),
    examFaqs: await c(s.examFaqsTable),
    examDates: await c(s.examDatesTable),
    examDocuments: await c(s.examDocumentsTable),
    pages: await c(s.pagesTable),
    blogPosts: await c(s.blogPostsTable),
    topics: await c(s.topicsTable),
    difficultyLevels: await c(s.difficultyLevelsTable),
    questions: await c(s.questionsTable),
    questionOptions: await c(s.questionOptionsTable),
    plans: await c(s.plansTable),
    planPrices: await c(s.planPricesTable),
    courses: await c(s.coursesTable),
    modules: await c(s.modulesTable),
    lessons: await c(s.lessonsTable),
    // demo users only, so the check also works on a database that already has real accounts
    users: Number((await db.select({ n: count() }).from(s.users).where(like(s.users.email, `%@${DEMO_EMAIL_DOMAIN}`)))[0]!.n),
  };
}

/** Expected counts after a clean seed. */
export const EXPECTED_COUNTS = {
  exams: 3, examFaqs: PUBLIC_SEED_COUNTS.examFaqs, examDates: PUBLIC_SEED_COUNTS.examDates, examDocuments: PUBLIC_SEED_COUNTS.examDocuments, pages: PUBLIC_SEED_COUNTS.pages, blogPosts: PUBLIC_SEED_COUNTS.blogPosts, topics: 18, difficultyLevels: 3, questions: 60, questionOptions: 240,
  plans: PUBLIC_SEED_COUNTS.plans, planPrices: PUBLIC_SEED_COUNTS.planPrices, courses: 2, modules: 4, lessons: 8, users: 5,
} as const;
