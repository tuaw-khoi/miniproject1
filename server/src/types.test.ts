import assert from "node:assert/strict";
import test from "node:test";
import { validateReviewUpdate, validateSurveyPayload } from "./types.js";

const validSurvey = {
  id: "survey-1",
  inspector: {
    profileId: "profile-1",
    fullName: "Nguyen Van A",
    inspectorCode: "24IT001",
    unit: "24IT1",
    phone: "0905000000",
    role: "Student Auditor",
    inspectionGroup: "Group 03"
  },
  session: {
    sessionId: "session-1",
    code: "VKU-20260910",
    surveyDate: "2026-09-10",
    campusZone: "VKU Main Campus",
    shift: "Morning"
  },
  building: "V",
  floor: "3",
  room: "V301",
  roomType: "Classroom",
  category: "Projector",
  checklist: [{ id: "projector-1", label: "Power", status: "OK" }],
  rating: 4,
  severity: "Low",
  priority: "Normal",
  issueType: "Performance",
  recommendedAction: "Monitor",
  notes: "Image is slightly dim.",
  gpsStatus: "not_requested",
  createdAt: "2026-09-10T08:00:00.000Z",
  updatedAt: "2026-09-10T08:00:00.000Z",
  status: "PENDING_SYNC"
};

test("accepts a complete professional survey", () => {
  const result = validateSurveyPayload(validSurvey);
  assert.equal(result.valid, true);
  assert.equal(result.survey?.inspector.inspectorCode, "24IT001");
});

test("rejects high severity without photo evidence", () => {
  const result = validateSurveyPayload({ ...validSurvey, severity: "High" });
  assert.equal(result.valid, false);
  assert.match(result.error ?? "", /photo evidence/i);
});

test("accepts unavailable GPS without coordinates", () => {
  const result = validateSurveyPayload({
    ...validSurvey,
    gpsStatus: "unavailable"
  });
  assert.equal(result.valid, true);
});

test("normalizes legacy submissions to version one and open review", () => {
  const result = validateSurveyPayload(validSurvey);
  assert.equal(result.survey?.version, 1);
  assert.equal(result.survey?.reviewStatus, "OPEN");
  assert.deepEqual(result.survey?.editHistory, []);
});

test("validates admin review updates", () => {
  const accepted = validateReviewUpdate({
    reviewStatus: "IN_REVIEW",
    assignedTo: "Facilities Team",
    adminNote: "Inspect projector lamp.",
    actor: "VKU Admin"
  });
  const rejected = validateReviewUpdate({ reviewStatus: "DONE" });

  assert.equal(accepted.valid, true);
  assert.equal(accepted.update?.assignedTo, "Facilities Team");
  assert.equal(rejected.valid, false);
});
