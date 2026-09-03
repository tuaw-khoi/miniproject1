import { ArrowLeft, ArrowRight, Check, Save } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PhotoPicker } from "../components/PhotoPicker";
import { RatingInput } from "../components/RatingInput";
import { StatusBadge } from "../components/StatusBadge";
import type { NetworkState } from "../hooks/useNetwork";
import { useSurveyDraft } from "../hooks/useSurveyDraft";
import { submitSurvey } from "../services/syncService";
import {
  BUILDINGS,
  FLOORS,
  SURVEY_CATEGORIES,
  isSurveyReady,
  type Survey
} from "../types/survey";

const STEPS = [
  "Location",
  "Equipment",
  "Condition",
  "Notes",
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
      setMessage("Please complete all required fields before submitting.");
      return;
    }

    setSubmitting(true);
    setMessage(undefined);

    try {
      const result = await submitSurvey(draft, network.connected);
      replaceDraft(result.survey);
      resetDraft();
      navigate(`/surveys/${result.survey.id}`, {
        state: {
          message: result.message
        }
      });
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

      <div className="grid grid-cols-5 gap-2">
        {STEPS.map((label, index) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(index)}
            title={label}
            className={`h-2 rounded-full transition ${
              index <= step ? "bg-vku-600" : "bg-slate-200"
            }`}
          />
        ))}
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        {step === 0 ? (
          <LocationStep draft={draft} onChange={updateDraft} />
        ) : null}
        {step === 1 ? (
          <CategoryStep draft={draft} onChange={updateDraft} />
        ) : null}
        {step === 2 ? (
          <ConditionStep draft={draft} onChange={updateDraft} />
        ) : null}
        {step === 3 ? (
          <NotesStep draft={draft} onChange={updateDraft} />
        ) : null}
        {step === 4 ? <ReviewStep draft={draft} ready={ready} /> : null}
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

function LocationStep({ draft, onChange }: StepProps) {
  return (
    <div className="space-y-4">
      <StepTitle title="Location" />

      <Field label="Building">
        <select
          value={draft.building}
          onChange={(event) => onChange({ building: event.target.value })}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm"
        >
          <option value="">Select building</option>
          {BUILDINGS.map((building) => (
            <option key={building} value={building}>
              Building {building}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Floor">
        <select
          value={draft.floor}
          onChange={(event) => onChange({ floor: event.target.value })}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm"
        >
          <option value="">Select floor</option>
          {FLOORS.map((floor) => (
            <option key={floor} value={floor}>
              Floor {floor}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Room number">
        <input
          value={draft.room}
          onChange={(event) =>
            onChange({
              room: event.target.value.toUpperCase()
            })
          }
          placeholder="V301"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm uppercase"
        />
      </Field>
    </div>
  );
}

function CategoryStep({ draft, onChange }: StepProps) {
  return (
    <div className="space-y-4">
      <StepTitle title="Equipment" />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {SURVEY_CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => onChange({ category })}
            className={`rounded-lg border px-4 py-3 text-left text-sm font-semibold ${
              draft.category === category
                ? "border-vku-500 bg-vku-50 text-vku-700"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
}

function ConditionStep({ draft, onChange }: StepProps) {
  return (
    <div className="space-y-4">
      <StepTitle title="Condition" />
      <RatingInput
        value={draft.rating}
        onChange={(rating) => onChange({ rating })}
      />
      <p className="text-sm text-slate-500">
        1 means urgent repair, 5 means good condition.
      </p>
    </div>
  );
}

function NotesStep({ draft, onChange }: StepProps) {
  return (
    <div className="space-y-4">
      <StepTitle title="Notes and photo" />
      <Field label="Defect notes">
        <textarea
          value={draft.notes}
          onChange={(event) => onChange({ notes: event.target.value })}
          placeholder="Describe the issue clearly..."
          rows={5}
          className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm"
        />
      </Field>
      <PhotoPicker
        photo={draft.photo}
        onChange={(photo) => onChange({ photo })}
      />
    </div>
  );
}

function ReviewStep({
  draft,
  ready
}: {
  draft: Survey;
  ready: boolean;
}) {
  return (
    <div className="space-y-4">
      <StepTitle title="Review" />
      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <ReviewItem label="Building" value={draft.building || "Missing"} />
        <ReviewItem label="Floor" value={draft.floor || "Missing"} />
        <ReviewItem label="Room" value={draft.room || "Missing"} />
        <ReviewItem label="Category" value={draft.category} />
        <ReviewItem
          label="Rating"
          value={draft.rating ? `${draft.rating}/5` : "Missing"}
        />
        <ReviewItem label="Photo" value={draft.photo ? "Attached" : "Optional"} />
      </dl>
      <div>
        <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
          Notes
        </p>
        <p className="mt-1 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
          {draft.notes || "Missing"}
        </p>
      </div>
      <p
        className={`rounded-lg px-3 py-2 text-sm ${
          ready
            ? "bg-emerald-50 text-emerald-700"
            : "bg-amber-50 text-amber-700"
        }`}
      >
        {ready
          ? "Ready to submit."
          : "Complete the missing required fields before submit."}
      </p>
    </div>
  );
}

function StepTitle({ title }: { title: string }) {
  return <h2 className="text-base font-semibold text-slate-950">{title}</h2>;
}

function Field({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}

function ReviewItem({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <dt className="text-xs font-semibold uppercase tracking-normal text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 font-semibold text-slate-900">{value}</dd>
    </div>
  );
}
