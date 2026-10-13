import { Router, type IRouter } from "express";
import { env } from "../config/env";
import { publicReadLimiter } from "../middlewares/rateLimit";
import { requireAuth, requirePermission } from "../middlewares/rbac";
import accountRouter from "./account";
import adminRouter from "./admin";
import bootstrapRouter from "./bootstrap";
import contactRouter from "./contact";
import contentRouter from "./content";
import examsRouter from "./exams";
import healthRouter from "./health";
import plansRouter from "./plans";
import sitemapRouter from "./sitemap";
import testHooksRouter from "./testHooks";
import osceRouter from "./osce";
import analyticsRouter from "./analytics";
import quizzesRouter from "./quizzes";
import { myNotesRouter, questionActionsRouter, questionCatalogRouter } from "./questions";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/setup", bootstrapRouter);
router.use("/account", requireAuth, accountRouter);
router.use("/admin", requireAuth, requirePermission("admin:access"), adminRouter);
router.use("/quizzes", requireAuth, quizzesRouter);
router.use("/questions", requireAuth, questionActionsRouter);
router.use("/me", requireAuth, myNotesRouter);
router.use("/analytics", requireAuth, analyticsRouter);
if (env.testHooksEnabled) router.use("/test", testHooksRouter);

// Public site (phase 04): read-only content, contact form and sitemap. Mounted after the authenticated
// areas so the generous public-read limiter never counts account or admin traffic.
const publicRouter: IRouter = Router();
publicRouter.use(publicReadLimiter);
publicRouter.use(examsRouter);
publicRouter.use(questionCatalogRouter);
publicRouter.use(contentRouter);
publicRouter.use(plansRouter);
publicRouter.use(contactRouter);
publicRouter.use(sitemapRouter);
publicRouter.use("/osce", osceRouter);
router.use(publicRouter);

export default router;
