import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link } from 'wouter';
import { ArrowUpRight, BookOpen, CirclePlus, Search, Trash2 } from 'lucide-react';
import { getAdminListCoursesQueryKey, useAdminCreateCourse, useAdminDeleteCourse, useAdminListCourses } from '@workspace/api-client-react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { EmptyState, ErrorState, PageSkeleton } from '@/components/shared/DataState';
import { Form } from '@/components/ui/form';
import { usePageMeta } from '@/lib/usePageMeta';

interface CreateCourseValues {
  title: string;
  slug: string;
  summary: string;
}

export default function AdminHome() {
  usePageMeta('Course administration', 'Manage MRCEM learning courses.');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');
  const params = useMemo(() => ({ limit: 100, ...(search.trim() ? { q: search.trim() } : {}) }), [search]);
  const courses = useAdminListCourses(params);
  const createCourse = useAdminCreateCourse();
  const deleteCourse = useAdminDeleteCourse();
  const queryClient = useQueryClient();
  const createForm = useForm<CreateCourseValues>({ defaultValues: { title: '', slug: '', summary: '' } });
  const data = courses.data?.data ?? [];

  async function handleCreate(values: CreateCourseValues) {
    setError('');
    try {
      await createCourse.mutateAsync({ data: { title: values.title.trim(), slug: values.slug.trim(), summary: values.summary.trim(), description: '', isFree: false, status: 'draft' } });
      await queryClient.invalidateQueries({ queryKey: getAdminListCoursesQueryKey() });
      createForm.reset();
      setShowCreate(false);
    } catch {
      setError('The course could not be created. Check the details and try again.');
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!window.confirm(`Soft-delete “${title}”? It will be hidden from the learner catalogue. This is a reversible soft deletion.`)) return;
    setError('');
    try {
      await deleteCourse.mutateAsync({ id });
      await queryClient.invalidateQueries({ queryKey: getAdminListCoursesQueryKey() });
    } catch {
      setError('The course could not be removed. Please try again.');
    }
  }

  return (
    <AdminLayout>
      <div className="course-admin">
        <header className="admin-page-head">
          <div>
            <span className="admin-kicker">MRCEM / OSCE · LEARNING LIBRARY</span>
            <h1>Courses</h1>
            <p>Shape exam knowledge into learning learners can follow.</p>
          </div>
          <button type="button" className="admin-button admin-button-primary" onClick={() => { setError(''); setShowCreate(true); }} data-testid="button-create-course">
            <CirclePlus size={17} /> New course
          </button>
        </header>
        <section className="catalog-panel" aria-label="Course catalogue">
          <div className="catalog-toolbar">
            <div className="catalog-count"><BookOpen size={17} /><strong>{courses.isLoading ? '—' : data.length}</strong><span>courses in this view</span></div>
            <label className="admin-search"><Search size={17} aria-hidden="true" /><span className="sr-only">Search courses</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search courses…" data-testid="input-search-courses" /></label>
          </div>
          {error && <div className="admin-inline-error" role="alert">{error}<button type="button" onClick={() => setError('')} aria-label="Dismiss error">Dismiss</button></div>}
          {courses.isLoading ? <PageSkeleton rows={3} label="Loading courses" /> : courses.isError ? <ErrorState title="Courses could not be loaded" onRetry={() => void courses.refetch()} /> : data.length === 0 ? (
            search ? <EmptyState title="No matching courses" text="Try another title or clear your search." /> : <div className="admin-empty"><span className="empty-mark"><BookOpen size={23} /></span><h2>Your course library starts here</h2><p>Create a course, then add modules and lessons in a clear sequence.</p><button className="admin-button admin-button-primary" type="button" onClick={() => setShowCreate(true)}><CirclePlus size={16} /> Create your first course</button></div>
          ) : (
            <div className="course-table-wrap"><table className="course-table"><thead><tr><th>Course</th><th>Lessons</th><th>Status</th><th>Access</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>{data.map((course) => <tr key={course.id} data-testid={`row-course-${course.id}`}>
                <td><Link href={`/admin/courses/${course.id}`} className="course-title-link"><span className="course-symbol">{course.title.slice(0, 1).toUpperCase()}</span><span><strong>{course.title}</strong><small>/{course.slug}</small></span><ArrowUpRight size={15} className="course-link-icon" /></Link></td>
                <td><span className="lesson-count">{course.lessonCount.toString().padStart(2, '0')}</span><span className="muted-label"> lessons</span></td>
                <td><span className={`status-pill status-${course.status}`}>{course.status}</span></td>
                <td><span className={`access-label ${course.isFree ? 'is-free' : ''}`}>{course.isFree ? 'Free' : 'Paid'}</span></td>
                <td><div className="row-actions"><Link href={`/admin/courses/${course.id}`} className="row-edit">Manage</Link><button type="button" className="icon-button danger-button" onClick={() => void handleDelete(course.id, course.title)} aria-label={`Delete ${course.title}`} data-testid={`button-delete-course-${course.id}`}><Trash2 size={16} /></button></div></td>
              </tr>)}</tbody></table></div>
          )}
        </section>
        <footer className="catalog-foot"><span>Course changes are saved directly to the learning library.</span><span className="sync-indicator"><i /> Staff workspace</span></footer>
      </div>
      {showCreate && <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCreate(false); }}>
        <section className="admin-dialog" role="dialog" aria-modal="true" aria-labelledby="create-course-title">
          <div className="dialog-heading"><div><span className="admin-kicker">NEW COURSE</span><h2 id="create-course-title">Start with the essentials</h2></div><button type="button" className="icon-button" onClick={() => setShowCreate(false)} aria-label="Close">×</button></div>
          <Form {...createForm}><form onSubmit={createForm.handleSubmit(handleCreate)}>
            <label className="admin-field">Course title<input autoFocus required {...createForm.register('title', { required: true })} placeholder="For example, MRCEM Primary foundations" data-testid="input-course-title" /></label>
            <label className="admin-field">Course slug<input required pattern="[a-z0-9-]+" {...createForm.register('slug', { required: true, pattern: /^[a-z0-9-]+$/ })} placeholder="mrcem-primary-foundations" data-testid="input-course-slug" /><small>Lowercase letters, numbers and hyphens only.</small></label>
            <label className="admin-field">Short summary<textarea {...createForm.register('summary')} rows={3} placeholder="A concise introduction for learners" data-testid="input-course-summary" /></label>
            {error && <p className="admin-form-error" role="alert">{error}</p>}
            <div className="dialog-actions"><button type="button" className="admin-button admin-button-quiet" onClick={() => setShowCreate(false)}>Cancel</button><button type="submit" className="admin-button admin-button-primary" disabled={createCourse.isPending} data-testid="button-submit-course">{createCourse.isPending ? 'Creating…' : 'Create course'}</button></div>
          </form></Form>
        </section>
      </div>}
    </AdminLayout>
  );
}
