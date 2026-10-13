--
-- PostgreSQL database dump
--

\restrict vC5sfgAWHV26cktwd11NNmRAWRrwZw2woPqJebDtgcO7UrgMKu4hIhhdPTPw5sT

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: bookmark_target; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.bookmark_target AS ENUM (
    'question',
    'lesson',
    'osce_station'
);


--
-- Name: contact_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.contact_status AS ENUM (
    'new',
    'in_progress',
    'resolved',
    'spam'
);


--
-- Name: coupon_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.coupon_kind AS ENUM (
    'percent',
    'amount'
);


--
-- Name: entitlement_source; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.entitlement_source AS ENUM (
    'subscription',
    'manual',
    'licence',
    'coupon',
    'free'
);


--
-- Name: lesson_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.lesson_type AS ENUM (
    'video',
    'article',
    'pdf',
    'audio',
    'resource',
    'quiz'
);


--
-- Name: media_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.media_kind AS ENUM (
    'image',
    'video',
    'audio',
    'pdf',
    'file'
);


--
-- Name: media_processing; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.media_processing AS ENUM (
    'uploading',
    'processing',
    'ready',
    'errored'
);


--
-- Name: osce_attempt_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.osce_attempt_status AS ENUM (
    'in_progress',
    'completed',
    'abandoned',
    'draft',
    'saved',
    'planned',
    'running'
);


--
-- Name: osce_global_rating; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.osce_global_rating AS ENUM (
    'clear_pass',
    'pass',
    'borderline',
    'fail'
);


--
-- Name: osce_mode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.osce_mode AS ENUM (
    'learning',
    'exam'
);


--
-- Name: osce_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.osce_role AS ENUM (
    'candidate',
    'examiner'
);


--
-- Name: osce_room_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.osce_room_status AS ENUM (
    'waiting',
    'active',
    'closed'
);


--
-- Name: plan_item_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.plan_item_kind AS ENUM (
    'qbank',
    'lesson',
    'osce',
    'flashcards',
    'revision',
    'rest'
);


--
-- Name: publish_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.publish_status AS ENUM (
    'draft',
    'published',
    'archived'
);


--
-- Name: question_report_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.question_report_status AS ENUM (
    'open',
    'investigating',
    'resolved',
    'dismissed'
);


--
-- Name: question_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.question_status AS ENUM (
    'draft',
    'review',
    'approved',
    'published',
    'archived'
);


--
-- Name: question_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.question_type AS ENUM (
    'sba',
    'image',
    'emq',
    'multi_select'
);


--
-- Name: quiz_mode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.quiz_mode AS ENUM (
    'tutor',
    'timed',
    'custom',
    'review'
);


--
-- Name: quiz_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.quiz_status AS ENUM (
    'in_progress',
    'completed',
    'expired',
    'abandoned'
);


--
-- Name: subscription_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.subscription_status AS ENUM (
    'trialing',
    'active',
    'past_due',
    'canceled',
    'incomplete',
    'expired',
    'refunded'
);


--
-- Name: tag_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tag_kind AS ENUM (
    'general',
    'source',
    'year'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts (
    id text NOT NULL,
    user_id text NOT NULL,
    account_id text NOT NULL,
    provider_id text NOT NULL,
    access_token text,
    refresh_token text,
    id_token text,
    access_token_expires_at timestamp with time zone,
    refresh_token_expires_at timestamp with time zone,
    scope text,
    password text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id text,
    impersonator_id text,
    action text NOT NULL,
    entity_type text,
    entity_id text,
    before jsonb,
    after jsonb,
    ip text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: auth_lockouts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_lockouts (
    email text NOT NULL,
    failed_count integer DEFAULT 0 NOT NULL,
    locked_until timestamp with time zone,
    last_failed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: banners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.banners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    exam_id uuid,
    message text NOT NULL,
    link_url text,
    link_label text,
    tone text DEFAULT 'info'::text NOT NULL,
    dismissible boolean DEFAULT true NOT NULL,
    starts_at timestamp with time zone,
    ends_at timestamp with time zone,
    status public.publish_status DEFAULT 'draft'::public.publish_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: blog_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blog_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    excerpt text DEFAULT ''::text NOT NULL,
    body text DEFAULT ''::text NOT NULL,
    cover_asset_id uuid,
    author_id text,
    author_name text DEFAULT 'Exam Platform team'::text NOT NULL,
    cover_image_url text,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    seo_title text,
    seo_description text,
    published_at timestamp with time zone,
    status public.publish_status DEFAULT 'draft'::public.publish_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: bookmarks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookmarks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    target_type public.bookmark_target NOT NULL,
    target_id uuid NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: card_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.card_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    flashcard_id uuid NOT NULL,
    user_id text NOT NULL,
    quality integer NOT NULL,
    interval_days integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: certificates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.certificates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    course_id uuid NOT NULL,
    code text NOT NULL,
    issued_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: contact_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contact_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text,
    name text NOT NULL,
    email text NOT NULL,
    subject text,
    message text NOT NULL,
    ip_hash text,
    emailed_at timestamp with time zone,
    status public.contact_status DEFAULT 'new'::public.contact_status NOT NULL,
    internal_notes jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: coupon_redemptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coupon_redemptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    coupon_id uuid NOT NULL,
    user_id text NOT NULL,
    subscription_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: coupons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coupons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    kind public.coupon_kind NOT NULL,
    percent_off numeric(5,2),
    amount_off_minor integer,
    currency text,
    max_redemptions integer,
    redeemed_count integer DEFAULT 0 NOT NULL,
    valid_from timestamp with time zone,
    valid_until timestamp with time zone,
    stripe_coupon_id text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.courses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    exam_id uuid,
    slug text NOT NULL,
    title text NOT NULL,
    summary text DEFAULT ''::text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    cover_asset_id uuid,
    instructor_id text,
    is_free boolean DEFAULT false NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    status public.publish_status DEFAULT 'draft'::public.publish_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: devices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.devices (
    id text NOT NULL,
    user_id text NOT NULL,
    fingerprint text NOT NULL,
    user_agent text,
    first_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    last_seen_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: difficulty_levels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.difficulty_levels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    rank integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: email_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text,
    to_email text NOT NULL,
    template_key text,
    subject text NOT NULL,
    provider_message_id text,
    status text DEFAULT 'queued'::text NOT NULL,
    error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: email_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    subject text NOT NULL,
    body_html text NOT NULL,
    body_text text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: entitlements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entitlements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    exam_id uuid NOT NULL,
    source public.entitlement_source NOT NULL,
    subscription_id uuid,
    granted_by text,
    starts_at timestamp with time zone DEFAULT now() NOT NULL,
    ends_at timestamp with time zone,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: exam_dates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_dates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    exam_id uuid NOT NULL,
    label text NOT NULL,
    starts_on date NOT NULL,
    ends_on date,
    application_opens_on date,
    application_closes_on date,
    location text,
    fee_amount numeric(10,2),
    fee_currency text DEFAULT 'GBP'::text NOT NULL,
    is_placeholder boolean DEFAULT false NOT NULL,
    notes text,
    status public.publish_status DEFAULT 'published'::public.publish_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: exam_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    exam_id uuid,
    title text NOT NULL,
    description text,
    storage_key text,
    external_url text,
    file_type text DEFAULT 'pdf'::text NOT NULL,
    size_bytes integer,
    "position" integer DEFAULT 0 NOT NULL,
    status public.publish_status DEFAULT 'published'::public.publish_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: exam_faqs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_faqs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    exam_id uuid,
    category text,
    question text NOT NULL,
    answer text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    status public.publish_status DEFAULT 'published'::public.publish_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: exams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    short_name text NOT NULL,
    summary text DEFAULT ''::text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    format jsonb NOT NULL,
    location text,
    official_url text,
    exam_type text DEFAULT ''::text NOT NULL,
    format_label text DEFAULT ''::text NOT NULL,
    last_reviewed_at timestamp with time zone,
    simulator_preset jsonb DEFAULT '{}'::jsonb NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    status public.publish_status DEFAULT 'draft'::public.publish_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: feature_flags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature_flags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    description text,
    enabled boolean DEFAULT false NOT NULL,
    rollout jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: flashcards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flashcards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    question_id uuid,
    topic_id uuid,
    front text NOT NULL,
    back text NOT NULL,
    ease_factor numeric(4,2) DEFAULT 2.50 NOT NULL,
    interval_days integer DEFAULT 0 NOT NULL,
    repetitions integer DEFAULT 0 NOT NULL,
    due_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    subscription_id uuid,
    stripe_invoice_id text,
    number text,
    currency text NOT NULL,
    amount_minor integer NOT NULL,
    status text NOT NULL,
    hosted_url text,
    pdf_url text,
    paid_at timestamp with time zone,
    refunded_minor integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lesson_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lesson_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    lesson_id uuid NOT NULL,
    at_seconds integer,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lesson_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lesson_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    lesson_id uuid NOT NULL,
    position_seconds integer DEFAULT 0 NOT NULL,
    percent integer DEFAULT 0 NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lessons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lessons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    module_id uuid NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    type public.lesson_type DEFAULT 'article'::public.lesson_type NOT NULL,
    body text,
    asset_id uuid,
    chapters jsonb DEFAULT '[]'::jsonb NOT NULL,
    duration_seconds integer,
    is_free_preview boolean DEFAULT false NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    status public.publish_status DEFAULT 'draft'::public.publish_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: licence_seats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.licence_seats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    licence_id uuid NOT NULL,
    user_id text,
    invite_email text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: licences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.licences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organisation text NOT NULL,
    owner_id text,
    exam_id uuid,
    seats integer NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: live_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.live_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid,
    title text NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    duration_minutes integer DEFAULT 60 NOT NULL,
    join_url text,
    recording_lesson_id uuid,
    status public.publish_status DEFAULT 'draft'::public.publish_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: media_assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.media_assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kind public.media_kind NOT NULL,
    filename text NOT NULL,
    mime_type text,
    size_bytes bigint,
    storage_key text,
    mux_asset_id text,
    mux_playback_id text,
    duration_seconds integer,
    processing public.media_processing DEFAULT 'ready'::public.media_processing NOT NULL,
    captions jsonb DEFAULT '[]'::jsonb NOT NULL,
    alt_text text,
    tags jsonb DEFAULT '[]'::jsonb NOT NULL,
    uploaded_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.modules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    topic_id uuid,
    title text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: osce_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.osce_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    station_id uuid NOT NULL,
    circuit_id uuid,
    room_id uuid,
    mode public.osce_mode NOT NULL,
    role public.osce_role DEFAULT 'candidate'::public.osce_role NOT NULL,
    status public.osce_attempt_status DEFAULT 'in_progress'::public.osce_attempt_status NOT NULL,
    domain_scores jsonb DEFAULT '{}'::jsonb NOT NULL,
    total_score integer,
    max_marks integer DEFAULT 20 NOT NULL,
    global_rating public.osce_global_rating,
    duration_seconds integer,
    notes text,
    saved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: osce_circuits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.osce_circuits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    exam_id uuid,
    title text DEFAULT 'Practice circuit'::text NOT NULL,
    plan jsonb DEFAULT '{}'::jsonb NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    station_order jsonb DEFAULT '[]'::jsonb NOT NULL,
    current_index integer DEFAULT 0 NOT NULL,
    status public.osce_attempt_status DEFAULT 'in_progress'::public.osce_attempt_status NOT NULL,
    started_at timestamp with time zone,
    finished_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: osce_marking_domains; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.osce_marking_domains (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    station_id uuid NOT NULL,
    name text NOT NULL,
    max_score integer DEFAULT 4 NOT NULL,
    descriptor text DEFAULT ''::text NOT NULL,
    descriptors jsonb DEFAULT '[]'::jsonb NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: osce_rooms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.osce_rooms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    station_id uuid NOT NULL,
    host_id text NOT NULL,
    candidate_id text,
    examiner_id text,
    status public.osce_room_status DEFAULT 'waiting'::public.osce_room_status NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    clock jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: osce_stations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.osce_stations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    exam_id uuid,
    topic_id uuid,
    slug text NOT NULL,
    title text NOT NULL,
    specialty text,
    topic_group text,
    topic_group_slug text,
    summary text DEFAULT ''::text NOT NULL,
    image text,
    difficulty text DEFAULT 'core'::text NOT NULL,
    station_status text DEFAULT 'draft'::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    reading_minutes integer DEFAULT 1 NOT NULL,
    station_minutes integer DEFAULT 8 NOT NULL,
    reading_seconds integer DEFAULT 60 NOT NULL,
    history_seconds integer DEFAULT 480 NOT NULL,
    examiner_seconds integer DEFAULT 120 NOT NULL,
    total_marks integer DEFAULT 20 NOT NULL,
    content_version integer DEFAULT 1 NOT NULL,
    content jsonb DEFAULT '{}'::jsonb NOT NULL,
    legacy_file text,
    status public.question_status DEFAULT 'draft'::public.question_status NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    reviewer_id text,
    last_reviewed_at timestamp with time zone,
    is_sample boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    body text DEFAULT ''::text NOT NULL,
    kind text DEFAULT 'page'::text NOT NULL,
    data jsonb,
    needs_review boolean DEFAULT false NOT NULL,
    seo_title text,
    seo_description text,
    status public.publish_status DEFAULT 'draft'::public.publish_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: plan_prices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_prices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid NOT NULL,
    currency text NOT NULL,
    region text DEFAULT 'ALL'::text NOT NULL,
    amount_minor integer NOT NULL,
    stripe_price_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    exam_id uuid,
    slug text NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    features jsonb DEFAULT '[]'::jsonb NOT NULL,
    access_months integer NOT NULL,
    trial_days integer DEFAULT 0 NOT NULL,
    is_placeholder boolean DEFAULT false NOT NULL,
    family_key text,
    family_name text,
    is_featured boolean DEFAULT false NOT NULL,
    stripe_product_id text,
    "position" integer DEFAULT 0 NOT NULL,
    status public.publish_status DEFAULT 'draft'::public.publish_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: question_flags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_flags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    question_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: question_lessons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_lessons (
    question_id uuid NOT NULL,
    lesson_id uuid NOT NULL
);


--
-- Name: question_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    question_id uuid NOT NULL,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: question_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_options (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question_id uuid NOT NULL,
    label text NOT NULL,
    text text NOT NULL,
    is_correct boolean DEFAULT false NOT NULL,
    rationale text DEFAULT ''::text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: question_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question_id uuid NOT NULL,
    user_id text,
    category text DEFAULT 'other'::text NOT NULL,
    message text NOT NULL,
    status public.question_report_status DEFAULT 'open'::public.question_report_status NOT NULL,
    internal_note text,
    resolved_by text,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: question_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_stats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question_id uuid NOT NULL,
    day date NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    correct integer DEFAULT 0 NOT NULL,
    total_time_ms integer DEFAULT 0 NOT NULL,
    option_counts jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: question_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_tags (
    question_id uuid NOT NULL,
    tag_id uuid NOT NULL
);


--
-- Name: question_topics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_topics (
    question_id uuid NOT NULL,
    topic_id uuid NOT NULL
);


--
-- Name: question_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question_id uuid NOT NULL,
    version integer NOT NULL,
    snapshot jsonb NOT NULL,
    change_note text,
    changed_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    exam_id uuid NOT NULL,
    type public.question_type DEFAULT 'sba'::public.question_type NOT NULL,
    stem text NOT NULL,
    lead_in text,
    media_asset_id uuid,
    explanation text DEFAULT ''::text NOT NULL,
    key_point text,
    "references" jsonb DEFAULT '[]'::jsonb NOT NULL,
    difficulty_id uuid,
    year integer,
    source_label text,
    status public.question_status DEFAULT 'draft'::public.question_status NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    author_id text,
    reviewer_id text,
    last_reviewed_at timestamp with time zone,
    is_sample boolean DEFAULT false NOT NULL,
    content_hash text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: quiz_answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quiz_answers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_question_id uuid NOT NULL,
    user_id text NOT NULL,
    question_id uuid NOT NULL,
    selected_option_id uuid,
    is_correct boolean,
    time_spent_ms integer DEFAULT 0 NOT NULL,
    struck_option_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    answered_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: quiz_session_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quiz_session_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    question_id uuid NOT NULL,
    "position" integer NOT NULL,
    section integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: quiz_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quiz_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    exam_id uuid,
    mode public.quiz_mode NOT NULL,
    status public.quiz_status DEFAULT 'in_progress'::public.quiz_status NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    question_count integer DEFAULT 0 NOT NULL,
    current_section integer DEFAULT 0 NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    deadline_at timestamp with time zone,
    finished_at timestamp with time zone,
    score_correct integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id text NOT NULL,
    user_id text NOT NULL,
    token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    ip_address text,
    user_agent text,
    impersonated_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value jsonb NOT NULL,
    is_public boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: study_plan_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.study_plan_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    study_plan_id uuid NOT NULL,
    topic_id uuid,
    kind public.plan_item_kind NOT NULL,
    title text NOT NULL,
    scheduled_for date NOT NULL,
    estimated_minutes integer DEFAULT 30 NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: study_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.study_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    exam_id uuid NOT NULL,
    exam_date date NOT NULL,
    hours_per_week integer DEFAULT 10 NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    plan_id uuid NOT NULL,
    status public.subscription_status NOT NULL,
    stripe_customer_id text,
    stripe_subscription_id text,
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    cancel_at_period_end boolean DEFAULT false NOT NULL,
    canceled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kind public.tag_kind DEFAULT 'general'::public.tag_kind NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: testimonials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.testimonials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    author_name text NOT NULL,
    author_role text,
    quote text NOT NULL,
    consent_recorded boolean DEFAULT false NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    status public.publish_status DEFAULT 'draft'::public.publish_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: topics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.topics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    parent_id uuid,
    exam_id uuid,
    slug text NOT NULL,
    name text NOT NULL,
    description text,
    syllabus_ref text,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: two_factors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.two_factors (
    id text NOT NULL,
    user_id text NOT NULL,
    secret text NOT NULL,
    backup_codes text NOT NULL,
    verified boolean DEFAULT true NOT NULL,
    failed_verification_count integer DEFAULT 0 NOT NULL,
    locked_until timestamp with time zone
);


--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_profiles (
    user_id text NOT NULL,
    country text,
    specialty text,
    target_exam text,
    target_exam_date date,
    grade text,
    target_exam_id uuid,
    daily_goal_questions integer DEFAULT 20 NOT NULL,
    marketing_opt_in boolean DEFAULT false NOT NULL,
    preferences jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    email_verified boolean DEFAULT false NOT NULL,
    image text,
    role text DEFAULT 'learner'::text NOT NULL,
    two_factor_enabled boolean DEFAULT false NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    last_seen_at timestamp with time zone,
    deletion_scheduled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: verifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verifications (
    id text NOT NULL,
    identifier text NOT NULL,
    value text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: webhook_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stripe_event_id text NOT NULL,
    type text NOT NULL,
    payload jsonb NOT NULL,
    processed_at timestamp with time zone,
    error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Data for Name: accounts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.accounts (id, user_id, account_id, provider_id, access_token, refresh_token, id_token, access_token_expires_at, refresh_token_expires_at, scope, password, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: audit_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_log (id, actor_id, impersonator_id, action, entity_type, entity_id, before, after, ip, user_agent, created_at) FROM stdin;
\.


--
-- Data for Name: auth_lockouts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.auth_lockouts (email, failed_count, locked_until, last_failed_at) FROM stdin;
\.


--
-- Data for Name: banners; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.banners (id, exam_id, message, link_url, link_label, tone, dismissible, starts_at, ends_at, status, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: blog_posts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.blog_posts (id, slug, title, excerpt, body, cover_asset_id, author_id, author_name, cover_image_url, tags, seo_title, seo_description, published_at, status, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: bookmarks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bookmarks (id, user_id, target_type, target_id, note, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: card_reviews; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.card_reviews (id, flashcard_id, user_id, quality, interval_days, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: certificates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.certificates (id, user_id, course_id, code, issued_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: contact_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.contact_messages (id, user_id, name, email, subject, message, ip_hash, emailed_at, status, internal_notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: coupon_redemptions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.coupon_redemptions (id, coupon_id, user_id, subscription_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: coupons; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.coupons (id, code, kind, percent_off, amount_off_minor, currency, max_redemptions, redeemed_count, valid_from, valid_until, stripe_coupon_id, is_active, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: courses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.courses (id, exam_id, slug, title, summary, description, cover_asset_id, instructor_id, is_free, "position", status, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: devices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.devices (id, user_id, fingerprint, user_agent, first_seen_at, last_seen_at) FROM stdin;
\.


--
-- Data for Name: difficulty_levels; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.difficulty_levels (id, slug, name, rank, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: email_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.email_log (id, user_id, to_email, template_key, subject, provider_message_id, status, error, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: email_templates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.email_templates (id, key, subject, body_html, body_text, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: entitlements; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.entitlements (id, user_id, exam_id, source, subscription_id, granted_by, starts_at, ends_at, revoked_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: exam_dates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.exam_dates (id, exam_id, label, starts_on, ends_on, application_opens_on, application_closes_on, location, fee_amount, fee_currency, is_placeholder, notes, status, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: exam_documents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.exam_documents (id, exam_id, title, description, storage_key, external_url, file_type, size_bytes, "position", status, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: exam_faqs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.exam_faqs (id, exam_id, category, question, answer, "position", status, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: exams; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.exams (id, slug, name, short_name, summary, description, format, location, official_url, exam_type, format_label, last_reviewed_at, simulator_preset, "position", status, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: feature_flags; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.feature_flags (id, key, description, enabled, rollout, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: flashcards; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.flashcards (id, user_id, question_id, topic_id, front, back, ease_factor, interval_days, repetitions, due_at, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.invoices (id, user_id, subscription_id, stripe_invoice_id, number, currency, amount_minor, status, hosted_url, pdf_url, paid_at, refunded_minor, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: lesson_notes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lesson_notes (id, user_id, lesson_id, at_seconds, body, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: lesson_progress; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lesson_progress (id, user_id, lesson_id, position_seconds, percent, completed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: lessons; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lessons (id, module_id, slug, title, type, body, asset_id, chapters, duration_seconds, is_free_preview, "position", status, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: licence_seats; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.licence_seats (id, licence_id, user_id, invite_email, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: licences; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.licences (id, organisation, owner_id, exam_id, seats, starts_at, ends_at, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: live_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.live_sessions (id, course_id, title, starts_at, duration_minutes, join_url, recording_lesson_id, status, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: media_assets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.media_assets (id, kind, filename, mime_type, size_bytes, storage_key, mux_asset_id, mux_playback_id, duration_seconds, processing, captions, alt_text, tags, uploaded_by, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: modules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.modules (id, course_id, topic_id, title, "position", created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: osce_attempts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.osce_attempts (id, user_id, station_id, circuit_id, room_id, mode, role, status, domain_scores, total_score, max_marks, global_rating, duration_seconds, notes, saved_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: osce_circuits; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.osce_circuits (id, user_id, exam_id, title, plan, config, station_order, current_index, status, started_at, finished_at, completed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: osce_marking_domains; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.osce_marking_domains (id, station_id, name, max_score, descriptor, descriptors, "position", created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: osce_rooms; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.osce_rooms (id, code, station_id, host_id, candidate_id, examiner_id, status, expires_at, clock, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: osce_stations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.osce_stations (id, exam_id, topic_id, slug, title, specialty, topic_group, topic_group_slug, summary, image, difficulty, station_status, sort_order, reading_minutes, station_minutes, reading_seconds, history_seconds, examiner_seconds, total_marks, content_version, content, legacy_file, status, version, reviewer_id, last_reviewed_at, is_sample, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: pages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pages (id, slug, title, body, kind, data, needs_review, seo_title, seo_description, status, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: plan_prices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.plan_prices (id, plan_id, currency, region, amount_minor, stripe_price_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: plans; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.plans (id, exam_id, slug, name, description, features, access_months, trial_days, is_placeholder, family_key, family_name, is_featured, stripe_product_id, "position", status, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: question_flags; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.question_flags (id, user_id, question_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: question_lessons; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.question_lessons (question_id, lesson_id) FROM stdin;
\.


--
-- Data for Name: question_notes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.question_notes (id, user_id, question_id, body, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: question_options; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.question_options (id, question_id, label, text, is_correct, rationale, "position", created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: question_reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.question_reports (id, question_id, user_id, category, message, status, internal_note, resolved_by, resolved_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: question_stats; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.question_stats (id, question_id, day, attempts, correct, total_time_ms, option_counts, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: question_tags; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.question_tags (question_id, tag_id) FROM stdin;
\.


--
-- Data for Name: question_topics; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.question_topics (question_id, topic_id) FROM stdin;
\.


--
-- Data for Name: question_versions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.question_versions (id, question_id, version, snapshot, change_note, changed_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: questions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.questions (id, exam_id, type, stem, lead_in, media_asset_id, explanation, key_point, "references", difficulty_id, year, source_label, status, version, author_id, reviewer_id, last_reviewed_at, is_sample, content_hash, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: quiz_answers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.quiz_answers (id, session_question_id, user_id, question_id, selected_option_id, is_correct, time_spent_ms, struck_option_ids, answered_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: quiz_session_questions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.quiz_session_questions (id, session_id, question_id, "position", section, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: quiz_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.quiz_sessions (id, user_id, exam_id, mode, status, config, question_count, current_section, started_at, deadline_at, finished_at, score_correct, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sessions (id, user_id, token, expires_at, ip_address, user_agent, impersonated_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.settings (id, key, value, is_public, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: study_plan_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.study_plan_items (id, study_plan_id, topic_id, kind, title, scheduled_for, estimated_minutes, completed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: study_plans; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.study_plans (id, user_id, exam_id, exam_date, hours_per_week, settings, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.subscriptions (id, user_id, plan_id, status, stripe_customer_id, stripe_subscription_id, current_period_start, current_period_end, cancel_at_period_end, canceled_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: tags; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tags (id, kind, slug, name, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: testimonials; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.testimonials (id, author_name, author_role, quote, consent_recorded, "position", status, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: topics; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.topics (id, parent_id, exam_id, slug, name, description, syllabus_ref, "position", created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: two_factors; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.two_factors (id, user_id, secret, backup_codes, verified, failed_verification_count, locked_until) FROM stdin;
\.


--
-- Data for Name: user_profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_profiles (user_id, country, specialty, target_exam, target_exam_date, grade, target_exam_id, daily_goal_questions, marketing_opt_in, preferences, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, name, email, email_verified, image, role, two_factor_enabled, status, last_seen_at, deletion_scheduled_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: verifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.verifications (id, identifier, value, expires_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: webhook_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.webhook_events (id, stripe_event_id, type, payload, processed_at, error, created_at, updated_at) FROM stdin;
\.


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: auth_lockouts auth_lockouts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_lockouts
    ADD CONSTRAINT auth_lockouts_pkey PRIMARY KEY (email);


--
-- Name: banners banners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banners
    ADD CONSTRAINT banners_pkey PRIMARY KEY (id);


--
-- Name: blog_posts blog_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_pkey PRIMARY KEY (id);


--
-- Name: bookmarks bookmarks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookmarks
    ADD CONSTRAINT bookmarks_pkey PRIMARY KEY (id);


--
-- Name: card_reviews card_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.card_reviews
    ADD CONSTRAINT card_reviews_pkey PRIMARY KEY (id);


--
-- Name: certificates certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_pkey PRIMARY KEY (id);


--
-- Name: contact_messages contact_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_messages
    ADD CONSTRAINT contact_messages_pkey PRIMARY KEY (id);


--
-- Name: coupon_redemptions coupon_redemptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_redemptions
    ADD CONSTRAINT coupon_redemptions_pkey PRIMARY KEY (id);


--
-- Name: coupons coupons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_pkey PRIMARY KEY (id);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- Name: devices devices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);


--
-- Name: difficulty_levels difficulty_levels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.difficulty_levels
    ADD CONSTRAINT difficulty_levels_pkey PRIMARY KEY (id);


--
-- Name: email_log email_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_log
    ADD CONSTRAINT email_log_pkey PRIMARY KEY (id);


--
-- Name: email_templates email_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_pkey PRIMARY KEY (id);


--
-- Name: entitlements entitlements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entitlements
    ADD CONSTRAINT entitlements_pkey PRIMARY KEY (id);


--
-- Name: exam_dates exam_dates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_dates
    ADD CONSTRAINT exam_dates_pkey PRIMARY KEY (id);


--
-- Name: exam_documents exam_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_documents
    ADD CONSTRAINT exam_documents_pkey PRIMARY KEY (id);


--
-- Name: exam_faqs exam_faqs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_faqs
    ADD CONSTRAINT exam_faqs_pkey PRIMARY KEY (id);


--
-- Name: exams exams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_pkey PRIMARY KEY (id);


--
-- Name: feature_flags feature_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_flags
    ADD CONSTRAINT feature_flags_pkey PRIMARY KEY (id);


--
-- Name: flashcards flashcards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flashcards
    ADD CONSTRAINT flashcards_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: lesson_notes lesson_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_notes
    ADD CONSTRAINT lesson_notes_pkey PRIMARY KEY (id);


--
-- Name: lesson_progress lesson_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_progress
    ADD CONSTRAINT lesson_progress_pkey PRIMARY KEY (id);


--
-- Name: lessons lessons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_pkey PRIMARY KEY (id);


--
-- Name: licence_seats licence_seats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licence_seats
    ADD CONSTRAINT licence_seats_pkey PRIMARY KEY (id);


--
-- Name: licences licences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licences
    ADD CONSTRAINT licences_pkey PRIMARY KEY (id);


--
-- Name: live_sessions live_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_sessions
    ADD CONSTRAINT live_sessions_pkey PRIMARY KEY (id);


--
-- Name: media_assets media_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_assets
    ADD CONSTRAINT media_assets_pkey PRIMARY KEY (id);


--
-- Name: modules modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modules
    ADD CONSTRAINT modules_pkey PRIMARY KEY (id);


--
-- Name: osce_attempts osce_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.osce_attempts
    ADD CONSTRAINT osce_attempts_pkey PRIMARY KEY (id);


--
-- Name: osce_circuits osce_circuits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.osce_circuits
    ADD CONSTRAINT osce_circuits_pkey PRIMARY KEY (id);


--
-- Name: osce_marking_domains osce_marking_domains_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.osce_marking_domains
    ADD CONSTRAINT osce_marking_domains_pkey PRIMARY KEY (id);


--
-- Name: osce_rooms osce_rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.osce_rooms
    ADD CONSTRAINT osce_rooms_pkey PRIMARY KEY (id);


--
-- Name: osce_stations osce_stations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.osce_stations
    ADD CONSTRAINT osce_stations_pkey PRIMARY KEY (id);


--
-- Name: pages pages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_pkey PRIMARY KEY (id);


--
-- Name: plan_prices plan_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_prices
    ADD CONSTRAINT plan_prices_pkey PRIMARY KEY (id);


--
-- Name: plans plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (id);


--
-- Name: question_flags question_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_flags
    ADD CONSTRAINT question_flags_pkey PRIMARY KEY (id);


--
-- Name: question_lessons question_lessons_question_id_lesson_id_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_lessons
    ADD CONSTRAINT question_lessons_question_id_lesson_id_pk PRIMARY KEY (question_id, lesson_id);


--
-- Name: question_notes question_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_notes
    ADD CONSTRAINT question_notes_pkey PRIMARY KEY (id);


--
-- Name: question_options question_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_options
    ADD CONSTRAINT question_options_pkey PRIMARY KEY (id);


--
-- Name: question_reports question_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_reports
    ADD CONSTRAINT question_reports_pkey PRIMARY KEY (id);


--
-- Name: question_stats question_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_stats
    ADD CONSTRAINT question_stats_pkey PRIMARY KEY (id);


--
-- Name: question_tags question_tags_question_id_tag_id_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_tags
    ADD CONSTRAINT question_tags_question_id_tag_id_pk PRIMARY KEY (question_id, tag_id);


--
-- Name: question_topics question_topics_question_id_topic_id_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_topics
    ADD CONSTRAINT question_topics_question_id_topic_id_pk PRIMARY KEY (question_id, topic_id);


--
-- Name: question_versions question_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_versions
    ADD CONSTRAINT question_versions_pkey PRIMARY KEY (id);


--
-- Name: questions questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_pkey PRIMARY KEY (id);


--
-- Name: quiz_answers quiz_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_answers
    ADD CONSTRAINT quiz_answers_pkey PRIMARY KEY (id);


--
-- Name: quiz_session_questions quiz_session_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_session_questions
    ADD CONSTRAINT quiz_session_questions_pkey PRIMARY KEY (id);


--
-- Name: quiz_sessions quiz_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_sessions
    ADD CONSTRAINT quiz_sessions_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_token_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_token_unique UNIQUE (token);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: study_plan_items study_plan_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_plan_items
    ADD CONSTRAINT study_plan_items_pkey PRIMARY KEY (id);


--
-- Name: study_plans study_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_plans
    ADD CONSTRAINT study_plans_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: testimonials testimonials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.testimonials
    ADD CONSTRAINT testimonials_pkey PRIMARY KEY (id);


--
-- Name: topics topics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topics
    ADD CONSTRAINT topics_pkey PRIMARY KEY (id);


--
-- Name: two_factors two_factors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.two_factors
    ADD CONSTRAINT two_factors_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (user_id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: verifications verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verifications
    ADD CONSTRAINT verifications_pkey PRIMARY KEY (id);


--
-- Name: webhook_events webhook_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_events
    ADD CONSTRAINT webhook_events_pkey PRIMARY KEY (id);


--
-- Name: accounts_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_user_idx ON public.accounts USING btree (user_id);


--
-- Name: audit_log_action_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_action_created_idx ON public.audit_log USING btree (action, created_at);


--
-- Name: audit_log_actor_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_actor_created_idx ON public.audit_log USING btree (actor_id, created_at);


--
-- Name: banners_exam_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX banners_exam_status_idx ON public.banners USING btree (exam_id, status);


--
-- Name: blog_posts_slug_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX blog_posts_slug_uq ON public.blog_posts USING btree (slug);


--
-- Name: blog_posts_status_published_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX blog_posts_status_published_idx ON public.blog_posts USING btree (status, published_at);


--
-- Name: bookmarks_user_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bookmarks_user_created_idx ON public.bookmarks USING btree (user_id, created_at);


--
-- Name: bookmarks_user_target_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX bookmarks_user_target_uq ON public.bookmarks USING btree (user_id, target_type, target_id);


--
-- Name: card_reviews_card_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX card_reviews_card_idx ON public.card_reviews USING btree (flashcard_id);


--
-- Name: card_reviews_user_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX card_reviews_user_created_idx ON public.card_reviews USING btree (user_id, created_at);


--
-- Name: certificates_code_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX certificates_code_uq ON public.certificates USING btree (code);


--
-- Name: certificates_user_course_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX certificates_user_course_uq ON public.certificates USING btree (user_id, course_id);


--
-- Name: contact_messages_status_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contact_messages_status_created_idx ON public.contact_messages USING btree (status, created_at);


--
-- Name: coupon_redemptions_coupon_user_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX coupon_redemptions_coupon_user_uq ON public.coupon_redemptions USING btree (coupon_id, user_id);


--
-- Name: coupon_redemptions_user_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX coupon_redemptions_user_created_idx ON public.coupon_redemptions USING btree (user_id, created_at);


--
-- Name: coupons_code_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX coupons_code_uq ON public.coupons USING btree (code);


--
-- Name: courses_exam_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX courses_exam_status_idx ON public.courses USING btree (exam_id, status);


--
-- Name: courses_slug_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX courses_slug_uq ON public.courses USING btree (slug);


--
-- Name: devices_user_fingerprint_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX devices_user_fingerprint_uq ON public.devices USING btree (user_id, fingerprint);


--
-- Name: difficulty_levels_slug_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX difficulty_levels_slug_uq ON public.difficulty_levels USING btree (slug);


--
-- Name: email_log_user_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_log_user_created_idx ON public.email_log USING btree (user_id, created_at);


--
-- Name: email_templates_key_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX email_templates_key_uq ON public.email_templates USING btree (key);


--
-- Name: entitlements_subscription_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX entitlements_subscription_idx ON public.entitlements USING btree (subscription_id);


--
-- Name: entitlements_user_exam_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX entitlements_user_exam_idx ON public.entitlements USING btree (user_id, exam_id);


--
-- Name: exam_dates_exam_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX exam_dates_exam_status_idx ON public.exam_dates USING btree (exam_id, status);


--
-- Name: exam_dates_starts_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX exam_dates_starts_idx ON public.exam_dates USING btree (starts_on);


--
-- Name: exam_documents_exam_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX exam_documents_exam_idx ON public.exam_documents USING btree (exam_id);


--
-- Name: exam_faqs_exam_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX exam_faqs_exam_status_idx ON public.exam_faqs USING btree (exam_id, status);


--
-- Name: exams_slug_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX exams_slug_uq ON public.exams USING btree (slug);


--
-- Name: exams_status_position_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX exams_status_position_idx ON public.exams USING btree (status, "position");


--
-- Name: feature_flags_key_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX feature_flags_key_uq ON public.feature_flags USING btree (key);


--
-- Name: flashcards_question_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX flashcards_question_idx ON public.flashcards USING btree (question_id);


--
-- Name: flashcards_topic_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX flashcards_topic_idx ON public.flashcards USING btree (topic_id);


--
-- Name: flashcards_user_due_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX flashcards_user_due_idx ON public.flashcards USING btree (user_id, due_at);


--
-- Name: invoices_stripe_invoice_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX invoices_stripe_invoice_uq ON public.invoices USING btree (stripe_invoice_id);


--
-- Name: invoices_user_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoices_user_created_idx ON public.invoices USING btree (user_id, created_at);


--
-- Name: lesson_notes_user_lesson_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lesson_notes_user_lesson_idx ON public.lesson_notes USING btree (user_id, lesson_id);


--
-- Name: lesson_progress_user_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lesson_progress_user_created_idx ON public.lesson_progress USING btree (user_id, created_at);


--
-- Name: lesson_progress_user_lesson_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX lesson_progress_user_lesson_uq ON public.lesson_progress USING btree (user_id, lesson_id);


--
-- Name: lessons_module_position_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lessons_module_position_idx ON public.lessons USING btree (module_id, "position");


--
-- Name: lessons_module_slug_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX lessons_module_slug_uq ON public.lessons USING btree (module_id, slug);


--
-- Name: licence_seats_licence_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX licence_seats_licence_idx ON public.licence_seats USING btree (licence_id);


--
-- Name: licence_seats_licence_user_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX licence_seats_licence_user_uq ON public.licence_seats USING btree (licence_id, user_id);


--
-- Name: licences_exam_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX licences_exam_idx ON public.licences USING btree (exam_id);


--
-- Name: live_sessions_starts_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX live_sessions_starts_idx ON public.live_sessions USING btree (starts_at);


--
-- Name: media_assets_kind_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX media_assets_kind_idx ON public.media_assets USING btree (kind);


--
-- Name: media_assets_mux_asset_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX media_assets_mux_asset_uq ON public.media_assets USING btree (mux_asset_id);


--
-- Name: modules_course_position_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX modules_course_position_idx ON public.modules USING btree (course_id, "position");


--
-- Name: modules_topic_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX modules_topic_idx ON public.modules USING btree (topic_id);


--
-- Name: osce_attempts_circuit_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX osce_attempts_circuit_idx ON public.osce_attempts USING btree (circuit_id);


--
-- Name: osce_attempts_circuit_station_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX osce_attempts_circuit_station_uq ON public.osce_attempts USING btree (circuit_id, station_id) WHERE (circuit_id IS NOT NULL);


--
-- Name: osce_attempts_one_draft_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX osce_attempts_one_draft_uq ON public.osce_attempts USING btree (user_id, station_id) WHERE ((status = 'draft'::public.osce_attempt_status) AND (circuit_id IS NULL) AND (room_id IS NULL));


--
-- Name: osce_attempts_room_draft_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX osce_attempts_room_draft_uq ON public.osce_attempts USING btree (user_id, room_id) WHERE ((status = 'draft'::public.osce_attempt_status) AND (room_id IS NOT NULL));


--
-- Name: osce_attempts_station_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX osce_attempts_station_idx ON public.osce_attempts USING btree (station_id);


--
-- Name: osce_attempts_user_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX osce_attempts_user_created_idx ON public.osce_attempts USING btree (user_id, created_at);


--
-- Name: osce_circuits_user_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX osce_circuits_user_created_idx ON public.osce_circuits USING btree (user_id, created_at);


--
-- Name: osce_marking_domains_station_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX osce_marking_domains_station_idx ON public.osce_marking_domains USING btree (station_id, "position");


--
-- Name: osce_marking_domains_station_position_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX osce_marking_domains_station_position_uq ON public.osce_marking_domains USING btree (station_id, "position");


--
-- Name: osce_rooms_code_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX osce_rooms_code_uq ON public.osce_rooms USING btree (code);


--
-- Name: osce_rooms_host_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX osce_rooms_host_created_idx ON public.osce_rooms USING btree (host_id, created_at);


--
-- Name: osce_stations_exam_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX osce_stations_exam_status_idx ON public.osce_stations USING btree (exam_id, status);


--
-- Name: osce_stations_library_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX osce_stations_library_status_idx ON public.osce_stations USING btree (station_status, sort_order);


--
-- Name: osce_stations_slug_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX osce_stations_slug_uq ON public.osce_stations USING btree (slug);


--
-- Name: osce_stations_topic_group_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX osce_stations_topic_group_idx ON public.osce_stations USING btree (topic_group_slug);


--
-- Name: osce_stations_topic_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX osce_stations_topic_idx ON public.osce_stations USING btree (topic_id);


--
-- Name: pages_kind_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pages_kind_status_idx ON public.pages USING btree (kind, status);


--
-- Name: pages_slug_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX pages_slug_uq ON public.pages USING btree (slug);


--
-- Name: plan_prices_plan_currency_region_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX plan_prices_plan_currency_region_uq ON public.plan_prices USING btree (plan_id, currency, region);


--
-- Name: plan_prices_plan_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX plan_prices_plan_idx ON public.plan_prices USING btree (plan_id);


--
-- Name: plans_exam_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX plans_exam_status_idx ON public.plans USING btree (exam_id, status);


--
-- Name: plans_slug_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX plans_slug_uq ON public.plans USING btree (slug);


--
-- Name: question_flags_question_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX question_flags_question_idx ON public.question_flags USING btree (question_id);


--
-- Name: question_flags_user_q_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX question_flags_user_q_uq ON public.question_flags USING btree (user_id, question_id);


--
-- Name: question_lessons_lesson_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX question_lessons_lesson_idx ON public.question_lessons USING btree (lesson_id);


--
-- Name: question_notes_question_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX question_notes_question_idx ON public.question_notes USING btree (question_id);


--
-- Name: question_notes_user_q_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX question_notes_user_q_uq ON public.question_notes USING btree (user_id, question_id);


--
-- Name: question_options_q_label_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX question_options_q_label_uq ON public.question_options USING btree (question_id, label);


--
-- Name: question_options_question_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX question_options_question_idx ON public.question_options USING btree (question_id);


--
-- Name: question_reports_question_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX question_reports_question_idx ON public.question_reports USING btree (question_id);


--
-- Name: question_reports_status_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX question_reports_status_created_idx ON public.question_reports USING btree (status, created_at);


--
-- Name: question_stats_q_day_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX question_stats_q_day_uq ON public.question_stats USING btree (question_id, day);


--
-- Name: question_stats_question_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX question_stats_question_idx ON public.question_stats USING btree (question_id);


--
-- Name: question_tags_tag_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX question_tags_tag_idx ON public.question_tags USING btree (tag_id);


--
-- Name: question_topics_topic_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX question_topics_topic_idx ON public.question_topics USING btree (topic_id);


--
-- Name: question_versions_q_version_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX question_versions_q_version_uq ON public.question_versions USING btree (question_id, version);


--
-- Name: questions_content_hash_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX questions_content_hash_idx ON public.questions USING btree (content_hash);


--
-- Name: questions_difficulty_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX questions_difficulty_idx ON public.questions USING btree (difficulty_id);


--
-- Name: questions_exam_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX questions_exam_status_idx ON public.questions USING btree (exam_id, status);


--
-- Name: quiz_answers_question_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quiz_answers_question_idx ON public.quiz_answers USING btree (question_id);


--
-- Name: quiz_answers_session_question_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX quiz_answers_session_question_uq ON public.quiz_answers USING btree (session_question_id);


--
-- Name: quiz_answers_user_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quiz_answers_user_created_idx ON public.quiz_answers USING btree (user_id, created_at);


--
-- Name: quiz_session_questions_question_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quiz_session_questions_question_idx ON public.quiz_session_questions USING btree (question_id);


--
-- Name: quiz_session_questions_session_pos_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX quiz_session_questions_session_pos_uq ON public.quiz_session_questions USING btree (session_id, "position");


--
-- Name: quiz_session_questions_session_q_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX quiz_session_questions_session_q_uq ON public.quiz_session_questions USING btree (session_id, question_id);


--
-- Name: quiz_sessions_exam_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quiz_sessions_exam_status_idx ON public.quiz_sessions USING btree (exam_id, status);


--
-- Name: quiz_sessions_user_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quiz_sessions_user_created_idx ON public.quiz_sessions USING btree (user_id, created_at);


--
-- Name: quiz_sessions_user_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quiz_sessions_user_status_idx ON public.quiz_sessions USING btree (user_id, status);


--
-- Name: sessions_user_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sessions_user_created_idx ON public.sessions USING btree (user_id, created_at);


--
-- Name: settings_key_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX settings_key_uq ON public.settings USING btree (key);


--
-- Name: study_plan_items_plan_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX study_plan_items_plan_date_idx ON public.study_plan_items USING btree (study_plan_id, scheduled_for);


--
-- Name: study_plans_user_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX study_plans_user_created_idx ON public.study_plans USING btree (user_id, created_at);


--
-- Name: subscriptions_stripe_sub_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX subscriptions_stripe_sub_uq ON public.subscriptions USING btree (stripe_subscription_id);


--
-- Name: subscriptions_user_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscriptions_user_created_idx ON public.subscriptions USING btree (user_id, created_at);


--
-- Name: subscriptions_user_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscriptions_user_status_idx ON public.subscriptions USING btree (user_id, status);


--
-- Name: tags_kind_slug_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tags_kind_slug_uq ON public.tags USING btree (kind, slug);


--
-- Name: testimonials_status_position_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX testimonials_status_position_idx ON public.testimonials USING btree (status, "position");


--
-- Name: topics_exam_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX topics_exam_idx ON public.topics USING btree (exam_id);


--
-- Name: topics_parent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX topics_parent_idx ON public.topics USING btree (parent_id);


--
-- Name: topics_slug_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX topics_slug_uq ON public.topics USING btree (slug);


--
-- Name: two_factors_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX two_factors_user_idx ON public.two_factors USING btree (user_id);


--
-- Name: verifications_identifier_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX verifications_identifier_idx ON public.verifications USING btree (identifier);


--
-- Name: webhook_events_stripe_event_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX webhook_events_stripe_event_uq ON public.webhook_events USING btree (stripe_event_id);


--
-- Name: webhook_events_type_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX webhook_events_type_created_idx ON public.webhook_events USING btree (type, created_at);


--
-- Name: accounts accounts_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: banners banners_exam_id_exams_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banners
    ADD CONSTRAINT banners_exam_id_exams_id_fk FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;


--
-- Name: blog_posts blog_posts_author_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_author_id_users_id_fk FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: blog_posts blog_posts_cover_asset_id_media_assets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_cover_asset_id_media_assets_id_fk FOREIGN KEY (cover_asset_id) REFERENCES public.media_assets(id) ON DELETE SET NULL;


--
-- Name: bookmarks bookmarks_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookmarks
    ADD CONSTRAINT bookmarks_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: card_reviews card_reviews_flashcard_id_flashcards_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.card_reviews
    ADD CONSTRAINT card_reviews_flashcard_id_flashcards_id_fk FOREIGN KEY (flashcard_id) REFERENCES public.flashcards(id) ON DELETE CASCADE;


--
-- Name: card_reviews card_reviews_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.card_reviews
    ADD CONSTRAINT card_reviews_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: certificates certificates_course_id_courses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_course_id_courses_id_fk FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: certificates certificates_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: contact_messages contact_messages_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_messages
    ADD CONSTRAINT contact_messages_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: coupon_redemptions coupon_redemptions_coupon_id_coupons_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_redemptions
    ADD CONSTRAINT coupon_redemptions_coupon_id_coupons_id_fk FOREIGN KEY (coupon_id) REFERENCES public.coupons(id) ON DELETE RESTRICT;


--
-- Name: coupon_redemptions coupon_redemptions_subscription_id_subscriptions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_redemptions
    ADD CONSTRAINT coupon_redemptions_subscription_id_subscriptions_id_fk FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE SET NULL;


--
-- Name: coupon_redemptions coupon_redemptions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_redemptions
    ADD CONSTRAINT coupon_redemptions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: courses courses_cover_asset_id_media_assets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_cover_asset_id_media_assets_id_fk FOREIGN KEY (cover_asset_id) REFERENCES public.media_assets(id) ON DELETE SET NULL;


--
-- Name: courses courses_exam_id_exams_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_exam_id_exams_id_fk FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE SET NULL;


--
-- Name: courses courses_instructor_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_instructor_id_users_id_fk FOREIGN KEY (instructor_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: devices devices_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: email_log email_log_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_log
    ADD CONSTRAINT email_log_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: entitlements entitlements_exam_id_exams_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entitlements
    ADD CONSTRAINT entitlements_exam_id_exams_id_fk FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;


--
-- Name: entitlements entitlements_granted_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entitlements
    ADD CONSTRAINT entitlements_granted_by_users_id_fk FOREIGN KEY (granted_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: entitlements entitlements_subscription_id_subscriptions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entitlements
    ADD CONSTRAINT entitlements_subscription_id_subscriptions_id_fk FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE SET NULL;


--
-- Name: entitlements entitlements_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entitlements
    ADD CONSTRAINT entitlements_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: exam_dates exam_dates_exam_id_exams_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_dates
    ADD CONSTRAINT exam_dates_exam_id_exams_id_fk FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;


--
-- Name: exam_documents exam_documents_exam_id_exams_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_documents
    ADD CONSTRAINT exam_documents_exam_id_exams_id_fk FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;


--
-- Name: exam_faqs exam_faqs_exam_id_exams_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_faqs
    ADD CONSTRAINT exam_faqs_exam_id_exams_id_fk FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;


--
-- Name: flashcards flashcards_question_id_questions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flashcards
    ADD CONSTRAINT flashcards_question_id_questions_id_fk FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE SET NULL;


--
-- Name: flashcards flashcards_topic_id_topics_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flashcards
    ADD CONSTRAINT flashcards_topic_id_topics_id_fk FOREIGN KEY (topic_id) REFERENCES public.topics(id) ON DELETE SET NULL;


--
-- Name: flashcards flashcards_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flashcards
    ADD CONSTRAINT flashcards_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: invoices invoices_subscription_id_subscriptions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_subscription_id_subscriptions_id_fk FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE SET NULL;


--
-- Name: invoices invoices_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: lesson_notes lesson_notes_lesson_id_lessons_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_notes
    ADD CONSTRAINT lesson_notes_lesson_id_lessons_id_fk FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: lesson_notes lesson_notes_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_notes
    ADD CONSTRAINT lesson_notes_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: lesson_progress lesson_progress_lesson_id_lessons_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_progress
    ADD CONSTRAINT lesson_progress_lesson_id_lessons_id_fk FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: lesson_progress lesson_progress_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_progress
    ADD CONSTRAINT lesson_progress_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: lessons lessons_asset_id_media_assets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_asset_id_media_assets_id_fk FOREIGN KEY (asset_id) REFERENCES public.media_assets(id) ON DELETE SET NULL;


--
-- Name: lessons lessons_module_id_modules_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_module_id_modules_id_fk FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE CASCADE;


--
-- Name: licence_seats licence_seats_licence_id_licences_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licence_seats
    ADD CONSTRAINT licence_seats_licence_id_licences_id_fk FOREIGN KEY (licence_id) REFERENCES public.licences(id) ON DELETE CASCADE;


--
-- Name: licence_seats licence_seats_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licence_seats
    ADD CONSTRAINT licence_seats_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: licences licences_exam_id_exams_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licences
    ADD CONSTRAINT licences_exam_id_exams_id_fk FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE SET NULL;


--
-- Name: licences licences_owner_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licences
    ADD CONSTRAINT licences_owner_id_users_id_fk FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: live_sessions live_sessions_course_id_courses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_sessions
    ADD CONSTRAINT live_sessions_course_id_courses_id_fk FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL;


--
-- Name: live_sessions live_sessions_recording_lesson_id_lessons_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_sessions
    ADD CONSTRAINT live_sessions_recording_lesson_id_lessons_id_fk FOREIGN KEY (recording_lesson_id) REFERENCES public.lessons(id) ON DELETE SET NULL;


--
-- Name: media_assets media_assets_uploaded_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_assets
    ADD CONSTRAINT media_assets_uploaded_by_users_id_fk FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: modules modules_course_id_courses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modules
    ADD CONSTRAINT modules_course_id_courses_id_fk FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: modules modules_topic_id_topics_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modules
    ADD CONSTRAINT modules_topic_id_topics_id_fk FOREIGN KEY (topic_id) REFERENCES public.topics(id) ON DELETE SET NULL;


--
-- Name: osce_attempts osce_attempts_circuit_id_osce_circuits_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.osce_attempts
    ADD CONSTRAINT osce_attempts_circuit_id_osce_circuits_id_fk FOREIGN KEY (circuit_id) REFERENCES public.osce_circuits(id) ON DELETE SET NULL;


--
-- Name: osce_attempts osce_attempts_room_id_osce_rooms_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.osce_attempts
    ADD CONSTRAINT osce_attempts_room_id_osce_rooms_id_fk FOREIGN KEY (room_id) REFERENCES public.osce_rooms(id) ON DELETE SET NULL;


--
-- Name: osce_attempts osce_attempts_station_id_osce_stations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.osce_attempts
    ADD CONSTRAINT osce_attempts_station_id_osce_stations_id_fk FOREIGN KEY (station_id) REFERENCES public.osce_stations(id) ON DELETE RESTRICT;


--
-- Name: osce_attempts osce_attempts_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.osce_attempts
    ADD CONSTRAINT osce_attempts_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: osce_circuits osce_circuits_exam_id_exams_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.osce_circuits
    ADD CONSTRAINT osce_circuits_exam_id_exams_id_fk FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE SET NULL;


--
-- Name: osce_circuits osce_circuits_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.osce_circuits
    ADD CONSTRAINT osce_circuits_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: osce_marking_domains osce_marking_domains_station_id_osce_stations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.osce_marking_domains
    ADD CONSTRAINT osce_marking_domains_station_id_osce_stations_id_fk FOREIGN KEY (station_id) REFERENCES public.osce_stations(id) ON DELETE CASCADE;


--
-- Name: osce_rooms osce_rooms_candidate_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.osce_rooms
    ADD CONSTRAINT osce_rooms_candidate_id_users_id_fk FOREIGN KEY (candidate_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: osce_rooms osce_rooms_examiner_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.osce_rooms
    ADD CONSTRAINT osce_rooms_examiner_id_users_id_fk FOREIGN KEY (examiner_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: osce_rooms osce_rooms_host_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.osce_rooms
    ADD CONSTRAINT osce_rooms_host_id_users_id_fk FOREIGN KEY (host_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: osce_rooms osce_rooms_station_id_osce_stations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.osce_rooms
    ADD CONSTRAINT osce_rooms_station_id_osce_stations_id_fk FOREIGN KEY (station_id) REFERENCES public.osce_stations(id) ON DELETE CASCADE;


--
-- Name: osce_stations osce_stations_exam_id_exams_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.osce_stations
    ADD CONSTRAINT osce_stations_exam_id_exams_id_fk FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE SET NULL;


--
-- Name: osce_stations osce_stations_reviewer_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.osce_stations
    ADD CONSTRAINT osce_stations_reviewer_id_users_id_fk FOREIGN KEY (reviewer_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: osce_stations osce_stations_topic_id_topics_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.osce_stations
    ADD CONSTRAINT osce_stations_topic_id_topics_id_fk FOREIGN KEY (topic_id) REFERENCES public.topics(id) ON DELETE SET NULL;


--
-- Name: plan_prices plan_prices_plan_id_plans_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_prices
    ADD CONSTRAINT plan_prices_plan_id_plans_id_fk FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE CASCADE;


--
-- Name: plans plans_exam_id_exams_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_exam_id_exams_id_fk FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE SET NULL;


--
-- Name: question_flags question_flags_question_id_questions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_flags
    ADD CONSTRAINT question_flags_question_id_questions_id_fk FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: question_flags question_flags_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_flags
    ADD CONSTRAINT question_flags_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: question_lessons question_lessons_lesson_id_lessons_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_lessons
    ADD CONSTRAINT question_lessons_lesson_id_lessons_id_fk FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: question_lessons question_lessons_question_id_questions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_lessons
    ADD CONSTRAINT question_lessons_question_id_questions_id_fk FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: question_notes question_notes_question_id_questions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_notes
    ADD CONSTRAINT question_notes_question_id_questions_id_fk FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: question_notes question_notes_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_notes
    ADD CONSTRAINT question_notes_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: question_options question_options_question_id_questions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_options
    ADD CONSTRAINT question_options_question_id_questions_id_fk FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: question_reports question_reports_question_id_questions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_reports
    ADD CONSTRAINT question_reports_question_id_questions_id_fk FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: question_reports question_reports_resolved_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_reports
    ADD CONSTRAINT question_reports_resolved_by_users_id_fk FOREIGN KEY (resolved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: question_reports question_reports_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_reports
    ADD CONSTRAINT question_reports_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: question_stats question_stats_question_id_questions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_stats
    ADD CONSTRAINT question_stats_question_id_questions_id_fk FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: question_tags question_tags_question_id_questions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_tags
    ADD CONSTRAINT question_tags_question_id_questions_id_fk FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: question_tags question_tags_tag_id_tags_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_tags
    ADD CONSTRAINT question_tags_tag_id_tags_id_fk FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: question_topics question_topics_question_id_questions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_topics
    ADD CONSTRAINT question_topics_question_id_questions_id_fk FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: question_topics question_topics_topic_id_topics_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_topics
    ADD CONSTRAINT question_topics_topic_id_topics_id_fk FOREIGN KEY (topic_id) REFERENCES public.topics(id) ON DELETE CASCADE;


--
-- Name: question_versions question_versions_changed_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_versions
    ADD CONSTRAINT question_versions_changed_by_users_id_fk FOREIGN KEY (changed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: question_versions question_versions_question_id_questions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_versions
    ADD CONSTRAINT question_versions_question_id_questions_id_fk FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: questions questions_author_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_author_id_users_id_fk FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: questions questions_difficulty_id_difficulty_levels_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_difficulty_id_difficulty_levels_id_fk FOREIGN KEY (difficulty_id) REFERENCES public.difficulty_levels(id) ON DELETE SET NULL;


--
-- Name: questions questions_exam_id_exams_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_exam_id_exams_id_fk FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE RESTRICT;


--
-- Name: questions questions_media_asset_id_media_assets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_media_asset_id_media_assets_id_fk FOREIGN KEY (media_asset_id) REFERENCES public.media_assets(id) ON DELETE SET NULL;


--
-- Name: questions questions_reviewer_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_reviewer_id_users_id_fk FOREIGN KEY (reviewer_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: quiz_answers quiz_answers_question_id_questions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_answers
    ADD CONSTRAINT quiz_answers_question_id_questions_id_fk FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE RESTRICT;


--
-- Name: quiz_answers quiz_answers_selected_option_id_question_options_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_answers
    ADD CONSTRAINT quiz_answers_selected_option_id_question_options_id_fk FOREIGN KEY (selected_option_id) REFERENCES public.question_options(id) ON DELETE SET NULL;


--
-- Name: quiz_answers quiz_answers_session_question_id_quiz_session_questions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_answers
    ADD CONSTRAINT quiz_answers_session_question_id_quiz_session_questions_id_fk FOREIGN KEY (session_question_id) REFERENCES public.quiz_session_questions(id) ON DELETE CASCADE;


--
-- Name: quiz_answers quiz_answers_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_answers
    ADD CONSTRAINT quiz_answers_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: quiz_session_questions quiz_session_questions_question_id_questions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_session_questions
    ADD CONSTRAINT quiz_session_questions_question_id_questions_id_fk FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE RESTRICT;


--
-- Name: quiz_session_questions quiz_session_questions_session_id_quiz_sessions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_session_questions
    ADD CONSTRAINT quiz_session_questions_session_id_quiz_sessions_id_fk FOREIGN KEY (session_id) REFERENCES public.quiz_sessions(id) ON DELETE CASCADE;


--
-- Name: quiz_sessions quiz_sessions_exam_id_exams_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_sessions
    ADD CONSTRAINT quiz_sessions_exam_id_exams_id_fk FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE SET NULL;


--
-- Name: quiz_sessions quiz_sessions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_sessions
    ADD CONSTRAINT quiz_sessions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_impersonated_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_impersonated_by_users_id_fk FOREIGN KEY (impersonated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: sessions sessions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: study_plan_items study_plan_items_study_plan_id_study_plans_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_plan_items
    ADD CONSTRAINT study_plan_items_study_plan_id_study_plans_id_fk FOREIGN KEY (study_plan_id) REFERENCES public.study_plans(id) ON DELETE CASCADE;


--
-- Name: study_plan_items study_plan_items_topic_id_topics_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_plan_items
    ADD CONSTRAINT study_plan_items_topic_id_topics_id_fk FOREIGN KEY (topic_id) REFERENCES public.topics(id) ON DELETE SET NULL;


--
-- Name: study_plans study_plans_exam_id_exams_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_plans
    ADD CONSTRAINT study_plans_exam_id_exams_id_fk FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;


--
-- Name: study_plans study_plans_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_plans
    ADD CONSTRAINT study_plans_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_plan_id_plans_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_plan_id_plans_id_fk FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE RESTRICT;


--
-- Name: subscriptions subscriptions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: topics topics_exam_id_exams_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topics
    ADD CONSTRAINT topics_exam_id_exams_id_fk FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE SET NULL;


--
-- Name: topics topics_parent_id_topics_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topics
    ADD CONSTRAINT topics_parent_id_topics_id_fk FOREIGN KEY (parent_id) REFERENCES public.topics(id) ON DELETE RESTRICT;


--
-- Name: two_factors two_factors_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.two_factors
    ADD CONSTRAINT two_factors_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_profiles user_profiles_target_exam_id_exams_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_target_exam_id_exams_id_fk FOREIGN KEY (target_exam_id) REFERENCES public.exams(id) ON DELETE SET NULL;


--
-- Name: user_profiles user_profiles_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict vC5sfgAWHV26cktwd11NNmRAWRrwZw2woPqJebDtgcO7UrgMKu4hIhhdPTPw5sT

