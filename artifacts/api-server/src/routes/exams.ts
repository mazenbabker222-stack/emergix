import { Router, type IRouter } from "express";
import {
  GetExamParams,
  GetExamResponse,
  ListDocumentsQueryParams,
  ListDocumentsResponse,
  ListExamDatesQueryParams,
  ListExamDatesResponse,
  ListExamsResponse,
  ListFaqsQueryParams,
  ListFaqsResponse,
} from "@workspace/api-zod";
import { sendError } from "../lib/errors";
import { publicCache } from "../lib/http";
import * as exams from "../services/exams";

const router: IRouter = Router();

router.get("/exams", async (_req, res) => {
  publicCache(res);
  res.json(ListExamsResponse.parse({ items: await exams.listExams() }));
});

router.get("/exams/:slug", async (req, res) => {
  const params = GetExamParams.safeParse(req.params);
  if (!params.success) {
    sendError(res, 400, "invalid_request", "Invalid exam slug");
    return;
  }
  const exam = await exams.getExamBySlug(params.data.slug);
  if (!exam) {
    sendError(res, 404, "not_found", "Exam not found");
    return;
  }
  publicCache(res);
  res.json(GetExamResponse.parse(exam));
});

router.get("/exam-dates", async (req, res) => {
  const query = ListExamDatesQueryParams.safeParse(req.query);
  if (!query.success) {
    sendError(res, 400, "invalid_request", "Invalid query", query.error.flatten());
    return;
  }
  publicCache(res);
  res.json(ListExamDatesResponse.parse(await exams.listExamDates(query.data.exam)));
});

router.get("/faqs", async (req, res) => {
  const query = ListFaqsQueryParams.safeParse(req.query);
  if (!query.success) {
    sendError(res, 400, "invalid_request", "Invalid query", query.error.flatten());
    return;
  }
  const q = query.data.q?.trim();
  publicCache(res);
  res.json(
    ListFaqsResponse.parse({
      items: await exams.listFaqs({ exam: query.data.exam, category: query.data.category, q: q || undefined }),
    }),
  );
});

router.get("/documents", async (req, res) => {
  const query = ListDocumentsQueryParams.safeParse(req.query);
  if (!query.success) {
    sendError(res, 400, "invalid_request", "Invalid query", query.error.flatten());
    return;
  }
  publicCache(res);
  res.json(ListDocumentsResponse.parse({ items: await exams.listDocuments(query.data.exam) }));
});

export default router;
