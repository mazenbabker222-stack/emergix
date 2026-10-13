import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useLocation } from 'wouter';
import { brand } from '@/config/brand';
import { appUrl, authClient, authErrorMessage, safeNext } from '@/lib/auth-client';
import { usePageMeta } from '@/lib/usePageMeta';
import { zodResolver } from '@/lib/zodResolver';
import { AuthShell } from './AuthShell';
import { useAuth } from './AuthProvider';
import { Field } from './components/Field';
import { FormAlert } from './components/FormAlert';
import { codeSchema, signInSchema, type CodeValues, type SignInValues } from './schemas';

const googleEnabled = import.meta.env.VITE_GOOGLE_SIGN_IN === 'true';

export function LoginForm() {
  usePageMeta('Log in', `Log in to your ${brand.name} learner account.`);
  const [, navigate] = useLocation();
  const { refresh } = useAuth();
  const next = safeNext(new URLSearchParams(window.location.search).get('next'));
  const [message, setMessage] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resent, setResent] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);
  const [useBackup, setUseBackup] = useState(false);

  const form = useForm<SignInValues>({ resolver: zodResolver(signInSchema), defaultValues: { email: '', password: '' } });
  const codeForm = useForm<CodeValues>({ resolver: zodResolver(codeSchema), defaultValues: { code: '' } });

  async function onSubmit(values: SignInValues) {
    setMessage('');
    setNeedsVerification(false);
    const { data, error } = await authClient.signIn.email({ email: values.email, password: values.password });
    if (error) {
      setNeedsVerification(error.status === 403);
      setMessage(authErrorMessage(error));
      return;
    }
    if ((data as { twoFactorRedirect?: boolean } | null)?.twoFactorRedirect) {
      setTwoFactor(true);
      return;
    }
    await refresh();
    navigate(next, { replace: true });
  }

  async function onCode(values: CodeValues) {
    setMessage('');
    const { error } = useBackup
      ? await authClient.twoFactor.verifyBackupCode({ code: values.code })
      : await authClient.twoFactor.verifyTotp({ code: values.code });
    if (error) {
      setMessage(error.status === 429 ? authErrorMessage(error) : 'That code is not valid. Try again.');
      return;
    }
    await refresh();
    navigate(next, { replace: true });
  }

  async function resend() {
    await authClient.sendVerificationEmail({ email: form.getValues('email'), callbackURL: appUrl('/verify-email') });
    setResent(true);
  }

  if (twoFactor) {
    return (
      <AuthShell eyebrow="Two-step verification" title="Enter your code." intro={useBackup ? 'Enter one of your backup codes.' : 'Open your authenticator app and enter the 6-digit code.'} onSubmit={codeForm.handleSubmit(onCode)}>
        <FormAlert message={message} />
        <Field id="auth-code" label={useBackup ? 'Backup code' : 'Authentication code'} registration={codeForm.register('code')} error={codeForm.formState.errors.code?.message} inputMode={useBackup ? 'text' : 'numeric'} autoComplete="one-time-code" autoFocus />
        <button className="btn btn-primary" type="submit" disabled={codeForm.formState.isSubmitting}>Verify <ArrowRight size={15} /></button>
        <p className="auth-bottom"><button type="button" className="link-button" onClick={() => { setUseBackup((v) => !v); setMessage(''); }}>{useBackup ? 'Use authenticator app instead' : 'Use a backup code instead'}</button></p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      title={`Log in to ${brand.name}.`}
      intro="Access your learning, practice cases and feedback."
      onSubmit={form.handleSubmit(onSubmit)}
      footer={<>New to {brand.name}? <Link href="/signup">Create an account</Link></>}
    >
      {new URLSearchParams(window.location.search).get('reset') === '1' && <FormAlert tone="success" message="Your password has been changed. Log in with your new password." />}
      <FormAlert message={message} />
      {needsVerification && (resent
        ? <div className="notice" role="status">If an account exists for that address, a new confirmation e-mail is on its way.</div>
        : <p className="auth-inline"><button type="button" className="link-button" onClick={resend}>Resend the confirmation e-mail</button></p>)}
      <Field id="auth-email" type="email" label="Email address" autoComplete="email" registration={form.register('email')} error={form.formState.errors.email?.message} />
      <Field id="auth-password" type="password" label="Password" autoComplete="current-password" registration={form.register('password')} error={form.formState.errors.password?.message} />
      <p className="auth-inline"><Link href="/forgot-password">Forgot your password?</Link></p>
      <button className="btn btn-primary" type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? 'Signing in…' : 'Log in'} <ArrowRight size={15} /></button>
      {googleEnabled && (
        <button className="btn btn-ghost btn-block" type="button" onClick={() => authClient.signIn.social({ provider: 'google', callbackURL: appUrl(next) })}>Continue with Google</button>
      )}
    </AuthShell>
  );
}
