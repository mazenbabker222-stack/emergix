import { Router, type IRouter } from "express";
import { requireAuth } from "../../middlewares/rbac";
import attempts from "./attempts";
import circuits from "./circuits";
import rooms from "./rooms";
import stations from "./stations";

const router: IRouter = Router();

router.use(stations);
router.use(requireAuth);
router.use(attempts);
router.use(circuits);
router.use(rooms);

export default router;
