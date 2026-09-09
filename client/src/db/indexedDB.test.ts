import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import {
  getCurrentInspectionSession,
  getInspectorProfile,
  getSurvey,
  listSyncQueue,
  putCurrentInspectionSession,
  putDraftSurvey,
  putInspectorProfile,
  putSurvey
} from "./indexedDB";
import {
  createEmptyInspectorProfile,
  toInspectorSnapshot
} from "../types/profile";
import { createInspectionSession, toSessionSnapshot } from "../types/session";
import { createEmptySurvey } from "../types/survey";

const now = "2026-09-10T08:00:00.000Z";

describe("IndexedDB offline records", () => {
  it("persists profile/session and keeps survey snapshots immutable", async () => {
    const profile = {
      ...createEmptyInspectorProfile(now),
      fullName: "Nguyen Van A",
      inspectorCode: "24IT001",
      unit: "24IT1",
      inspectionGroup: "Group 03"
    };
    const firstSession = createInspectionSession("session-a", now);
    const secondSession = createInspectionSession(
      "session-b",
      "2026-09-10T09:00:00.000Z"
    );

    await putInspectorProfile(profile);
    await putCurrentInspectionSession(firstSession);
    await putCurrentInspectionSession(secondSession);

    expect((await getInspectorProfile()).fullName).toBe("Nguyen Van A");
    expect((await getCurrentInspectionSession())?.id).toBe("session-b");

    const survey = {
      ...createEmptySurvey(
        "snapshot-survey",
        now,
        toInspectorSnapshot(profile),
        toSessionSnapshot(firstSession)
      ),
      building: "V",
      floor: "3",
      room: "V301",
      rating: 4,
      notes: "Snapshot test",
      status: "PENDING_SYNC" as const
    };

    await putSurvey(survey);
    await putInspectorProfile({ ...profile, fullName: "Tran Thi B" });

    expect((await getSurvey(survey.id))?.inspector.fullName).toBe("Nguyen Van A");
  });

  it("returns pending work in creation order", async () => {
    const profile = await getInspectorProfile();
    const session = await getCurrentInspectionSession();
    expect(session).toBeDefined();
    if (!session) return;

    const later = {
      ...createEmptySurvey(
        "queue-later",
        "2026-09-10T11:00:00.000Z",
        toInspectorSnapshot(profile),
        toSessionSnapshot(session)
      ),
      status: "PENDING_SYNC" as const
    };
    const earlier = {
      ...createEmptySurvey(
        "queue-earlier",
        "2026-09-10T10:00:00.000Z",
        toInspectorSnapshot(profile),
        toSessionSnapshot(session)
      ),
      status: "PENDING_SYNC" as const
    };

    await putSurvey(later);
    await putSurvey(earlier);
    const ids = (await listSyncQueue())
      .filter((survey) => survey.id.startsWith("queue-"))
      .map((survey) => survey.id);

    expect(ids).toEqual(["queue-earlier", "queue-later"]);
  });

  it("never lets a late draft autosave overwrite a submitted record", async () => {
    const profile = await getInspectorProfile();
    const session = await getCurrentInspectionSession();
    expect(session).toBeDefined();
    if (!session) return;

    const draft = createEmptySurvey(
      "autosave-race",
      now,
      toInspectorSnapshot(profile),
      toSessionSnapshot(session)
    );
    await putSurvey({ ...draft, status: "SYNCED" });
    await putDraftSurvey({ ...draft, notes: "Late draft write" });

    expect((await getSurvey(draft.id))?.status).toBe("SYNCED");
  });
});
