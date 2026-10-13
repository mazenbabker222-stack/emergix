import { Router, type IRouter } from "express";
import {
  GetBlogPostParams,
  GetBlogPostResponse,
  GetPageParams,
  GetPageResponse,
  ListActiveBannersResponse,
  ListBlogPostsQueryParams,
  ListBlogPostsResponse,
} from "@workspace/api-zod";
import { sendError } from "../lib/errors";
import { publicCache } from "../lib/http";
import * as content from "../services/content";

const router: IRouter = Router();

router.get("/banners", async (_req, res) => {
  publicCache(res);
  res.json(ListActiveBannersResponse.parse({ items: await content.listActiveBanners() }));
});

router.get("/pages/:slug", async (req, res) => {
  const params = GetPageParams.safeParse(req.params);
  if (!params.success) {
    sendError(res, 400, "invalid_request", "Invalid page slug");
    return;
  }
  const page = await content.getPageBySlug(params.data.slug);
  if (!page) {
    sendError(res, 404, "not_found", "Page not found");
    return;
  }
  publicCache(res);
  res.json(GetPageResponse.parse(page));
});

router.get("/blog", async (req, res) => {
  const query = ListBlogPostsQueryParams.safeParse(req.query);
  if (!query.success) {
    sendError(res, 400, "invalid_request", "Invalid query", query.error.flatten());
    return;
  }
  let cursor: { t: Date; i: string } | undefined;
  if (query.data.cursor) {
    const decoded = content.decodeCursor(query.data.cursor);
    if (!decoded) {
      sendError(res, 400, "invalid_cursor", "The pagination cursor is not valid");
      return;
    }
    cursor = decoded;
  }
  publicCache(res);
  res.json(ListBlogPostsResponse.parse(await content.listBlogPosts(query.data.limit, cursor)));
});

router.get("/blog/:slug", async (req, res) => {
  const params = GetBlogPostParams.safeParse(req.params);
  if (!params.success) {
    sendError(res, 400, "invalid_request", "Invalid post slug");
    return;
  }
  const post = await content.getBlogPostBySlug(params.data.slug);
  if (!post) {
    sendError(res, 404, "not_found", "Post not found");
    return;
  }
  publicCache(res);
  res.json(GetBlogPostResponse.parse(post));
});

export default router;
