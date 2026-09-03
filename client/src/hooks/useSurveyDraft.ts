import { useCallback, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { getLatestDraft, putSurvey } from "../db/indexedDB";
import { surveyStore } from "../stores/surveyStore";
import {
  createEmptySurvey,
  type Survey
} from "../types/survey";

interface UseSurveyDraftResult {
  draft: Survey | undefined;
  loading: boolean;
  saveState: "idle" | "saving" | "saved";
  updateDraft: (patch: Partial<Survey>) => void;
  replaceDraft: (survey: Survey) => void;
  resetDraft: () => void;
}

function newDraft(): Survey {
  const now = new Date().toISOString();
  return createEmptySurvey(uuidv4(), now);
}

export function useSurveyDraft(): UseSurveyDraftResult {
  const [draft, setDraft] = useState<Survey>();
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle"
  );

  useEffect(() => {
    let active = true;

    void getLatestDraft().then((storedDraft) => {
      if (!active) {
        return;
      }

      setDraft(storedDraft ?? newDraft());
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!draft || loading || draft.status !== "DRAFT") {
      return undefined;
    }

    setSaveState("saving");
    const timeout = window.setTimeout(() => {
      void putSurvey({
        ...draft,
        updatedAt: new Date().toISOString()
      }).then(() => {
        surveyStore.notify();
        setSaveState("saved");
      });
    }, 350);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [draft, loading]);

  const updateDraft = useCallback((patch: Partial<Survey>) => {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        ...patch,
        status: "DRAFT",
        updatedAt: new Date().toISOString()
      };
    });
  }, []);

  const replaceDraft = useCallback((survey: Survey) => {
    setDraft(survey);
  }, []);

  const resetDraft = useCallback(() => {
    setDraft(newDraft());
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
