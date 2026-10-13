import type { generatedTypes } from "@workspace/api-zod";
import type { OsceAttempt as AttemptRow, OsceMarkingDomain as DomainRow, OsceStation as StationRow } from "@workspace/db";

type OsceAttempt = generatedTypes.Phase06OsceAttempt;
type OsceMarkingDomain = generatedTypes.OsceMarkingDomain;
type OsceStationContent = generatedTypes.OsceStationContent;
type OsceStationDetail = generatedTypes.OsceStationDetail;
type OsceStationPreview = generatedTypes.OsceStationPreview;
type OsceStationSummary = generatedTypes.Phase06OsceStationSummary;
type Rating = OsceAttempt["globalRating"];
type DatabaseRating = "clear_pass" | "pass" | "borderline" | "fail";

export function toDatabaseRating(value: string | null | undefined): DatabaseRating | null {
  if (!value) return null;
  const ratings: Record<string, DatabaseRating> = {
    "Clear pass": "clear_pass",
    Pass: "pass",
    Borderline: "borderline",
    Fail: "fail",
  };
  return ratings[value] ?? null;
}

function toApiRating(value: string | null): Rating {
  const ratings: Record<string, Exclude<Rating, null>> = {
    clear_pass: "Clear pass",
    pass: "Pass",
    borderline: "Borderline",
    fail: "Fail",
  };
  return value ? ratings[value] ?? null : null;
}

export function toSummary(row: StationRow): OsceStationSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    specialty: row.specialty ?? "neurology",
    topicGroup: row.topicGroup,
    summary: row.summary,
    image: row.image,
    difficulty: row.difficulty as OsceStationSummary["difficulty"],
    status: row.stationStatus as OsceStationSummary["status"],
    totalMarks: row.totalMarks ?? 0,
    timing: {
      readingSeconds: row.readingSeconds,
      historySeconds: row.historySeconds,
      examinerSeconds: row.examinerSeconds,
    },
  };
}

export function toDomain(row: DomainRow): OsceMarkingDomain {
  return { id: row.id, position: row.position, domain: row.domain, descriptor: row.descriptor, maxMarks: row.maxMarks };
}

export function toDetail(row: StationRow, domains: DomainRow[]): OsceStationDetail {
  return { ...toSummary(row), content: row.content as unknown as OsceStationContent, domains: domains.map(toDomain) };
}

/** Public preview: aim and candidate instructions only. Model answers and the examiner view stay behind the full endpoint. */
export function toPreview(row: StationRow, domains: DomainRow[]): OsceStationPreview {
  const content = (row.content ?? {}) as Partial<OsceStationContent>;
  return {
    ...toSummary(row),
    aim: content.aim ?? [],
    candidateInstructions: content.candidateInstructions ?? [],
    domains: domains.map((d) => ({ domain: d.domain, maxMarks: d.maxMarks })),
  };
}

export function toAttempt(row: AttemptRow, station: Pick<StationRow, "slug" | "title">): OsceAttempt {
  return {
    id: row.id,
    stationId: row.stationId,
    stationSlug: station.slug,
    stationTitle: station.title,
    mode: row.mode as OsceAttempt["mode"],
    status: row.status === "draft" || row.status === "in_progress" ? "draft" : "saved",
    marks: row.marks,
    totalMarks: row.totalMarks ?? 0,
    maxMarks: row.maxMarks,
    globalRating: toApiRating(row.globalRating),
    notes: row.notes,
    circuitId: row.circuitId,
    roomId: row.roomId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    savedAt: row.savedAt,
  };
}
