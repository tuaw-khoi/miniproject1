export const ADMIN_ACCESS_STORAGE_KEY = "vku-admin-access-key";

export function getStoredAdminAccessKey(): string | undefined {
  try {
    const value = window.sessionStorage.getItem(ADMIN_ACCESS_STORAGE_KEY);
    return value?.trim() || undefined;
  } catch {
    return undefined;
  }
}

export function storeAdminAccessKey(key: string): void {
  window.sessionStorage.setItem(ADMIN_ACCESS_STORAGE_KEY, key.trim());
}

export function clearStoredAdminAccessKey(): void {
  window.sessionStorage.removeItem(ADMIN_ACCESS_STORAGE_KEY);
}
