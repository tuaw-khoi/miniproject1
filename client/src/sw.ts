/// <reference lib="webworker" />

import { openDB, type DBSchema } from "idb";
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import type { Survey, SurveyStatus } from "./types/survey";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Parameters<typeof precacheAndRoute>[0];
};

const DB_NAME = "vku-field-survey";
const DB_VERSION = 1;
const SURVEYS_STORE = "surveys";
const BACKGROUND_SYNC_TAG = "vku-survey-sync";
const DEFAULT_API_URL = "http://localhost:4000";
const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ||
  DEFAULT_API_URL;

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
    }
  });

  const queue = (await db.getAll(SURVEYS_STORE))
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
      const response = await fetch(`${API_BASE_URL}/api/surveys`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...queuedSurvey,
          status: "SYNCED"
        })
      });

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
