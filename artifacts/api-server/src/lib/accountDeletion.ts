import { db, users } from '@workspace/db';
import { and, eq, isNotNull, lte } from 'drizzle-orm';
import { writeAudit } from './audit';
import { logger } from './logger';

/** Permanently delete accounts whose cooldown has passed (user data cascades). Returns the count. */
export async function purgeDueAccountDeletions(now = new Date()): Promise<number> {
  const due = await db
    .select({ id: users.id })
    .from(users)
    .where(and(isNotNull(users.deletionScheduledAt), lte(users.deletionScheduledAt, now)));
  for (const { id } of due) {
    // The audit entry has no foreign key, so it outlives the account.
    await writeAudit({ actorId: id, action: 'account.deleted', entityType: 'user', entityId: id });
    await db.delete(users).where(eq(users.id, id));
  }
  return due.length;
}

/** Interim scheduler; replace with a queue job when the job runner arrives. */
export function startAccountDeletionJob(): void {
  const run = () =>
    purgeDueAccountDeletions().catch((err: unknown) => logger.error({ err }, 'account deletion job failed'));
  void run();
  setInterval(run, 60 * 60 * 1000).unref();
}
