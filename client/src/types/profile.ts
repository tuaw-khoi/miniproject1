export const INSPECTOR_ROLES = [
  "Student Auditor",
  "Staff Inspector",
  "Team Lead"
] as const;

export type InspectorRole = (typeof INSPECTOR_ROLES)[number];

export interface InspectorProfile {
  id: string;
  fullName: string;
  inspectorCode: string;
  unit: string;
  phone: string;
  role: InspectorRole;
  inspectionGroup: string;
  updatedAt: string;
}

export interface InspectorSnapshot {
  profileId: string;
  fullName: string;
  inspectorCode: string;
  unit: string;
  phone: string;
  role: InspectorRole;
  inspectionGroup: string;
}

export const CURRENT_PROFILE_ID = "local-inspector";

export function createEmptyInspectorProfile(now: string): InspectorProfile {
  return {
    id: CURRENT_PROFILE_ID,
    fullName: "",
    inspectorCode: "",
    unit: "",
    phone: "",
    role: "Student Auditor",
    inspectionGroup: "",
    updatedAt: now
  };
}

export function toInspectorSnapshot(
  profile: InspectorProfile
): InspectorSnapshot {
  return {
    profileId: profile.id,
    fullName: profile.fullName.trim(),
    inspectorCode: profile.inspectorCode.trim(),
    unit: profile.unit.trim(),
    phone: profile.phone.trim(),
    role: profile.role,
    inspectionGroup: profile.inspectionGroup.trim()
  };
}

export function isInspectorProfileComplete(
  profile: InspectorProfile | InspectorSnapshot
): boolean {
  return Boolean(
    profile.fullName.trim() &&
      profile.inspectorCode.trim() &&
      profile.unit.trim() &&
      profile.role &&
      profile.inspectionGroup.trim()
  );
}

export function createLegacyInspectorSnapshot(): InspectorSnapshot {
  return {
    profileId: "legacy",
    fullName: "Not recorded",
    inspectorCode: "LEGACY",
    unit: "Not recorded",
    phone: "",
    role: "Student Auditor",
    inspectionGroup: "Not recorded"
  };
}
