import {
  AlertCircle,
  ArrowLeft,
  Building2,
  RefreshCw,
  Star
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { getSurvey } from "../db/indexedDB";
import { surveyStore } from "../stores/surveyStore";
import { syncSurveys } from "../services/syncService";
import type { Survey } from "../types/survey";
import { formatDateTime } from "../utils/format";
import { StatusBadge } from "../components/StatusBadge";

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

    const unsubscribe = surveyStore.subscribe(() => {
      void load();
    });

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
        <Link
          to="/surveys"
          className="inline-flex items-center gap-2 text-sm font-semibold text-vku-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to history
        </Link>
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
      <Link
        to="/surveys"
        className="inline-flex items-center gap-2 text-sm font-semibold text-vku-700"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to history
      </Link>

      <section className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-950">
              {survey.room || "Inspection detail"}
            </h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
              <Building2 className="h-4 w-4" aria-hidden="true" />
              Building {survey.building || "?"}, floor {survey.floor || "?"}
            </p>
          </div>
          <StatusBadge status={survey.status} />
        </div>

        {message ? (
          <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            {message}
          </p>
        ) : null}
      </section>

      {survey.photo ? (
        <img
          src={survey.photo}
          alt="Survey evidence"
          className="h-64 w-full rounded-lg border border-slate-200 object-cover"
        />
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <DetailItem label="Category" value={survey.category} />
          <DetailItem label="Created" value={formatDateTime(survey.createdAt)} />
          <DetailItem label="Updated" value={formatDateTime(survey.updatedAt)} />
          <DetailItem label="Synced" value={formatDateTime(survey.syncedAt)} />
        </dl>

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
            Rating
          </p>
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

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
            Notes
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {survey.notes || "No notes"}
          </p>
        </div>

        {survey.lastSyncError ? (
          <div className="mt-5 flex gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>{survey.lastSyncError}</p>
          </div>
        ) : null}
      </section>

      {canRetry ? (
        <button
          type="button"
          onClick={() => void retrySync()}
          disabled={syncing}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-vku-600 px-4 py-3 text-sm font-semibold text-white hover:bg-vku-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          <RefreshCw
            className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          Retry Sync
        </button>
      ) : null}
    </div>
  );
}

function DetailItem({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-normal text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 font-semibold text-slate-900">{value}</dd>
    </div>
  );
}
