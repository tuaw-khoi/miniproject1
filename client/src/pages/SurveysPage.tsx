import {
  Download,
  FileJson,
  RefreshCw,
  RotateCcw,
  Search
} from "lucide-react";
import { useMemo, useState } from "react";
import { SurveyCard } from "../components/SurveyCard";
import { useSurveys } from "../hooks/useSurveys";
import { exportSurveys } from "../services/exportService";
import { syncSurveys } from "../services/syncService";
import {
  PRIORITIES,
  SEVERITIES,
  STATUS_LABELS,
  SURVEY_CATEGORIES,
  type Priority,
  type Severity,
  type SurveyCategory,
  type SurveyStatus
} from "../types/survey";

type StatusFilter = "ALL" | SurveyStatus;
type CategoryFilter = "ALL" | SurveyCategory;
type SeverityFilter = "ALL" | Severity;
type PriorityFilter = "ALL" | Priority;

const STATUS_FILTERS: StatusFilter[] = [
  "ALL",
  "DRAFT",
  "PENDING_SYNC",
  "SYNCED",
  "SYNC_FAILED"
];

export function SurveysPage() {
  const { surveys, loading } = useSurveys();
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [category, setCategory] = useState<CategoryFilter>("ALL");
  const [severity, setSeverity] = useState<SeverityFilter>("ALL");
  const [priority, setPriority] = useState<PriorityFilter>("ALL");
  const [inspector, setInspector] = useState("ALL");
  const [surveyDate, setSurveyDate] = useState("");
  const [query, setQuery] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string>();

  const inspectorOptions = useMemo(
    () =>
      Array.from(
        new Set(
          surveys
            .map((survey) => survey.inspector.fullName)
            .filter((name) => Boolean(name))
        )
      ).sort((a, b) => a.localeCompare(b)),
    [surveys]
  );

  const filteredSurveys = useMemo(() => {
    const normalizedQuery = query.toLowerCase().trim();

    return surveys.filter((survey) => {
      const haystack = [
        survey.building,
        survey.floor,
        survey.room,
        survey.roomType,
        survey.category,
        survey.notes,
        survey.inspector.fullName,
        survey.inspector.inspectorCode,
        survey.session.code
      ]
        .join(" ")
        .toLowerCase();

      return (
        (status === "ALL" || survey.status === status) &&
        (category === "ALL" || survey.category === category) &&
        (severity === "ALL" || survey.severity === severity) &&
        (priority === "ALL" || survey.priority === priority) &&
        (inspector === "ALL" || survey.inspector.fullName === inspector) &&
        (!surveyDate || survey.session.surveyDate === surveyDate) &&
        haystack.includes(normalizedQuery)
      );
    });
  }, [category, inspector, priority, query, severity, status, surveyDate, surveys]);

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

  const resetFilters = (): void => {
    setStatus("ALL");
    setCategory("ALL");
    setSeverity("ALL");
    setPriority("ALL");
    setInspector("ALL");
    setSurveyDate("");
    setQuery("");
  };

  const runExport = (format: "csv" | "json"): void => {
    exportSurveys(filteredSurveys, format);
    setMessage(`Exported ${filteredSurveys.length} survey(s) as ${format.toUpperCase()}.`);
  };

  return (
    <div className="space-y-5">
      <section>
        <h1 className="text-xl font-bold text-slate-950">Survey history</h1>
        <p className="mt-1 text-sm text-slate-600">
          {filteredSurveys.length} of {surveys.length} local record(s)
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
            placeholder="Search room, inspector, session, notes"
            className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-3 text-sm"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setStatus(item)}
              className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ring-1 ${
                status === item
                  ? "bg-vku-600 text-white ring-vku-600"
                  : "bg-white text-slate-600 ring-slate-200"
              }`}
            >
              {item === "ALL" ? "All statuses" : STATUS_LABELS[item]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <FilterSelect
            label="Category"
            value={category}
            onChange={(value) => setCategory(value as CategoryFilter)}
            options={SURVEY_CATEGORIES}
          />
          <FilterSelect
            label="Severity"
            value={severity}
            onChange={(value) => setSeverity(value as SeverityFilter)}
            options={SEVERITIES}
          />
          <FilterSelect
            label="Priority"
            value={priority}
            onChange={(value) => setPriority(value as PriorityFilter)}
            options={PRIORITIES}
          />
          <FilterSelect
            label="Inspector"
            value={inspector}
            onChange={setInspector}
            options={inspectorOptions}
          />
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">
              Survey date
            </span>
            <input
              type="date"
              value={surveyDate}
              onChange={(event) => setSurveyDate(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reset filters
          </button>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-3">
          <button
            type="button"
            onClick={() => void retrySync()}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            Retry Sync
          </button>
          <button
            type="button"
            onClick={() => runExport("csv")}
            disabled={filteredSurveys.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => runExport("json")}
            disabled={filteredSurveys.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
          >
            <FileJson className="h-4 w-4" aria-hidden="true" />
            Export JSON
          </button>
        </div>
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
            Reset filters or create a new inspection.
          </p>
        </section>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-600">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
      >
        <option value="ALL">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
