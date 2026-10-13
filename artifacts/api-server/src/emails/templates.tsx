import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Text } from '@react-email/components';
import type { ReactElement } from 'react';
import { env } from '../config/env';

interface ActionEmailProps {
  preview: string;
  heading: string;
  body: string;
  ctaLabel?: string;
  url?: string;
  footer?: string;
}

function ActionEmail({ preview, heading, body, ctaLabel, url, footer }: ActionEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: '#f3f8ff', fontFamily: 'Inter, Arial, sans-serif', margin: 0 }}>
        <Container style={{ backgroundColor: '#ffffff', margin: '32px auto', padding: '32px', maxWidth: '520px', borderRadius: '12px' }}>
          <Text style={{ color: '#0A2342', fontWeight: 800, fontSize: '18px', margin: 0 }}>{env.APP_NAME}</Text>
          <Heading as="h1" style={{ color: '#0A2342', fontSize: '22px' }}>{heading}</Heading>
          <Text style={{ color: '#3b4f66', lineHeight: '24px', whiteSpace: 'pre-wrap' }}>{body}</Text>
          {url && ctaLabel ? (
            <Button href={url} style={{ backgroundColor: '#0A84FF', color: '#ffffff', padding: '12px 20px', borderRadius: '8px', fontWeight: 700 }}>
              {ctaLabel}
            </Button>
          ) : null}
          {url ? (
            <Text style={{ color: '#60758d', fontSize: '12px', wordBreak: 'break-all' }}>
              If the button does not work, copy this link into your browser: {url}
            </Text>
          ) : null}
          <Hr style={{ borderColor: '#dce7f2' }} />
          <Text style={{ color: '#60758d', fontSize: '12px' }}>
            {footer ?? 'If you did not request this, you can safely ignore this e-mail.'}
          </Text>
          <Text style={{ color: '#60758d', fontSize: '11px' }}>
            Not affiliated with or endorsed by the Royal College of Emergency Medicine.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function verifyEmailMessage(name: string, url: string): ReactElement {
  return (
    <ActionEmail
      preview={`Confirm your ${env.APP_NAME} e-mail address`}
      heading="Confirm your e-mail address"
      body={`Hi ${name}, please confirm your e-mail address to finish creating your account. The link expires in one hour.`}
      ctaLabel="Confirm e-mail"
      url={url}
    />
  );
}

export function resetPasswordMessage(name: string, url: string): ReactElement {
  return (
    <ActionEmail
      preview={`Reset your ${env.APP_NAME} password`}
      heading="Reset your password"
      body={`Hi ${name}, we received a request to reset your password. The link expires in one hour.`}
      ctaLabel="Choose a new password"
      url={url}
    />
  );
}

export function changeEmailMessage(name: string, newEmail: string, url: string): ReactElement {
  return (
    <ActionEmail
      preview="Approve your e-mail address change"
      heading="Approve your e-mail address change"
      body={`Hi ${name}, you asked to change your account e-mail to ${newEmail}. Approve the change with the button below.`}
      ctaLabel="Approve change"
      url={url}
    />
  );
}

export function newDeviceMessage(name: string, device: string, when: string): ReactElement {
  return (
    <ActionEmail
      preview="New sign-in to your account"
      heading="New sign-in to your account"
      body={`Hi ${name}, your account was just signed in to from a new device (${device}) at ${when}. If this was you, no action is needed. If not, change your password and sign out other devices from your account page.`}
      footer="You receive this alert whenever a new device signs in."
    />
  );
}

/** Internal notification sent to the support inbox when someone uses the public contact form. */
export function contactNotificationMessage(m: { id: string; name: string; email: string; topic: string; message: string }): ReactElement {
  return ActionEmail({
    preview: `New contact message from ${m.name}`,
    heading: `Contact form: ${m.topic}`,
    body: `From: ${m.name} <${m.email}>\n\n${m.message}\n\nMessage id: ${m.id}`,
    footer: 'Reply to this e-mail to answer the sender directly.',
  });
}
