import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { env } from "../config/env";
import { contactNotificationMessage } from "../emails/templates";
import { loadDb } from "../lib/database";
import { logger } from "../lib/logger";
import { sendEmail } from "../lib/mailer";

export interface ContactInput {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

/** Salted hash: lets us spot repeat abusers without keeping the raw IP address. */
export function hashIp(ip: string | undefined) {
  if (!ip) return null;
  return createHash("sha256").update(`${env.SESSION_SECRET}:${ip}`).digest("hex");
}

/** Strip CR/LF so user input can never inject extra header lines into an email subject. */
const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").trim();

export async function createContactMessage(input: ContactInput, ip: string | undefined, userId?: string) {
  const { db, contactMessagesTable } = await loadDb();
  const [row] = await db
    .insert(contactMessagesTable)
    .values({
      name: input.name,
      email: input.email,
      subject: input.subject?.trim() || null,
      message: input.message,
      userId: userId ?? null,
      ipHash: hashIp(ip),
    })
    .returning({ id: contactMessagesTable.id });
  if (!row) throw new Error("contact message was not stored");

  // Email is best effort: the message is already safely stored, so a mail outage never loses it.
  void deliver(row.id, input).catch((err) => logger.error({ err, id: row.id }, "contact email failed"));
  return row.id;
}

async function deliver(id: string, input: ContactInput) {
  const to = env.SUPPORT_EMAIL;
  if (!to) {
    logger.warn("SUPPORT_EMAIL is not set; contact message stored but not emailed");
    return;
  }
  const topic = oneLine(input.subject ?? "General");
  await sendEmail(
    to,
    `[Contact] ${topic} from ${oneLine(input.name)}`,
    contactNotificationMessage({ id, name: input.name, email: input.email, topic, message: input.message }),
    { replyTo: input.email },
  );
  const { db, contactMessagesTable } = await loadDb();
  await db.update(contactMessagesTable).set({ emailedAt: new Date() }).where(eq(contactMessagesTable.id, id));
}
