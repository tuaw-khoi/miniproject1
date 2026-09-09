import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { INSPECTOR_ROLES } from "../src/types/profile";
import { INSPECTION_SHIFTS } from "../src/types/session";
import {
  CHECKLIST_STATUSES,
  ISSUE_TYPES,
  PRIORITIES,
  RECOMMENDED_ACTIONS,
  ROOM_TYPES,
  SEVERITIES,
  SURVEY_CATEGORIES,
  type Survey
} from "../src/types/survey";

interface ApiRequest {
  method?: string;
  query: Record<string, string | string[] | undefined>;
  body?: unknown;
}

interface ApiResponse {
  setHeader(name: string, value: string): void;
  status(code: number): ApiResponse;
  json(value: unknown): void;
  end(): void;
}

interface StoredSurveyResult {
  survey: Survey;
  created: boolean;
}

const DATA_DIR = path.join("/tmp", "vku-field-survey");
const DATA_FILE = path.join(DATA_DIR, "surveys.json");
const TEMP_FILE = path.join(DATA_DIR, "surveys.json.tmp");

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

function parseBody(body: unknown): unknown {
  if (typeof body !== "string") {
    return body;
  }

  try {
    return JSON.parse(body) as unknown;
  } catch {
    return undefined;
  }
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

function getRoute(request: ApiRequest): string {
  const route = request.query.route;
  return Array.isArray(route) ? route.join("/") : (route ?? "");
}

function setCors(response: ApiResponse): void {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Cache-Control", "no-store");
}

export default async function handler(
  request: ApiRequest,
  response: ApiResponse
): Promise<void> {
  setCors(response);

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  const route = getRoute(request);

  try {
    if (request.method === "GET" && route === "health") {
      response.status(200).json({
        ok: true,
        name: "VKU Field Survey API",
        runtime: "vercel"
      });
      return;
    }

    if (request.method === "GET" && route === "surveys") {
      const surveys = await readSurveys();
      response
        .status(200)
        .json(surveys.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      return;
    }

    if (request.method === "GET" && route.startsWith("surveys/")) {
      const id = decodeURIComponent(route.slice("surveys/".length));
      const surveys = await readSurveys();
      const survey = surveys.find((item) => item.id === id);

      if (!survey) {
        response.status(404).json({ error: "Survey not found." });
        return;
      }

      response.status(200).json(survey);
      return;
    }

    if (request.method === "POST" && route === "surveys") {
      const body = parseBody(request.body);

      if (!validateSurvey(body)) {
        response.status(400).json({ error: "Invalid survey payload." });
        return;
      }

      const result = await upsertSurvey(body);
      response.status(result.created ? 201 : 200).json(result.survey);
      return;
    }

    response.status(404).json({ error: "API route not found." });
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : "Unexpected server error."
    });
  }
}
