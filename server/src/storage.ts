import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ReviewUpdate, Survey } from "./types.js";

const DATA_DIR = path.resolve(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "surveys.json");
const TEMP_FILE = path.join(DATA_DIR, "surveys.json.tmp");

let writeQueue = Promise.resolve();

async function ensureDataFile(): Promise<void> {
  await mkdir(DATA_DIR, {
    recursive: true
  });

  try {
    await readFile(DATA_FILE, "utf8");
  } catch {
    await writeFile(DATA_FILE, "[]", "utf8");
  }
}

export async function readSurveys(): Promise<Survey[]> {
  await ensureDataFile();
  const content = await readFile(DATA_FILE, "utf8");
  const parsed = JSON.parse(content) as unknown;

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed as Survey[];
}

async function writeSurveys(surveys: Survey[]): Promise<void> {
  await ensureDataFile();
  await writeFile(TEMP_FILE, JSON.stringify(surveys, null, 2), "utf8");
  await rename(TEMP_FILE, DATA_FILE);
}

export async function upsertSurveyIdempotent(survey: Survey): Promise<{
  survey: Survey;
  created: boolean;
  updated: boolean;
}> {
  return enqueueWrite(async () => {
    const surveys = await readSurveys();
    const existing = surveys.find((item) => item.id === survey.id);

    if (existing) {
      const existingVersion = existing.version ?? 1;

      if (survey.version <= existingVersion) {
        return {
          survey: {
            ...existing,
            version: existingVersion,
            reviewStatus: existing.reviewStatus ?? "OPEN",
            editHistory: existing.editHistory ?? []
          },
          created: false,
          updated: false
        };
      }

      const now = new Date().toISOString();
      const updatedSurvey: Survey = {
        ...survey,
        status: "SYNCED",
        reviewStatus: existing.reviewStatus ?? survey.reviewStatus,
        assignedTo: existing.assignedTo ?? survey.assignedTo,
        adminNote: existing.adminNote ?? survey.adminNote,
        resolvedAt: existing.resolvedAt ?? survey.resolvedAt,
        syncedAt: now,
        lastSyncError: undefined
      };
      const index = surveys.findIndex((item) => item.id === survey.id);
      surveys[index] = updatedSurvey;
      await writeSurveys(surveys);

      return {
        survey: updatedSurvey,
        created: false,
        updated: true
      };
    }

    const now = new Date().toISOString();
    const syncedSurvey: Survey = {
      ...survey,
      status: "SYNCED",
      syncedAt: survey.syncedAt ?? now,
      updatedAt: survey.updatedAt ?? now,
      lastSyncError: undefined
    };

    surveys.push(syncedSurvey);
    await writeSurveys(surveys);

    return {
      survey: syncedSurvey,
      created: true,
      updated: false
    };
  });
}

export async function updateSurveyReview(
  id: string,
  update: ReviewUpdate
): Promise<Survey | undefined> {
  return enqueueWrite(async () => {
    const surveys = await readSurveys();
    const index = surveys.findIndex((item) => item.id === id);

    if (index < 0) return undefined;

    const current = surveys[index];
    const now = new Date().toISOString();
    const updated: Survey = {
      ...current,
      version: current.version ?? 1,
      reviewStatus: update.reviewStatus,
      assignedTo: update.assignedTo || undefined,
      adminNote: update.adminNote || undefined,
      resolvedAt:
        update.reviewStatus === "RESOLVED"
          ? current.resolvedAt ?? now
          : undefined,
      editHistory: current.editHistory ?? [],
      updatedAt: now
    };

    surveys[index] = updated;
    await writeSurveys(surveys);
    return updated;
  });
}

function enqueueWrite<T>(operation: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(operation, operation);
  writeQueue = next.then(
    () => undefined,
    () => undefined
  );

  return next;
}
