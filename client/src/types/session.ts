export const INSPECTION_SHIFTS = ["Morning", "Afternoon", "Evening"] as const;

export type InspectionShift = (typeof INSPECTION_SHIFTS)[number];

export interface InspectionSession {
  id: string;
  code: string;
  surveyDate: string;
  campusZone: string;
  shift: InspectionShift;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InspectionSessionSnapshot {
  sessionId: string;
  code: string;
  surveyDate: string;
  campusZone: string;
  shift: InspectionShift;
}

export function getLocalDateValue(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createInspectionSession(
  id: string,
  now: string
): InspectionSession {
  const surveyDate = getLocalDateValue(new Date(now));

  return {
    id,
    code: `VKU-${surveyDate.replaceAll("-", "")}`,
    surveyDate,
    campusZone: "VKU Main Campus",
    shift: "Morning",
    active: true,
    createdAt: now,
    updatedAt: now
  };
}

export function toSessionSnapshot(
  session: InspectionSession
): InspectionSessionSnapshot {
  return {
    sessionId: session.id,
    code: session.code.trim(),
    surveyDate: session.surveyDate,
    campusZone: session.campusZone.trim(),
    shift: session.shift
  };
}

export function isInspectionSessionComplete(
  session: InspectionSession | InspectionSessionSnapshot
): boolean {
  return Boolean(
    session.code.trim() &&
      session.surveyDate &&
      session.campusZone.trim() &&
      session.shift
  );
}

export function createLegacySessionSnapshot(
  createdAt: string
): InspectionSessionSnapshot {
  return {
    sessionId: "legacy",
    code: "LEGACY",
    surveyDate: createdAt.slice(0, 10),
    campusZone: "VKU",
    shift: "Morning"
  };
}
