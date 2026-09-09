import { mkdir, readFile, rename, writeFile } from "node:fs/promises";

const INSPECTOR_ROLES = [
  "Student Auditor",
  "Staff Inspector",
  "Team Lead"
] as const;
const INSPECTION_SHIFTS = ["Morning", "Afternoon", "Evening"] as const;
const SURVEY_CATEGORIES = [
  "Hardware",
  "Projector",
  "AC",
  "Electrical",
  "Furniture"
] as const;
const ROOM_TYPES = [
  "Classroom",
  "Lab",
  "Office",
  "Hall",
  "Library",
  "Other"
] as const;
const CHECKLIST_STATUSES = ["OK", "ISSUE", "NOT_CHECKED"] as const;
const SEVERITIES = ["Low", "Medium", "High", "Critical"] as const;
const PRIORITIES = ["Normal", "Soon", "Urgent"] as const;
const ISSUE_TYPES = [
  "Broken",
  "Missing",
  "Dirty",
  "Unsafe",
  "Performance",
  "Other"
] as const;
const RECOMMENDED_ACTIONS = [
  "Repair",
  "Replace",
  "Clean",
  "Escalate",
  "Monitor"
] as const;

interface Survey {
  id: string;
  inspector: {
    profileId: string;
    fullName: string;
    inspectorCode: string;
    unit: string;
    phone: string;
    role: (typeof INSPECTOR_ROLES)[number];
    inspectionGroup: string;
  };
  session: {
    sessionId: string;
    code: string;
    surveyDate: string;
    campusZone: string;
    shift: (typeof INSPECTION_SHIFTS)[number];
  };
  building: string;
  floor: string;
  room: string;
  roomType: (typeof ROOM_TYPES)[number];
  category: (typeof SURVEY_CATEGORIES)[number];
  checklist: Array<{
    id: string;
    label: string;
    status: (typeof CHECKLIST_STATUSES)[number];
  }>;
  rating: number;
  severity: (typeof SEVERITIES)[number];
  priority: (typeof PRIORITIES)[number];
  issueType: (typeof ISSUE_TYPES)[number];
  recommendedAction: (typeof RECOMMENDED_ACTIONS)[number];
  notes: string;
  photo?: string;
  gpsStatus: "not_requested" | "captured" | "unavailable";
  gps?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    capturedAt: string;
  };
  createdAt: string;
  updatedAt: string;
  status: "DRAFT" | "PENDING_SYNC" | "SYNCED" | "SYNC_FAILED";
  syncedAt?: string;
  syncAttempts?: number;
  lastSyncError?: string;
}

interface StoredSurveyResult {
  survey: Survey;
  created: boolean;
}

const DATA_DIR = "/tmp/vku-field-survey";
const DATA_FILE = `${DATA_DIR}/surveys.json`;
const TEMP_FILE = `${DATA_DIR}/surveys.json.tmp`;

let writeQueue = Promise.resolve();

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

function validateSurvey(value: unknown): value is Survey {
  if (!isRecord(value) || !isRecord(value.inspector) || !isRecord(value.session)) {
    return false;
  }

  const inspector = value.inspector;
  const session = value.session;
  const checklist = value.checklist;
  const gps = value.gps;

  const inspectorValid =
    isNonEmptyString(inspector.profileId) &&
    isNonEmptyString(inspector.fullName) &&
    isNonEmptyString(inspector.inspectorCode) &&
    isNonEmptyString(inspector.unit) &&
    isString(inspector.phone) &&
    isOneOf(inspector.role, INSPECTOR_ROLES) &&
    isNonEmptyString(inspector.inspectionGroup);

  const sessionValid =
    isNonEmptyString(session.sessionId) &&
    isNonEmptyString(session.code) &&
    isNonEmptyString(session.surveyDate) &&
    isNonEmptyString(session.campusZone) &&
    isOneOf(session.shift, INSPECTION_SHIFTS);

  const checklistValid =
    Array.isArray(checklist) &&
    checklist.length > 0 &&
    checklist.every(
      (item) =>
        isRecord(item) &&
        isNonEmptyString(item.id) &&
        isNonEmptyString(item.label) &&
        isOneOf(item.status, CHECKLIST_STATUSES)
    );

  const gpsValid =
    value.gpsStatus !== "captured" ||
    (isRecord(gps) &&
      typeof gps.latitude === "number" &&
      Number.isFinite(gps.latitude) &&
      gps.latitude >= -90 &&
      gps.latitude <= 90 &&
      typeof gps.longitude === "number" &&
      Number.isFinite(gps.longitude) &&
      gps.longitude >= -180 &&
      gps.longitude <= 180 &&
      typeof gps.accuracy === "number" &&
      Number.isFinite(gps.accuracy) &&
      gps.accuracy >= 0 &&
      isNonEmptyString(gps.capturedAt));

  const photoRequired = value.severity === "High" || value.severity === "Critical";

  return Boolean(
    isNonEmptyString(value.id) &&
      inspectorValid &&
      sessionValid &&
      isNonEmptyString(value.building) &&
      isNonEmptyString(value.floor) &&
      isNonEmptyString(value.room) &&
      isOneOf(value.roomType, ROOM_TYPES) &&
      isOneOf(value.category, SURVEY_CATEGORIES) &&
      checklistValid &&
      typeof value.rating === "number" &&
      Number.isInteger(value.rating) &&
      value.rating >= 1 &&
      value.rating <= 5 &&
      isOneOf(value.severity, SEVERITIES) &&
      isOneOf(value.priority, PRIORITIES) &&
      isOneOf(value.issueType, ISSUE_TYPES) &&
      isOneOf(value.recommendedAction, RECOMMENDED_ACTIONS) &&
      isNonEmptyString(value.notes) &&
      (!photoRequired || isNonEmptyString(value.photo)) &&
      (value.gpsStatus === "not_requested" ||
        value.gpsStatus === "captured" ||
        value.gpsStatus === "unavailable") &&
      gpsValid &&
      isNonEmptyString(value.createdAt) &&
      isNonEmptyString(value.updatedAt) &&
      (value.status === "DRAFT" ||
        value.status === "PENDING_SYNC" ||
        value.status === "SYNCED" ||
        value.status === "SYNC_FAILED")
  );
}

async function ensureDataFile(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    await readFile(DATA_FILE, "utf8");
  } catch {
    await writeFile(DATA_FILE, "[]", "utf8");
  }
}

async function readSurveys(): Promise<Survey[]> {
  await ensureDataFile();
  const content = await readFile(DATA_FILE, "utf8");
  const parsed = JSON.parse(content) as unknown;
  return Array.isArray(parsed) ? (parsed as Survey[]) : [];
}

async function writeSurveys(surveys: Survey[]): Promise<void> {
  await ensureDataFile();
  await writeFile(TEMP_FILE, JSON.stringify(surveys), "utf8");
  await rename(TEMP_FILE, DATA_FILE);
}

function enqueueWrite<T>(operation: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(operation, operation);
  writeQueue = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

async function upsertSurvey(survey: Survey): Promise<StoredSurveyResult> {
  return enqueueWrite(async () => {
    const surveys = await readSurveys();
    const existing = surveys.find((item) => item.id === survey.id);

    if (existing) {
      return { survey: existing, created: false };
    }

    const now = new Date().toISOString();
    const syncedSurvey: Survey = {
      ...survey,
      status: "SYNCED",
      syncedAt: survey.syncedAt ?? now,
      updatedAt: now,
      lastSyncError: undefined
    };

    surveys.push(syncedSurvey);
    await writeSurveys(surveys);
    return { survey: syncedSurvey, created: true };
  });
}

const RESPONSE_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store"
};

function json(value: unknown, status = 200): Response {
  return Response.json(value, {
    status,
    headers: RESPONSE_HEADERS
  });
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: RESPONSE_HEADERS
      });
    }

    const url = new URL(request.url);
    const route = url.searchParams.get("route") ?? "";

    try {
      if (request.method === "GET" && route === "health") {
        return json({
          ok: true,
          name: "VKU Field Survey API",
          runtime: "vercel"
        });
      }

      if (request.method === "GET" && route === "surveys") {
        const surveys = await readSurveys();
        return json(
          surveys.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        );
      }

      if (request.method === "GET" && route.startsWith("surveys/")) {
        const id = decodeURIComponent(route.slice("surveys/".length));
        const surveys = await readSurveys();
        const survey = surveys.find((item) => item.id === id);

        return survey ? json(survey) : json({ error: "Survey not found." }, 404);
      }

      if (request.method === "POST" && route === "surveys") {
        const body = (await request.json().catch(() => undefined)) as unknown;

        if (!validateSurvey(body)) {
          return json({ error: "Invalid survey payload." }, 400);
        }

        const result = await upsertSurvey(body);
        return json(result.survey, result.created ? 201 : 200);
      }

      return json({ error: "API route not found." }, 404);
    } catch (error) {
      return json(
        {
          error:
            error instanceof Error ? error.message : "Unexpected server error."
        },
        500
      );
    }
  }
};
