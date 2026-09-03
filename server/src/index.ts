import cors from "cors";
import express from "express";
import morgan from "morgan";
import { readSurveys, upsertSurveyIdempotent } from "./storage.js";
import { validateSurveyPayload } from "./types.js";

const PORT = Number(process.env.PORT ?? 4000);
const app = express();

app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(morgan("dev"));

app.get("/health", (_request, response) => {
  response.json({
    ok: true,
    name: "VKU Field Survey API"
  });
});

app.get("/api/surveys", async (_request, response, next) => {
  try {
    const surveys = await readSurveys();
    response.json(
      surveys.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    );
  } catch (error) {
    next(error);
  }
});

app.get("/api/surveys/:id", async (request, response, next) => {
  try {
    const surveys = await readSurveys();
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
});

app.post("/api/surveys", async (request, response, next) => {
  try {
    const result = validateSurveyPayload(request.body);

    if (!result.valid || !result.survey) {
      response.status(400).json({
        error: result.error ?? "Invalid survey payload."
      });
      return;
    }

    const saved = await upsertSurveyIdempotent(result.survey);
    response.status(saved.created ? 201 : 200).json(saved.survey);
  } catch (error) {
    next(error);
  }
});

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
