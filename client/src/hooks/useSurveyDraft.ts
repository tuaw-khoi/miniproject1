import { useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  getCurrentInspectionSession,
  getInspectorProfile,
  getLatestDraft,
  putCurrentInspectionSession,
  putDraftSurvey
} from "../db/indexedDB";
import { surveyStore } from "../stores/surveyStore";
import {
  isInspectorProfileComplete,
  toInspectorSnapshot,
  type InspectorProfile
} from "../types/profile";
import {
  createInspectionSession,
  isInspectionSessionComplete,
  toSessionSnapshot,
  type InspectionSession
} from "../types/session";
import { createEmptySurvey, type Survey } from "../types/survey";

interface UseSurveyDraftResult {
  draft: Survey | undefined;
  loading: boolean;
  saveState: "idle" | "saving" | "saved";
  updateDraft: (patch: Partial<Survey>) => void;
  replaceDraft: (survey: Survey) => void;
  resetDraft: () => void;
}

function newDraft(
  profile: InspectorProfile,
  session: InspectionSession
): Survey {
  const now = new Date().toISOString();
  return createEmptySurvey(
    uuidv4(),
    now,
    toInspectorSnapshot(profile),
    toSessionSnapshot(session)
  );
}

export function useSurveyDraft(): UseSurveyDraftResult {
  const [draft, setDraft] = useState<Survey>();
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle"
  );
  const contextRef = useRef<{
    profile: InspectorProfile;
    session: InspectionSession;
  } | undefined>(undefined);

  useEffect(() => {
    let active = true;

    const load = async (): Promise<void> => {
      const [storedDraft, profile, storedSession] = await Promise.all([
        getLatestDraft(),
        getInspectorProfile(),
        getCurrentInspectionSession()
      ]);
      const now = new Date().toISOString();
      const session =
        storedSession ??
        (await putCurrentInspectionSession(
          createInspectionSession("current-session", now)
        ));

      if (!active) return;

      contextRef.current = { profile, session };
      const restoredDraft = storedDraft
        ? {
            ...storedDraft,
            inspector:
              !isInspectorProfileComplete(storedDraft.inspector) &&
              isInspectorProfileComplete(profile)
                ? toInspectorSnapshot(profile)
                : storedDraft.inspector,
            session:
              !isInspectionSessionComplete(storedDraft.session) &&
              isInspectionSessionComplete(session)
                ? toSessionSnapshot(session)
                : storedDraft.session
          }
        : undefined;

      setDraft(restoredDraft ?? newDraft(profile, session));
      setLoading(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!draft || loading || draft.status !== "DRAFT") return undefined;

    setSaveState("saving");
    const timeout = window.setTimeout(() => {
      void putDraftSurvey({
        ...draft,
        updatedAt: new Date().toISOString()
      }).then(() => {
        surveyStore.notify();
        setSaveState("saved");
      });
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [draft, loading]);

  const updateDraft = useCallback((patch: Partial<Survey>) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            ...patch,
            status: "DRAFT",
            updatedAt: new Date().toISOString()
          }
        : current
    );
  }, []);

  const replaceDraft = useCallback((survey: Survey) => setDraft(survey), []);

  const resetDraft = useCallback(() => {
    const context = contextRef.current;
    if (context) setDraft(newDraft(context.profile, context.session));
    setSaveState("idle");
  }, []);

  return {
    draft,
    loading,
    saveState,
    updateDraft,
    replaceDraft,
    resetDraft
  };
}
