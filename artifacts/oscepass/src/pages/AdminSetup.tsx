import { useState } from 'react';
import { ArrowRight, Check, Copy, Eye, EyeOff, RefreshCw, ShieldCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link } from 'wouter';
import { useBootstrapInitialAdmin } from '@workspace/api-client-react';
import { AuthShell } from '@/features/auth/AuthShell';
import { Field } from '@/features/auth/components/Field';
import { FormAlert } from '@/features/auth/components/FormAlert';
import { zodResolver } from '@/lib/zodResolver';
import { usePageMeta } from '@/lib/usePageMeta';
import { z } from 'zod/v4';

const setupSchema = z.object({
  name: z.string().trim().min(1, 'Enter the administrator name.').max(100, 'Use 100 characters or fewer.'),
  email: z.email('Enter a valid email address.').max(254, 'Use 254 characters or fewer.'),
  password: z.string().min(10, 'Use at least 10 characters.').max(128, 'Use 128 characters or fewer.'),
  bootstrapToken: z.string().min(32, 'Enter the setup token provided by your platform operator.').max(256, 'The setup token is too long.'),
});

type SetupValues = z.infer<typeof setupSchema>;
const PASSWORD_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function generateSecurePassword() {
  const bytes = window.crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => PASSWORD_ALPHABET[byte & 63]).join('');
}

function safeSetupError(error: unknown) {
  const status = typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number'
    ? error.status
    : undefined;
  if (status === 401 || status === 403) {
    return 'The email or setup token was not accepted. Check that the email matches the configured administrator address.';
  }
  if (status === 409) {
    return 'Initial administrator setup has already been completed. Sign in with the administrator account instead.';
  }
  if (status === 400 || status === 422) {
    return 'Some details were not accepted. Check the name, email, password length and setup token, then try again.';
  }
  if (status === 429) {
    return 'Too many setup attempts were made. Wait a moment before trying again.';
  }
  if (status === 503) {
    return 'Initial setup is not enabled yet. The platform owner must configure its one-time setup token first.';
  }
  return 'Setup could not be completed. Check your details and try again, or contact your platform operator.';
}

export default function AdminSetup() {
  usePageMeta('Initial administrator setup', 'Set up the configured Emergix Academy administrator account.');
  const setup = useBootstrapInitialAdmin();
  const [failure, setFailure] = useState('');
  const [complete, setComplete] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState('');
  const form = useForm<SetupValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: { name: '', email: '', password: '', bootstrapToken: '' },
  });
  const passwordValue = form.watch('password');

  function handleGeneratePassword() {
    try {
      form.setValue('password', generateSecurePassword(), { shouldDirty: true, shouldValidate: true });
      setPasswordFeedback('A strong password was generated in this browser. Copy and save it before creating the account.');
    } catch {
      setPasswordFeedback('Your browser could not generate a secure password. Use a password manager to create one instead.');
    }
  }

  async function handleCopyPassword() {
    if (!passwordValue) return;
    try {
      await navigator.clipboard.writeText(passwordValue);
      setPasswordFeedback('Password copied. Save it in a password manager before creating the account.');
    } catch {
      setPasswordFeedback('Copy was blocked by this browser. Show the password and copy it manually.');
    }
  }

  async function submit(values: SetupValues) {
    setFailure('');
    try {
      await setup.mutateAsync({
        data: {
          name: values.name.trim(),
          email: values.email.trim(),
          password: values.password,
          bootstrapToken: values.bootstrapToken,
        },
      });
      form.reset();
      setComplete(true);
    } catch (error) {
      setFailure(safeSetupError(error));
    }
  }

  return (
    <AuthShell
      eyebrow="Secure account setup"
      title={complete ? 'Administrator ready' : 'Set up the first administrator'}
      intro={complete ? undefined : 'Create the initial Emergix Academy administrator account to begin managing the platform.'}
      onSubmit={complete ? undefined : form.handleSubmit(submit)}
      footer={complete ? undefined : <>Already set up? <Link href="/login">Sign in</Link></>}
    >
      {complete ? (
        <div className="setup-success">
          <span className="setup-success-mark"><Check size={21} aria-hidden="true" /></span>
          <p role="status">The administrator account has been created. You can now sign in securely.</p>
          <Link className="btn btn-primary" href="/login">Continue to sign in <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      ) : (
        <>
          <div className="setup-security-note">
            <ShieldCheck size={19} aria-hidden="true" />
            <p>The email must match the administrator address configured for this platform. This setup can be completed once.</p>
          </div>
          <div className="admin-setup-fields">
            <Field
              id="admin-setup-name"
              label="Administrator name"
              autoComplete="name"
              maxLength={100}
              registration={form.register('name')}
              error={form.formState.errors.name?.message}
            />
            <Field
              id="admin-setup-email"
              label="Configured administrator email"
              type="email"
              autoComplete="email"
              maxLength={254}
              registration={form.register('email')}
              error={form.formState.errors.email?.message}
              hint="Use the exact address configured by your platform operator."
            />
            <Field
              id="admin-setup-password"
              label="Password"
              type={passwordVisible ? 'text' : 'password'}
              autoComplete="new-password"
              minLength={10}
              maxLength={128}
              registration={form.register('password')}
              error={form.formState.errors.password?.message}
              hint="At least 10 characters. Save it securely before submitting."
            />
            <div className="setup-password-tools">
              <button className="btn btn-ghost" type="button" onClick={handleGeneratePassword} disabled={setup.isPending}>
                <RefreshCw size={14} aria-hidden="true" /> Generate secure password
              </button>
              <button className="btn btn-ghost" type="button" onClick={handleCopyPassword} disabled={!passwordValue || setup.isPending}>
                <Copy size={14} aria-hidden="true" /> Copy
              </button>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => setPasswordVisible((visible) => !visible)}
                disabled={!passwordValue || setup.isPending}
                aria-pressed={passwordVisible}
              >
                {passwordVisible ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
                {passwordVisible ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="setup-password-feedback" role="status" aria-live="polite">
              {passwordFeedback || 'The generated password stays in this form until you submit it.'}
            </p>
            <Field
              id="admin-setup-token"
              label="One-time setup token"
              type="password"
              autoComplete="off"
              spellCheck={false}
              maxLength={256}
              registration={form.register('bootstrapToken')}
              error={form.formState.errors.bootstrapToken?.message}
              hint="Keep this private. It is sent only in the secure setup request body."
            />
          </div>
          <FormAlert message={failure} />
          <button className="btn btn-primary setup-submit" type="submit" disabled={setup.isPending}>
            {setup.isPending ? 'Creating administrator…' : 'Create administrator'}
            {!setup.isPending && <ArrowRight size={16} aria-hidden="true" />}
          </button>
          <p className="setup-once-note">Your password and setup token are never placed in a link.</p>
        </>
      )}
    </AuthShell>
  );
}
