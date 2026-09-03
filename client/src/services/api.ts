import type { Survey } from "../types/survey";

const DEFAULT_API_URL = "http://localhost:4000";

export const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ||
  DEFAULT_API_URL;

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
  const timeout = window.setTimeout(() => controller.abort(), 15000);

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

export async function createRemoteSurvey(survey: Survey): Promise<Survey> {
  return fetchJson<Survey>("/api/surveys", {
    method: "POST",
    body: JSON.stringify({
      ...survey,
      status: "SYNCED"
    })
  });
}

export async function getRemoteSurveys(): Promise<Survey[]> {
  return fetchJson<Survey[]>("/api/surveys");
}

export async function getRemoteSurvey(id: string): Promise<Survey> {
  return fetchJson<Survey>(`/api/surveys/${id}`);
}
