import {
  AlertTriangle,
  CheckCircle2,
  ClipboardPlus,
  Clock3,
  FilePenLine
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { NetworkStatus } from "../components/NetworkStatus";
import { SurveyCard } from "../components/SurveyCard";
import type { NetworkState } from "../hooks/useNetwork";
import { useSurveys } from "../hooks/useSurveys";
import { syncSurveys } from "../services/syncService";

interface HomePageProps {
  network: NetworkState;
}

export function HomePage({ network }: HomePageProps) {
  const { surveys, counts } = useSurveys();
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string>();

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

  const recent = surveys.slice(0, 3);

  return (
    <div className="space-y-5">
      <NetworkStatus
        network={network}
        pendingCount={counts.pending}
        failedCount={counts.failed}
        onRetry={() => void retrySync()}
        syncing={syncing}
      />

      <section className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-normal text-slate-950">
            Campus inspection
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Record facility issues at VKU, keep work safe offline, and sync when
            the API is reachable.
          </p>
        </div>

        <Link
          to="/new"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-vku-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-vku-700 sm:w-auto"
        >
          <ClipboardPlus className="h-5 w-5" aria-hidden="true" />
          New Inspection
        </Link>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard
          label="Draft"
          value={counts.draft}
          icon={FilePenLine}
          tone="text-slate-700 bg-slate-100"
        />
        <MetricCard
          label="Pending"
          value={counts.pending}
          icon={Clock3}
          tone="text-amber-700 bg-amber-50"
        />
        <MetricCard
          label="Synced"
          value={counts.synced}
          icon={CheckCircle2}
          tone="text-emerald-700 bg-emerald-50"
        />
        <MetricCard
          label="Failed"
          value={counts.failed}
          icon={AlertTriangle}
          tone="text-rose-700 bg-rose-50"
        />
      </section>

      {message ? (
        <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          {message}
        </p>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-950">Recent surveys</h2>
          <Link to="/surveys" className="text-sm font-semibold text-vku-700">
            View all
          </Link>
        </div>

        {recent.length ? (
          <div className="space-y-3">
            {recent.map((survey) => (
              <SurveyCard key={survey.id} survey={survey} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center">
            <p className="text-sm font-semibold text-slate-700">
              No local surveys yet
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Your first draft will be stored in IndexedDB.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: number;
  icon: typeof Clock3;
  tone: string;
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone
}: MetricCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div
        className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <p className="text-2xl font-bold text-slate-950">{value}</p>
      <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
        {label}
      </p>
    </div>
  );
}
