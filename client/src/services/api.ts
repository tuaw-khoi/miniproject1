import { normalizeSurvey, type ReviewStatus, type Survey } from "../types/survey";
import { API_BASE_URL } from "./apiConfig";

const API_TIMEOUT_MS = 35_000;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown API error";
}

async function fetchJson<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      },
      signal: controller.signal
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(body || `API request failed with ${response.status}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  } finally {
    window.clearTimeout(timeout);
  }
}

export interface ReviewUpdate {
  reviewStatus: ReviewStatus;
  assignedTo: string;
  adminNote: string;
  actor: string;
}

export async function upsertRemoteSurvey(survey: Survey): Promise<Survey> {
  const isRevision = survey.version > 1;
  const remoteSurvey = await fetchJson<Survey>(
    isRevision ? `/api/surveys/${encodeURIComponent(survey.id)}` : "/api/surveys",
    {
    method: isRevision ? "PUT" : "POST",
    body: JSON.stringify({
      ...survey,
      status: "SYNCED"
    })
    }
  );

  return normalizeSurvey(remoteSurvey);
}

export async function getRemoteSurveys(): Promise<Survey[]> {
  const surveys = await fetchJson<Survey[]>("/api/surveys");
  return surveys.map(normalizeSurvey);
}

export async function getRemoteSurvey(id: string): Promise<Survey> {
  return normalizeSurvey(
    await fetchJson<Survey>(`/api/surveys/${encodeURIComponent(id)}`)
  );
}

export async function updateRemoteSurveyReview(
  id: string,
  update: ReviewUpdate
): Promise<Survey> {
  return normalizeSurvey(
    await fetchJson<Survey>(
      `/api/surveys/${encodeURIComponent(id)}/review`,
      {
        method: "PATCH",
        body: JSON.stringify(update)
      }
    )
  );
}
