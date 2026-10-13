import { render } from '@react-email/components';
import { Resend } from 'resend';
import type { ReactElement } from 'react';
import { env } from '../config/env';
import { logger } from './logger';

export interface OutboxMessage {
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  sentAt: Date;
}

/** In-memory copy of every message when no Resend key is set (tests and local dev). */
const outbox: OutboxMessage[] = [];
export const getOutbox = (to?: string) =>
  to ? outbox.filter((m) => m.to.toLowerCase() === to.toLowerCase()) : [...outbox];

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export interface SendEmailOptions {
  /** Where replies go (e.g. the person who used the contact form). */
  replyTo?: string;
}

export async function sendEmail(
  to: string,
  subject: string,
  element: ReactElement,
  options: SendEmailOptions = {},
): Promise<void> {
  const html = await render(element);
  const text = await render(element, { plainText: true });
  if (resend) {
    const { error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
      text,
      ...(options.replyTo ? { replyTo: options.replyTo } : {}),
    });
    if (error) throw new Error(`E-mail provider rejected the message: ${error.message}`);
    return;
  }
  outbox.push({ to, subject, html, text, sentAt: new Date(), ...(options.replyTo ? { replyTo: options.replyTo } : {}) });
  if (env.DEV_PRINT_EMAILS) {
    // Opt-in, local development only: the text body contains one-time links.
    console.info(`\n[dev e-mail] to=${to} subject="${subject}"\n${text}\n`);
  }
}

/**
 * Fire-and-forget: never await e-mail delivery inside auth flows, so response timing
 * does not reveal whether an account exists. Failures are logged without the recipient's content.
 */
export function sendEmailInBackground(to: string, subject: string, element: ReactElement): void {
  void sendEmail(to, subject, element).catch((err: unknown) => {
    logger.error({ err, subject }, 'failed to send e-mail');
  });
}
