import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Building2,
  ExternalLink,
  MapPin,
  RefreshCw,
  Star,
  UserRound
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge";
import { getSurvey } from "../db/indexedDB";
import { syncSurveys } from "../services/syncService";
import { surveyStore } from "../stores/surveyStore";
import {
  CHECKLIST_STATUS_LABELS,
  needsAction,
  type ChecklistStatus,
  type Survey
} from "../types/survey";
import { formatDateTime } from "../utils/format";

export function SurveyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [survey, setSurvey] = useState<Survey>();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | undefined>(
    typeof location.state === "object" &&
      location.state !== null &&
      "message" in location.state
      ? String(location.state.message)
      : undefined
  );

  useEffect(() => {
    let active = true;

    const load = async (): Promise<void> => {
      if (!id) {
        setLoading(false);
        return;
      }

      const localSurvey = await getSurvey(id);
      if (active) {
        setSurvey(localSurvey);
        setLoading(false);
      }
    };

    void load();
    const unsubscribe = surveyStore.subscribe(() => void load());

    return () => {
      active = false;
      unsubscribe();
    };
  }, [id]);

  const retrySync = async (): Promise<void> => {
    setSyncing(true);
    setMessage(undefined);

    try {
      const result = await syncSurveys();
      setMessage(
        result.skippedReason ??
          `Synced ${result.synced} item(s), ${result.failed} failed.`
      );
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Loading survey...
      </p>
    );
  }

  if (!survey) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-800">
            Survey not found locally.
          </p>
        </div>
      </div>
    );
  }

  const canRetry =
    survey.status === "PENDING_SYNC" || survey.status === "SYNC_FAILED";

  return (
    <div className="space-y-5">
      <BackLink />

      <section className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-950">
              {survey.room || "Inspection detail"}
            </h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
              <Building2 className="h-4 w-4" aria-hidden="true" />
              Building {survey.building || "?"}, floor {survey.floor || "?"} · {survey.roomType}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={survey.status} />
            {needsAction(survey) ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                Needs Action
              </span>
            ) : null}
          </div>
        </div>

        {message ? (
          <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            {message}
          </p>
        ) : null}
      </section>

      <DetailSection title="Assignment" icon={UserRound}>
        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <DetailItem label="Inspector" value={survey.inspector.fullName} />
          <DetailItem label="Inspector ID" value={survey.inspector.inspectorCode} />
          <DetailItem label="Class / unit" value={survey.inspector.unit} />
          <DetailItem label="Role" value={survey.inspector.role} />
          <DetailItem label="Inspection group" value={survey.inspector.inspectionGroup} />
          <DetailItem label="Phone" value={survey.inspector.phone || "Not provided"} />
          <DetailItem label="Session" value={survey.session.code} />
          <DetailItem label="Survey date" value={survey.session.surveyDate} />
          <DetailItem label="Campus / zone" value={survey.session.campusZone} />
          <DetailItem label="Shift" value={survey.session.shift} />
        </dl>
      </DetailSection>

      <DetailSection title="Assessment" icon={Building2}>
        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <DetailItem label="Category" value={survey.category} />
          <DetailItem label="Severity" value={survey.severity} />
          <DetailItem label="Priority" value={survey.priority} />
          <DetailItem label="Issue type" value={survey.issueType} />
          <DetailItem label="Recommended action" value={survey.recommendedAction} />
          <DetailItem label="Created" value={formatDateTime(survey.createdAt)} />
          <DetailItem label="Updated" value={formatDateTime(survey.updatedAt)} />
          <DetailItem label="Synced" value={formatDateTime(survey.syncedAt)} />
        </dl>

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase text-slate-500">Rating</p>
          <div className="mt-2 flex gap-1 text-amber-500">
            {[1, 2, 3, 4, 5].map((rating) => (
              <Star
                key={rating}
                className="h-5 w-5"
                fill={rating <= survey.rating ? "currentColor" : "none"}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>
      </DetailSection>

      <DetailSection title="Category checklist" icon={AlertCircle}>
        <div className="divide-y divide-slate-200 border-y border-slate-200">
          {survey.checklist.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 py-3">
              <p className="text-sm font-medium text-slate-800">{item.label}</p>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${checklistTone(
                  item.status
                )}`}
              >
                {CHECKLIST_STATUS_LABELS[item.status]}
              </span>
            </div>
          ))}
        </div>
      </DetailSection>

      <DetailSection title="Evidence" icon={MapPin}>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Notes</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {survey.notes || "No notes"}
          </p>
        </div>

        {survey.photo ? (
          <img
            src={survey.photo}
            alt="Survey evidence"
            className="mt-4 h-72 w-full rounded-lg border border-slate-200 object-cover"
          />
        ) : (
          <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            No photo attached.
          </p>
        )}

        <div className="mt-5 border-t border-slate-200 pt-4">
          <p className="text-xs font-semibold uppercase text-slate-500">
            GPS status
          </p>
          {survey.gps ? (
            <div className="mt-2 text-sm text-slate-700">
              <p>
                {survey.gps.latitude.toFixed(6)}, {survey.gps.longitude.toFixed(6)} · accuracy {Math.round(survey.gps.accuracy)} m
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Captured {formatDateTime(survey.gps.capturedAt)}
              </p>
              <a
                href={`https://www.google.com/maps?q=${survey.gps.latitude},${survey.gps.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-2 font-semibold text-vku-700"
              >
                Open coordinates
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          ) : (
            <p className="mt-2 text-sm capitalize text-slate-600">
              {survey.gpsStatus.replace("_", " ")}
            </p>
          )}
        </div>

        {survey.lastSyncError ? (
          <div className="mt-5 flex gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>{survey.lastSyncError}</p>
          </div>
        ) : null}
      </DetailSection>

      <div className="flex flex-wrap gap-3">
        {survey.status === "DRAFT" ? (
          <Link
            to="/new"
            className="inline-flex items-center justify-center rounded-lg bg-vku-600 px-4 py-3 text-sm font-semibold text-white"
          >
            Continue editing
          </Link>
        ) : null}
        {canRetry ? (
          <button
            type="button"
            onClick={() => void retrySync()}
            disabled={syncing}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-vku-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            Retry Sync
          </button>
        ) : null}
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/surveys"
      className="inline-flex items-center gap-2 text-sm font-semibold text-vku-700"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Back to history
    </Link>
  );
}

function DetailSection({
  title,
  icon: Icon,
  children
}: {
  title: string;
  icon: typeof Building2;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-5 w-5 text-vku-600" aria-hidden="true" />
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function checklistTone(status: ChecklistStatus): string {
  switch (status) {
    case "OK":
      return "bg-emerald-50 text-emerald-700";
    case "ISSUE":
      return "bg-rose-50 text-rose-700";
    case "NOT_CHECKED":
      return "bg-slate-100 text-slate-600";
  }
}
