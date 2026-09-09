import type {
  ChecklistItem,
  InspectorRole,
  InspectionShift,
  IssueType,
  Priority,
  RecommendedAction,
  ReviewStatus,
  ReviewUpdate,
  RoomType,
  Severity,
  Survey,
  SurveyCategory,
  SurveyStatus
} from "./types.js";

const WEBHOOK_URL = process.env.SHEETS_WEBHOOK_URL?.trim();
const WEBHOOK_SECRET = process.env.SHEETS_WEBHOOK_SECRET?.trim();

interface SheetResponse {
  ok?: boolean;
  error?: string;
  action?: string;
  version?: number;
  surveys?: Array<Record<string, string>>;
}

export function isSheetBridgeConfigured(): boolean {
  return Boolean(WEBHOOK_URL && WEBHOOK_SECRET);
}

export async function upsertSurveyToSheet(survey: Survey): Promise<void> {
  if (!WEBHOOK_URL || !WEBHOOK_SECRET) return;

  const {
    reviewStatus: _reviewStatus,
    assignedTo: _assignedTo,
    adminNote: _adminNote,
    resolvedAt: _resolvedAt,
    ...inspectorManagedSurvey
  } = survey;
  const latestEdit = survey.editHistory.at(-1);

  const result = await postToSheet({
    action: "upsert",
    secret: WEBHOOK_SECRET,
    survey: {
      ...inspectorManagedSurvey,
      editedBy: latestEdit?.editedBy,
      editReason: latestEdit?.reason
    }
  });

  if (result.action === "ignored" && (result.version ?? 0) > survey.version) {
    throw new Error(
      `A newer central version (${result.version}) already exists.`
    );
  }
}

export async function updateReviewInSheet(
  surveyId: string,
  update: ReviewUpdate
): Promise<void> {
  if (!WEBHOOK_URL || !WEBHOOK_SECRET) return;

  await postToSheet({
    action: "update-review",
    secret: WEBHOOK_SECRET,
    surveyId,
    ...update
  });
}

export async function listSurveysFromSheet(): Promise<Survey[] | undefined> {
  if (!WEBHOOK_URL || !WEBHOOK_SECRET) return undefined;

  const url = new URL(WEBHOOK_URL);
  url.searchParams.set("action", "list");
  url.searchParams.set("secret", WEBHOOK_SECRET);
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(20_000)
  });

  if (!response.ok) {
    throw new Error(`Google Sheets list failed with ${response.status}.`);
  }

  const body = (await response.json()) as SheetResponse;
  if (!body.ok || !Array.isArray(body.surveys)) {
    throw new Error(body.error ?? "Google Sheets returned an invalid list response.");
  }

  return body.surveys.map(sheetRecordToSurvey);
}

async function postToSheet(
  payload: Record<string, unknown>
): Promise<SheetResponse> {
  if (!WEBHOOK_URL) return { ok: true };

  const response = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    redirect: "follow",
    signal: AbortSignal.timeout(25_000)
  });

  if (!response.ok) {
    throw new Error(`Google Sheets write failed with ${response.status}.`);
  }

  const body = (await response.json()) as SheetResponse;
  if (!body.ok) {
    throw new Error(body.error ?? "Google Sheets rejected the request.");
  }
  return body;
}

function sheetRecordToSurvey(record: Record<string, string>): Survey {
  const gpsStatus = record["GPS Status"] as Survey["gpsStatus"];
  const photoUrl = record["Photo URL"] ?? "";

  return {
    id: record["Survey UUID"],
    version: positiveInteger(record.Version),
    inspector: {
      profileId: record["Inspector Code"] || "sheet-inspector",
      fullName: record["Inspector Name"],
      inspectorCode: record["Inspector Code"],
      unit: record.Unit,
      phone: "",
      role: record.Role as InspectorRole,
      inspectionGroup: record["Inspection Group"]
    },
    session: {
      sessionId: record["Session Code"] || "sheet-session",
      code: record["Session Code"],
      surveyDate: record["Survey Date"],
      campusZone: record["Campus Zone"],
      shift: record.Shift as InspectionShift
    },
    building: record.Building,
    floor: record.Floor,
    room: record.Room,
    roomType: record["Room Type"] as RoomType,
    category: record.Category as SurveyCategory,
    checklist: parseChecklist(record.Checklist),
    rating: Number(record.Rating || 0),
    severity: record.Severity as Severity,
    priority: record.Priority as Priority,
    issueType: record["Issue Type"] as IssueType,
    recommendedAction: record["Recommended Action"] as RecommendedAction,
    notes: record.Notes,
    photo:
      photoUrl.startsWith("http://") || photoUrl.startsWith("https://")
        ? photoUrl
        : undefined,
    gpsStatus:
      gpsStatus === "captured" ||
      gpsStatus === "unavailable" ||
      gpsStatus === "not_requested"
        ? gpsStatus
        : "not_requested",
    gps:
      gpsStatus === "captured"
        ? {
            latitude: Number(record.Latitude),
            longitude: Number(record.Longitude),
            accuracy: Number(record["GPS Accuracy"]),
            capturedAt: record["GPS Captured At"]
          }
        : undefined,
    createdAt: record["Created At"],
    updatedAt: record["Updated At"],
    status: (record["Sync Status"] || "SYNCED") as SurveyStatus,
    reviewStatus: (record["Review Status"] || "OPEN") as ReviewStatus,
    assignedTo: record["Assigned To"] || undefined,
    adminNote: record["Admin Note"] || undefined,
    editHistory: [],
    syncedAt: record["Synced At"] || undefined
  };
}

function parseChecklist(value: string): ChecklistItem[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as ChecklistItem[]) : [];
  } catch {
    return [];
  }
}

function positiveInteger(value: string): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}
