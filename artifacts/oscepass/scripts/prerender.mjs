/**
 * Build-time pre-rendering of public routes (SEO).
 *
 *   1. pnpm --filter @workspace/oscepass run build
 *   2. start the API server with DATABASE_URL (and seed data)
 *   3. API_PROXY_TARGET=http://localhost:8080 pnpm --filter @workspace/oscepass run prerender
 *
 * It serves dist/public with a tiny static server (proxying /api to the API), opens every URL from
 * /api/sitemap.xml in headless Chromium, waits until no [aria-busy="true"] skeleton is left and writes
 * <route>/index.html next to the SPA bundle. If the API or Chromium is unavailable it exits 0 with a
 * warning so a normal build is never blocked.
 */
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';

const dist = path.resolve(import.meta.dirname, '..', 'dist', 'public');
const api = (process.env.API_PROXY_TARGET ?? 'http://localhost:8080').replace(/\/$/, '');
const CONSENT_KEY = 'emergix-academy:cookie-consent';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json', '.txt': 'text/plain', '.xml': 'application/xml' };

function skip(reason) {
  console.warn(`[prerender] skipped: ${reason}`);
  process.exit(0);
}

let paths;
try {
  const res = await fetch(`${api}/api/sitemap.xml`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  paths = [...(await res.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1].replace(/&amp;/g, '&')).pathname);
} catch (err) {
  skip(`cannot read ${api}/api/sitemap.xml (${err.message})`);
}

let chromium;
try {
  ({ chromium } = await import('@playwright/test'));
} catch {
  skip('@playwright/test is not installed');
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/')) {
    const upstream = await fetch(api + req.url, { headers: { accept: req.headers.accept ?? '*/*' } }).catch(() => null);
    if (!upstream) { res.writeHead(502).end(); return; }
    res.writeHead(upstream.status, { 'content-type': upstream.headers.get('content-type') ?? 'application/json' });
    res.end(Buffer.from(await upstream.arrayBuffer()));
    return;
  }
  let file = path.join(dist, decodeURIComponent(url.pathname));
  if (!file.startsWith(dist)) { res.writeHead(403).end(); return; }
  const info = await stat(file).catch(() => null);
  if (info?.isDirectory()) file = path.join(file, 'index.html');
  const body = await readFile(file).catch(() => null);
  const final = body ?? (path.extname(file) ? null : await readFile(path.join(dist, 'index.html')));
  if (!final) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'text/html' }).end(final);
});
await new Promise((resolve) => server.listen(0, resolve));
const origin = `http://localhost:${server.address().port}`;

let browser;
try {
  browser = await chromium.launch();
} catch (err) {
  server.close();
  skip(`Chromium is not available (${err.message}). Run: pnpm --filter @workspace/oscepass exec playwright install chromium`);
}

// Keep the SPA shell: the home page is written last so it never feeds the other routes.
const ordered = [...paths.filter((p) => p !== '/'), ...(paths.includes('/') ? ['/'] : [])];
const context = await browser.newContext();
// Pre-set consent so the cookie banner is not baked into the HTML.
await context.addInitScript(([key]) => window.localStorage.setItem(key, 'essential'), [CONSENT_KEY]);
let ok = 0;
for (const route of ordered) {
  const page = await context.newPage();
  try {
    await page.goto(origin + route, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), null, { timeout: 15000 });
    const html = '<!DOCTYPE html>' + (await page.evaluate(() => document.documentElement.outerHTML));
    const target = route === '/' ? path.join(dist, 'index.html') : path.join(dist, route, 'index.html');
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, html);
    ok += 1;
  } catch (err) {
    console.warn(`[prerender] ${route} failed: ${err.message}`);
  } finally {
    await page.close();
  }
}
await browser.close();
server.close();
console.log(`[prerender] wrote ${ok}/${ordered.length} routes`);
