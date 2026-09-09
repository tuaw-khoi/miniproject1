import { CheckCircle2, Plus, Save, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  getCurrentInspectionSession,
  getInspectorProfile,
  putCurrentInspectionSession,
  putInspectorProfile
} from "../db/indexedDB";
import { contextStore } from "../stores/contextStore";
import {
  INSPECTOR_ROLES,
  isInspectorProfileComplete,
  type InspectorProfile
} from "../types/profile";
import {
  createInspectionSession,
  INSPECTION_SHIFTS,
  isInspectionSessionComplete,
  type InspectionSession
} from "../types/session";

export function ProfilePage() {
  const [profile, setProfile] = useState<InspectorProfile>();
  const [session, setSession] = useState<InspectionSession>();
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle"
  );

  useEffect(() => {
    let active = true;

    const load = async (): Promise<void> => {
      const [storedProfile, storedSession] = await Promise.all([
        getInspectorProfile(),
        getCurrentInspectionSession()
      ]);
      const now = new Date().toISOString();

      if (!active) return;
      setProfile(storedProfile);
      setSession(
        storedSession ?? createInspectionSession("current-session", now)
      );
      setLoading(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (loading || !profile || !session) return undefined;

    setSaveState("saving");
    const timeout = window.setTimeout(() => {
      void Promise.all([
        putInspectorProfile(profile),
        putCurrentInspectionSession(session)
      ]).then(() => {
        setSaveState("saved");
        contextStore.notify();
      });
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [loading, profile, session]);

  const contextReady = useMemo(
    () =>
      Boolean(
        profile &&
          session &&
          isInspectorProfileComplete(profile) &&
          isInspectionSessionComplete(session)
      ),
    [profile, session]
  );

  if (loading || !profile || !session) {
    return (
      <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Loading local profile...
      </p>
    );
  }

  const updateProfile = (patch: Partial<InspectorProfile>): void => {
    setProfile((current) =>
      current
        ? { ...current, ...patch, updatedAt: new Date().toISOString() }
        : current
    );
  };

  const updateSession = (patch: Partial<InspectionSession>): void => {
    setSession((current) =>
      current
        ? { ...current, ...patch, updatedAt: new Date().toISOString() }
        : current
    );
  };

  const startNewSession = (): void => {
    const now = new Date().toISOString();
    setSession(createInspectionSession(uuidv4(), now));
  };

  return (
    <div className="space-y-5">
      <section className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-950">Inspector profile</h1>
          <p className="mt-1 text-sm text-slate-600">
            Identity and active session are stored only on this device.
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Save className="h-4 w-4" aria-hidden="true" />
          {saveState === "saving"
            ? "Saving..."
            : saveState === "saved"
              ? "Saved"
              : "Local"}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <UserRound className="h-5 w-5 text-vku-600" aria-hidden="true" />
          <h2 className="text-base font-semibold text-slate-950">
            Inspector identity
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full name" required>
            <input
              value={profile.fullName}
              onChange={(event) => updateProfile({ fullName: event.target.value })}
              placeholder="Nguyen Van A"
              className={inputClass}
            />
          </Field>
          <Field label="Student / staff ID" required>
            <input
              value={profile.inspectorCode}
              onChange={(event) =>
                updateProfile({ inspectorCode: event.target.value.toUpperCase() })
              }
              placeholder="24IT001"
              className={`${inputClass} uppercase`}
            />
          </Field>
          <Field label="Class / unit" required>
            <input
              value={profile.unit}
              onChange={(event) => updateProfile({ unit: event.target.value })}
              placeholder="24IT1 / Facilities Office"
              className={inputClass}
            />
          </Field>
          <Field label="Phone">
            <input
              type="tel"
              value={profile.phone}
              onChange={(event) => updateProfile({ phone: event.target.value })}
              placeholder="0905 000 000"
              className={inputClass}
            />
          </Field>
          <Field label="Role" required>
            <select
              value={profile.role}
              onChange={(event) =>
                updateProfile({
                  role: event.target.value as InspectorProfile["role"]
                })
              }
              className={inputClass}
            >
              {INSPECTOR_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Inspection group" required>
            <input
              value={profile.inspectionGroup}
              onChange={(event) =>
                updateProfile({ inspectionGroup: event.target.value })
              }
              placeholder="Group 03"
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-950">
              Active inspection session
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              New surveys use a snapshot of this session.
            </p>
          </div>
          <button
            type="button"
            onClick={startNewSession}
            title="Start new session"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-vku-700"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Session code" required>
            <input
              value={session.code}
              onChange={(event) =>
                updateSession({ code: event.target.value.toUpperCase() })
              }
              className={`${inputClass} uppercase`}
            />
          </Field>
          <Field label="Survey date" required>
            <input
              type="date"
              value={session.surveyDate}
              onChange={(event) =>
                updateSession({ surveyDate: event.target.value })
              }
              className={inputClass}
            />
          </Field>
          <Field label="Campus / zone" required>
            <input
              value={session.campusZone}
              onChange={(event) =>
                updateSession({ campusZone: event.target.value })
              }
              placeholder="VKU Main Campus"
              className={inputClass}
            />
          </Field>
          <Field label="Shift" required>
            <select
              value={session.shift}
              onChange={(event) =>
                updateSession({
                  shift: event.target.value as InspectionSession["shift"]
                })
              }
              className={inputClass}
            >
              {INSPECTION_SHIFTS.map((shift) => (
                <option key={shift} value={shift}>
                  {shift}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <p
        className={`flex items-start gap-2 rounded-lg px-3 py-3 text-sm ${
          contextReady
            ? "bg-emerald-50 text-emerald-800"
            : "bg-amber-50 text-amber-800"
        }`}
      >
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        {contextReady
          ? "Profile and active session are ready for new inspections."
          : "Complete all required identity and session fields before submitting."}
      </p>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm";

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
