const LOCAL_API_URL = "http://localhost:4000";
const PRODUCTION_API_URL = "https://miniproject1-client.vercel.app";

function trimTrailingSlash(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

export function getApiBaseUrl(): string {
  const configuredUrl = import.meta.env.VITE_API_URL as string | undefined;

  if (configuredUrl?.trim()) {
    return trimTrailingSlash(configuredUrl);
  }

  // Capacitor runs production assets from an internal WebView origin, so a
  // relative API path would never reach the public Vercel backend.
  return import.meta.env.DEV ? LOCAL_API_URL : PRODUCTION_API_URL;
}

export const API_BASE_URL = getApiBaseUrl();
