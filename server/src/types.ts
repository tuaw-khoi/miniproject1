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

export type SurveyCategory = (typeof SURVEY_CATEGORIES)[number];
export type SurveyStatus = (typeof SURVEY_STATUSES)[number];

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

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isSurveyCategory(value: unknown): value is SurveyCategory {
  return SURVEY_CATEGORIES.includes(value as SurveyCategory);
}

function isSurveyStatus(value: unknown): value is SurveyStatus {
  return SURVEY_STATUSES.includes(value as SurveyStatus);
}

export function validateSurveyPayload(value: unknown): {
  valid: boolean;
  survey?: Survey;
  error?: string;
} {
  if (!value || typeof value !== "object") {
    return {
      valid: false,
      error: "Request body must be an object."
    };
  }

  const input = value as Record<string, unknown>;
  const rating = input.rating;

  if (!isString(input.id) || !input.id.trim()) {
    return {
      valid: false,
      error: "Survey id is required."
    };
  }

  if (!isString(input.building) || !input.building.trim()) {
    return {
      valid: false,
      error: "Building is required."
    };
  }

  if (!isString(input.floor) || !input.floor.trim()) {
    return {
      valid: false,
      error: "Floor is required."
    };
  }

  if (!isString(input.room) || !input.room.trim()) {
    return {
      valid: false,
      error: "Room is required."
    };
  }

  if (!isSurveyCategory(input.category)) {
    return {
      valid: false,
      error: "Category is invalid."
    };
  }

  if (typeof rating !== "number" || rating < 1 || rating > 5) {
    return {
      valid: false,
      error: "Rating must be between 1 and 5."
    };
  }

  if (!isString(input.notes) || !input.notes.trim()) {
    return {
      valid: false,
      error: "Notes are required."
    };
  }

  if (!isString(input.createdAt) || !input.createdAt.trim()) {
    return {
      valid: false,
      error: "createdAt is required."
    };
  }

  if (!isString(input.updatedAt) || !input.updatedAt.trim()) {
    return {
      valid: false,
      error: "updatedAt is required."
    };
  }

  if (!isSurveyStatus(input.status)) {
    return {
      valid: false,
      error: "Status is invalid."
    };
  }

  return {
    valid: true,
    survey: {
      id: input.id,
      building: input.building,
      floor: input.floor,
      room: input.room,
      category: input.category,
      rating,
      notes: input.notes,
      photo: isString(input.photo) ? input.photo : undefined,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
      status: input.status,
      syncedAt: isString(input.syncedAt) ? input.syncedAt : undefined,
      syncAttempts:
        typeof input.syncAttempts === "number" ? input.syncAttempts : undefined,
      lastSyncError: isString(input.lastSyncError)
        ? input.lastSyncError
        : undefined
    }
  };
}
