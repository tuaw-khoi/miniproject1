import { describe, expect, it } from "vitest";
import {
  createEmptyInspectorProfile,
  toInspectorSnapshot
} from "./profile";
import { createInspectionSession, toSessionSnapshot } from "./session";
import {
  createChecklist,
  createEmptySurvey,
  getSurveyValidationErrors,
  isSurveyReady,
  needsAction,
  normalizeSurvey,
  type Survey
} from "./survey";

const now = "2026-09-10T08:00:00.000Z";

function createReadySurvey(): Survey {
  const profile = {
    ...createEmptyInspectorProfile(now),
    fullName: "Nguyen Van A",
    inspectorCode: "24IT001",
    unit: "24IT1",
    inspectionGroup: "Group 03"
  };
  const session = createInspectionSession("session-1", now);

  return {
    ...createEmptySurvey(
      "survey-1",
      now,
      toInspectorSnapshot(profile),
      toSessionSnapshot(session)
    ),
    building: "V",
    floor: "3",
    room: "V301",
    rating: 4,
    notes: "Projector image is slightly dim."
  };
}

describe("survey business rules", () => {
  it("accepts a complete low-severity survey without a photo", () => {
    expect(isSurveyReady(createReadySurvey())).toBe(true);
  });

  it("requires photo evidence for high and critical issues", () => {
    const survey = { ...createReadySurvey(), severity: "High" as const };

    expect(isSurveyReady(survey)).toBe(false);
    expect(getSurveyValidationErrors(survey)).toContain(
      "High and critical issues require photo evidence."
    );
    expect(isSurveyReady({ ...survey, photo: "data:image/jpeg;base64,test" })).toBe(
      true
    );
  });

  it("creates the correct category-specific checklist", () => {
    expect(createChecklist("Electrical").map((item) => item.label)).toEqual([
      "Socket",
      "Light",
      "Switch",
      "Exposed wire",
      "Breaker"
    ]);
  });

  it("normalizes records created by the original schema", () => {
    const legacy = {
      id: "legacy-1",
      building: "A",
      floor: "2",
      room: "A201",
      category: "Hardware",
      rating: 3,
      notes: "Legacy record",
      createdAt: now,
      updatedAt: now,
      status: "SYNCED"
    } as Survey;

    const normalized = normalizeSurvey(legacy);
    expect(normalized.inspector.inspectorCode).toBe("LEGACY");
    expect(normalized.roomType).toBe("Other");
    expect(normalized.checklist).toHaveLength(5);
    expect(normalized.version).toBe(1);
    expect(normalized.reviewStatus).toBe("OPEN");
    expect(normalized.editHistory).toEqual([]);
  });

  it("clears Needs Action after an admin resolves the issue", () => {
    const survey = {
      ...createReadySurvey(),
      severity: "Critical" as const,
      photo: "data:image/jpeg;base64,test"
    };

    expect(needsAction(survey)).toBe(true);
    expect(needsAction({ ...survey, reviewStatus: "RESOLVED" })).toBe(false);
  });
});
