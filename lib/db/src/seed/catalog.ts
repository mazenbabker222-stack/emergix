/** Placeholder course content. Plans and prices live in ./public (phase 04). Everything here is SAMPLE content. */
export const SEED_COURSES = [
  {
    slug: "primary-foundations-sample", exam: "mrcem-primary", title: "Primary foundations (SAMPLE)",
    summary: "SAMPLE course used to test the course builder and learner player.",
    modules: [
      { title: "Cardiovascular basics", topic: "cardiovascular", lessons: [
        { slug: "reading-an-ecg", title: "Reading an ECG: a systematic approach", preview: true },
        { slug: "shock-and-perfusion", title: "Shock and perfusion", preview: false },
      ] },
      { title: "Respiratory basics", topic: "respiratory", lessons: [
        { slug: "oxygen-delivery", title: "Oxygen delivery and targets", preview: false },
        { slug: "interpreting-abgs", title: "Interpreting arterial blood gases", preview: false },
      ] },
    ],
  },
  {
    slug: "osce-communication-sample", exam: "mrcem-osce", title: "OSCE communication skills (SAMPLE)",
    summary: "SAMPLE course on communication in timed stations.",
    modules: [
      { title: "Opening the consultation", topic: null, lessons: [
        { slug: "first-60-seconds", title: "The first 60 seconds", preview: true },
        { slug: "structuring-the-history", title: "Structuring the history", preview: false },
      ] },
      { title: "Closing and safety-netting", topic: null, lessons: [
        { slug: "breaking-bad-news", title: "Breaking bad news", preview: false },
        { slug: "safety-netting", title: "Safety-netting and handover", preview: false },
      ] },
    ],
  },
] as const;

export const SAMPLE_LESSON_BODY = "SAMPLE lesson text. Replace with clinician-authored, reviewed content before launch. This is not clinical advice.";

export const DEMO_USERS = [
  { key: "learner", role: "learner", name: "Demo Learner" },
  { key: "instructor", role: "instructor", name: "Demo Instructor" },
  { key: "editor", role: "editor", name: "Demo Editor" },
  { key: "admin", role: "admin", name: "Demo Admin" },
  { key: "superadmin", role: "superadmin", name: "Demo Superadmin" },
] as const;
export const DEMO_EMAIL_DOMAIN = "demo.emergix-academy.example";
