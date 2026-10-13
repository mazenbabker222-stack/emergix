import { Router, type IRouter } from "express";
import {
  GetAnalyticsOverviewResponse,
  GetPerformanceTrendQueryParams,
  GetPerformanceTrendResponse,
  GetTopicPerformanceQueryParams,
  GetTopicPerformanceResponse,
} from "@workspace/api-zod";
import { parse } from "../lib/http-error";
import * as analytics from "../services/analytics";

const router: IRouter = Router();

router.get("/overview", async (req, res) => {
  res.json(GetAnalyticsOverviewResponse.parse(await analytics.getAnalyticsOverview(req.auth!.user.id)));
});

router.get("/topics", async (req, res) => {
  const query = parse(GetTopicPerformanceQueryParams, req.query);
  res.json(GetTopicPerformanceResponse.parse(
    await analytics.getTopicPerformance(req.auth!.user.id, query.examId),
  ));
});

router.get("/trend", async (req, res) => {
  const query = parse(GetPerformanceTrendQueryParams, req.query);
  res.json(GetPerformanceTrendResponse.parse(
    await analytics.getPerformanceTrend(req.auth!.user.id, query.days),
  ));
});

export default router;
