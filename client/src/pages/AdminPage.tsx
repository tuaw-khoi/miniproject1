import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  FileJson,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ReviewStatusBadge } from "../components/ReviewStatusBadge";
import { patchSurvey } from "../db/indexedDB";
import type { NetworkState } from "../hooks/useNetwork";
import {
  getRemoteSurveys,
  updateRemoteSurveyReview
} from "../services/api";
import { exportSurveys } from "../services/exportService";
import { surveyStore } from "../stores/surveyStore";
import {
  REVIEW_STATUSES,
  REVIEW_STATUS_LABELS,
  PRIORITIES,
  SEVERITIES,
  SURVEY_CATEGORIES,
  needsAction,
  type ReviewStatus,
  type Priority,
  type Severity,
  type Survey,
  type SurveyCategory
} from "../types/survey";
import { formatDateTime } from "../utils/format";

type ReviewFilter = "ALL" | ReviewStatus;
type CategoryFilter = "ALL" | SurveyCategory;
type SeverityFilter = "ALL" | Severity;
type PriorityFilter = "ALL" | Priority;

export function AdminPage({ network }: { network: NetworkState }) {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [query, setQuery] = useState("");
  const [review, setReview] = useState<ReviewFilter>("ALL");
  const [category, setCategory] = useState<CategoryFilter>("ALL");
  const [severity, setSeverity] = useState<SeverityFilter>("ALL");
  const [priority, setPriority] = useState<PriorityFilter>("ALL");
  const [building, setBuilding] = useState("ALL");
  const [inspector, setInspector] = useState("ALL");
  const [surveyDate, setSurveyDate] = useState("");

  const load = async (manual = false): Promise<void> => {
    if (!network.connected) {
      setError("Admin records require a network connection.");
      setLoading(false);
      return;
    }

    if (manual) setRefreshing(true);
    else setLoading(true);
    setError(undefined);

    try {
      const remote = await getRemoteSurveys();
      setSurveys(remote);
      setSelectedId((current) =>
        current && remote.some((survey) => survey.id === current)
          ? current
          : remote[0]?.id
      );
      if (manual) setMessage(`Loaded ${remote.length} central record(s).`);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load central surveys."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
  }, [network.connected]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return surveys.filter((survey) => {
      const haystack = [
        survey.id,
        survey.room,
        survey.building,
        survey.inspector.fullName,
        survey.inspector.inspectorCode,
        survey.session.code,
        survey.notes
      ]
        .join(" ")
        .toLowerCase();

      return (
        (review === "ALL" || survey.reviewStatus === review) &&
        (category === "ALL" || survey.category === category) &&
        (severity === "ALL" || survey.severity === severity) &&
        (priority === "ALL" || survey.priority === priority) &&
        (building === "ALL" || survey.building === building) &&
        (inspector === "ALL" || survey.inspector.fullName === inspector) &&
        (!surveyDate || survey.session.surveyDate === surveyDate) &&
        haystack.includes(term)
      );
    });
  }, [building, category, inspector, priority, query, review, severity, surveyDate, surveys]);

  const buildingOptions = useMemo(
    () => Array.from(new Set(surveys.map((survey) => survey.building))).filter(Boolean).sort(),
    [surveys]
  );
  const inspectorOptions = useMemo(
    () => Array.from(new Set(surveys.map((survey) => survey.inspector.fullName))).filter(Boolean).sort(),
    [surveys]
  );

  const metrics = useMemo(
    () => ({
      total: surveys.length,
      open: surveys.filter((survey) => survey.reviewStatus === "OPEN").length,
      inReview: surveys.filter((survey) => survey.reviewStatus === "IN_REVIEW").length,
      critical: surveys.filter((survey) => survey.severity === "Critical").length,
      resolved: surveys.filter((survey) => survey.reviewStatus === "RESOLVED").length
    }),
    [surveys]
  );
  const selected = surveys.find((survey) => survey.id === selectedId);

  const saveReview = async (
    surveyId: string,
    reviewStatus: ReviewStatus,
    assignedTo: string,
    adminNote: string
  ): Promise<void> => {
    const updated = await updateRemoteSurveyReview(surveyId, {
      reviewStatus,
      assignedTo,
      adminNote,
      actor: "VKU Admin"
    });
    await patchSurvey(updated.id, {
      reviewStatus: updated.reviewStatus,
      assignedTo: updated.assignedTo,
      adminNote: updated.adminNote,
      resolvedAt: updated.resolvedAt,
      updatedAt: updated.updatedAt
    });
    surveyStore.notify();
    setSurveys((current) =>
      current.map((survey) => (survey.id === updated.id ? updated : survey))
    );
    setMessage(`Review for ${updated.room} updated to ${REVIEW_STATUS_LABELS[updated.reviewStatus]}.`);
  };

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-vku-600" aria-hidden="true" />
            <h1 className="text-xl font-bold text-slate-950">Admin review</h1>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Central records synchronized by field inspectors
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={refreshing || !network.connected}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
          Refresh
        </button>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Metric label="Total" value={metrics.total} tone="text-slate-900" />
        <Metric label="Open" value={metrics.open} tone="text-amber-700" />
        <Metric label="In review" value={metrics.inReview} tone="text-sky-700" />
        <Metric label="Critical" value={metrics.critical} tone="text-rose-700" />
        <Metric label="Resolved" value={metrics.resolved} tone="text-emerald-700" />
      </section>

      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
          {message}
        </p>
      ) : null}

      <section className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search UUID, room, inspector or session"
            className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-3 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <FilterSelect label="Filter review status" value={review} options={REVIEW_STATUSES} onChange={(value) => setReview(value as ReviewFilter)} />
          <FilterSelect label="Category" value={category} options={SURVEY_CATEGORIES} onChange={(value) => setCategory(value as CategoryFilter)} />
          <FilterSelect label="Severity" value={severity} options={SEVERITIES} onChange={(value) => setSeverity(value as SeverityFilter)} />
          <FilterSelect label="Priority" value={priority} options={PRIORITIES} onChange={(value) => setPriority(value as PriorityFilter)} />
          <FilterSelect label="Building" value={building} options={buildingOptions} onChange={setBuilding} />
          <FilterSelect label="Inspector" value={inspector} options={inspectorOptions} onChange={setInspector} />
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Survey date</span>
            <input type="date" value={surveyDate} onChange={(event) => setSurveyDate(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
          </label>
          <button
            type="button"
            onClick={() => {
              setReview("ALL");
              setCategory("ALL");
              setSeverity("ALL");
              setPriority("ALL");
              setBuilding("ALL");
              setInspector("ALL");
              setSurveyDate("");
              setQuery("");
            }}
            className="mt-5 h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
          >
            Reset filters
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
          <p className="text-sm text-slate-600">{filtered.length} matching record(s)</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => exportSurveys(filtered, "csv")} disabled={!filtered.length} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">
              <Download className="h-4 w-4" aria-hidden="true" /> CSV
            </button>
            <button type="button" onClick={() => exportSurveys(filtered, "json")} disabled={!filtered.length} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">
              <FileJson className="h-4 w-4" aria-hidden="true" /> JSON
            </button>
          </div>
        </div>
      </section>

      {loading ? (
        <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading central surveys...</p>
      ) : filtered.length ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="space-y-3">
            {filtered.map((survey) => (
              <button
                key={survey.id}
                type="button"
                onClick={() => setSelectedId(survey.id)}
                className={`w-full rounded-lg border bg-white p-4 text-left shadow-sm transition ${selectedId === survey.id ? "border-vku-400 ring-2 ring-vku-100" : "border-slate-200 hover:border-vku-200"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-950">{survey.building} / {survey.floor} / {survey.room}</p>
                    <p className="mt-1 text-sm text-slate-600">{survey.category} · {survey.severity} · Rating {survey.rating}/5</p>
                  </div>
                  <ReviewStatusBadge status={survey.reviewStatus} />
                </div>
                <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                  <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                  {survey.inspector.fullName} · {survey.session.surveyDate}
                </p>
              </button>
            ))}
          </section>
          {selected ? (
            <AdminDetail
              key={`${selected.id}-${selected.version}-${selected.reviewStatus}-${selected.assignedTo ?? ""}-${selected.adminNote ?? ""}`}
              survey={selected}
              onSave={saveReview}
            />
          ) : null}
        </div>
      ) : !error ? (
        <section className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-600">
          No central surveys match the current filters.
        </section>
      ) : null}
    </div>
  );
}

function AdminDetail({
  survey,
  onSave
}: {
  survey: Survey;
  onSave: (
    id: string,
    status: ReviewStatus,
    assignedTo: string,
    adminNote: string
  ) => Promise<void>;
}) {
  const [reviewStatus, setReviewStatus] = useState(survey.reviewStatus);
  const [assignedTo, setAssignedTo] = useState(survey.assignedTo ?? "");
  const [adminNote, setAdminNote] = useState(survey.adminNote ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const save = async (): Promise<void> => {
    setSaving(true);
    setError(undefined);
    try {
      await onSave(survey.id, reviewStatus, assignedTo, adminNote);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Review update failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <aside className="self-start rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Selected inspection</p>
          <h2 className="mt-1 text-lg font-bold text-slate-950">{survey.room}</h2>
          <p className="text-sm text-slate-600">Version {survey.version} · {formatDateTime(survey.updatedAt)}</p>
        </div>
        {needsAction(survey) ? <AlertTriangle className="h-5 w-5 text-rose-600" aria-label="Needs action" /> : <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-label="Normal condition" />}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <AdminValue label="Inspector" value={survey.inspector.fullName} />
        <AdminValue label="Session" value={survey.session.code} />
        <AdminValue label="Category" value={survey.category} />
        <AdminValue label="Severity" value={survey.severity} />
        <AdminValue label="Priority" value={survey.priority} />
        <AdminValue label="Action" value={survey.recommendedAction} />
      </dl>

      <div className="mt-4 border-t border-slate-200 pt-4">
        <p className="text-xs font-semibold uppercase text-slate-500">Inspector notes</p>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{survey.notes}</p>
      </div>

      {survey.photo ? (
        <a href={survey.photo} target="_blank" rel="noreferrer" className="mt-4 block">
          <img src={survey.photo} alt="Inspection evidence" className="h-44 w-full rounded-lg border border-slate-200 object-cover" />
        </a>
      ) : null}

      <div className="mt-5 space-y-3 border-t border-slate-200 pt-4">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-600">Review status</span>
          <select value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value as ReviewStatus)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            {REVIEW_STATUSES.map((status) => <option key={status} value={status}>{REVIEW_STATUS_LABELS[status]}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-600">Assigned to</span>
          <input value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} placeholder="Facilities team or staff name" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-600">Admin note</span>
          <textarea value={adminNote} onChange={(event) => setAdminNote(event.target.value)} rows={4} placeholder="Review result and follow-up action" className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
        </label>
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        <button type="button" onClick={() => void save()} disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-vku-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
          <Eye className="h-4 w-4" aria-hidden="true" />
          {saving ? "Saving review..." : "Save review"}
        </button>
      </div>
    </aside>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm last:col-span-2 sm:last:col-span-1">
      <p className={`text-2xl font-bold ${tone}`}>{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase text-slate-500">{label}</p>
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
        <option value="ALL">All</option>
        {options.map((option) => <option key={option} value={option}>{option.replace("_", " ")}</option>)}
      </select>
    </label>
  );
}

function AdminValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-900">{value}</dd>
    </div>
  );
}
