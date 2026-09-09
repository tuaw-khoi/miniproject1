import {
  AlertTriangle,
  CalendarDays,
  ClipboardPlus,
  Clock3,
  MapPinned,
  Star,
  UserRound
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { NetworkStatus } from "../components/NetworkStatus";
import { SurveyCard } from "../components/SurveyCard";
import { useInspectionContext } from "../hooks/useInspectionContext";
import type { NetworkState } from "../hooks/useNetwork";
import { useSurveys } from "../hooks/useSurveys";
import { syncSurveys } from "../services/syncService";
import { isInspectorProfileComplete } from "../types/profile";

interface HomePageProps {
  network: NetworkState;
}

export function HomePage({ network }: HomePageProps) {
  const { surveys, counts } = useSurveys();
  const { profile, session, loading: contextLoading } = useInspectionContext();
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
  const profileReady = Boolean(profile && isInspectorProfileComplete(profile));

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
          <h1 className="text-2xl font-bold text-slate-950">
            Campus inspections
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {profileReady ? `Welcome, ${profile?.fullName}.` : "Inspector setup required."}
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

      {!contextLoading && (!profileReady || !session) ? (
        <Link
          to="/profile"
          className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900"
        >
          <UserRound className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold">Complete inspector setup</p>
            <p className="mt-1 text-sm text-amber-800">
              Identity and an active session are required for submission.
            </p>
          </div>
        </Link>
      ) : null}

      {session ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                Active session
              </p>
              <h2 className="mt-1 text-base font-semibold text-slate-950">
                {session.code}
              </h2>
            </div>
            <MapPinned className="h-5 w-5 text-vku-600" aria-hidden="true" />
          </div>
          <p className="mt-3 text-sm text-slate-600">
            {session.surveyDate} · {session.shift} · {session.campusZone}
          </p>
        </section>
      ) : null}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <MetricCard
          label="Today"
          value={counts.today}
          icon={CalendarDays}
          tone="bg-vku-50 text-vku-700"
        />
        <MetricCard
          label="Pending"
          value={counts.pending}
          icon={Clock3}
          tone="bg-amber-50 text-amber-700"
        />
        <MetricCard
          label="Failed"
          value={counts.failed}
          icon={AlertTriangle}
          tone="bg-rose-50 text-rose-700"
        />
        <MetricCard
          label="Critical"
          value={counts.critical}
          icon={AlertTriangle}
          tone="bg-red-50 text-red-700"
        />
        <MetricCard
          label="Low rating"
          value={counts.lowRating}
          icon={Star}
          tone="bg-orange-50 text-orange-700"
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
              New records will appear here as soon as a draft is saved.
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

function MetricCard({ label, value, icon: Icon, tone }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm last:col-span-2 sm:last:col-span-1">
      <div
        className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <p className="text-2xl font-bold text-slate-950">{value}</p>
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
    </div>
  );
}
