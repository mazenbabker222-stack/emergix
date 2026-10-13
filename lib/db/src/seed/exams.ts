import type { ExamFormat } from "../schema";

export const EXAM_DISCLAIMER = "Not affiliated with or endorsed by the Royal College of Emergency Medicine.";

export type SeedExam = {
  slug: string; name: string; shortName: string; summary: string; description: string;
  format: ExamFormat; simulatorPreset: Record<string, unknown>; position: number;
  dates: { label: string; startsOn: string; endsOn?: string; opens: string; closes: string; location: string }[];
};

export const SEED_EXAMS: SeedExam[] = [
  {
    slug: "mrcem-primary", name: "MRCEM Primary", shortName: "Primary", position: 1,
    summary: "Single-best-answer paper on the basic sciences relevant to emergency medicine.",
    description: "SAMPLE description. Confirm all format details on the official college page; this text is placeholder content.",
    format: { kind: "sba", totalQuestions: 180, sections: [{ name: "Paper", questions: 180, durationMinutes: 180 }], totalMinutes: 180 },
    simulatorPreset: { mode: "timed", questions: 180, minutes: 180 },
    dates: [
      { label: "PLACEHOLDER sitting A", startsOn: "2027-02-10", opens: "2026-11-02", closes: "2026-12-14", location: "PLACEHOLDER venue" },
      { label: "PLACEHOLDER sitting B", startsOn: "2027-06-09", opens: "2027-03-01", closes: "2027-04-12", location: "PLACEHOLDER venue" },
    ],
  },
  {
    slug: "mrcem-sba", name: "MRCEM SBA (Intermediate)", shortName: "SBA", position: 2,
    summary: "Single-best-answer paper on the clinical content of emergency medicine, sat in two sections.",
    description: "SAMPLE description. Confirm all format details on the official college page; this text is placeholder content.",
    format: {
      kind: "sba", totalQuestions: 180,
      sections: [
        { name: "Section 1", questions: 90, durationMinutes: 120, breakAfterMinutes: 60 },
        { name: "Section 2", questions: 90, durationMinutes: 120 },
      ],
      totalMinutes: 240,
    },
    simulatorPreset: { mode: "timed", sections: 2, minutesPerSection: 120, breakMinutes: 60 },
    dates: [
      { label: "PLACEHOLDER sitting A", startsOn: "2027-03-17", opens: "2026-12-01", closes: "2027-01-18", location: "PLACEHOLDER venue" },
      { label: "PLACEHOLDER sitting B", startsOn: "2027-09-15", opens: "2027-06-01", closes: "2027-07-12", location: "PLACEHOLDER venue" },
    ],
  },
  {
    slug: "mrcem-osce", name: "MRCEM OSCE", shortName: "OSCE", position: 3,
    summary: "Objective structured clinical examination: a circuit of timed stations with rest stations.",
    description: "SAMPLE description. Confirm all format details on the official college page; this text is placeholder content.",
    format: { kind: "osce", stations: 16, restStations: 2, stationMinutes: 8, readingMinutes: 1, sections: [{ name: "Circuit", durationMinutes: 162 }], totalMinutes: 162 },
    simulatorPreset: { mode: "circuit", stations: 16, restStations: 2, stationMinutes: 8, readingMinutes: 1 },
    dates: [
      { label: "PLACEHOLDER sitting A", startsOn: "2027-04-21", endsOn: "2027-04-23", opens: "2026-12-15", closes: "2027-02-01", location: "PLACEHOLDER venue" },
      { label: "PLACEHOLDER sitting B", startsOn: "2027-10-20", endsOn: "2027-10-22", opens: "2027-07-01", closes: "2027-08-16", location: "PLACEHOLDER venue" },
    ],
  },
];

/** Same six topics for every exam; answers deliberately point to the official source of truth. */
export const FAQ_TEMPLATE: { category: string; question: string }[] = [
  { category: "Eligibility", question: "Who can sit this exam?" },
  { category: "Booking", question: "How do I book a place?" },
  { category: "Dates and cost", question: "When are the sittings and what do they cost?" },
  { category: "Structure", question: "How is the exam structured?" },
  { category: "Marking", question: "How is the exam marked and the standard set?" },
  { category: "Results", question: "When are results released?" },
];
export const FAQ_ANSWER = "PLACEHOLDER answer. Official details change; please check the official college page linked on this page for the current rules.";
