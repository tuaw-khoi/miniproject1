import { useCallback, useEffect, useState } from "react";
import {
  getCurrentInspectionSession,
  getInspectorProfile,
  putCurrentInspectionSession
} from "../db/indexedDB";
import { contextStore } from "../stores/contextStore";
import type { InspectorProfile } from "../types/profile";
import {
  createInspectionSession,
  type InspectionSession
} from "../types/session";

interface InspectionContextState {
  profile?: InspectorProfile;
  session?: InspectionSession;
  loading: boolean;
  reload: () => Promise<void>;
}

export function useInspectionContext(): InspectionContextState {
  const [profile, setProfile] = useState<InspectorProfile>();
  const [session, setSession] = useState<InspectionSession>();
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [storedProfile, storedSession] = await Promise.all([
      getInspectorProfile(),
      getCurrentInspectionSession()
    ]);
    let activeSession = storedSession;

    if (!activeSession) {
      const now = new Date().toISOString();
      activeSession = await putCurrentInspectionSession(
        createInspectionSession("current-session", now)
      );
    }

    setProfile(storedProfile);
    setSession(activeSession);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
    return contextStore.subscribe(() => void reload());
  }, [reload]);

  return { profile, session, loading, reload };
}
