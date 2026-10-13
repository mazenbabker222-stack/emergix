import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link } from 'wouter';
import { brand } from '@/config/brand';
import { appUrl, authClient } from '@/lib/auth-client';
import { usePageMeta } from '@/lib/usePageMeta';
import { zodResolver } from '@/lib/zodResolver';
import { AuthShell } from './AuthShell';
import { Field } from './components/Field';
import { FormAlert } from './components/FormAlert';
import { PASSWORD_MIN, signUpSchema, type SignUpValues } from './schemas';

export function SignupForm() {
  usePageMeta('Create your account', `Create a ${brand.name} learner account.`);
  const [message, setMessage] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const form = useForm<SignUpValues>({ resolver: zodResolver(signUpSchema), defaultValues: { name: '', email: '', password: '', confirmPassword: '' } });
  const errors = form.formState.errors;

  async function onSubmit(values: SignUpValues) {
    setMessage('');
    const { error } = await authClient.signUp.email({
      name: values.name,
      email: values.email,
      password: values.password,
      callbackURL: appUrl('/verify-email'),
    });
    // 422 = e-mail already registered. Show the same screen so sign-up cannot be used to discover accounts.
    if (error && error.status !== 422) {
      setMessage(error.status === 429 ? 'Too many attempts. Please wait a few minutes and try again.' : error.message || 'We could not create your account. Please try again.');
      return;
    }
    setSentTo(values.email);
  }

  if (sentTo) {
    return (
      <AuthShell eyebrow="Check your inbox" title="Confirm your e-mail address.">
        <div className="notice" role="status">If {sentTo} can be used to create an account, we have sent a confirmation link. It expires in one hour.</div>
        <p className="auth-bottom">Already confirmed? <Link href="/login">Log in</Link></p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow={`Join ${brand.name}`}
      title="Start preparing with purpose."
      intro="Create your learner account to explore cases, courses and resources."
      onSubmit={form.handleSubmit(onSubmit)}
      footer={<>Already have an account? <Link href="/login">Log in</Link></>}
    >
      <FormAlert message={message} />
      <Field id="auth-name" label="Full name" autoComplete="name" registration={form.register('name')} error={errors.name?.message} />
      <Field id="auth-email" type="email" label="Email address" autoComplete="email" registration={form.register('email')} error={errors.email?.message} />
      <Field id="auth-password" type="password" label="Password" autoComplete="new-password" hint={`At least ${PASSWORD_MIN} characters.`} registration={form.register('password')} error={errors.password?.message} />
      <Field id="auth-confirm" type="password" label="Confirm password" autoComplete="new-password" registration={form.register('confirmPassword')} error={errors.confirmPassword?.message} />
      <button className="btn btn-primary" type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? 'Creating account…' : 'Create account'} <ArrowRight size={15} /></button>
    </AuthShell>
  );
}
