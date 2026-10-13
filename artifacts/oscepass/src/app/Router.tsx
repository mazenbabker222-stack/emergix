import { lazy, Suspense } from 'react';
import { Redirect, Route, Switch, useLocation, useParams } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { PageSkeleton } from '@/components/shared/DataState';
import { RequireAuth } from '@/features/auth/guards';

// Route-level code splitting: each page is its own chunk.
const About = lazy(() => import('@/pages/About'));
const AdminHome = lazy(() => import('@/pages/admin/AdminHome'));
const CourseEditor = lazy(() => import('@/pages/admin/CourseEditor'));
const QuestionBank = lazy(() => import('@/pages/admin/QuestionBank'));
const Account = lazy(() => import('@/pages/app/Account'));
const Blog = lazy(() => import('@/pages/Blog'));
const BlogPost = lazy(() => import('@/pages/BlogPost'));
const Calendar = lazy(() => import('@/pages/Calendar'));
const Contact = lazy(() => import('@/pages/Contact'));
const Courses = lazy(() => import('@/pages/Courses'));
const Dashboard = lazy(() => import('@/pages/app/Dashboard'));
const ExamDetail = lazy(() => import('@/pages/ExamDetail'));
const Exams = lazy(() => import('@/pages/Exams'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const FreeDemo = lazy(() => import('@/pages/FreeDemo'));
const Help = lazy(() => import('@/pages/Help'));
const Home = lazy(() => import('@/pages/Home'));
const Legal = lazy(() => import('@/pages/Legal'));
const Login = lazy(() => import('@/pages/Login'));
const NotFound = lazy(() => import('@/pages/not-found'));
const OsceCircuitPage = lazy(() => import('@/features/osce/pages/OsceCircuitPage'));
const OsceLibrary = lazy(() => import('@/features/osce/pages/OsceLibrary'));
const OsceRoomPage = lazy(() => import('@/features/osce/pages/OsceRoomPage'));
const OsceStationPage = lazy(() => import('@/features/osce/pages/OsceStationPage'));
const OsceStationPreview = lazy(() => import('@/features/osce/pages/OsceStationPreview'));
const OsceStationPrint = lazy(() => import('@/features/osce/pages/OsceStationPrint'));
const Practice = lazy(() => import('@/pages/Practice'));
const Pricing = lazy(() => import('@/pages/Pricing'));
const QbankHome = lazy(() => import('@/features/qbank/pages').then((module) => ({ default: module.QbankHome })));
const NewQbankSession = lazy(() => import('@/features/qbank/pages').then((module) => ({ default: module.NewQbankSession })));
const QbankSession = lazy(() => import('@/features/qbank/pages').then((module) => ({ default: module.QbankSession })));
const QbankReview = lazy(() => import('@/features/qbank/pages').then((module) => ({ default: module.QbankReview })));
const QbankAnalytics = lazy(() => import('@/features/qbank/pages').then((module) => ({ default: module.QbankAnalytics })));
const Resources = lazy(() => import('@/pages/Resources'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const AdminSetup = lazy(() => import('@/pages/AdminSetup'));
const Signup = lazy(() => import('@/pages/Signup'));
const VerifyEmail = lazy(() => import('@/pages/VerifyEmail'));

function LegacyStationRedirect() {
  const { station = '' } = useParams<{ station: string }>();
  const slug = station.replace(/\.html$/i, '');
  return <Redirect to={slug === 'curriculum' ? '/osce-stations?topic=neurology' : `/osce-stations/${slug}`} replace />;
}

export function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><Suspense fallback={<PageSkeleton />}><Switch>
    <Route path="/" component={Home} />
    <Route path="/exams" component={Exams} />
    <Route path="/exams/:slug" component={ExamDetail} />
    <Route path="/calendar" component={Calendar} />
    <Route path="/pricing" component={Pricing} />
    <Route path="/free-demo" component={FreeDemo} />
    <Route path="/blog" component={Blog} />
    <Route path="/blog/:slug" component={BlogPost} />
    <Route path="/help" component={Help} />
    <Route path="/legal/:page" component={Legal} />
    <Route path="/courses" component={Courses} />
    <Route path="/practice" component={Practice} />
    <Route path="/resources" component={Resources} />
    <Route path="/about" component={About} />
    <Route path="/contact" component={Contact} />
    <Route path="/login" component={Login} />
    <Route path="/signup" component={Signup} />
    <Route path="/forgot-password" component={ForgotPassword} />
    <Route path="/reset-password" component={ResetPassword} />
    <Route path="/verify-email" component={VerifyEmail} />
    <Route path="/setup/admin" component={AdminSetup} />
    <Route path="/osce-stations"><OsceLibrary area="public" /></Route>
    <Route path="/osce-stations/:slug" component={OsceStationPreview} />
    <Route path="/app/osce"><RequireAuth><OsceLibrary area="app" /></RequireAuth></Route>
    <Route path="/app/osce/circuit/:id"><RequireAuth><OsceCircuitPage /></RequireAuth></Route>
    <Route path="/app/osce/room/:code"><RequireAuth><OsceRoomPage /></RequireAuth></Route>
    <Route path="/app/osce/:slug/print"><RequireAuth><OsceStationPrint /></RequireAuth></Route>
    <Route path="/app/osce/:slug"><RequireAuth><OsceStationPage /></RequireAuth></Route>
    <Route path="/app/qbank"><RequireAuth><QbankHome /></RequireAuth></Route>
    <Route path="/app/qbank/new"><RequireAuth><NewQbankSession /></RequireAuth></Route>
    <Route path="/app/qbank/session/:id"><RequireAuth><QbankSession /></RequireAuth></Route>
    <Route path="/app/qbank/review/:id"><RequireAuth><QbankReview /></RequireAuth></Route>
    <Route path="/app/analytics"><RequireAuth><QbankAnalytics /></RequireAuth></Route>
    <Route path="/app"><RequireAuth><Dashboard /></RequireAuth></Route>
    <Route path="/app/account"><RequireAuth><Account /></RequireAuth></Route>
    <Route path="/admin"><RequireAuth permission="admin:access"><AdminHome /></RequireAuth></Route>
    <Route path="/admin/questions"><RequireAuth permission="admin:access"><QuestionBank /></RequireAuth></Route>
    <Route path="/admin/courses/:id"><RequireAuth permission="admin:access"><CourseEditor /></RequireAuth></Route>
    <Route path="/neurology"><Redirect to="/osce-stations?topic=neurology" replace /></Route>
    <Route path="/neurology/:station" component={LegacyStationRedirect} />
    <Route component={NotFound} />
  </Switch></Suspense></ErrorBoundary>;
}
