import { useCallback, useEffect, useState } from "react";
import {
  commitSurveyEdit,
  deleteSurveyEditDraft,
  getSurvey,
  getSurveyEditDraft,
  putSurveyEditDraft
} from "../db/indexedDB";
import { surveyStore } from "../stores/surveyStore";
import type { Survey, SurveyEditDraft } from "../types/survey";

interface UseSurveyEditDraftResult {
  draft: SurveyEditDraft | undefined;
  loading: boolean;
  saveState: "idle" | "saving" | "saved";
  updateSurvey: (patch: Partial<Survey>) => void;
  updateReason: (reason: string) => void;
  commit: () => Promise<Survey>;
  cancel: () => Promise<void>;
}

export function useSurveyEditDraft(
  surveyId: string | undefined
): UseSurveyEditDraftResult {
  const [draft, setDraft] = useState<SurveyEditDraft>();
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle"
  );

  useEffect(() => {
    let active = true;

    const load = async (): Promise<void> => {
      if (!surveyId) {
        setLoading(false);
        return;
      }

      const [survey, storedEdit] = await Promise.all([
        getSurvey(surveyId),
        getSurveyEditDraft(surveyId)
      ]);

      if (!active) return;

      if (!survey) {
        setLoading(false);
        return;
      }

      const editDraft =
        storedEdit && storedEdit.originalVersion === survey.version
          ? storedEdit
          : {
              id: survey.id,
              surveyId: survey.id,
              originalVersion: survey.version,
              survey,
              reason: "",
              updatedAt: new Date().toISOString()
            };

      setDraft(editDraft);
      setLoading(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, [surveyId]);

  useEffect(() => {
    if (!draft || loading) return undefined;

    setSaveState("saving");
    const timeout = window.setTimeout(() => {
      void putSurveyEditDraft(draft).then((saved) => {
        setDraft((current) =>
          current && current.surveyId === saved.surveyId
            ? { ...current, updatedAt: saved.updatedAt }
            : current
        );
        setSaveState("saved");
      });
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [draft?.reason, draft?.survey, draft?.surveyId, loading]);

  const updateSurvey = useCallback((patch: Partial<Survey>) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            survey: {
              ...current.survey,
              ...patch,
              updatedAt: new Date().toISOString()
            }
          }
        : current
    );
  }, []);

  const updateReason = useCallback((reason: string) => {
    setDraft((current) => (current ? { ...current, reason } : current));
  }, []);

  const commit = useCallback(async (): Promise<Survey> => {
    if (!draft) throw new Error("Survey edit is not loaded.");
    if (!draft.reason.trim()) throw new Error("Enter a reason for this change.");

    const survey = await commitSurveyEdit(draft);
    setDraft(undefined);
    surveyStore.notify();
    return survey;
  }, [draft]);

  const cancel = useCallback(async (): Promise<void> => {
    if (!surveyId) return;
    await deleteSurveyEditDraft(surveyId);
    setDraft(undefined);
  }, [surveyId]);

  return {
    draft,
    loading,
    saveState,
    updateSurvey,
    updateReason,
    commit,
    cancel
  };
}
