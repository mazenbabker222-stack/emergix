/**
 * Public exam content for the seed. Structural facts follow docs/PLATFORM_PLAN.md section 3.
 * Every fee and date here is a PLACEHOLDER until the owner confirms it against the official source.
 */
/** Shape of one row in the public "Exam structure" table (derived from the exam format at read time). */
export interface PublicExamSection {
  name: string;
  itemCount: number | null;
  itemLabel: string;
  minutes: number | null;
  notes: string | null;
}

export const OFFICIAL_URL = "https://rcem.ac.uk/";

export interface SeedExam {
  slug: string;
  name: string;
  shortName: string;
  examType: string;
  summary: string;
  format: string;
  totalQuestions: number | null;
  sections: PublicExamSection[];
  totalMinutes: number;
  breakMinutes: number | null;
  location: string;
  content: string;
  sortOrder: number;
}

export const exams: SeedExam[] = [
  {
    slug: "mrcem-primary",
    name: "MRCEM Primary",
    shortName: "Primary",
    examType: "Written exam (SBA)",
    summary: "The first membership exam: 180 single best answer questions in one three-hour paper.",
    format: "180 single best answer (SBA) questions in one 3-hour paper",
    totalQuestions: 180,
    sections: [
      { name: "Single paper", itemCount: 180, itemLabel: "SBA questions", minutes: 180, notes: "One sitting, no scheduled break" },
    ],
    totalMinutes: 180,
    breakMinutes: null,
    location: "Approved test centre (confirm on the official site)",
    content: [
      "## What it covers",
      "The Primary exam tests the basic science knowledge that underpins safe emergency medicine practice. Check the current syllabus and blueprint on the official college page before you plan your revision.",
      "## How to prepare",
      "- Work through questions by topic first, then move to timed full-length papers.",
      "- Review every explanation, including the options you got right.",
      "- Track weak topics and revisit them on a schedule.",
      "*SAMPLE content: replace with clinician-reviewed text before launch.*",
    ].join("\n\n"),
    sortOrder: 10,
  },
  {
    slug: "mrcem-sba",
    name: "MRCEM SBA",
    shortName: "SBA",
    examType: "Written exam (SBA)",
    summary: "The applied knowledge exam: 180 SBA questions in two two-hour sections with a one-hour break.",
    format: "180 SBA questions in 2 sections of 2 hours, with a 1-hour break",
    totalQuestions: 180,
    sections: [
      { name: "Section 1", itemCount: null, itemLabel: "SBA questions", minutes: 120, notes: "First part of the 180 questions" },
      { name: "Section 2", itemCount: null, itemLabel: "SBA questions", minutes: 120, notes: "Opens after the 1-hour break" },
    ],
    totalMinutes: 240,
    breakMinutes: 60,
    location: "Approved test centre (confirm on the official site)",
    content: [
      "## What it covers",
      "The SBA exam tests applied clinical knowledge across emergency medicine. Check the current syllabus and blueprint on the official college page.",
      "## Exam-day structure",
      "You sit two two-hour sections with a one-hour break between them. Practise this rhythm with our timed mock mode so the real day feels familiar.",
      "*SAMPLE content: replace with clinician-reviewed text before launch.*",
    ].join("\n\n"),
    sortOrder: 20,
  },
  {
    slug: "mrcem-osce",
    name: "MRCEM OSCE",
    shortName: "OSCE",
    examType: "Clinical exam (OSCE)",
    summary: "The clinical exam: 16 stations of 8 minutes each, plus 2 rest stations.",
    format: "16 stations of 8 minutes (1 minute reading time each) and 2 rest stations",
    totalQuestions: null,
    sections: [
      { name: "Assessed stations", itemCount: 16, itemLabel: "stations", minutes: 128, notes: "8 minutes per station, plus 1 minute reading time before each" },
      { name: "Rest stations", itemCount: 2, itemLabel: "rest stations", minutes: null, notes: null },
    ],
    totalMinutes: 162,
    breakMinutes: null,
    location: "Examination centre (confirm on the official site)",
    content: [
      "## What it covers",
      "The OSCE assesses clinical skills in realistic emergency scenarios: history taking, examination, procedures, communication and management. Check the current blueprint on the official college page.",
      "## How to prepare",
      "- Practise stations out loud, against the clock.",
      "- Use the examiner view to see what a strong performance looks like.",
      "- Rehearse the transitions: reading time, the station, and the reset.",
      "*SAMPLE content: replace with clinician-reviewed text before launch.*",
    ].join("\n\n"),
    sortOrder: 30,
  },
];

type Faq = { key: string; exam: string | null; category: string; q: string; a: string };

const examFaqs = (slug: string, short: string, structure: string, results: string): Faq[] => [
  { key: `${slug}-who`, exam: slug, category: "eligibility", q: "Who can sit this exam?", a: `Eligibility rules are set by the college and can change. Check the eligibility criteria on the [official exam page](${OFFICIAL_URL}) before you apply.` },
  { key: `${slug}-book`, exam: slug, category: "booking", q: "How do I book?", a: `Bookings are made with the college, not with this platform. Use the application link on the official exam page and note the application window shown in our [exam calendar](/calendar).` },
  { key: `${slug}-when`, exam: slug, category: "dates", q: "When is the exam held?", a: `See the [exam calendar](/calendar) for sittings. **The dates shown are PLACEHOLDERS** until confirmed against the official source.` },
  { key: `${slug}-cost`, exam: slug, category: "cost", q: "How much does it cost?", a: "Fees are set by the college and change over time. **The fees shown on this site are PLACEHOLDERS.** Confirm the current fee on the official site before you pay." },
  { key: `${slug}-where`, exam: slug, category: "location", q: "Where is it held?", a: "Venue details are published by the college for each sitting. Confirm the venue for your sitting on the official site." },
  { key: `${slug}-structure`, exam: slug, category: "structure", q: `What is the structure of the ${short} exam?`, a: structure },
  { key: `${slug}-marking`, exam: slug, category: "marking", q: "How is it marked and how is the pass mark set?", a: "The college explains its marking and standard-setting approach in its published exam documents. Practice scores on this platform are a learning aid, not a prediction of your result." },
  { key: `${slug}-results`, exam: slug, category: "results", q: "When do results come out?", a: results },
];

export const faqs: Faq[] = [
  ...examFaqs("mrcem-primary", "Primary", "One paper of **180 single best answer questions** in **3 hours**.", "Results timing differs by sitting. The college publishes the expected release date for each sitting; check the official site."),
  ...examFaqs("mrcem-sba", "SBA", "**180 single best answer questions** in **two 2-hour sections** with a **1-hour break** between them.", "Results timing differs by sitting. The college publishes the expected release date for each sitting; check the official site."),
  ...examFaqs("mrcem-osce", "OSCE", "**16 stations** of **8 minutes** each (with 1 minute reading time) plus **2 rest stations**: roughly 2 hours 42 minutes in total.", "Results timing differs by sitting. The college publishes the expected release date for each sitting; check the official site."),
  { key: "pricing-refunds", exam: null, category: "pricing", q: "Can I get a refund?", a: "Our refund terms are on the [Refunds page](/legal/refunds). **PLACEHOLDER: the owner must confirm the policy before launch.**" },
  { key: "pricing-switch", exam: null, category: "pricing", q: "Can I switch plan or exam later?", a: "You will be able to change plan from your account once billing is live. **PLACEHOLDER: details to be confirmed.**" },
  { key: "pricing-free", exam: null, category: "pricing", q: "What do I get for free?", a: "Try the [free demo](/free-demo): a handful of sample questions and one lesson, with no account needed." },
  { key: "help-account", exam: null, category: "account", q: "How do I create an account?", a: "Choose **Start free** in the header and follow the steps. Accounts arrive with the next platform release." },
  { key: "help-contact", exam: null, category: "support", q: "How do I contact support?", a: "Use the [contact form](/contact) and we will reply by email." },
  { key: "help-affiliation", exam: null, category: "general", q: "Are you connected to the Royal College of Emergency Medicine?", a: "No. This platform is independent and **not affiliated with or endorsed by the Royal College of Emergency Medicine.** Always rely on the college for official exam rules." },
  { key: "help-content", exam: null, category: "general", q: "Is the practice content clinical advice?", a: "No. All practice material is for exam preparation only and must never be used to make decisions about real patients. See the [Medical disclaimer](/legal/medical-disclaimer)." },
];

type DateRow = { key: string; exam: string; label: string; start: string; end: string | null; opens: string; closes: string; fee: number };
export const dates: DateRow[] = [
  { key: "primary-2027-02", exam: "mrcem-primary", label: "Sample sitting 1 (PLACEHOLDER)", start: "2027-02-10", end: null, opens: "2026-11-02", closes: "2027-01-08", fee: 10000 },
  { key: "primary-2027-06", exam: "mrcem-primary", label: "Sample sitting 2 (PLACEHOLDER)", start: "2027-06-09", end: null, opens: "2027-03-01", closes: "2027-05-07", fee: 10000 },
  { key: "primary-2027-10", exam: "mrcem-primary", label: "Sample sitting 3 (PLACEHOLDER)", start: "2027-10-13", end: null, opens: "2027-07-05", closes: "2027-09-10", fee: 10000 },
  { key: "sba-2027-03", exam: "mrcem-sba", label: "Sample sitting 1 (PLACEHOLDER)", start: "2027-03-03", end: null, opens: "2026-12-01", closes: "2027-01-29", fee: 10000 },
  { key: "sba-2027-07", exam: "mrcem-sba", label: "Sample sitting 2 (PLACEHOLDER)", start: "2027-07-07", end: null, opens: "2027-04-05", closes: "2027-06-04", fee: 10000 },
  { key: "osce-2027-04", exam: "mrcem-osce", label: "Sample circuit 1 (PLACEHOLDER)", start: "2027-04-12", end: "2027-04-14", opens: "2026-12-07", closes: "2027-02-12", fee: 10000 },
  { key: "osce-2027-09", exam: "mrcem-osce", label: "Sample circuit 2 (PLACEHOLDER)", start: "2027-09-20", end: "2027-09-22", opens: "2027-05-10", closes: "2027-07-16", fee: 10000 },
];

export const documents = [
  { key: "doc-official-primary", exam: "mrcem-primary", title: "Official MRCEM information (external site)", description: "The source of truth for syllabus, eligibility and regulations.", url: OFFICIAL_URL, fileType: "link", sortOrder: 10 },
  { key: "doc-official-sba", exam: "mrcem-sba", title: "Official MRCEM information (external site)", description: "The source of truth for syllabus, eligibility and regulations.", url: OFFICIAL_URL, fileType: "link", sortOrder: 10 },
  { key: "doc-official-osce", exam: "mrcem-osce", title: "Official MRCEM information (external site)", description: "The source of truth for syllabus, eligibility and regulations.", url: OFFICIAL_URL, fileType: "link", sortOrder: 10 },
];
