import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  LocateFixed,
  MapPin,
  RefreshCw,
  Save,
  UserRound
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PhotoPicker } from "../components/PhotoPicker";
import { RatingInput } from "../components/RatingInput";
import { StatusBadge } from "../components/StatusBadge";
import type { NetworkState } from "../hooks/useNetwork";
import { useSurveyDraft } from "../hooks/useSurveyDraft";
import { captureCurrentGps } from "../services/geolocationService";
import { submitSurvey } from "../services/syncService";
import { isInspectorProfileComplete } from "../types/profile";
import { isInspectionSessionComplete } from "../types/session";
import {
  BUILDINGS,
  CHECKLIST_STATUSES,
  CHECKLIST_STATUS_LABELS,
  FLOORS,
  ISSUE_TYPES,
  PRIORITIES,
  RECOMMENDED_ACTIONS,
  ROOM_TYPES,
  SEVERITIES,
  SURVEY_CATEGORIES,
  createChecklist,
  getSurveyValidationErrors,
  isSurveyReady,
  type ChecklistItem,
  type ChecklistStatus,
  type Survey
} from "../types/survey";

const STEPS = [
  "Assignment",
  "Location",
  "Checklist",
  "Assessment",
  "Evidence",
  "Review"
];

interface NewSurveyPageProps {
  network: NetworkState;
}

export function NewSurveyPage({ network }: NewSurveyPageProps) {
  const navigate = useNavigate();
  const { draft, loading, saveState, updateDraft, replaceDraft, resetDraft } =
    useSurveyDraft();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string>();

  const validationErrors = useMemo(
    () => (draft ? getSurveyValidationErrors(draft) : []),
    [draft]
  );
  const ready = useMemo(() => (draft ? isSurveyReady(draft) : false), [draft]);

  if (loading || !draft) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Loading local draft...
      </div>
    );
  }

  const submit = async (): Promise<void> => {
    if (!ready) {
      setMessage(validationErrors[0] ?? "Complete all required fields.");
      return;
    }

    setSubmitting(true);
    setMessage(undefined);

    try {
      const result = await submitSurvey(draft, network.connected);
      replaceDraft(result.survey);
      resetDraft();
      navigate(`/surveys/${result.survey.id}`, {
        state: { message: result.message }
      });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The survey could not be saved locally."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-950">New inspection</h1>
            <p className="mt-1 text-sm text-slate-600">
              Draft autosaves locally while you work.
            </p>
          </div>
          <StatusBadge status={draft.status} />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Save className="h-4 w-4" aria-hidden="true" />
          {saveState === "saving"
            ? "Saving draft..."
            : saveState === "saved"
              ? "Draft saved"
              : "Ready"}
        </div>
      </section>

      <div className="grid grid-cols-6 gap-2">
        {STEPS.map((label, index) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(index)}
            title={label}
            aria-label={`Open ${label} step`}
            className={`h-2 rounded-full transition ${
              index <= step ? "bg-vku-600" : "bg-slate-200"
            }`}
          />
        ))}
      </div>

      <p className="text-xs font-semibold uppercase text-slate-500">
        Step {step + 1} of {STEPS.length}: {STEPS[step]}
      </p>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        {step === 0 ? <AssignmentStep draft={draft} /> : null}
        {step === 1 ? (
          <LocationStep draft={draft} onChange={updateDraft} />
        ) : null}
        {step === 2 ? (
          <ChecklistStep draft={draft} onChange={updateDraft} />
        ) : null}
        {step === 3 ? (
          <AssessmentStep draft={draft} onChange={updateDraft} />
        ) : null}
        {step === 4 ? (
          <EvidenceStep draft={draft} onChange={updateDraft} />
        ) : null}
        {step === 5 ? (
          <ReviewStep
            draft={draft}
            ready={ready}
            validationErrors={validationErrors}
          />
        ) : null}
      </section>

      {message ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {message}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep((current) => Math.max(0, current - 1))}
          disabled={step === 0 || submitting}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </button>

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() =>
              setStep((current) => Math.min(STEPS.length - 1, current + 1))
            }
            className="inline-flex items-center gap-2 rounded-lg bg-vku-600 px-4 py-3 text-sm font-semibold text-white hover:bg-vku-700"
          >
            Next
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void submit()}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-vku-600 px-4 py-3 text-sm font-semibold text-white hover:bg-vku-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            {submitting ? "Submitting..." : "Submit"}
          </button>
        )}
      </div>
    </div>
  );
}

interface StepProps {
  draft: Survey;
  onChange: (patch: Partial<Survey>) => void;
}

function AssignmentStep({ draft }: { draft: Survey }) {
  const profileReady = isInspectorProfileComplete(draft.inspector);
  const sessionReady = isInspectionSessionComplete(draft.session);

  return (
    <div className="space-y-4">
      <StepTitle title="Inspector and session" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <UserRound className="h-4 w-4 text-vku-600" aria-hidden="true" />
            {draft.inspector.fullName || "Profile incomplete"}
          </div>
          <p className="mt-2 text-sm text-slate-600">
            {draft.inspector.inspectorCode || "No ID"} · {draft.inspector.role}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {draft.inspector.unit || "No class/unit"} · {draft.inspector.inspectionGroup || "No group"}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-sm font-semibold text-slate-900">
            {draft.session.code || "Session incomplete"}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {draft.session.surveyDate || "No date"} · {draft.session.shift}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {draft.session.campusZone || "No campus/zone"}
          </p>
        </div>
      </div>

      {!profileReady || !sessionReady ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <p>Complete the local profile and session before submitting.</p>
          <Link
            to="/profile"
            className="mt-2 inline-flex font-semibold text-amber-900 underline"
          >
            Open Profile
          </Link>
        </div>
      ) : (
        <p className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Assignment snapshot is ready and will remain with this survey.
        </p>
      )}
    </div>
  );
}

function LocationStep({ draft, onChange }: StepProps) {
  return (
    <div className="space-y-4">
      <StepTitle title="Facility location" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Building" required>
          <select
            value={draft.building}
            onChange={(event) => onChange({ building: event.target.value })}
            className={inputClass}
          >
            <option value="">Select building</option>
            {BUILDINGS.map((building) => (
              <option key={building} value={building}>
                Building {building}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Floor" required>
          <select
            value={draft.floor}
            onChange={(event) => onChange({ floor: event.target.value })}
            className={inputClass}
          >
            <option value="">Select floor</option>
            {FLOORS.map((floor) => (
              <option key={floor} value={floor}>
                Floor {floor}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Room number / custom room" required>
          <input
            value={draft.room}
            onChange={(event) =>
              onChange({ room: event.target.value.toUpperCase() })
            }
            placeholder="V301 or Basement electrical room"
            className={`${inputClass} uppercase`}
          />
        </Field>
        <Field label="Room type" required>
          <select
            value={draft.roomType}
            onChange={(event) =>
              onChange({ roomType: event.target.value as Survey["roomType"] })
            }
            className={inputClass}
          >
            {ROOM_TYPES.map((roomType) => (
              <option key={roomType} value={roomType}>
                {roomType}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </div>
  );
}

function ChecklistStep({ draft, onChange }: StepProps) {
  const changeCategory = (category: Survey["category"]): void => {
    if (category === draft.category) return;
    onChange({ category, checklist: createChecklist(category) });
  };

  const updateChecklistItem = (
    itemId: string,
    status: ChecklistStatus
  ): void => {
    onChange({
      checklist: draft.checklist.map((item) =>
        item.id === itemId ? { ...item, status } : item
      )
    });
  };

  return (
    <div className="space-y-5">
      <StepTitle title="Category checklist" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {SURVEY_CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => changeCategory(category)}
            className={`min-h-11 rounded-lg border px-3 py-2 text-left text-sm font-semibold ${
              draft.category === category
                ? "border-vku-500 bg-vku-50 text-vku-700"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="divide-y divide-slate-200 border-y border-slate-200">
        {draft.checklist.map((item) => (
          <ChecklistRow
            key={item.id}
            item={item}
            onChange={(status) => updateChecklistItem(item.id, status)}
          />
        ))}
      </div>
    </div>
  );
}

function ChecklistRow({
  item,
  onChange
}: {
  item: ChecklistItem;
  onChange: (status: ChecklistStatus) => void;
}) {
  return (
    <div className="py-3">
      <p className="mb-2 text-sm font-semibold text-slate-800">{item.label}</p>
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
        {CHECKLIST_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => onChange(status)}
            className={`min-h-9 rounded-md px-1 text-xs font-semibold ${
              item.status === status
                ? status === "OK"
                  ? "bg-emerald-600 text-white"
                  : status === "ISSUE"
                    ? "bg-rose-600 text-white"
                    : "bg-white text-slate-700 shadow-sm"
                : "text-slate-500"
            }`}
          >
            {CHECKLIST_STATUS_LABELS[status]}
          </button>
        ))}
      </div>
    </div>
  );
}

function AssessmentStep({ draft, onChange }: StepProps) {
  const evidenceRequired =
    draft.severity === "High" || draft.severity === "Critical";

  return (
    <div className="space-y-5">
      <StepTitle title="Condition assessment" />
      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">
          Condition rating <span className="text-rose-600">*</span>
        </p>
        <RatingInput
          value={draft.rating}
          onChange={(rating) => onChange({ rating })}
        />
        <p className="mt-2 text-sm text-slate-500">
          1 means urgent repair; 5 means good condition.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField
          label="Severity"
          value={draft.severity}
          options={SEVERITIES}
          onChange={(value) => onChange({ severity: value })}
        />
        <SelectField
          label="Priority"
          value={draft.priority}
          options={PRIORITIES}
          onChange={(value) => onChange({ priority: value })}
        />
        <SelectField
          label="Issue type"
          value={draft.issueType}
          options={ISSUE_TYPES}
          onChange={(value) => onChange({ issueType: value })}
        />
        <SelectField
          label="Recommended action"
          value={draft.recommendedAction}
          options={RECOMMENDED_ACTIONS}
          onChange={(value) => onChange({ recommendedAction: value })}
        />
      </div>

      {evidenceRequired ? (
        <p className="flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          High and critical issues require notes and a photo before submission.
        </p>
      ) : null}
    </div>
  );
}

function EvidenceStep({ draft, onChange }: StepProps) {
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsMessage, setGpsMessage] = useState<string>();

  const captureGps = async (): Promise<void> => {
    setGpsBusy(true);
    setGpsMessage(undefined);
    const result = await captureCurrentGps();

    if (result.status === "captured" && result.evidence) {
      onChange({ gpsStatus: "captured", gps: result.evidence });
      setGpsMessage("GPS evidence captured.");
    } else {
      onChange({ gpsStatus: "unavailable", gps: undefined });
      setGpsMessage(result.error ?? "GPS is unavailable.");
    }

    setGpsBusy(false);
  };

  return (
    <div className="space-y-5">
      <StepTitle title="Notes and evidence" />
      <Field label="Defect notes" required>
        <textarea
          value={draft.notes}
          onChange={(event) => onChange({ notes: event.target.value })}
          placeholder="Describe observed condition, defect and affected equipment..."
          rows={5}
          className={`${inputClass} resize-none`}
        />
      </Field>

      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">
          Photo evidence
          {draft.severity === "High" || draft.severity === "Critical" ? (
            <span className="ml-1 text-rose-600">*</span>
          ) : null}
        </p>
        <PhotoPicker
          photo={draft.photo}
          onChange={(photo) => onChange({ photo })}
        />
      </div>

      <div className="border-t border-slate-200 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">GPS evidence</p>
            <p className="mt-1 text-xs text-slate-500">
              Optional; failed capture does not block offline submission.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void captureGps()}
            disabled={gpsBusy}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-vku-700 disabled:opacity-60"
          >
            {gpsBusy ? (
              <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <LocateFixed className="h-4 w-4" aria-hidden="true" />
            )}
            {draft.gps ? "Recapture GPS" : "Capture GPS"}
          </button>
        </div>

        {draft.gps ? (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {draft.gps.latitude.toFixed(6)}, {draft.gps.longitude.toFixed(6)} ·
            accuracy {Math.round(draft.gps.accuracy)} m
          </p>
        ) : draft.gpsStatus === "unavailable" ? (
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            GPS unavailable. The survey can still be submitted.
          </p>
        ) : null}

        {gpsMessage ? (
          <p className="mt-2 text-xs text-slate-600">{gpsMessage}</p>
        ) : null}
      </div>
    </div>
  );
}

function ReviewStep({
  draft,
  ready,
  validationErrors
}: {
  draft: Survey;
  ready: boolean;
  validationErrors: string[];
}) {
  const issueCount = draft.checklist.filter(
    (item) => item.status === "ISSUE"
  ).length;

  return (
    <div className="space-y-5">
      <StepTitle title="Review inspection" />
      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <ReviewItem
          label="Inspector"
          value={draft.inspector.fullName || "Missing"}
        />
        <ReviewItem label="Session" value={draft.session.code || "Missing"} />
        <ReviewItem
          label="Location"
          value={
            draft.building && draft.floor && draft.room
              ? `${draft.building} / Floor ${draft.floor} / ${draft.room}`
              : "Missing"
          }
        />
        <ReviewItem label="Room type" value={draft.roomType} />
        <ReviewItem label="Category" value={draft.category} />
        <ReviewItem
          label="Checklist"
          value={`${issueCount} issue(s) of ${draft.checklist.length} items`}
        />
        <ReviewItem
          label="Rating"
          value={draft.rating ? `${draft.rating}/5` : "Missing"}
        />
        <ReviewItem
          label="Classification"
          value={`${draft.severity} · ${draft.priority}`}
        />
        <ReviewItem label="Issue type" value={draft.issueType} />
        <ReviewItem label="Action" value={draft.recommendedAction} />
        <ReviewItem
          label="Photo"
          value={draft.photo ? "Attached" : "Not attached"}
        />
        <ReviewItem
          label="GPS"
          value={
            draft.gpsStatus === "captured"
              ? "Captured"
              : draft.gpsStatus === "unavailable"
                ? "Unavailable"
                : "Not requested"
          }
        />
      </dl>

      <div>
        <p className="text-xs font-semibold uppercase text-slate-500">Notes</p>
        <p className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
          {draft.notes || "Missing"}
        </p>
      </div>

      <div
        className={`rounded-lg px-3 py-3 text-sm ${
          ready
            ? "bg-emerald-50 text-emerald-800"
            : "bg-amber-50 text-amber-800"
        }`}
      >
        <p className="font-semibold">
          {ready ? "Ready to submit." : "Submission checklist"}
        </p>
        {!ready ? (
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {validationErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm";

function StepTitle({ title }: { title: string }) {
  return <h2 className="text-base font-semibold text-slate-950">{title}</h2>;
}

function Field({
  label,
  required = false,
  children
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-slate-700">
        {label}
        {required ? <span className="ml-1 text-rose-600">*</span> : null}
      </span>
      {children}
    </label>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  return (
    <Field label={label} required>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className={inputClass}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </Field>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-900">{value}</dd>
    </div>
  );
}
