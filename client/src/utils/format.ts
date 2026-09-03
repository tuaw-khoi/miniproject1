import type { SurveyStatus } from "../types/survey";

export function formatDateTime(value: string | undefined): string {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function statusTone(status: SurveyStatus): string {
  switch (status) {
    case "DRAFT":
      return "bg-slate-100 text-slate-700 ring-slate-200";
    case "PENDING_SYNC":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "SYNCED":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "SYNC_FAILED":
      return "bg-rose-50 text-rose-700 ring-rose-200";
  }
}
