import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Survey, SurveyCounts, SurveyStatus } from "../types/survey";

export const DB_NAME = "vku-field-survey";
export const DB_VERSION = 1;
export const SURVEYS_STORE = "surveys";

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
        const store = db.objectStoreNames.contains(SURVEYS_STORE)
          ? transaction.objectStore(SURVEYS_STORE)
          : db.createObjectStore(SURVEYS_STORE, {
              keyPath: "id"
            });

        ensureSurveyIndexes(store);
      }
    });
  }

  return dbPromise;
}

export async function putSurvey(survey: Survey): Promise<Survey> {
  const db = await getSurveyDB();
  await db.put(SURVEYS_STORE, survey);
  return survey;
}

export async function patchSurvey(
  id: string,
  patch: Partial<Survey>
): Promise<Survey | undefined> {
  const db = await getSurveyDB();
  const current = await db.get(SURVEYS_STORE, id);

  if (!current) {
    return undefined;
  }

  const updated = {
    ...current,
    ...patch,
    updatedAt: patch.updatedAt ?? new Date().toISOString()
  };

  await db.put(SURVEYS_STORE, updated);
  return updated;
}

export async function getSurvey(id: string): Promise<Survey | undefined> {
  const db = await getSurveyDB();
  return db.get(SURVEYS_STORE, id);
}

export async function listSurveys(): Promise<Survey[]> {
  const db = await getSurveyDB();
  const surveys = await db.getAll(SURVEYS_STORE);
  return surveys.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
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

  return {
    total: surveys.length,
    draft: surveys.filter((survey) => survey.status === "DRAFT").length,
    pending: surveys.filter((survey) => survey.status === "PENDING_SYNC").length,
    synced: surveys.filter((survey) => survey.status === "SYNCED").length,
    failed: surveys.filter((survey) => survey.status === "SYNC_FAILED").length
  };
}
