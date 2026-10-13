import { createHash } from 'node:crypto';
import { devices, db, sessions, users } from '@workspace/db';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { newDeviceMessage } from '../emails/templates';
import { env } from '../config/env';
import { writeAudit } from './audit';
import { sendEmailInBackground } from './mailer';

interface NewSession {
  id: string;
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

const fingerprint = (userAgent?: string | null) =>
  createHash('sha256')
    .update(userAgent ?? 'unknown')
    .digest('hex');

/** Keep only the newest `MAX_SESSIONS` sessions per user. */
async function enforceSessionLimit(userId: string) {
  const rows = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(desc(sessions.createdAt));
  const excess = rows.slice(env.MAX_SESSIONS).map((r) => r.id);
  if (excess.length > 0) await db.delete(sessions).where(inArray(sessions.id, excess));
}

/** Record the device; e-mail an alert when it is new and the user already had other devices. */
async function recordDevice(session: NewSession) {
  const fp = fingerprint(session.userAgent);
  const known = await db.select({ id: devices.id, fingerprint: devices.fingerprint }).from(devices).where(eq(devices.userId, session.userId));
  const seen = known.find((d) => d.fingerprint === fp);
  if (seen) {
    await db.update(devices).set({ lastSeenAt: new Date() }).where(and(eq(devices.id, seen.id)));
    return;
  }
  await db.insert(devices).values({ userId: session.userId, fingerprint: fp, userAgent: session.userAgent ?? null }).onConflictDoNothing();
  if (known.length === 0) return; // first device: nothing to compare against
  const [user] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, session.userId)).limit(1);
  if (!user) return;
  sendEmailInBackground(
    user.email,
    `New sign-in to your ${env.APP_NAME} account`,
    newDeviceMessage(user.name, (session.userAgent ?? 'unknown device').slice(0, 120), new Date().toUTCString()),
  );
}

/** Runs after every successful sign-in (password, Google or 2FA completion). */
export async function onSessionCreated(session: NewSession): Promise<void> {
  await enforceSessionLimit(session.userId);
  await recordDevice(session);
  await writeAudit({ actorId: session.userId, action: 'auth.sign_in', entityType: 'user', entityId: session.userId, ip: session.ipAddress });
}
