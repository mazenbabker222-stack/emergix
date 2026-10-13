import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link } from 'wouter';
import { appUrl, authClient } from '@/lib/auth-client';
import { usePageMeta } from '@/lib/usePageMeta';
import { zodResolver } from '@/lib/zodResolver';
import { AuthShell } from './AuthShell';
import { Field } from './components/Field';
import { forgotPasswordSchema, type ForgotPasswordValues } from './schemas';

export function ForgotPasswordForm() {
  usePageMeta('Reset your password', 'Request a link to reset your password.');
  const [sent, setSent] = useState(false);
  const form = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: '' } });

  async function onSubmit(values: ForgotPasswordValues) {
    // Always show the same confirmation: never reveal whether the address has an account.
    await authClient.requestPasswordReset({ email: values.email, redirectTo: appUrl('/reset-password') });
    setSent(true);
  }

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Forgot your password?"
      intro="Enter your e-mail address and we will send you a link to choose a new one."
      onSubmit={sent ? undefined : form.handleSubmit(onSubmit)}
      footer={<Link href="/login">Back to log in</Link>}
    >
      {sent ? (
        <div className="notice" role="status">If an account exists for that address, a reset link is on its way. It expires in one hour.</div>
      ) : (
        <>
          <Field id="auth-email" type="email" label="Email address" autoComplete="email" registration={form.register('email')} error={form.formState.errors.email?.message} />
          <button className="btn btn-primary" type="submit" disabled={form.formState.isSubmitting}>Send reset link <ArrowRight size={15} /></button>
        </>
      )}
    </AuthShell>
  );
}
