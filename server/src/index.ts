import cors from "cors";
import express from "express";
import morgan from "morgan";
import { isValidAdminAccessKey } from "./adminAuth.js";
import {
  isSheetBridgeConfigured,
  listSurveysFromSheet,
  updateReviewInSheet,
  upsertSurveyToSheet
} from "./sheetBridge.js";
import {
  readSurveys,
  updateSurveyReview,
  upsertSurveyIdempotent
} from "./storage.js";
import { validateReviewUpdate, validateSurveyPayload } from "./types.js";

const PORT = Number(process.env.PORT ?? 4000);
const app = express();

app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(morgan("dev"));

app.get("/health", (_request, response) => {
  response.json({
    ok: true,
    name: "VKU Field Survey API",
    sheetsConfigured: isSheetBridgeConfigured()
  });
});

const requireAdminAccess: express.RequestHandler = (request, response, next) => {
  if (!isValidAdminAccessKey(request.header("x-admin-key"))) {
    response.status(401).json({ error: "Valid admin access key is required." });
    return;
  }

  next();
};

app.post("/api/admin/verify", (request, response) => {
  if (!isValidAdminAccessKey(request.body?.key)) {
    response.status(401).json({ error: "Invalid admin access key." });
    return;
  }

  response.json({ ok: true });
});

const listSurveys: express.RequestHandler = async (_request, response, next) => {
  try {
    const surveys = (await listSurveysFromSheet()) ?? (await readSurveys());
    response.json(
      surveys.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    );
  } catch (error) {
    next(error);
  }
};

app.get("/api/surveys", listSurveys);
app.get("/api/admin/surveys", requireAdminAccess, listSurveys);

const getSurvey: express.RequestHandler = async (request, response, next) => {
  try {
    const surveys = (await listSurveysFromSheet()) ?? (await readSurveys());
    const survey = surveys.find((item) => item.id === request.params.id);

    if (!survey) {
      response.status(404).json({
        error: "Survey not found."
      });
      return;
    }

    response.json(survey);
  } catch (error) {
    next(error);
  }
};

app.get("/api/surveys/:id", getSurvey);
app.get("/api/admin/surveys/:id", requireAdminAccess, getSurvey);

const saveSurvey: express.RequestHandler = async (request, response, next) => {
  try {
    const result = validateSurveyPayload(request.body);

    if (!result.valid || !result.survey) {
      response.status(400).json({
        error: result.error ?? "Invalid survey payload."
      });
      return;
    }

    if (request.params.id && request.params.id !== result.survey.id) {
      response.status(400).json({ error: "Route id must match survey UUID." });
      return;
    }

    const saved = await upsertSurveyIdempotent(result.survey);
    await upsertSurveyToSheet(saved.survey);
    response
      .status(request.method === "POST" && saved.created ? 201 : 200)
      .json(saved.survey);
  } catch (error) {
    next(error);
  }
};

app.post("/api/surveys", saveSurvey);
app.put("/api/surveys/:id", saveSurvey);

const reviewSurvey: express.RequestHandler = async (request, response, next) => {
  try {
    const result = validateReviewUpdate(request.body);
    if (!result.valid || !result.update) {
      response.status(400).json({
        error: result.error ?? "Invalid review update."
      });
      return;
    }

    const surveyId = String(request.params.id);

    const localSurvey = await updateSurveyReview(
      surveyId,
      result.update
    );
    await updateReviewInSheet(surveyId, result.update);

    const remoteSurvey = localSurvey
      ? undefined
      : (await listSurveysFromSheet())?.find(
          (survey) => survey.id === surveyId
        );
    const survey = localSurvey ?? remoteSurvey;

    if (!survey) {
      response.status(404).json({ error: "Survey not found." });
      return;
    }

    response.json({
      ...survey,
      reviewStatus: result.update.reviewStatus,
      assignedTo: result.update.assignedTo || undefined,
      adminNote: result.update.adminNote || undefined,
      resolvedAt:
        result.update.reviewStatus === "RESOLVED"
          ? survey.resolvedAt ?? new Date().toISOString()
          : undefined
    });
  } catch (error) {
    next(error);
  }
};

app.patch("/api/surveys/:id/review", requireAdminAccess, reviewSurvey);
app.patch("/api/admin/surveys/:id/review", requireAdminAccess, reviewSurvey);

app.use(
  (
    error: unknown,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction
  ) => {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";

    response.status(500).json({
      error: message
    });
  }
);

app.listen(PORT, () => {
  console.log(`VKU Field Survey API listening on http://localhost:${PORT}`);
});
