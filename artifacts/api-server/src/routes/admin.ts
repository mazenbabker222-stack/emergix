import { SetUserRoleBody, SetUserRoleParams } from '@workspace/api-zod';
import { db, users } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { Router, type IRouter } from 'express';
import { writeAudit } from '../lib/audit';
import { sendError } from '../lib/errors';
import { requirePermission } from '../middlewares/rbac';
import adminCoursesRouter from './admin-courses';
import adminMediaRouter from './admin-media';
import adminQuestionsRouter from './admin-questions';

/** Mounted behind requireAuth + requirePermission('admin:access'). */
const router: IRouter = Router();

router.get('/ping', (_req, res) => {
  res.json({ status: 'ok' });
});

router.put('/users/:userId/role', requirePermission('users:set-role'), async (req, res) => {
  const params = SetUserRoleParams.safeParse(req.params);
  const body = SetUserRoleBody.safeParse(req.body);
  if (!params.success || !body.success) {
    return void sendError(res, 400, 'validation_error', 'Invalid request.');
  }
  const actor = req.auth!.user;
  if (params.data.userId === actor.id) {
    return void sendError(res, 400, 'cannot_change_own_role', 'You cannot change your own role.');
  }
  const [target] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, params.data.userId)).limit(1);
  if (!target) return void sendError(res, 404, 'not_found', 'User not found.');

  await db.update(users).set({ role: body.data.role }).where(eq(users.id, target.id));
  await writeAudit({
    actorId: actor.id,
    action: 'admin.role_changed',
    entityType: 'user',
    entityId: target.id,
    before: { role: target.role },
    after: { role: body.data.role },
    ip: req.ip,
  });
  res.json({ status: 'ok' });
});

router.use(adminCoursesRouter);
router.use(adminMediaRouter);
router.use(adminQuestionsRouter);

export default router;
