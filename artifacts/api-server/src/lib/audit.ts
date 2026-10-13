import { auditLog, db } from '@workspace/db';
import { logger } from './logger';

export interface AuditInput {
  actorId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
}

/** Never put passwords, tokens or secrets in before/after. Failures must not break the request. */
export async function writeAudit(entry: AuditInput): Promise<void> {
  try {
    await db.insert(auditLog).values({
      actorId: entry.actorId ?? null,
      action: entry.action,
      entityType: entry.entityType ?? null,
      entityId: entry.entityId ?? null,
      before: entry.before ?? null,
      after: entry.after ?? null,
      ip: entry.ip ?? null,
    });
  } catch (err) {
    logger.error({ err, action: entry.action }, 'failed to write audit log entry');
  }
}
