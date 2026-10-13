import { useState } from 'react';
import { getGetAccountExportUrl, useCancelAccountDeletion, useRequestAccountDeletion } from '@workspace/api-client-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';
import { useAuth } from '@/features/auth/AuthProvider';
import { Field } from '@/features/auth/components/Field';
import { FormAlert } from '@/features/auth/components/FormAlert';
import { zodResolver } from '@/lib/zodResolver';

const schema = z.object({ confirmEmail: z.string().min(1, 'Type your e-mail address to confirm.') });

export function PrivacySection() {
  const { user, refresh } = useAuth();
  const request = useRequestAccountDeletion();
  const cancel = useCancelAccountDeletion();
  const [message, setMessage] = useState('');
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { confirmEmail: '' } });

  async function onDelete(v: z.infer<typeof schema>) {
    setMessage('');
    try {
      await request.mutateAsync({ data: { confirmEmail: v.confirmEmail } });
      form.reset();
      await refresh();
    } catch {
      setMessage('That e-mail address does not match your account.');
    }
  }
  async function onCancel() {
    setMessage('');
    try {
      await cancel.mutateAsync();
      await refresh();
    } catch {
      setMessage('We could not cancel the deletion. Please try again.');
    }
  }

  return (
    <section className="account-section" aria-labelledby="privacy-h">
      <h2 id="privacy-h">Your data</h2>
      <p>Download a copy of the personal data we hold about you (profile, devices and account activity).</p>
      <a className="btn btn-ghost" href={getGetAccountExportUrl()} download="account-data-export.json">Download my data</a>
      <hr />
      <h3>Delete my account</h3>
      <FormAlert message={message} />
      {user?.deletionScheduledAt ? (
        <>
          <div className="form-alert" role="status">Your account will be permanently deleted on {new Date(user.deletionScheduledAt).toLocaleDateString()}. Until then you can change your mind.</div>
          <button type="button" className="btn btn-primary" onClick={onCancel}>Cancel deletion</button>
        </>
      ) : (
        <form onSubmit={form.handleSubmit(onDelete)} noValidate>
          <p>Deleting your account removes your profile, progress and devices. There is a waiting period so you can change your mind.</p>
          <Field id="del-email" type="email" label="Type your e-mail address to confirm" autoComplete="off" registration={form.register('confirmEmail')} error={form.formState.errors.confirmEmail?.message} />
          <button className="btn btn-danger" type="submit" disabled={form.formState.isSubmitting}>Delete my account</button>
        </form>
      )}
    </section>
  );
}
