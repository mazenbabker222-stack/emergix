import {
  RequestAccountDeletionBody,
  UpdateAccountProfileBody,
} from '@workspace/api-zod';
import { accounts, auditLog, db, devices, sessions, userProfiles, users } from '@workspace/db';
import { desc, eq } from 'drizzle-orm';
import { Router, type IRouter, type Request } from 'express';
import { env } from '../config/env';
import { writeAudit } from '../lib/audit';
import { sendError } from '../lib/errors';

const router: IRouter = Router();

const me = (req: Request) => req.auth!.user; // requireAuth runs before this router

async function loadProfile(userId: string) {
  const [row] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  return {
    country: row?.country ?? null,
    specialty: row?.specialty ?? null,
    targetExam: row?.targetExam ?? null,
    targetExamDate: row?.targetExamDate ?? null,
  };
}

router.get('/profile', async (req, res) => {
  res.json(await loadProfile(me(req).id));
});

router.put('/profile', async (req, res) => {
  const parsed = UpdateAccountProfileBody.safeParse(req.body);
  if (!parsed.success) {
    return void sendError(res, 400, 'validation_error', 'Some fields are invalid.', { issues: parsed.error.flatten() });
  }
  const userId = me(req).id;
  const before = await loadProfile(userId);
  await db
    .insert(userProfiles)
    .values({ userId, ...parsed.data })
    .onConflictDoUpdate({ target: userProfiles.userId, set: { ...parsed.data } });
  await writeAudit({ actorId: userId, action: 'account.profile_updated', entityType: 'user', entityId: userId, before, after: parsed.data, ip: req.ip });
  res.json(await loadProfile(userId));
});

/** GDPR/UK-GDPR data export. Never includes password hashes, session tokens or 2FA secrets. */
router.get('/export', async (req, res) => {
  const user = me(req);
  const [row] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  const linked = await db.select({ providerId: accounts.providerId, createdAt: accounts.createdAt }).from(accounts).where(eq(accounts.userId, user.id));
  const sess = await db
    .select({ id: sessions.id, ipAddress: sessions.ipAddress, userAgent: sessions.userAgent, createdAt: sessions.createdAt, expiresAt: sessions.expiresAt })
    .from(sessions)
    .where(eq(sessions.userId, user.id));
  const devs = await db.select({ userAgent: devices.userAgent, firstSeenAt: devices.firstSeenAt, lastSeenAt: devices.lastSeenAt }).from(devices).where(eq(devices.userId, user.id));
  const audit = await db
    .select({ action: auditLog.action, createdAt: auditLog.createdAt, ip: auditLog.ip })
    .from(auditLog)
    .where(eq(auditLog.actorId, user.id))
    .orderBy(desc(auditLog.createdAt))
    .limit(1000);

  await writeAudit({ actorId: user.id, action: 'account.data_exported', entityType: 'user', entityId: user.id, ip: req.ip });
  res.setHeader('Content-Disposition', 'attachment; filename="account-data-export.json"');
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    exportedAt: new Date().toISOString(),
    account: {
      id: row?.id,
      name: row?.name,
      email: row?.email,
      emailVerified: row?.emailVerified,
      role: row?.role,
      twoFactorEnabled: row?.twoFactorEnabled,
      createdAt: row?.createdAt,
    },
    profile: await loadProfile(user.id),
    linkedProviders: linked,
    sessions: sess,
    devices: devs,
    auditLog: audit,
  });
});

router.post('/deletion', async (req, res) => {
  const parsed = RequestAccountDeletionBody.safeParse(req.body);
  const user = me(req);
  if (!parsed.success || parsed.data.confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
    return void sendError(res, 400, 'confirmation_mismatch', 'Type your account e-mail address to confirm.');
  }
  const scheduledFor = new Date(Date.now() + env.DELETION_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
  await db.update(users).set({ deletionScheduledAt: scheduledFor }).where(eq(users.id, user.id));
  await writeAudit({ actorId: user.id, action: 'account.deletion_requested', entityType: 'user', entityId: user.id, after: { scheduledFor }, ip: req.ip });
  res.json({ status: 'scheduled', scheduledFor: scheduledFor.toISOString() });
});

router.delete('/deletion', async (req, res) => {
  const user = me(req);
  await db.update(users).set({ deletionScheduledAt: null }).where(eq(users.id, user.id));
  await writeAudit({ actorId: user.id, action: 'account.deletion_cancelled', entityType: 'user', entityId: user.id, ip: req.ip });
  res.json({ status: 'cancelled', scheduledFor: null });
});

export default router;
