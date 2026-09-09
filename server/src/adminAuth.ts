export const DEFAULT_ADMIN_ACCESS_KEY = "VKU-ADMIN-2026";

function configuredAdminAccessKey(): string {
  return process.env.ADMIN_ACCESS_KEY?.trim() || DEFAULT_ADMIN_ACCESS_KEY;
}

export function isValidAdminAccessKey(value: unknown): boolean {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim() === configuredAdminAccessKey()
  );
}
