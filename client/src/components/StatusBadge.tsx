import { CheckCircle2, Clock3, FilePenLine, RefreshCcw } from "lucide-react";
import { STATUS_LABELS, type SurveyStatus } from "../types/survey";
import { statusTone } from "../utils/format";

interface StatusBadgeProps {
  status: SurveyStatus;
}

const ICONS = {
  DRAFT: FilePenLine,
  PENDING_SYNC: Clock3,
  SYNCED: CheckCircle2,
  SYNC_FAILED: RefreshCcw
} satisfies Record<SurveyStatus, typeof FilePenLine>;

export function StatusBadge({ status }: StatusBadgeProps) {
  const Icon = ICONS[status];

  return (
    <span
      role="status"
      aria-label={STATUS_LABELS[status]}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusTone(
        status
      )}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  );
}
