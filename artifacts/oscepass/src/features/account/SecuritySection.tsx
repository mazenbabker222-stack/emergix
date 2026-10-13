import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';
import { useAuth } from '@/features/auth/AuthProvider';
import { Field } from '@/features/auth/components/Field';
import { FormAlert } from '@/features/auth/components/FormAlert';
import { PASSWORD_MIN } from '@/features/auth/schemas';
import { appUrl, authClient } from '@/lib/auth-client';
import { zodResolver } from '@/lib/zodResolver';

const emailSchema = z.object({ newEmail: z.email('Enter a valid e-mail address.') });
const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password.'),
  newPassword: z.string().min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`).max(128),
});
const confirmSchema = z.object({ password: z.string().min(1, 'Enter your password.') });
const codeSchema = z.object({ code: z.string().trim().min(6, 'Enter the 6-digit code.') });

function ChangeEmail() {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);
  const form = useForm<z.infer<typeof emailSchema>>({ resolver: zodResolver(emailSchema), defaultValues: { newEmail: '' } });
  async function onSubmit(v: z.infer<typeof emailSchema>) {
    setMessage('');
    const { error } = await authClient.changeEmail({ newEmail: v.newEmail, callbackURL: appUrl('/app/account') });
    if (error) return setMessage(error.message || 'We could not start the change. Please try again.');
    setDone(true);
  }
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate aria-labelledby="chg-email-h">
      <h3 id="chg-email-h">E-mail address</h3>
      <p className="field-hint">Current: {user?.email}. We will e-mail you a link to approve the change.</p>
      <FormAlert message={message} />
      {done && <FormAlert tone="success" message="Check your inbox for a link to approve the change." />}
      <Field id="sec-new-email" type="email" label="New e-mail address" autoComplete="email" registration={form.register('newEmail')} error={form.formState.errors.newEmail?.message} />
      <button className="btn btn-ghost" type="submit" disabled={form.formState.isSubmitting}>Change e-mail</button>
    </form>
  );
}

function ChangePassword() {
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);
  const form = useForm<z.infer<typeof passwordSchema>>({ resolver: zodResolver(passwordSchema), defaultValues: { currentPassword: '', newPassword: '' } });
  async function onSubmit(v: z.infer<typeof passwordSchema>) {
    setMessage('');
    setDone(false);
    const { error } = await authClient.changePassword({ currentPassword: v.currentPassword, newPassword: v.newPassword, revokeOtherSessions: true });
    if (error) return setMessage(error.status === 400 || error.status === 401 ? 'Your current password is not correct.' : error.message || 'We could not change your password.');
    form.reset();
    setDone(true);
  }
  const e = form.formState.errors;
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate aria-labelledby="chg-pw-h">
      <h3 id="chg-pw-h">Password</h3>
      <p className="field-hint">Changing your password signs you out of your other devices.</p>
      <FormAlert message={message} />
      {done && <FormAlert tone="success" message="Password changed. Other devices were signed out." />}
      <Field id="sec-cur-pw" type="password" label="Current password" autoComplete="current-password" registration={form.register('currentPassword')} error={e.currentPassword?.message} />
      <Field id="sec-new-pw" type="password" label="New password" autoComplete="new-password" hint={`At least ${PASSWORD_MIN} characters.`} registration={form.register('newPassword')} error={e.newPassword?.message} />
      <button className="btn btn-ghost" type="submit" disabled={form.formState.isSubmitting}>Change password</button>
    </form>
  );
}

function TwoFactor() {
  const { user, refresh } = useAuth();
  const [message, setMessage] = useState('');
  const [setup, setSetup] = useState<{ secret: string; uri: string; backupCodes: string[] } | null>(null);
  const passwordForm = useForm<z.infer<typeof confirmSchema>>({ resolver: zodResolver(confirmSchema), defaultValues: { password: '' } });
  const codeForm = useForm<z.infer<typeof codeSchema>>({ resolver: zodResolver(codeSchema), defaultValues: { code: '' } });

  async function start(v: z.infer<typeof confirmSchema>) {
    setMessage('');
    const { data, error } = await authClient.twoFactor.enable({ password: v.password });
    if (error || !data) return setMessage('Your password is not correct.');
    if (data.method !== 'totp') return setMessage('Authenticator app setup is not available for this account.');
    const secret = new URL(data.totpURI).searchParams.get('secret') ?? '';
    setSetup({ secret, uri: data.totpURI, backupCodes: data.backupCodes });
    passwordForm.reset();
  }
  async function confirm(v: z.infer<typeof codeSchema>) {
    setMessage('');
    const { error } = await authClient.twoFactor.verifyTotp({ code: v.code });
    if (error) return setMessage('That code is not valid. Try again.');
    setSetup(null);
    await refresh();
  }
  async function disable(v: z.infer<typeof confirmSchema>) {
    setMessage('');
    const { error } = await authClient.twoFactor.disable({ password: v.password });
    if (error) return setMessage('Your password is not correct.');
    passwordForm.reset();
    await refresh();
  }

  return (
    <div aria-labelledby="tf-h" role="group">
      <h3 id="tf-h">Two-step verification</h3>
      <FormAlert message={message} />
      {setup ? (
        <form onSubmit={codeForm.handleSubmit(confirm)} noValidate>
          <p>Add this key to an authenticator app (Google Authenticator, 1Password, Authy…), then enter the 6-digit code it shows.</p>
          <p><strong>Setup key:</strong> <code className="secret-key">{setup.secret}</code></p>
          <p><a href={setup.uri}>Open in authenticator app</a></p>
          <p><strong>Backup codes</strong> — store them somewhere safe. Each works once if you lose your device.</p>
          <ul className="backup-codes">{setup.backupCodes.map((c) => <li key={c}><code>{c}</code></li>)}</ul>
          <Field id="tf-code" label="6-digit code" inputMode="numeric" autoComplete="one-time-code" registration={codeForm.register('code')} error={codeForm.formState.errors.code?.message} />
          <button className="btn btn-primary" type="submit">Turn on</button>
        </form>
      ) : (
        <form onSubmit={passwordForm.handleSubmit(user?.twoFactorEnabled ? disable : start)} noValidate>
          <p>{user?.twoFactorEnabled ? 'Two-step verification is on.' : 'Add a second step to protect your account.'}</p>
          <Field id="tf-pw" type="password" label="Confirm with your password" autoComplete="current-password" registration={passwordForm.register('password')} error={passwordForm.formState.errors.password?.message} />
          <button className={user?.twoFactorEnabled ? 'btn btn-danger' : 'btn btn-primary'} type="submit">{user?.twoFactorEnabled ? 'Turn off' : 'Set up'}</button>
        </form>
      )}
    </div>
  );
}

export function SecuritySection() {
  return (
    <section className="account-section" aria-labelledby="security-h">
      <h2 id="security-h">Security</h2>
      <ChangeEmail />
      <hr />
      <ChangePassword />
      <hr />
      <TwoFactor />
    </section>
  );
}
