import { Router, type IRouter } from "express";
import { ListPlansResponse } from "@workspace/api-zod";
import { publicCache } from "../lib/http";
import { listPlans } from "../services/plans";

const router: IRouter = Router();

router.get("/plans", async (_req, res) => {
  publicCache(res);
  res.json(ListPlansResponse.parse({ items: await listPlans() }));
});

export default router;
