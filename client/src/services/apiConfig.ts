const LOCAL_API_URL = "http://localhost:4000";

function trimTrailingSlash(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

export function getApiBaseUrl(): string {
  const configuredUrl = import.meta.env.VITE_API_URL as string | undefined;

  if (configuredUrl?.trim()) {
    return trimTrailingSlash(configuredUrl);
  }

  return import.meta.env.DEV ? LOCAL_API_URL : "";
}

export const API_BASE_URL = getApiBaseUrl();
