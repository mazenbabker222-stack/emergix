import { and, desc, eq, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import { loadDb } from "../lib/database";

export async function listActiveBanners() {
  const { db, bannersTable } = await loadDb();
  const now = new Date();
  const rows = await db
    .select()
    .from(bannersTable)
    .where(
      and(
        eq(bannersTable.status, "published"),
        isNull(bannersTable.deletedAt),
        // Site-wide announcements only; exam-specific banners are shown on the exam page (later phase).
        isNull(bannersTable.examId),
        or(isNull(bannersTable.startsAt), lte(bannersTable.startsAt, now)),
        or(isNull(bannersTable.endsAt), sql`${bannersTable.endsAt} > ${now}`),
      ),
    )
    .orderBy(desc(bannersTable.createdAt));
  return rows.map((b) => ({
    id: b.id,
    message: b.message,
    linkUrl: b.linkUrl,
    linkLabel: b.linkLabel,
    variant: (["info", "warning", "success"] as const).find((v) => v === b.tone) ?? "info",
  }));
}

export async function getPageBySlug(slug: string) {
  const { db, pagesTable } = await loadDb();
  const [page] = await db
    .select()
    .from(pagesTable)
    .where(and(eq(pagesTable.slug, slug), eq(pagesTable.status, "published"), isNull(pagesTable.deletedAt)))
    .limit(1);
  if (!page) return null;
  return {
    slug: page.slug,
    title: page.title,
    description: page.seoDescription ?? "",
    body: page.body,
    data: page.data ?? null,
    needsReview: page.needsReview,
    updatedAt: page.updatedAt.toISOString(),
  };
}

/** Cursor = base64url({ t: publishedAt ISO, i: id }); keyset pagination on (published_at desc, id desc). */
export function encodeCursor(publishedAt: Date, id: string) {
  return Buffer.from(JSON.stringify({ t: publishedAt.toISOString(), i: id })).toString("base64url");
}
export function decodeCursor(cursor: string): { t: Date; i: string } | null {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as { t?: unknown; i?: unknown };
    if (typeof parsed.t !== "string" || typeof parsed.i !== "string") return null;
    const t = new Date(parsed.t);
    if (Number.isNaN(t.getTime())) return null;
    return { t, i: parsed.i };
  } catch {
    return null;
  }
}

async function publishedPostsWhere() {
  const { blogPostsTable } = await loadDb();
  return and(
    eq(blogPostsTable.status, "published"),
    isNull(blogPostsTable.deletedAt),
    isNotNull(blogPostsTable.publishedAt),
    lte(blogPostsTable.publishedAt, new Date()),
  );
}

export async function listBlogPosts(limit: number, cursor?: { t: Date; i: string }) {
  const { db, blogPostsTable } = await loadDb();
  const base = await publishedPostsWhere();
  const where = cursor
    ? and(
        base,
        or(
          sql`${blogPostsTable.publishedAt} < ${cursor.t}`,
          and(sql`${blogPostsTable.publishedAt} = ${cursor.t}`, sql`${blogPostsTable.id} < ${cursor.i}`),
        ),
      )
    : base;
  const rows = await db
    .select()
    .from(blogPostsTable)
    .where(where)
    .orderBy(desc(blogPostsTable.publishedAt), desc(blogPostsTable.id))
    .limit(limit + 1);
  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  const nextCursor = rows.length > limit && last?.publishedAt ? encodeCursor(last.publishedAt, last.id) : null;
  return {
    items: page.map((p) => ({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      coverImageUrl: p.coverImageUrl,
      authorName: p.authorName,
      tags: p.tags,
      publishedAt: (p.publishedAt as Date).toISOString(),
    })),
    nextCursor,
  };
}

export async function getBlogPostBySlug(slug: string) {
  const { db, blogPostsTable } = await loadDb();
  const base = await publishedPostsWhere();
  const [p] = await db
    .select()
    .from(blogPostsTable)
    .where(and(base, eq(blogPostsTable.slug, slug)))
    .limit(1);
  if (!p) return null;
  return {
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    coverImageUrl: p.coverImageUrl,
    authorName: p.authorName,
    tags: p.tags,
    publishedAt: (p.publishedAt as Date).toISOString(),
    body: p.body,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
  };
}
