import { useCallback, useEffect, useState } from "react";
import {
  getSurveyCounts,
  listSurveys
} from "../db/indexedDB";
import { surveyStore } from "../stores/surveyStore";
import type { Survey, SurveyCounts } from "../types/survey";

const EMPTY_COUNTS: SurveyCounts = {
  total: 0,
  today: 0,
  draft: 0,
  pending: 0,
  synced: 0,
  failed: 0,
  critical: 0,
  lowRating: 0
};

export function useSurveys(): {
  surveys: Survey[];
  counts: SurveyCounts;
  loading: boolean;
  reload: () => Promise<void>;
} {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [counts, setCounts] = useState<SurveyCounts>(EMPTY_COUNTS);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [nextSurveys, nextCounts] = await Promise.all([
      listSurveys(),
      getSurveyCounts()
    ]);

    setSurveys(nextSurveys);
    setCounts(nextCounts);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
    return surveyStore.subscribe(() => {
      void reload();
    });
  }, [reload]);

  return {
    surveys,
    counts,
    loading,
    reload
  };
}
