import { mkdir, readFile, rename, writeFile } from "node:fs/promises";

const INSPECTOR_ROLES = ["Student Auditor", "Staff Inspector", "Team Lead"] as const;
const INSPECTION_SHIFTS = ["Morning", "Afternoon", "Evening"] as const;
const SURVEY_CATEGORIES = ["Hardware", "Projector", "AC", "Electrical", "Furniture"] as const;
const ROOM_TYPES = ["Classroom", "Lab", "Office", "Hall", "Library", "Other"] as const;
const CHECKLIST_STATUSES = ["OK", "ISSUE", "NOT_CHECKED"] as const;
const SEVERITIES = ["Low", "Medium", "High", "Critical"] as const;
const PRIORITIES = ["Normal", "Soon", "Urgent"] as const;
const ISSUE_TYPES = ["Broken", "Missing", "Dirty", "Unsafe", "Performance", "Other"] as const;
const RECOMMENDED_ACTIONS = ["Repair", "Replace", "Clean", "Escalate", "Monitor"] as const;
const REVIEW_STATUSES = ["OPEN", "IN_REVIEW", "RESOLVED", "REJECTED"] as const;

type ReviewStatus = (typeof REVIEW_STATUSES)[number];

interface Survey {
  id: string;
  version: number;
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
  reviewStatus: ReviewStatus;
  assignedTo?: string;
  adminNote?: string;
  resolvedAt?: string;
  editHistory: Array<{
    version: number;
    editedAt: string;
    editedBy: string;
    reason: string;
  }>;
  syncedAt?: string;
  syncAttempts?: number;
  lastSyncError?: string;
}

interface ReviewUpdate {
  reviewStatus: ReviewStatus;
  assignedTo: string;
  adminNote: string;
  actor: string;
}

interface SheetResponse {
  ok?: boolean;
  error?: string;
  action?: string;
  version?: number;
  surveys?: Array<Record<string, string>>;
}

interface StoredSurveyResult {
  survey: Survey;
  created: boolean;
  updated: boolean;
}

const DATA_DIR = "/tmp/vku-field-survey";
const DATA_FILE = `${DATA_DIR}/surveys.json`;
const TEMP_FILE = `${DATA_DIR}/surveys.json.tmp`;
const DEFAULT_SHEETS_WEBHOOK_URL =
  "https://script.google.com/macros/s/AKfycbzErqfZstJb23XhZF3ZPnaSO6v2cU6GmWFbiq_6Ux1JZ5_daHQT-p_xHXXaxgidqSBu9w/exec";
const DEFAULT_SHEETS_WEBHOOK_SECRET = "vku-survey-change-this-secret";
const DEFAULT_ADMIN_ACCESS_KEY = "VKU-ADMIN-2026";
const SHEETS_WEBHOOK_URL =
  process.env.SHEETS_WEBHOOK_URL?.trim() || DEFAULT_SHEETS_WEBHOOK_URL;
const SHEETS_WEBHOOK_SECRET =
  process.env.SHEETS_WEBHOOK_SECRET?.trim() || DEFAULT_SHEETS_WEBHOOK_SECRET;
const ADMIN_ACCESS_KEY =
  process.env.ADMIN_ACCESS_KEY?.trim() || DEFAULT_ADMIN_ACCESS_KEY;

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

function isOneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return options.includes(value as T);
}

function isValidSurvey(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value) || !isRecord(value.inspector) || !isRecord(value.session)) {
    return false;
  }

  const inspector = value.inspector;
  const session = value.session;
  const checklist = value.checklist;
  const gps = value.gps;
  const versionValid =
    value.version === undefined ||
    (typeof value.version === "number" && Number.isInteger(value.version) && value.version > 0);
  const reviewStatusValid =
    value.reviewStatus === undefined || isOneOf(value.reviewStatus, REVIEW_STATUSES);
  const gpsValid =
    value.gpsStatus !== "captured" ||
    (isRecord(gps) &&
      typeof gps.latitude === "number" &&
      Number.isFinite(gps.latitude) &&
      typeof gps.longitude === "number" &&
      Number.isFinite(gps.longitude) &&
      typeof gps.accuracy === "number" &&
      Number.isFinite(gps.accuracy) &&
      isNonEmptyString(gps.capturedAt));

  return Boolean(
    isNonEmptyString(value.id) &&
      versionValid &&
      isNonEmptyString(inspector.profileId) &&
      isNonEmptyString(inspector.fullName) &&
      isNonEmptyString(inspector.inspectorCode) &&
      isNonEmptyString(inspector.unit) &&
      isString(inspector.phone) &&
      isOneOf(inspector.role, INSPECTOR_ROLES) &&
      isNonEmptyString(inspector.inspectionGroup) &&
      isNonEmptyString(session.sessionId) &&
      isNonEmptyString(session.code) &&
      isNonEmptyString(session.surveyDate) &&
      isNonEmptyString(session.campusZone) &&
      isOneOf(session.shift, INSPECTION_SHIFTS) &&
      isNonEmptyString(value.building) &&
      isNonEmptyString(value.floor) &&
      isNonEmptyString(value.room) &&
      isOneOf(value.roomType, ROOM_TYPES) &&
      isOneOf(value.category, SURVEY_CATEGORIES) &&
      Array.isArray(checklist) &&
      checklist.length > 0 &&
      checklist.every(
        (item) =>
          isRecord(item) &&
          isNonEmptyString(item.id) &&
          isNonEmptyString(item.label) &&
          isOneOf(item.status, CHECKLIST_STATUSES)
      ) &&
      typeof value.rating === "number" &&
      Number.isInteger(value.rating) &&
      value.rating >= 1 &&
      value.rating <= 5 &&
      isOneOf(value.severity, SEVERITIES) &&
      isOneOf(value.priority, PRIORITIES) &&
      isOneOf(value.issueType, ISSUE_TYPES) &&
      isOneOf(value.recommendedAction, RECOMMENDED_ACTIONS) &&
      isNonEmptyString(value.notes) &&
      ((value.severity !== "High" && value.severity !== "Critical") ||
        isNonEmptyString(value.photo)) &&
      (value.gpsStatus === "not_requested" ||
        value.gpsStatus === "captured" ||
        value.gpsStatus === "unavailable") &&
      gpsValid &&
      isNonEmptyString(value.createdAt) &&
      isNonEmptyString(value.updatedAt) &&
      (value.status === "DRAFT" ||
        value.status === "PENDING_SYNC" ||
        value.status === "SYNCED" ||
        value.status === "SYNC_FAILED") &&
      reviewStatusValid &&
      (value.editHistory === undefined || Array.isArray(value.editHistory))
  );
}

function normalizeSurvey(value: Record<string, unknown>): Survey {
  return {
    ...(value as unknown as Survey),
    version:
      typeof value.version === "number" && value.version > 0 ? value.version : 1,
    reviewStatus: isOneOf(value.reviewStatus, REVIEW_STATUSES)
      ? value.reviewStatus
      : "OPEN",
    editHistory: Array.isArray(value.editHistory)
      ? (value.editHistory as Survey["editHistory"])
      : []
  };
}

function parseReviewUpdate(value: unknown): ReviewUpdate | undefined {
  if (!isRecord(value) || !isOneOf(value.reviewStatus, REVIEW_STATUSES)) {
    return undefined;
  }
  if (
    (value.assignedTo !== undefined && !isString(value.assignedTo)) ||
    (value.adminNote !== undefined && !isString(value.adminNote)) ||
    (value.actor !== undefined && !isString(value.actor))
  ) {
    return undefined;
  }

  return {
    reviewStatus: value.reviewStatus,
    assignedTo: isString(value.assignedTo) ? value.assignedTo.trim() : "",
    adminNote: isString(value.adminNote) ? value.adminNote.trim() : "",
    actor: isString(value.actor) && value.actor.trim() ? value.actor.trim() : "Admin"
  };
}

function isValidAdminAccessKey(value: unknown): boolean {
  return typeof value === "string" && value.trim() === ADMIN_ACCESS_KEY;
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
  const parsed = JSON.parse(await readFile(DATA_FILE, "utf8")) as unknown;
  return Array.isArray(parsed) ? parsed.filter(isRecord).map(normalizeSurvey) : [];
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
    const index = surveys.findIndex((item) => item.id === survey.id);
    const existing = index >= 0 ? surveys[index] : undefined;

    if (existing && survey.version <= existing.version) {
      return { survey: existing, created: false, updated: false };
    }

    const now = new Date().toISOString();
    const syncedSurvey: Survey = {
      ...survey,
      status: "SYNCED",
      reviewStatus: existing?.reviewStatus ?? survey.reviewStatus,
      assignedTo: existing?.assignedTo ?? survey.assignedTo,
      adminNote: existing?.adminNote ?? survey.adminNote,
      resolvedAt: existing?.resolvedAt ?? survey.resolvedAt,
      syncedAt: now,
      lastSyncError: undefined
    };

    if (existing) surveys[index] = syncedSurvey;
    else surveys.push(syncedSurvey);
    await writeSurveys(surveys);
    return { survey: syncedSurvey, created: !existing, updated: Boolean(existing) };
  });
}

async function postToSheet(payload: Record<string, unknown>): Promise<SheetResponse> {
  const response = await fetch(SHEETS_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    redirect: "follow",
    signal: AbortSignal.timeout(30_000)
  });
  if (!response.ok) throw new Error(`Google Sheets write failed with ${response.status}.`);
  const body = (await response.json()) as SheetResponse;
  if (!body.ok) throw new Error(body.error ?? "Google Sheets rejected the request.");
  return body;
}

async function upsertSurveyToSheet(survey: Survey): Promise<void> {
  const latestEdit = survey.editHistory.at(-1);
  const result = await postToSheet({
    action: "upsert",
    secret: SHEETS_WEBHOOK_SECRET,
    survey: {
      ...survey,
      reviewStatus: undefined,
      assignedTo: undefined,
      adminNote: undefined,
      resolvedAt: undefined,
      editedBy: latestEdit?.editedBy,
      editReason: latestEdit?.reason
    }
  });
  if (result.action === "ignored" && (result.version ?? 0) > survey.version) {
    throw new Error(`A newer central version (${result.version}) already exists.`);
  }
}

async function updateReviewInSheet(surveyId: string, update: ReviewUpdate): Promise<void> {
  await postToSheet({
    action: "update-review",
    secret: SHEETS_WEBHOOK_SECRET,
    surveyId,
    ...update
  });
}

async function listSurveysFromSheet(): Promise<Survey[]> {
  const url = new URL(SHEETS_WEBHOOK_URL);
  url.searchParams.set("action", "list");
  url.searchParams.set("secret", SHEETS_WEBHOOK_SECRET);
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(25_000)
  });
  if (!response.ok) throw new Error(`Google Sheets list failed with ${response.status}.`);
  const body = (await response.json()) as SheetResponse;
  if (!body.ok || !Array.isArray(body.surveys)) {
    throw new Error(body.error ?? "Google Sheets returned an invalid response.");
  }
  return body.surveys.map(sheetRecordToSurvey);
}

function sheetRecordToSurvey(record: Record<string, string>): Survey {
  const gpsStatus = record["GPS Status"];
  const photoUrl = record["Photo URL"] || "";
  let checklist: Survey["checklist"] = [];
  try {
    const parsed = JSON.parse(record.Checklist || "[]") as unknown;
    if (Array.isArray(parsed)) checklist = parsed as Survey["checklist"];
  } catch {
    checklist = [];
  }

  return {
    id: record["Survey UUID"],
    version: Math.max(1, Number(record.Version || 1)),
    inspector: {
      profileId: record["Inspector Code"] || "sheet-inspector",
      fullName: record["Inspector Name"],
      inspectorCode: record["Inspector Code"],
      unit: record.Unit,
      phone: "",
      role: record.Role as Survey["inspector"]["role"],
      inspectionGroup: record["Inspection Group"]
    },
    session: {
      sessionId: record["Session Code"] || "sheet-session",
      code: record["Session Code"],
      surveyDate: record["Survey Date"],
      campusZone: record["Campus Zone"],
      shift: record.Shift as Survey["session"]["shift"]
    },
    building: record.Building,
    floor: record.Floor,
    room: record.Room,
    roomType: record["Room Type"] as Survey["roomType"],
    category: record.Category as Survey["category"],
    checklist,
    rating: Number(record.Rating || 0),
    severity: record.Severity as Survey["severity"],
    priority: record.Priority as Survey["priority"],
    issueType: record["Issue Type"] as Survey["issueType"],
    recommendedAction: record["Recommended Action"] as Survey["recommendedAction"],
    notes: record.Notes,
    photo:
      photoUrl.startsWith("http://") || photoUrl.startsWith("https://")
        ? photoUrl
        : undefined,
    gpsStatus:
      gpsStatus === "captured" || gpsStatus === "unavailable" || gpsStatus === "not_requested"
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
    status: (record["Sync Status"] || "SYNCED") as Survey["status"],
    reviewStatus: (record["Review Status"] || "OPEN") as ReviewStatus,
    assignedTo: record["Assigned To"] || undefined,
    adminNote: record["Admin Note"] || undefined,
    editHistory: [],
    syncedAt: record["Synced At"] || undefined
  };
}

const RESPONSE_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key",
  "Cache-Control": "no-store"
};

function json(value: unknown, status = 200): Response {
  return Response.json(value, { status, headers: RESPONSE_HEADERS });
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: RESPONSE_HEADERS });
    }

    const url = new URL(request.url);
    const route = url.searchParams.get("route") ?? "";

    try {
      if (request.method === "GET" && route === "health") {
        return json({
          ok: true,
          name: "VKU Field Survey API",
          runtime: "vercel",
          sheetsConfigured: true
        });
      }

      if (request.method === "POST" && route === "admin/verify") {
        const body = (await request.json().catch(() => undefined)) as {
          key?: unknown;
        } | undefined;
        if (!isValidAdminAccessKey(body?.key)) {
          return json({ error: "Invalid admin access key." }, 401);
        }
        return json({ ok: true });
      }

      const isAdminRoute =
        route === "admin/surveys" || route.startsWith("admin/surveys/");
      if (isAdminRoute && !isValidAdminAccessKey(request.headers.get("x-admin-key"))) {
        return json({ error: "Valid admin access key is required." }, 401);
      }

      if (
        request.method === "GET" &&
        (route === "surveys" || route === "admin/surveys")
      ) {
        const surveys = await listSurveysFromSheet();
        return json(surveys.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      }

      if (request.method === "PATCH" && route.endsWith("/review")) {
        const prefix = route.startsWith("admin/surveys/")
          ? "admin/surveys/"
          : "surveys/";
        const id = decodeURIComponent(route.slice(prefix.length, -"/review".length));
        const update = parseReviewUpdate(
          (await request.json().catch(() => undefined)) as unknown
        );
        if (!id || !update) return json({ error: "Invalid review update." }, 400);

        await updateReviewInSheet(id, update);
        const survey = (await listSurveysFromSheet()).find((item) => item.id === id);
        return survey ? json(survey) : json({ error: "Survey not found." }, 404);
      }

      const isCreate = request.method === "POST" && route === "surveys";
      const isUpdate =
        request.method === "PUT" && route.startsWith("surveys/") && !route.endsWith("/review");

      if (isCreate || isUpdate) {
        const body = (await request.json().catch(() => undefined)) as unknown;
        if (!isValidSurvey(body)) return json({ error: "Invalid survey payload." }, 400);

        const survey = normalizeSurvey(body);
        if (isUpdate) {
          const id = decodeURIComponent(route.slice("surveys/".length));
          if (id !== survey.id) {
            return json({ error: "Route id must match survey UUID." }, 400);
          }
        }

        const result = await upsertSurvey(survey);
        await upsertSurveyToSheet(result.survey);
        return json(result.survey, isCreate && result.created ? 201 : 200);
      }

      if (
        request.method === "GET" &&
        (route.startsWith("surveys/") || route.startsWith("admin/surveys/"))
      ) {
        const prefix = route.startsWith("admin/surveys/")
          ? "admin/surveys/"
          : "surveys/";
        const id = decodeURIComponent(route.slice(prefix.length));
        const survey = (await listSurveysFromSheet()).find((item) => item.id === id);
        return survey ? json(survey) : json({ error: "Survey not found." }, 404);
      }

      return json({ error: "API route not found." }, 404);
    } catch (error) {
      return json(
        { error: error instanceof Error ? error.message : "Unexpected server error." },
        500
      );
    }
  }
};
