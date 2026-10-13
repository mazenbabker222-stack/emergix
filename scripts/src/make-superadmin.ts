/**
 * Bootstrap the first superadmin (there is deliberately no sign-up path to a privileged role).
 *   DATABASE_URL=... pnpm --filter @workspace/scripts run make-superadmin -- someone@example.com
 * The account must already exist (sign up and confirm the e-mail first).
 */
import { auditLog, db, users } from '@workspace/db';
import { eq } from 'drizzle-orm';

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error('Usage: make-superadmin <email>');
  process.exit(1);
}

const [user] = await db.select({ id: users.id, role: users.role, emailVerified: users.emailVerified }).from(users).where(eq(users.email, email)).limit(1);
if (!user) {
  console.error('No account with that e-mail address. Sign up first.');
  process.exit(1);
}
if (!user.emailVerified) {
  console.error('That account has not confirmed its e-mail address yet.');
  process.exit(1);
}

await db.update(users).set({ role: 'superadmin' }).where(eq(users.id, user.id));
await db.insert(auditLog).values({
  actorId: null,
  action: 'admin.role_changed',
  entityType: 'user',
  entityId: user.id,
  before: { role: user.role },
  after: { role: 'superadmin' },
  ip: 'cli',
});
console.log(`Done: ${email} is now a superadmin.`);
process.exit(0);
