import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useLocation } from 'wouter';
import { authClient } from '@/lib/auth-client';
import { usePageMeta } from '@/lib/usePageMeta';
import { zodResolver } from '@/lib/zodResolver';
import { AuthShell } from './AuthShell';
import { Field } from './components/Field';
import { FormAlert } from './components/FormAlert';
import { PASSWORD_MIN, resetPasswordSchema, type ResetPasswordValues } from './schemas';

export function ResetPasswordForm() {
  usePageMeta('Choose a new password', 'Choose a new password for your account.');
  const [, navigate] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const linkInvalid = !token || params.get('error') === 'INVALID_TOKEN';
  const [message, setMessage] = useState('');
  const form = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { password: '', confirmPassword: '' } });
  const errors = form.formState.errors;

  async function onSubmit(values: ResetPasswordValues) {
    setMessage('');
    const { error } = await authClient.resetPassword({ newPassword: values.password, token: token! });
    if (error) {
      setMessage('This reset link is invalid or has expired. Request a new one.');
      return;
    }
    navigate('/login?reset=1', { replace: true });
  }

  if (linkInvalid) {
    return (
      <AuthShell eyebrow="Account recovery" title="This link is not valid.">
        <div className="form-alert" role="alert">The reset link is invalid or has expired.</div>
        <p className="auth-bottom"><Link href="/forgot-password">Request a new link</Link></p>
      </AuthShell>
    );
  }

  return (
    <AuthShell eyebrow="Account recovery" title="Choose a new password." onSubmit={form.handleSubmit(onSubmit)}>
      <FormAlert message={message} />
      <Field id="auth-password" type="password" label="New password" autoComplete="new-password" hint={`At least ${PASSWORD_MIN} characters.`} registration={form.register('password')} error={errors.password?.message} />
      <Field id="auth-confirm" type="password" label="Confirm new password" autoComplete="new-password" registration={form.register('confirmPassword')} error={errors.confirmPassword?.message} />
      <button className="btn btn-primary" type="submit" disabled={form.formState.isSubmitting}>Save new password <ArrowRight size={15} /></button>
    </AuthShell>
  );
}
