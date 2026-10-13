import { and, eq, isNull } from "drizzle-orm";
import { loadDb } from "../lib/database";

/** Static public routes that always exist. Keep in sync with artifacts/oscepass/src/app/Router.tsx. */
export const STATIC_ROUTES = [
  "/",
  "/exams",
  "/calendar",
  "/pricing",
  "/free-demo",
  "/blog",
  "/help",
  "/contact",
  "/courses",
  "/practice",
  "/resources",
  "/about",
  "/neurology",
];

export interface SitemapEntry {
  path: string;
  lastmod?: string;
}

export const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export function renderSitemap(origin: string, entries: SitemapEntry[]) {
  const base = origin.replace(/\/$/, "");
  const urls = entries
    .map(
      (e) =>
        `  <url><loc>${escapeXml(base + e.path)}</loc>${e.lastmod ? `<lastmod>${e.lastmod.slice(0, 10)}</lastmod>` : ""}</url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export async function collectSitemapEntries(): Promise<SitemapEntry[]> {
  const { db, examsTable, blogPostsTable, pagesTable } = await loadDb();
  const [exams, posts, pages] = await Promise.all([
    db
      .select({ slug: examsTable.slug, updatedAt: examsTable.updatedAt })
      .from(examsTable)
      .where(and(eq(examsTable.status, "published"), isNull(examsTable.deletedAt))),
    db
      .select({ slug: blogPostsTable.slug, updatedAt: blogPostsTable.updatedAt })
      .from(blogPostsTable)
      .where(and(eq(blogPostsTable.status, "published"), isNull(blogPostsTable.deletedAt))),
    db
      .select({ slug: pagesTable.slug, updatedAt: pagesTable.updatedAt })
      .from(pagesTable)
      .where(and(eq(pagesTable.kind, "legal"), eq(pagesTable.status, "published"), isNull(pagesTable.deletedAt))),
  ]);
  return [
    ...STATIC_ROUTES.map((path) => ({ path })),
    ...exams.map((e) => ({ path: `/exams/${e.slug}`, lastmod: e.updatedAt.toISOString() })),
    ...posts.map((p) => ({ path: `/blog/${p.slug}`, lastmod: p.updatedAt.toISOString() })),
    ...pages.map((p) => ({ path: `/legal/${p.slug}`, lastmod: p.updatedAt.toISOString() })),
  ];
}
