import { useEffect, useState } from 'react';
import { useGetAccountProfile, useUpdateAccountProfile, getGetAccountProfileQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';
import { useAuth } from '@/features/auth/AuthProvider';
import { Field } from '@/features/auth/components/Field';
import { FormAlert } from '@/features/auth/components/FormAlert';
import { authClient } from '@/lib/auth-client';
import { zodResolver } from '@/lib/zodResolver';

const schema = z.object({
  name: z.string().trim().min(1, 'Enter your name.').max(100),
  country: z.string().trim().max(100),
  specialty: z.string().trim().max(100),
  targetExam: z.string().trim().max(100),
  targetExamDate: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, 'Use the date picker.'),
});
type Values = z.infer<typeof schema>;

const orNull = (v: string) => (v.trim() === '' ? null : v.trim());

export function ProfileSection() {
  const { user, refresh } = useAuth();
  const queryClient = useQueryClient();
  const profile = useGetAccountProfile();
  const update = useUpdateAccountProfile();
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState(false);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: user?.name ?? '', country: '', specialty: '', targetExam: '', targetExamDate: '' } });

  useEffect(() => {
    if (profile.data) {
      form.reset({
        name: user?.name ?? '',
        country: profile.data.country ?? '',
        specialty: profile.data.specialty ?? '',
        targetExam: profile.data.targetExam ?? '',
        targetExamDate: profile.data.targetExamDate ?? '',
      });
    }
  }, [profile.data, user?.name, form]);

  async function onSubmit(v: Values) {
    setMessage('');
    setSaved(false);
    try {
      if (v.name !== user?.name) {
        const { error } = await authClient.updateUser({ name: v.name });
        if (error) throw new Error(error.message);
        await refresh();
      }
      const result = await update.mutateAsync({ data: { country: orNull(v.country), specialty: orNull(v.specialty), targetExam: orNull(v.targetExam), targetExamDate: orNull(v.targetExamDate) } });
      queryClient.setQueryData(getGetAccountProfileQueryKey(), result);
      setSaved(true);
    } catch {
      setMessage('We could not save your profile. Please try again.');
    }
  }

  const e = form.formState.errors;
  return (
    <section className="account-section" aria-labelledby="profile-h">
      <h2 id="profile-h">Profile</h2>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <FormAlert message={message} />
        {saved && <FormAlert tone="success" message="Profile saved." />}
        <Field id="pf-name" label="Full name" autoComplete="name" registration={form.register('name')} error={e.name?.message} />
        <Field id="pf-country" label="Country" autoComplete="country-name" registration={form.register('country')} error={e.country?.message} />
        <Field id="pf-specialty" label="Specialty" registration={form.register('specialty')} error={e.specialty?.message} />
        <Field id="pf-exam" label="Target exam" registration={form.register('targetExam')} error={e.targetExam?.message} />
        <Field id="pf-exam-date" type="date" label="Target exam date" registration={form.register('targetExamDate')} error={e.targetExamDate?.message} />
        <button className="btn btn-primary" type="submit" disabled={form.formState.isSubmitting}>Save profile</button>
      </form>
    </section>
  );
}
