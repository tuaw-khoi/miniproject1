import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import {
  createEmptyInspectorProfile,
  CURRENT_PROFILE_ID,
  type InspectorProfile
} from "../types/profile";
import {
  getLocalDateValue,
  type InspectionSession
} from "../types/session";
import {
  normalizeSurvey,
  type Survey,
  type SurveyCounts,
  type SurveyStatus
} from "../types/survey";

export const DB_NAME = "vku-field-survey";
export const DB_VERSION = 2;
export const SURVEYS_STORE = "surveys";
export const PROFILE_STORE = "profile";
export const SESSIONS_STORE = "sessions";

interface VkuFieldSurveyDB extends DBSchema {
  surveys: {
    key: string;
    value: Survey;
    indexes: {
      "by-status": SurveyStatus;
      "by-created-at": string;
      "by-updated-at": string;
    };
  };
  profile: {
    key: string;
    value: InspectorProfile;
  };
  sessions: {
    key: string;
    value: InspectionSession;
    indexes: {
      "by-updated-at": string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<VkuFieldSurveyDB>> | undefined;

interface IndexableStore {
  indexNames: DOMStringList;
  createIndex(
    name: string,
    keyPath: string | string[],
    options?: IDBIndexParameters
  ): unknown;
}

function ensureSurveyIndexes(store: IndexableStore): void {
  if (!store.indexNames.contains("by-status")) {
    store.createIndex("by-status", "status");
  }
  if (!store.indexNames.contains("by-created-at")) {
    store.createIndex("by-created-at", "createdAt");
  }
  if (!store.indexNames.contains("by-updated-at")) {
    store.createIndex("by-updated-at", "updatedAt");
  }
}

export function getSurveyDB(): Promise<IDBPDatabase<VkuFieldSurveyDB>> {
  if (!dbPromise) {
    dbPromise = openDB<VkuFieldSurveyDB>(DB_NAME, DB_VERSION, {
      upgrade(db, _oldVersion, _newVersion, transaction) {
        const surveyStore = db.objectStoreNames.contains(SURVEYS_STORE)
          ? transaction.objectStore(SURVEYS_STORE)
          : db.createObjectStore(SURVEYS_STORE, { keyPath: "id" });
        ensureSurveyIndexes(surveyStore);

        if (!db.objectStoreNames.contains(PROFILE_STORE)) {
          db.createObjectStore(PROFILE_STORE, { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
          const sessionStore = db.createObjectStore(SESSIONS_STORE, {
            keyPath: "id"
          });
          sessionStore.createIndex("by-updated-at", "updatedAt");
        }
      }
    });
  }

  return dbPromise;
}

export async function putSurvey(survey: Survey): Promise<Survey> {
  const db = await getSurveyDB();
  const normalized = normalizeSurvey(survey);
  await db.put(SURVEYS_STORE, normalized);
  return normalized;
}

export async function putDraftSurvey(survey: Survey): Promise<Survey> {
  const db = await getSurveyDB();
  const transaction = db.transaction(SURVEYS_STORE, "readwrite");
  const current = await transaction.store.get(survey.id);

  if (current && current.status !== "DRAFT") {
    await transaction.done;
    return normalizeSurvey(current);
  }

  const normalized = normalizeSurvey({ ...survey, status: "DRAFT" });
  await transaction.store.put(normalized);
  await transaction.done;
  return normalized;
}

export async function patchSurvey(
  id: string,
  patch: Partial<Survey>
): Promise<Survey | undefined> {
  const db = await getSurveyDB();
  const stored = await db.get(SURVEYS_STORE, id);

  if (!stored) return undefined;

  const updated = normalizeSurvey({
    ...stored,
    ...patch,
    updatedAt: patch.updatedAt ?? new Date().toISOString()
  });

  await db.put(SURVEYS_STORE, updated);
  return updated;
}

export async function getSurvey(id: string): Promise<Survey | undefined> {
  const db = await getSurveyDB();
  const survey = await db.get(SURVEYS_STORE, id);
  return survey ? normalizeSurvey(survey) : undefined;
}

export async function listSurveys(): Promise<Survey[]> {
  const db = await getSurveyDB();
  const surveys = await db.getAll(SURVEYS_STORE);
  return surveys
    .map(normalizeSurvey)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function listSurveysByStatus(
  status: SurveyStatus
): Promise<Survey[]> {
  const surveys = await listSurveys();
  return surveys.filter((survey) => survey.status === status);
}

export async function getLatestDraft(): Promise<Survey | undefined> {
  const drafts = await listSurveysByStatus("DRAFT");
  return drafts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}

export async function listSyncQueue(): Promise<Survey[]> {
  const surveys = await listSurveys();
  return surveys
    .filter(
      (survey) =>
        survey.status === "PENDING_SYNC" || survey.status === "SYNC_FAILED"
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getSurveyCounts(): Promise<SurveyCounts> {
  const surveys = await listSurveys();
  const today = getLocalDateValue();
  const submitted = surveys.filter((survey) => survey.status !== "DRAFT");

  return {
    total: surveys.length,
    today: submitted.filter(
      (survey) => getLocalDateValue(new Date(survey.createdAt)) === today
    ).length,
    draft: surveys.filter((survey) => survey.status === "DRAFT").length,
    pending: surveys.filter((survey) => survey.status === "PENDING_SYNC").length,
    synced: surveys.filter((survey) => survey.status === "SYNCED").length,
    failed: surveys.filter((survey) => survey.status === "SYNC_FAILED").length,
    critical: submitted.filter((survey) => survey.severity === "Critical").length,
    lowRating: submitted.filter((survey) => survey.rating <= 2).length
  };
}

export async function getInspectorProfile(): Promise<InspectorProfile> {
  const db = await getSurveyDB();
  return (
    (await db.get(PROFILE_STORE, CURRENT_PROFILE_ID)) ??
    createEmptyInspectorProfile(new Date().toISOString())
  );
}

export async function putInspectorProfile(
  profile: InspectorProfile
): Promise<InspectorProfile> {
  const db = await getSurveyDB();
  const updated = { ...profile, updatedAt: new Date().toISOString() };
  await db.put(PROFILE_STORE, updated);
  return updated;
}

export async function getCurrentInspectionSession(): Promise<
  InspectionSession | undefined
> {
  const db = await getSurveyDB();
  const sessions = await db.getAll(SESSIONS_STORE);
  return sessions
    .filter((session) => session.active)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}

export async function putCurrentInspectionSession(
  session: InspectionSession
): Promise<InspectionSession> {
  const db = await getSurveyDB();
  const transaction = db.transaction(SESSIONS_STORE, "readwrite");
  const sessions = await transaction.store.getAll();
  const now = new Date().toISOString();

  for (const storedSession of sessions) {
    if (storedSession.id !== session.id && storedSession.active) {
      await transaction.store.put({
        ...storedSession,
        active: false,
        updatedAt: now
      });
    }
  }

  const updated = { ...session, active: true, updatedAt: now };
  await transaction.store.put(updated);
  await transaction.done;
  return updated;
}
