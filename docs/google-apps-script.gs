const CONFIG = {
  SECRET: "vku-survey-change-this-secret",
  SURVEY_SHEET: "Surveys",
  AUDIT_SHEET: "AuditLog",
  PHOTO_FOLDER_ID: "1zlXHJdzi2g7GdeCwiGG_xjk14bGyTDJ5"
};

const SURVEY_HEADERS = [
  "Survey UUID", "Version", "Created At", "Updated At", "Sync Status",
  "Review Status", "Inspector Name", "Inspector Code", "Unit", "Role",
  "Inspection Group", "Session Code", "Survey Date", "Campus Zone", "Shift",
  "Building", "Floor", "Room", "Room Type", "Category", "Rating", "Severity",
  "Priority", "Issue Type", "Recommended Action", "Checklist", "Notes",
  "GPS Status", "Latitude", "Longitude", "GPS Accuracy", "GPS Captured At",
  "Photo URL", "Photo Attached", "Assigned To", "Admin Note", "Edited By",
  "Edit Reason", "Synced At"
];

const AUDIT_HEADERS = [
  "Timestamp", "Action", "Survey UUID", "Version", "Review Status", "Actor",
  "Details"
];

function setupSheets() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet_(spreadsheet, CONFIG.SURVEY_SHEET, SURVEY_HEADERS);
  ensureSheet_(spreadsheet, CONFIG.AUDIT_SHEET, AUDIT_HEADERS);
  return json_({ ok: true, message: "VKU Field Survey sheets are ready." });
}

function doGet(event) {
  const action = String(
    event && event.parameter && event.parameter.action
      ? event.parameter.action
      : "health"
  );

  if (action === "health") {
    return json_({ ok: true, service: "VKU Field Survey Google Sheets Bridge" });
  }
  if (!isAuthorized_(event.parameter.secret)) {
    return json_({ ok: false, error: "Unauthorized" });
  }
  if (action === "list") {
    return json_({ ok: true, surveys: readSurveys_() });
  }
  return json_({ ok: false, error: "Unknown action" });
}

function doPost(event) {
  try {
    const body = JSON.parse(event.postData.contents || "{}");
    if (body.action === "health") return json_({ ok: true });
    if (!isAuthorized_(body.secret)) {
      return json_({ ok: false, error: "Unauthorized" });
    }
    if (body.action === "update-review") return updateReview_(body);

    const survey = body.survey || body;
    if (!survey.id) {
      return json_({ ok: false, error: "Survey UUID is required." });
    }
    return upsertSurvey_(survey);
  } catch (error) {
    return json_({ ok: false, error: String(error) });
  }
}

function upsertSurvey_(survey) {
  return withWriteLock_(function() {
    const sheet = ensureSheet_(
      SpreadsheetApp.getActiveSpreadsheet(),
      CONFIG.SURVEY_SHEET,
      SURVEY_HEADERS
    );
    const surveyId = String(survey.id);
    const existingRow = findSurveyRow_(sheet, surveyId);

    if (existingRow > 0) {
      const current = sheet
        .getRange(existingRow, 1, 1, SURVEY_HEADERS.length)
        .getValues()[0];
      const currentVersion = Number(current[1] || 0);
      const incomingVersion = Number(survey.version || 1);

      if (incomingVersion <= currentVersion) {
        return json_({
          ok: true,
          action: "ignored",
          reason: "Older or duplicate version",
          surveyId: surveyId,
          version: currentVersion
        });
      }

      const values = buildSurveyRow_(survey, current);
      sheet.getRange(existingRow, 1, 1, values.length).setValues([values]);
      appendAudit_("UPDATED", survey, values[5], "system", "Updated by UUID and version.");
      return json_({ ok: true, action: "updated", surveyId: surveyId, version: incomingVersion });
    }

    const values = buildSurveyRow_(survey, []);
    sheet.getRange(sheet.getLastRow() + 1, 1, 1, values.length).setValues([values]);
    appendAudit_("CREATED", survey, values[5], "system", "New survey received.");
    return json_({ ok: true, action: "created", surveyId: surveyId, version: Number(survey.version || 1) });
  });
}

function updateReview_(body) {
  return withWriteLock_(function() {
    const surveyId = String(body.surveyId || "");
    const reviewStatus = String(body.reviewStatus || "OPEN");
    const allowed = ["OPEN", "IN_REVIEW", "RESOLVED", "REJECTED"];

    if (!surveyId) return json_({ ok: false, error: "surveyId is required." });
    if (allowed.indexOf(reviewStatus) === -1) {
      return json_({ ok: false, error: "Invalid review status." });
    }

    const sheet = ensureSheet_(
      SpreadsheetApp.getActiveSpreadsheet(),
      CONFIG.SURVEY_SHEET,
      SURVEY_HEADERS
    );
    const rowNumber = findSurveyRow_(sheet, surveyId);
    if (rowNumber < 0) return json_({ ok: false, error: "Survey not found." });

    const row = sheet.getRange(rowNumber, 1, 1, SURVEY_HEADERS.length).getValues()[0];
    row[5] = reviewStatus;
    row[34] = body.assignedTo || row[34] || "";
    row[35] = body.adminNote || row[35] || "";
    sheet.getRange(rowNumber, 1, 1, row.length).setValues([row]);
    appendAudit_("REVIEW_UPDATED", { id: surveyId, version: row[1] }, reviewStatus, body.actor || "admin", body.adminNote || "");
    return json_({ ok: true, action: "review-updated", surveyId: surveyId, reviewStatus: reviewStatus });
  });
}

function buildSurveyRow_(survey, oldValues) {
  const old = function(index) { return oldValues[index] || ""; };
  const photoUrl = materializePhoto_(survey.photo, String(survey.id), old(32));

  return [
    survey.id,
    Number(survey.version || 1),
    survey.createdAt || new Date().toISOString(),
    survey.updatedAt || new Date().toISOString(),
    survey.syncStatus || survey.status || "SYNCED",
    survey.reviewStatus || old(5) || "OPEN",
    survey.inspector && survey.inspector.fullName || "",
    survey.inspector && survey.inspector.inspectorCode || "",
    survey.inspector && survey.inspector.unit || "",
    survey.inspector && survey.inspector.role || "",
    survey.inspector && survey.inspector.inspectionGroup || "",
    survey.session && survey.session.code || "",
    survey.session && survey.session.surveyDate || "",
    survey.session && survey.session.campusZone || "",
    survey.session && survey.session.shift || "",
    survey.building || "",
    survey.floor || "",
    survey.room || "",
    survey.roomType || "",
    survey.category || "",
    survey.rating || "",
    survey.severity || "",
    survey.priority || "",
    survey.issueType || "",
    survey.recommendedAction || "",
    JSON.stringify(survey.checklist || []),
    survey.notes || "",
    survey.gpsStatus || "not_requested",
    survey.gps ? survey.gps.latitude : "",
    survey.gps ? survey.gps.longitude : "",
    survey.gps ? survey.gps.accuracy : "",
    survey.gps ? survey.gps.capturedAt : "",
    photoUrl,
    survey.photo ? "YES" : old(33) || "NO",
    survey.assignedTo || old(34) || "",
    survey.adminNote || old(35) || "",
    survey.editHistory && survey.editHistory.length
      ? survey.editHistory[survey.editHistory.length - 1].editedBy
      : "",
    survey.editHistory && survey.editHistory.length
      ? survey.editHistory[survey.editHistory.length - 1].reason
      : "",
    survey.syncedAt || ""
  ];
}

function materializePhoto_(photo, surveyId, existingUrl) {
  if (!photo) return existingUrl || "";
  const text = String(photo);
  if (text.indexOf("http://") === 0 || text.indexOf("https://") === 0) return text;
  if (!CONFIG.PHOTO_FOLDER_ID || text.indexOf("data:image/") !== 0) return "[PHOTO_ATTACHED]";

  const match = text.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return "[PHOTO_ATTACHED]";
  const extension = match[1].split("/")[1].split("+")[0];
  const blob = Utilities.newBlob(
    Utilities.base64Decode(match[2]),
    match[1],
    "survey-" + surveyId + "-" + Date.now() + "." + extension
  );
  return DriveApp.getFolderById(CONFIG.PHOTO_FOLDER_ID).createFile(blob).getUrl();
}

function readSurveys_() {
  const sheet = ensureSheet_(
    SpreadsheetApp.getActiveSpreadsheet(),
    CONFIG.SURVEY_SHEET,
    SURVEY_HEADERS
  );
  if (sheet.getLastRow() <= 1) return [];

  return sheet
    .getRange(2, 1, sheet.getLastRow() - 1, SURVEY_HEADERS.length)
    .getDisplayValues()
    .filter(function(row) { return row[0]; })
    .map(function(row) {
      const result = {};
      SURVEY_HEADERS.forEach(function(header, index) { result[header] = row[index]; });
      return result;
    });
}

function findSurveyRow_(sheet, surveyId) {
  if (sheet.getLastRow() <= 1) return -1;
  const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getDisplayValues();
  for (let index = 0; index < ids.length; index += 1) {
    if (ids[index][0] === surveyId) return index + 2;
  }
  return -1;
}

function appendAudit_(action, survey, reviewStatus, actor, details) {
  const sheet = ensureSheet_(
    SpreadsheetApp.getActiveSpreadsheet(),
    CONFIG.AUDIT_SHEET,
    AUDIT_HEADERS
  );
  sheet.appendRow([
    new Date().toISOString(), action, survey.id || "", survey.version || "",
    reviewStatus || "", actor || "", details || ""
  ]);
}

function ensureSheet_(spreadsheet, name, headers) {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) sheet = spreadsheet.insertSheet(name);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight("bold")
    .setBackground("#0284c7")
    .setFontColor("#ffffff");
  sheet.setFrozenRows(1);
  return sheet;
}

function withWriteLock_(operation) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    return operation();
  } finally {
    lock.releaseLock();
  }
}

function isAuthorized_(secret) {
  return String(secret || "") === String(CONFIG.SECRET);
}

function json_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
