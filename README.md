# VKU Field Survey

Offline-first facility inspection and review system for VKU campus. Inspectors can work without connectivity, revise submitted records and synchronize later; administrators review the central queue backed by Google Sheets and Drive evidence links.

[Live PWA](https://miniproject1-client.vercel.app) | [API Health](https://miniproject1-client.vercel.app/api/health) | [Download Android APK](https://github.com/tuaw-khoi/miniproject1/releases/download/apk-latest/vku-field-survey.apk)

## Core Features

- Installable React, TypeScript, Vite and Tailwind PWA.
- Cache-first application shell with standalone manifest and VKU theme.
- IndexedDB stores for surveys, inspector profile and inspection sessions.
- Six-step form: assignment, location, checklist, assessment, evidence and review.
- Autosaved drafts with refresh/restart recovery.
- Building, floor, custom room and room-type facility context.
- Hardware, Projector, AC, Electrical and Furniture checklists.
- Condition rating, severity, priority, issue type and recommended action.
- Mandatory notes plus mandatory photo for High/Critical issues.
- Native Capacitor GPS and Camera with browser fallbacks.
- Offline queue with UUIDs, sequential retry, duplicate-run lock and idempotent API.
- Autosaved survey edits with stable UUIDs, version history and automatic re-queue.
- Separate sync and review workflows (`OPEN`, `IN_REVIEW`, `RESOLVED`, `REJECTED`).
- Admin dashboard with central filters, evidence detail, assignment and resolution notes.
- Admin access gate with server-validated key for PWA and Capacitor builds.
- Google Sheets UUID/version upsert, AuditLog and optional Google Drive photo storage.
- Search/filter by status, category, severity, priority, inspector and date.
- Local CSV/JSON export that remains available offline.
- Operational dashboard for today's records, pending/failed sync, critical issues and low ratings.

## Architecture

```text
React PWA / Capacitor
  -> IndexedDB v3 (surveys, profile, sessions, surveyEdits)
  -> local-first submit (PENDING_SYNC)
  -> sequential sync service / Background Sync
  -> Express / Vercel REST API
  -> Google Apps Script -> Sheets + Drive
```

Every survey stores immutable `inspector` and `session` snapshots. Changing the local profile later does not rewrite existing inspection records. IndexedDB version 3 normalizes older records and stores in-progress edits separately, so refreshing an edit cannot damage the last submitted version.

## Project Structure

```text
client/src/pages/       Home, Profile, Survey workflow, History, Detail and Admin
client/src/db/          IndexedDB schema and local repository functions
client/src/services/    API, sync, camera, GPS, network and export services
client/src/types/       Strongly typed profile, session and survey contracts
client/src/sw.ts        App-shell cache and Background Sync handler
client/android/         Capacitor Android project
server/src/             Express API, validation, version upsert and Sheets bridge
docs/                   Report, implementation checklist and screenshots
```

## Requirements

- Node.js 20 or newer
- npm 10 or newer
- Chromium for the optional browser E2E check
- Java 21 and Android SDK for local APK builds
- GitHub Actions can build the debug APK when the local Android SDK is unavailable

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Local URLs:

- PWA: `http://localhost:5173`
- API: `http://localhost:4000`

Open Profile first and enter the inspector identity and active session. Profile/session data remains local to the current device. Photos are resized and stored as Base64 data URLs in IndexedDB; the Apps Script bridge moves synchronized evidence to Drive and stores its URL in Sheets.

Google Sheets is optional for local development. To enable the central Admin data source, copy `docs/google-apps-script.gs` into a Sheet-bound Apps Script project, run `setupSheets`, deploy it as a Web App, and set `SHEETS_WEBHOOK_URL` plus `SHEETS_WEBHOOK_SECRET`. The deployed Vercel function already has the course-demo webhook fallback; production projects should use environment variables instead. The demo Admin key is `VKU-ADMIN-2026`; set `ADMIN_ACCESS_KEY` in `.env`/Vercel to replace it.

## Commands

```bash
npm run dev             # client and API development servers
npm test                # client business/IndexedDB tests and server validation tests
npm run check           # typecheck and production build for both workspaces
npm run build:pwa       # production PWA build
npm run test:e2e -w client  # real Chromium workflow and screenshots
npm run android:sync    # build web assets and sync Capacitor Android
npm run android:open    # open the Android project
npm run android:apk     # create app-debug.apk when Android SDK is configured
```

The E2E command uses a temporary API data directory. It verifies profile persistence, online submit, offline submit, automatic reconnect sync, GPS, CSV export and service-worker offline boot without changing `server/data/surveys.json`. Set `CHROMIUM_PATH` if Chromium is installed outside the common Linux paths.

Production PWA and Capacitor builds default to `https://miniproject1-client.vercel.app`; set `VITE_API_URL` only when building against another HTTPS backend. Development mode continues to use `http://localhost:4000`.

## API

```text
GET  /health
GET  /api/surveys
GET  /api/surveys/:id
POST /api/surveys
PUT  /api/surveys/:id
POST /api/admin/verify
GET  /api/admin/surveys          (X-Admin-Key required)
PATCH /api/admin/surveys/:id/review (X-Admin-Key required)
```

`POST` creates version 1, while `PUT` accepts a newer version for the same UUID. Equal/older retries return the existing record. Admin review routes require the server-validated access key and change only administrator-owned review fields. All endpoints validate the business payload before persistence.

## Manual Acceptance Test

1. Complete Profile and confirm it remains after refresh.
2. Create a partial inspection, reload, and confirm the draft is restored.
3. Submit normally and confirm the record becomes `SYNCED`.
4. Disable network, submit three surveys, and confirm all become `PENDING_SYNC`.
5. Restore network and confirm the queue synchronizes sequentially.
6. Stop the API and confirm a failed upload remains local as `SYNC_FAILED`.
7. Set severity to High or Critical and confirm notes/photo rules are enforced.
8. Edit a synced survey, refresh during editing, save and confirm the UUID stays the same while version increments.
9. Open Admin, confirm a wrong key is rejected, then enter `VKU-ADMIN-2026`.
10. Assign the record, add a note and move it to In Review/Resolved.
11. Confirm one UUID row and a new audit event appear in Google Sheets; photo evidence opens from Drive.
12. Export filtered History/Admin data as CSV and JSON.
13. Reopen the installed PWA offline after one successful online visit.
14. On Android, verify native Camera, Network and Geolocation permissions/plugins plus the Admin key gate.

## Android

The PWA and APK share the same React source. Android permissions include Camera, coarse location, fine location and Internet. After configuring `ANDROID_HOME` or `client/android/local.properties`, run:

```bash
npm run android:sync
npm run android:apk
```

Expected debug APK: `client/android/app/build/outputs/apk/debug/app-debug.apk`.

### Build APK Without Local Android SDK

The included GitHub Actions workflow builds the APK in the cloud on every push to `main`. It embeds the production API URL, signs the debug build and publishes a stable download link:

<https://github.com/tuaw-khoi/miniproject1/releases/download/apk-latest/vku-field-survey.apk>

The same build is also retained for 14 days as the `vku-field-survey-debug-apk` artifact under GitHub Actions. A manual workflow run can override the backend with the `api_url` input or repository variable/secret `VITE_API_URL`.

To install on a phone, open the download link in Chrome, allow that browser to install unknown apps when Android prompts, then open `vku-field-survey.apk`. The debug signature is suitable for course submission and physical-device testing; it is not a Play Store release signature.

## Deployment

- Live PWA: <https://miniproject1-client.vercel.app>
- API health check: <https://miniproject1-client.vercel.app/api/health>
- Public source: <https://github.com/tuaw-khoi/miniproject1>

The connected Vercel project uses `client/` as its Root Directory. `client/vercel.json` preserves React Router deep links, serves the Vite PWA, and routes `/api/*` to the same-origin Vercel Function. Google Sheets is the durable central review store; Vercel `/tmp` is only a request-level fallback. IndexedDB remains the durable device source of truth, so a server or Sheets failure cannot remove local drafts and queued surveys.

## Submission Assets

- Technical report: `docs/VKU_FIELD_SURVEY_REPORT.pdf`
- Report sources: `docs/TECHNICAL_REPORT.md` and `docs/TECHNICAL_REPORT.html`
- Screenshots: `docs/screenshots/`
- Live PWA, public repository and APK download links are listed at the top of this README.
