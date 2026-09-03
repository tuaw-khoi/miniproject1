import { RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { SurveyCard } from "../components/SurveyCard";
import { useSurveys } from "../hooks/useSurveys";
import { syncSurveys } from "../services/syncService";
import {
  STATUS_LABELS,
  type SurveyStatus
} from "../types/survey";

type Filter = "ALL" | SurveyStatus;

const FILTERS: Filter[] = [
  "ALL",
  "DRAFT",
  "PENDING_SYNC",
  "SYNCED",
  "SYNC_FAILED"
];

export function SurveysPage() {
  const { surveys, loading } = useSurveys();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string>();

  const filteredSurveys = useMemo(() => {
    return surveys.filter((survey) => {
      const matchesStatus = filter === "ALL" || survey.status === filter;
      const haystack = `${survey.building} ${survey.floor} ${survey.room} ${survey.category} ${survey.notes}`.toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase().trim());

      return matchesStatus && matchesQuery;
    });
  }, [filter, query, surveys]);

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

  return (
    <div className="space-y-5">
      <section>
        <h1 className="text-xl font-bold text-slate-950">Survey history</h1>
        <p className="mt-1 text-sm text-slate-600">
          Local IndexedDB records stay available after refresh and offline boot.
        </p>
      </section>

      <section className="space-y-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search room, category, notes"
            className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-3 text-sm"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold ring-1 ${
                filter === item
                  ? "bg-vku-600 text-white ring-vku-600"
                  : "bg-white text-slate-600 ring-slate-200"
              }`}
            >
              {item === "ALL" ? "All" : STATUS_LABELS[item]}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => void retrySync()}
          disabled={syncing}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          Retry Sync
        </button>
      </section>

      {message ? (
        <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          {message}
        </p>
      ) : null}

      {loading ? (
        <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Loading local surveys...
        </p>
      ) : filteredSurveys.length ? (
        <section className="space-y-3">
          {filteredSurveys.map((survey) => (
            <SurveyCard key={survey.id} survey={survey} />
          ))}
        </section>
      ) : (
        <section className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center">
          <p className="text-sm font-semibold text-slate-700">
            No matching surveys
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Try another filter or create a new inspection.
          </p>
        </section>
      )}
    </div>
  );
}
