import { useForm } from 'react-hook-form';
import { ApiError, useSubmitContact } from '@workspace/api-client-react';
import { ArrowRight } from 'lucide-react';
import { PageHero } from '@/components/shared/PageHero';
import { SiteLayout } from '@/components/shared/SiteLayout';
import { brand } from '@/config/brand';
import { usePageMeta } from '@/lib/usePageMeta';

type Topic = 'course-information' | 'osce-practice' | 'examiner-sessions' | 'student-access' | 'other';
interface FormValues { name: string; email: string; topic: Topic; message: string; website: string }

const topics: { value: Topic; label: string }[] = [
  { value: 'course-information', label: 'Course information' },
  { value: 'osce-practice', label: 'OSCE practice cases' },
  { value: 'examiner-sessions', label: 'Examiner sessions' },
  { value: 'student-access', label: 'Student access' },
  { value: 'other', label: 'Other' },
];

export default function Contact() {
  usePageMeta('Contact', `Contact the ${brand.name} team about exams, courses, student access and examiner sessions.`);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({ defaultValues: { topic: 'course-information', website: '' } });
  const send = useSubmitContact();
  const rateLimited = send.error instanceof ApiError && send.error.status === 429;
  // The API contract has a free-text `subject`: send the readable topic label.
  const onSubmit = handleSubmit(({ topic, ...values }) =>
    send.mutate({ data: { ...values, subject: topics.find((t) => t.value === topic)?.label ?? 'Other' } }, { onSuccess: () => reset() }));
  return <SiteLayout><main><PageHero eyebrow="Contact" title="Tell us what you’re preparing for." intro={`Questions about exams, courses, student access or examiner sessions? Send the ${brand.name} team a note.`} />
    <section className="section"><div className="container form-layout"><div className="form-copy"><span className="eyebrow" style={{ color: '#a7d2ff' }}>We’re here to help</span><h2>Let’s make your next step clear.</h2><p>Send a message or call us using the number below.</p>
      {brand.phone && <p style={{ marginTop: 26 }}><strong style={{ color: '#fff' }}>Call us</strong><br /><a href={`tel:${brand.phone.replace(/\s/g, '')}`} style={{ color: '#b9d9fb', textDecoration: 'none' }}>{brand.phone}</a></p>}
      {brand.supportEmail && <p style={{ marginTop: 18 }}><strong style={{ color: '#fff' }}>Email</strong><br /><a href={`mailto:${brand.supportEmail}`} style={{ color: '#b9d9fb', textDecoration: 'none' }}>{brand.supportEmail}</a></p>}</div>
      <form className="form-box" onSubmit={onSubmit} noValidate><h2>Send a message</h2><p>All fields are required.</p>
        <div className="form-field"><label htmlFor="contact-name">Your name</label><input id="contact-name" autoComplete="name" aria-invalid={!!errors.name} aria-describedby={errors.name ? 'err-name' : undefined} {...register('name', { required: 'Enter your name', maxLength: 120 })} />{errors.name && <p className="field-error" id="err-name">{errors.name.message}</p>}</div>
        <div className="form-field"><label htmlFor="contact-email">Email address</label><input id="contact-email" type="email" autoComplete="email" aria-invalid={!!errors.email} aria-describedby={errors.email ? 'err-email' : undefined} {...register('email', { required: 'Enter your email address', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' } })} />{errors.email && <p className="field-error" id="err-email">{errors.email.message}</p>}</div>
        <div className="form-field"><label htmlFor="contact-topic">What can we help with?</label><select id="contact-topic" {...register('topic')}>{topics.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
        <div className="form-field"><label htmlFor="contact-message">Message</label><textarea id="contact-message" aria-invalid={!!errors.message} aria-describedby={errors.message ? 'err-message' : undefined} {...register('message', { required: 'Enter a message', minLength: { value: 10, message: 'Please write at least 10 characters' }, maxLength: { value: 5000, message: 'Please keep it under 5,000 characters' } })} />{errors.message && <p className="field-error" id="err-message">{errors.message.message}</p>}</div>
        <div className="hp-field" aria-hidden="true"><label>Leave this field empty<input tabIndex={-1} autoComplete="off" {...register('website')} /></label></div>
        <button className="btn btn-primary" type="submit" disabled={send.isPending}>{send.isPending ? 'Sending…' : <>Send message <ArrowRight size={15} aria-hidden="true" /></>}</button>
        <div aria-live="polite">
          {send.isSuccess && <div className="notice" role="status">Thanks for getting in touch. We’ll reply by email.</div>}
          {send.isError && <div className="notice notice-error" role="alert">{rateLimited ? 'You have sent several messages recently. Please wait a few minutes and try again.' : 'Sorry, we could not send your message. Please try again, or email us directly.'}</div>}
        </div>
      </form>
    </div></section></main></SiteLayout>;
}
