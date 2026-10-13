import { Router, type IRouter } from "express";
import { env } from "../config/env";
import { collectSitemapEntries, renderSitemap } from "../services/sitemap";

const router: IRouter = Router();

// Served at /api/sitemap.xml (robots.txt points to it). Not in openapi.yaml: it is XML, not JSON.
router.get("/sitemap.xml", async (req, res) => {
  const xml = renderSitemap(env.appOrigin, await collectSitemapEntries());
  res.type("application/xml").setHeader("Cache-Control", "public, max-age=0, must-revalidate").send(xml);
});

export default router;
