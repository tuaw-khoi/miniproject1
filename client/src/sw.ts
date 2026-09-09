/// <reference lib="webworker" />

import { openDB, type DBSchema } from "idb";
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { API_BASE_URL } from "./services/apiConfig";
import type { InspectorProfile } from "./types/profile";
import type { InspectionSession } from "./types/session";
import {
  normalizeSurvey,
  type Survey,
  type SurveyEditDraft,
  type SurveyStatus
} from "./types/survey";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Parameters<typeof precacheAndRoute>[0];
};

const DB_NAME = "vku-field-survey";
const DB_VERSION = 3;
const SURVEYS_STORE = "surveys";
const PROFILE_STORE = "profile";
const SESSIONS_STORE = "sessions";
const SURVEY_EDITS_STORE = "surveyEdits";
const BACKGROUND_SYNC_TAG = "vku-survey-sync";

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
  surveyEdits: {
    key: string;
    value: SurveyEditDraft;
    indexes: {
      "by-updated-at": string;
    };
  };
}

interface SyncEvent extends ExtendableEvent {
  readonly tag: string;
}

interface IndexableStore {
  indexNames: DOMStringList;
  createIndex(
    name: string,
    keyPath: string | string[],
    options?: IDBIndexParameters
  ): unknown;
}

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
registerRoute(new NavigationRoute(createHandlerBoundToURL("/index.html")));

self.addEventListener("sync", (event) => {
  const syncEvent = event as SyncEvent;

  if (syncEvent.tag === BACKGROUND_SYNC_TAG) {
    syncEvent.waitUntil(syncPendingSurveysFromWorker());
  }
});

async function syncPendingSurveysFromWorker(): Promise<void> {
  const db = await openDB<VkuFieldSurveyDB>(DB_NAME, DB_VERSION, {
    upgrade(database, _oldVersion, _newVersion, transaction) {
      const store = database.objectStoreNames.contains(SURVEYS_STORE)
        ? transaction.objectStore(SURVEYS_STORE)
        : database.createObjectStore(SURVEYS_STORE, {
            keyPath: "id"
          });

      ensureSurveyIndexes(store);

      if (!database.objectStoreNames.contains(PROFILE_STORE)) {
        database.createObjectStore(PROFILE_STORE, { keyPath: "id" });
      }

      if (!database.objectStoreNames.contains(SESSIONS_STORE)) {
        const sessionStore = database.createObjectStore(SESSIONS_STORE, {
          keyPath: "id"
        });
        sessionStore.createIndex("by-updated-at", "updatedAt");
      }

      if (!database.objectStoreNames.contains(SURVEY_EDITS_STORE)) {
        const editStore = database.createObjectStore(SURVEY_EDITS_STORE, {
          keyPath: "id"
        });
        editStore.createIndex("by-updated-at", "updatedAt");
      }
    }
  });

  const queue = (await db.getAll(SURVEYS_STORE))
    .map(normalizeSurvey)
    .filter(
      (survey) =>
        survey.status === "PENDING_SYNC" || survey.status === "SYNC_FAILED"
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  for (const survey of queue) {
    const queuedSurvey: Survey = {
      ...survey,
      status: "PENDING_SYNC",
      updatedAt: new Date().toISOString()
    };

    await db.put(SURVEYS_STORE, queuedSurvey);

    try {
      const isRevision = queuedSurvey.version > 1;
      const response = await fetch(
        isRevision
          ? `${API_BASE_URL}/api/surveys/${encodeURIComponent(queuedSurvey.id)}`
          : `${API_BASE_URL}/api/surveys`,
        {
        method: isRevision ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...queuedSurvey,
          status: "SYNCED"
        })
        }
      );

      if (!response.ok) {
        throw new Error(`API request failed with ${response.status}`);
      }

      const remoteSurvey = (await response.json()) as Survey;
      await db.put(SURVEYS_STORE, {
        ...queuedSurvey,
        ...remoteSurvey,
        status: "SYNCED",
        syncedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastSyncError: undefined
      });
    } catch (error) {
      await db.put(SURVEYS_STORE, {
        ...queuedSurvey,
        status: "SYNC_FAILED",
        updatedAt: new Date().toISOString(),
        syncAttempts: (queuedSurvey.syncAttempts ?? 0) + 1,
        lastSyncError:
          error instanceof Error ? error.message : "Background sync failed"
      });

      throw error;
    }
  }
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
