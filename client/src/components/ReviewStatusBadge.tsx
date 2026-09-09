import { CheckCircle2, CircleDot, Eye, XCircle } from "lucide-react";
import {
  REVIEW_STATUS_LABELS,
  type ReviewStatus
} from "../types/survey";

const ICONS = {
  OPEN: CircleDot,
  IN_REVIEW: Eye,
  RESOLVED: CheckCircle2,
  REJECTED: XCircle
} satisfies Record<ReviewStatus, typeof CircleDot>;

const TONES: Record<ReviewStatus, string> = {
  OPEN: "bg-amber-50 text-amber-700 ring-amber-200",
  IN_REVIEW: "bg-sky-50 text-sky-700 ring-sky-200",
  RESOLVED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  REJECTED: "bg-slate-100 text-slate-700 ring-slate-200"
};

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  const Icon = ICONS[status];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${TONES[status]}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {REVIEW_STATUS_LABELS[status]}
    </span>
  );
}
