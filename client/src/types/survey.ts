import {
  createLegacyInspectorSnapshot,
  isInspectorProfileComplete,
  type InspectorSnapshot
} from "./profile";
import {
  createLegacySessionSnapshot,
  isInspectionSessionComplete,
  type InspectionSessionSnapshot
} from "./session";

export const SURVEY_CATEGORIES = [
  "Hardware",
  "Projector",
  "AC",
  "Electrical",
  "Furniture"
] as const;

export const BUILDINGS = ["A", "B", "C", "V"] as const;
export const FLOORS = ["1", "2", "3", "4"] as const;

export const ROOM_TYPES = [
  "Classroom",
  "Lab",
  "Office",
  "Hall",
  "Library",
  "Other"
] as const;

export const CHECKLIST_STATUSES = ["OK", "ISSUE", "NOT_CHECKED"] as const;
export const SEVERITIES = ["Low", "Medium", "High", "Critical"] as const;
export const PRIORITIES = ["Normal", "Soon", "Urgent"] as const;
export const ISSUE_TYPES = [
  "Broken",
  "Missing",
  "Dirty",
  "Unsafe",
  "Performance",
  "Other"
] as const;
export const RECOMMENDED_ACTIONS = [
  "Repair",
  "Replace",
  "Clean",
  "Escalate",
  "Monitor"
] as const;
export const REVIEW_STATUSES = [
  "OPEN",
  "IN_REVIEW",
  "RESOLVED",
  "REJECTED"
] as const;

export type SurveyCategory = (typeof SURVEY_CATEGORIES)[number];
export type RoomType = (typeof ROOM_TYPES)[number];
export type ChecklistStatus = (typeof CHECKLIST_STATUSES)[number];
export type Severity = (typeof SEVERITIES)[number];
export type Priority = (typeof PRIORITIES)[number];
export type IssueType = (typeof ISSUE_TYPES)[number];
export type RecommendedAction = (typeof RECOMMENDED_ACTIONS)[number];
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];
export type GpsStatus = "not_requested" | "captured" | "unavailable";

export type SurveyStatus =
  | "DRAFT"
  | "PENDING_SYNC"
  | "SYNCED"
  | "SYNC_FAILED";

export interface ChecklistItem {
  id: string;
  label: string;
  status: ChecklistStatus;
}

export interface GpsEvidence {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: string;
}

export interface SurveyEditRecord {
  version: number;
  editedAt: string;
  editedBy: string;
  reason: string;
}

export interface SurveyEditDraft {
  id: string;
  surveyId: string;
  originalVersion: number;
  survey: Survey;
  reason: string;
  updatedAt: string;
}

export interface Survey {
  id: string;
  version: number;
  inspector: InspectorSnapshot;
  session: InspectionSessionSnapshot;
  building: string;
  floor: string;
  room: string;
  roomType: RoomType;
  category: SurveyCategory;
  checklist: ChecklistItem[];
  rating: number;
  severity: Severity;
  priority: Priority;
  issueType: IssueType;
  recommendedAction: RecommendedAction;
  notes: string;
  photo?: string;
  gpsStatus: GpsStatus;
  gps?: GpsEvidence;
  createdAt: string;
  updatedAt: string;
  status: SurveyStatus;
  reviewStatus: ReviewStatus;
  assignedTo?: string;
  adminNote?: string;
  resolvedAt?: string;
  editHistory: SurveyEditRecord[];
  syncedAt?: string;
  syncAttempts?: number;
  lastSyncError?: string;
}

export interface SurveyCounts {
  total: number;
  today: number;
  draft: number;
  pending: number;
  synced: number;
  failed: number;
  critical: number;
  lowRating: number;
  needsReview: number;
  resolved: number;
}

export const STATUS_LABELS: Record<SurveyStatus, string> = {
  DRAFT: "Draft",
  PENDING_SYNC: "Pending Sync",
  SYNCED: "Synced",
  SYNC_FAILED: "Sync Failed"
};

export const CHECKLIST_STATUS_LABELS: Record<ChecklistStatus, string> = {
  OK: "OK",
  ISSUE: "Issue",
  NOT_CHECKED: "Not checked"
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  OPEN: "Open",
  IN_REVIEW: "In Review",
  RESOLVED: "Resolved",
  REJECTED: "Rejected"
};

const CHECKLIST_LABELS: Record<SurveyCategory, string[]> = {
  Hardware: ["Monitor", "Keyboard", "Mouse", "CPU", "Network port"],
  Projector: ["Power", "Image quality", "HDMI/VGA cable", "Remote", "Screen"],
  AC: ["Cooling", "Remote", "Noise", "Water leak", "Filter"],
  Electrical: ["Socket", "Light", "Switch", "Exposed wire", "Breaker"],
  Furniture: ["Table", "Chair", "Board", "Door/window", "Cleanliness"]
};

export function createChecklist(category: SurveyCategory): ChecklistItem[] {
  return CHECKLIST_LABELS[category].map((label, index) => ({
    id: `${category.toLowerCase()}-${index + 1}`,
    label,
    status: "NOT_CHECKED"
  }));
}

export function needsAction(survey: Survey): boolean {
  return (
    survey.reviewStatus !== "RESOLVED" &&
    (survey.severity === "High" ||
      survey.severity === "Critical" ||
      survey.rating <= 2)
  );
}

export function getSurveyValidationErrors(survey: Survey): string[] {
  const errors: string[] = [];

  if (!isInspectorProfileComplete(survey.inspector)) {
    errors.push("Complete the inspector profile before submitting.");
  }
  if (!isInspectionSessionComplete(survey.session)) {
    errors.push("Complete the active inspection session.");
  }
  if (!survey.building.trim()) errors.push("Building is required.");
  if (!survey.floor.trim()) errors.push("Floor is required.");
  if (!survey.room.trim()) errors.push("Room number is required.");
  if (!survey.roomType) errors.push("Room type is required.");
  if (!survey.category) errors.push("Category is required.");
  if (survey.checklist.length === 0) errors.push("Checklist is required.");
  if (survey.rating < 1 || survey.rating > 5) {
    errors.push("Condition rating must be between 1 and 5.");
  }
  if (!survey.notes.trim()) errors.push("Defect notes are required.");
  if (
    (survey.severity === "High" || survey.severity === "Critical") &&
    !survey.photo
  ) {
    errors.push("High and critical issues require photo evidence.");
  }

  return errors;
}

export function isSurveyReady(survey: Survey): boolean {
  return getSurveyValidationErrors(survey).length === 0;
}

export function createEmptySurvey(
  id: string,
  createdAt: string,
  inspector: InspectorSnapshot,
  session: InspectionSessionSnapshot
): Survey {
  return {
    id,
    version: 1,
    inspector,
    session,
    building: "",
    floor: "",
    room: "",
    roomType: "Classroom",
    category: "Hardware",
    checklist: createChecklist("Hardware"),
    rating: 0,
    severity: "Low",
    priority: "Normal",
    issueType: "Broken",
    recommendedAction: "Repair",
    notes: "",
    gpsStatus: "not_requested",
    createdAt,
    updatedAt: createdAt,
    status: "DRAFT",
    reviewStatus: "OPEN",
    editHistory: [],
    syncAttempts: 0
  };
}

export function normalizeSurvey(input: Survey): Survey {
  const legacyInput = input as Survey & {
    roomType?: RoomType;
    checklist?: ChecklistItem[];
    severity?: Severity;
    priority?: Priority;
    issueType?: IssueType;
    recommendedAction?: RecommendedAction;
    inspector?: InspectorSnapshot;
    session?: InspectionSessionSnapshot;
    gpsStatus?: GpsStatus;
    version?: number;
    reviewStatus?: ReviewStatus;
    editHistory?: SurveyEditRecord[];
  };
  const category = SURVEY_CATEGORIES.includes(legacyInput.category)
    ? legacyInput.category
    : "Hardware";

  return {
    ...legacyInput,
    version:
      Number.isInteger(legacyInput.version) && (legacyInput.version ?? 0) > 0
        ? legacyInput.version
        : 1,
    inspector: legacyInput.inspector ?? createLegacyInspectorSnapshot(),
    session:
      legacyInput.session ?? createLegacySessionSnapshot(legacyInput.createdAt),
    roomType: legacyInput.roomType ?? "Other",
    category,
    checklist:
      legacyInput.checklist?.length
        ? legacyInput.checklist
        : createChecklist(category),
    severity: legacyInput.severity ?? "Low",
    priority: legacyInput.priority ?? "Normal",
    issueType: legacyInput.issueType ?? "Other",
    recommendedAction: legacyInput.recommendedAction ?? "Monitor",
    reviewStatus: REVIEW_STATUSES.includes(
      legacyInput.reviewStatus as ReviewStatus
    )
      ? (legacyInput.reviewStatus as ReviewStatus)
      : "OPEN",
    editHistory: Array.isArray(legacyInput.editHistory)
      ? legacyInput.editHistory
      : [],
    gpsStatus:
      legacyInput.gpsStatus ?? (legacyInput.gps ? "captured" : "not_requested")
  };
}
