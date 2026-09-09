import type { Survey } from "../types/survey";

export type ExportFormat = "csv" | "json";

export function exportSurveys(
  surveys: Survey[],
  format: ExportFormat
): void {
  const date = new Date().toLocaleDateString("en-CA");
  const content =
    format === "json"
      ? JSON.stringify(surveys, null, 2)
      : createSurveyCsv(surveys);
  const mimeType =
    format === "json"
      ? "application/json;charset=utf-8"
      : "text/csv;charset=utf-8";
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `vku-surveys-${date}.${format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function createSurveyCsv(surveys: Survey[]): string {
  const headers = [
    "id",
    "version",
    "status",
    "review_status",
    "created_at",
    "session_code",
    "survey_date",
    "campus_zone",
    "shift",
    "inspector_name",
    "inspector_id",
    "unit",
    "inspection_group",
    "building",
    "floor",
    "room",
    "room_type",
    "category",
    "rating",
    "severity",
    "priority",
    "issue_type",
    "recommended_action",
    "assigned_to",
    "admin_note",
    "checklist",
    "notes",
    "photo_attached",
    "gps_status",
    "latitude",
    "longitude",
    "accuracy_m"
  ];

  const rows = surveys.map((survey) => [
    survey.id,
    String(survey.version),
    survey.status,
    survey.reviewStatus,
    survey.createdAt,
    survey.session.code,
    survey.session.surveyDate,
    survey.session.campusZone,
    survey.session.shift,
    survey.inspector.fullName,
    survey.inspector.inspectorCode,
    survey.inspector.unit,
    survey.inspector.inspectionGroup,
    survey.building,
    survey.floor,
    survey.room,
    survey.roomType,
    survey.category,
    String(survey.rating),
    survey.severity,
    survey.priority,
    survey.issueType,
    survey.recommendedAction,
    survey.assignedTo ?? "",
    survey.adminNote ?? "",
    survey.checklist.map((item) => `${item.label}: ${item.status}`).join("; "),
    survey.notes,
    survey.photo ? "Yes" : "No",
    survey.gpsStatus,
    survey.gps ? String(survey.gps.latitude) : "",
    survey.gps ? String(survey.gps.longitude) : "",
    survey.gps ? String(survey.gps.accuracy) : ""
  ]);

  return [headers, ...rows]
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\r\n");
}

function escapeCsvValue(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}
