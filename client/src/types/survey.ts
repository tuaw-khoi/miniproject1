export const SURVEY_CATEGORIES = [
  "Hardware",
  "Projector",
  "AC",
  "Electrical",
  "Furniture"
] as const;

export const BUILDINGS = [
  "A",
  "B",
  "C",
  "V"
] as const;

export const FLOORS = [
  "1",
  "2",
  "3",
  "4"
] as const;

export type SurveyCategory = (typeof SURVEY_CATEGORIES)[number];

export type SurveyStatus =
  | "DRAFT"
  | "PENDING_SYNC"
  | "SYNCED"
  | "SYNC_FAILED";

export interface Survey {
  id: string;
  building: string;
  floor: string;
  room: string;
  category: SurveyCategory;
  rating: number;
  notes: string;
  photo?: string;
  createdAt: string;
  updatedAt: string;
  status: SurveyStatus;
  syncedAt?: string;
  syncAttempts?: number;
  lastSyncError?: string;
}

export interface SurveyCounts {
  total: number;
  draft: number;
  pending: number;
  synced: number;
  failed: number;
}

export const STATUS_LABELS: Record<SurveyStatus, string> = {
  DRAFT: "Draft",
  PENDING_SYNC: "Pending Sync",
  SYNCED: "Synced",
  SYNC_FAILED: "Sync Failed"
};

export function isSurveyReady(survey: Survey): boolean {
  return Boolean(
    survey.building.trim() &&
      survey.floor.trim() &&
      survey.room.trim() &&
      survey.category &&
      survey.rating >= 1 &&
      survey.rating <= 5 &&
      survey.notes.trim()
  );
}

export function createEmptySurvey(id: string, createdAt: string): Survey {
  return {
    id,
    building: "",
    floor: "",
    room: "",
    category: "Hardware",
    rating: 0,
    notes: "",
    createdAt,
    updatedAt: createdAt,
    status: "DRAFT",
    syncAttempts: 0
  };
}
