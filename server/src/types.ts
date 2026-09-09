export const SURVEY_CATEGORIES = [
  "Hardware",
  "Projector",
  "AC",
  "Electrical",
  "Furniture"
] as const;
export const SURVEY_STATUSES = [
  "DRAFT",
  "PENDING_SYNC",
  "SYNCED",
  "SYNC_FAILED"
] as const;
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
export const INSPECTOR_ROLES = [
  "Student Auditor",
  "Staff Inspector",
  "Team Lead"
] as const;
export const INSPECTION_SHIFTS = ["Morning", "Afternoon", "Evening"] as const;
export const GPS_STATUSES = ["not_requested", "captured", "unavailable"] as const;

export type SurveyCategory = (typeof SURVEY_CATEGORIES)[number];
export type SurveyStatus = (typeof SURVEY_STATUSES)[number];
export type RoomType = (typeof ROOM_TYPES)[number];
export type ChecklistStatus = (typeof CHECKLIST_STATUSES)[number];
export type Severity = (typeof SEVERITIES)[number];
export type Priority = (typeof PRIORITIES)[number];
export type IssueType = (typeof ISSUE_TYPES)[number];
export type RecommendedAction = (typeof RECOMMENDED_ACTIONS)[number];
export type InspectorRole = (typeof INSPECTOR_ROLES)[number];
export type InspectionShift = (typeof INSPECTION_SHIFTS)[number];
export type GpsStatus = (typeof GPS_STATUSES)[number];

export interface InspectorSnapshot {
  profileId: string;
  fullName: string;
  inspectorCode: string;
  unit: string;
  phone: string;
  role: InspectorRole;
  inspectionGroup: string;
}

export interface InspectionSessionSnapshot {
  sessionId: string;
  code: string;
  surveyDate: string;
  campusZone: string;
  shift: InspectionShift;
}

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

export interface Survey {
  id: string;
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
  syncedAt?: string;
  syncAttempts?: number;
  lastSyncError?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNonEmptyString(value: unknown): value is string {
  return isString(value) && Boolean(value.trim());
}

function isOneOf<T extends string>(
  value: unknown,
  options: readonly T[]
): value is T {
  return options.includes(value as T);
}

function isInspectorSnapshot(value: unknown): value is InspectorSnapshot {
  if (!isRecord(value)) return false;

  return (
    isNonEmptyString(value.profileId) &&
    isNonEmptyString(value.fullName) &&
    isNonEmptyString(value.inspectorCode) &&
    isNonEmptyString(value.unit) &&
    isString(value.phone) &&
    isOneOf(value.role, INSPECTOR_ROLES) &&
    isNonEmptyString(value.inspectionGroup)
  );
}

function isSessionSnapshot(
  value: unknown
): value is InspectionSessionSnapshot {
  if (!isRecord(value)) return false;

  return (
    isNonEmptyString(value.sessionId) &&
    isNonEmptyString(value.code) &&
    isNonEmptyString(value.surveyDate) &&
    isNonEmptyString(value.campusZone) &&
    isOneOf(value.shift, INSPECTION_SHIFTS)
  );
}

function isChecklist(value: unknown): value is ChecklistItem[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (item) =>
        isRecord(item) &&
        isNonEmptyString(item.id) &&
        isNonEmptyString(item.label) &&
        isOneOf(item.status, CHECKLIST_STATUSES)
    )
  );
}

function isGpsEvidence(value: unknown): value is GpsEvidence {
  if (!isRecord(value)) return false;

  return (
    typeof value.latitude === "number" &&
    Number.isFinite(value.latitude) &&
    value.latitude >= -90 &&
    value.latitude <= 90 &&
    typeof value.longitude === "number" &&
    Number.isFinite(value.longitude) &&
    value.longitude >= -180 &&
    value.longitude <= 180 &&
    typeof value.accuracy === "number" &&
    Number.isFinite(value.accuracy) &&
    value.accuracy >= 0 &&
    isNonEmptyString(value.capturedAt)
  );
}

export function validateSurveyPayload(value: unknown): {
  valid: boolean;
  survey?: Survey;
  error?: string;
} {
  if (!isRecord(value)) {
    return { valid: false, error: "Request body must be an object." };
  }

  if (!isNonEmptyString(value.id)) {
    return { valid: false, error: "Survey id is required." };
  }
  if (!isInspectorSnapshot(value.inspector)) {
    return { valid: false, error: "Inspector snapshot is incomplete." };
  }
  if (!isSessionSnapshot(value.session)) {
    return { valid: false, error: "Inspection session is incomplete." };
  }
  if (!isNonEmptyString(value.building)) {
    return { valid: false, error: "Building is required." };
  }
  if (!isNonEmptyString(value.floor)) {
    return { valid: false, error: "Floor is required." };
  }
  if (!isNonEmptyString(value.room)) {
    return { valid: false, error: "Room is required." };
  }
  if (!isOneOf(value.roomType, ROOM_TYPES)) {
    return { valid: false, error: "Room type is invalid." };
  }
  if (!isOneOf(value.category, SURVEY_CATEGORIES)) {
    return { valid: false, error: "Category is invalid." };
  }
  if (!isChecklist(value.checklist)) {
    return { valid: false, error: "Checklist is invalid." };
  }
  if (
    typeof value.rating !== "number" ||
    !Number.isInteger(value.rating) ||
    value.rating < 1 ||
    value.rating > 5
  ) {
    return { valid: false, error: "Rating must be an integer from 1 to 5." };
  }
  if (!isOneOf(value.severity, SEVERITIES)) {
    return { valid: false, error: "Severity is invalid." };
  }
  if (!isOneOf(value.priority, PRIORITIES)) {
    return { valid: false, error: "Priority is invalid." };
  }
  if (!isOneOf(value.issueType, ISSUE_TYPES)) {
    return { valid: false, error: "Issue type is invalid." };
  }
  if (!isOneOf(value.recommendedAction, RECOMMENDED_ACTIONS)) {
    return { valid: false, error: "Recommended action is invalid." };
  }
  if (!isNonEmptyString(value.notes)) {
    return { valid: false, error: "Notes are required." };
  }
  if (
    (value.severity === "High" || value.severity === "Critical") &&
    !isNonEmptyString(value.photo)
  ) {
    return {
      valid: false,
      error: "High and critical issues require photo evidence."
    };
  }
  if (!isOneOf(value.gpsStatus, GPS_STATUSES)) {
    return { valid: false, error: "GPS status is invalid." };
  }
  if (value.gpsStatus === "captured" && !isGpsEvidence(value.gps)) {
    return { valid: false, error: "Captured GPS evidence is invalid." };
  }
  if (!isNonEmptyString(value.createdAt)) {
    return { valid: false, error: "createdAt is required." };
  }
  if (!isNonEmptyString(value.updatedAt)) {
    return { valid: false, error: "updatedAt is required." };
  }
  if (!isOneOf(value.status, SURVEY_STATUSES)) {
    return { valid: false, error: "Status is invalid." };
  }

  return {
    valid: true,
    survey: {
      id: value.id,
      inspector: value.inspector,
      session: value.session,
      building: value.building,
      floor: value.floor,
      room: value.room,
      roomType: value.roomType,
      category: value.category,
      checklist: value.checklist,
      rating: value.rating,
      severity: value.severity,
      priority: value.priority,
      issueType: value.issueType,
      recommendedAction: value.recommendedAction,
      notes: value.notes,
      photo: isString(value.photo) ? value.photo : undefined,
      gpsStatus: value.gpsStatus,
      gps: isGpsEvidence(value.gps) ? value.gps : undefined,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
      status: value.status,
      syncedAt: isString(value.syncedAt) ? value.syncedAt : undefined,
      syncAttempts:
        typeof value.syncAttempts === "number" ? value.syncAttempts : undefined,
      lastSyncError: isString(value.lastSyncError)
        ? value.lastSyncError
        : undefined
    }
  };
}
