import {
  listSurveys,
  listSyncQueue,
  patchSurvey,
  putSurvey
} from "../db/indexedDB";
import { surveyStore } from "../stores/surveyStore";
import type { Survey } from "../types/survey";
import { getRemoteSurveys, upsertRemoteSurvey } from "./api";
import { getNetworkSnapshot } from "./networkService";

export const BACKGROUND_SYNC_TAG = "vku-survey-sync";

export interface SubmitResult {
  survey: Survey;
  message: string;
}

export interface SyncResult {
  attempted: number;
  synced: number;
  failed: number;
  skippedReason?: string;
}

let syncInProgress = false;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown sync error";
}

export async function registerBackgroundSync(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) {
    return false;
  }

  try {
    const registration = (await navigator.serviceWorker.ready) as ServiceWorkerRegistration & {
      sync?: {
        register(tag: string): Promise<void>;
      };
    };

    if (!registration.sync) {
      return false;
    }

    await registration.sync.register(BACKGROUND_SYNC_TAG);
    return true;
  } catch {
    return false;
  }
}

export async function submitSurvey(
  survey: Survey,
  isOnline: boolean
): Promise<SubmitResult> {
  const now = new Date().toISOString();
  const queuedSurvey: Survey = {
    ...survey,
    status: "PENDING_SYNC",
    updatedAt: now,
    syncAttempts: survey.syncAttempts ?? 0,
    lastSyncError: undefined
  };

  await putSurvey(queuedSurvey);
  surveyStore.notify();

  if (!isOnline) {
    await registerBackgroundSync();

    return {
      survey: queuedSurvey,
      message: "Saved locally. It will sync when the network returns."
    };
  }

  try {
    const remoteSurvey = await upsertRemoteSurvey(queuedSurvey);
    const syncedSurvey: Survey = {
      ...queuedSurvey,
      ...remoteSurvey,
      status: "SYNCED",
      updatedAt: new Date().toISOString(),
      syncedAt: new Date().toISOString(),
      lastSyncError: undefined
    };

    await putSurvey(syncedSurvey);
    surveyStore.notify();

    return {
      survey: syncedSurvey,
      message: "Submitted and synced successfully."
    };
  } catch (error) {
    const failedSurvey: Survey = {
      ...queuedSurvey,
      status: "SYNC_FAILED",
      updatedAt: new Date().toISOString(),
      syncAttempts: (queuedSurvey.syncAttempts ?? 0) + 1,
      lastSyncError: getErrorMessage(error)
    };

    await putSurvey(failedSurvey);
    await registerBackgroundSync();
    surveyStore.notify();

    return {
      survey: failedSurvey,
      message: "Saved locally. API sync failed and can be retried."
    };
  }
}

export async function syncSurveys(): Promise<SyncResult> {
  if (syncInProgress) {
    return {
      attempted: 0,
      synced: 0,
      failed: 0,
      skippedReason: "Sync is already running."
    };
  }

  const network = await getNetworkSnapshot();
  if (!network.connected) {
    await registerBackgroundSync();

    return {
      attempted: 0,
      synced: 0,
      failed: 0,
      skippedReason: "Device is offline."
    };
  }

  syncInProgress = true;

  try {
    const queue = await listSyncQueue();
    const result: SyncResult = {
      attempted: queue.length,
      synced: 0,
      failed: 0
    };

    for (const survey of queue) {
      const queuedSurvey: Survey = {
        ...survey,
        status: "PENDING_SYNC",
        updatedAt: new Date().toISOString()
      };

      await putSurvey(queuedSurvey);
      surveyStore.notify();

      try {
        const remoteSurvey = await upsertRemoteSurvey(queuedSurvey);
        await putSurvey({
          ...queuedSurvey,
          ...remoteSurvey,
          status: "SYNCED",
          syncedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastSyncError: undefined
        });
        result.synced += 1;
      } catch (error) {
        await putSurvey({
          ...queuedSurvey,
          status: "SYNC_FAILED",
          updatedAt: new Date().toISOString(),
          syncAttempts: (queuedSurvey.syncAttempts ?? 0) + 1,
          lastSyncError: getErrorMessage(error)
        });
        result.failed += 1;
      }

      surveyStore.notify();
    }

    return result;
  } finally {
    syncInProgress = false;
  }
}

export async function refreshReviewMetadata(): Promise<number> {
  const network = await getNetworkSnapshot();
  if (!network.connected) return 0;

  try {
    const [localSurveys, remoteSurveys] = await Promise.all([
      listSurveys(),
      getRemoteSurveys()
    ]);
    const localById = new Map(localSurveys.map((survey) => [survey.id, survey]));
    let updated = 0;

    for (const remote of remoteSurveys) {
      const local = localById.get(remote.id);
      if (!local) continue;
      if (
        local.reviewStatus === remote.reviewStatus &&
        local.assignedTo === remote.assignedTo &&
        local.adminNote === remote.adminNote &&
        local.resolvedAt === remote.resolvedAt
      ) {
        continue;
      }
      await patchSurvey(remote.id, {
        reviewStatus: remote.reviewStatus,
        assignedTo: remote.assignedTo,
        adminNote: remote.adminNote,
        resolvedAt: remote.resolvedAt,
        updatedAt: local.updatedAt
      });
      updated += 1;
    }

    if (updated) surveyStore.notify();
    return updated;
  } catch {
    return 0;
  }
}
