# VKU Field Survey

Offline-first facility inspection system for VKU campus. Inspectors can maintain a local identity, work in an inspection session, complete category-specific checklists, attach photo/GPS evidence, submit with no network, and automatically synchronize queued records later.

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
- Search/filter by status, category, severity, priority, inspector and date.
- Local CSV/JSON export that remains available offline.
- Operational dashboard for today's records, pending/failed sync, critical issues and low ratings.

## Architecture

```text
React PWA / Capacitor
  -> IndexedDB (surveys, profile, sessions)
  -> local-first submit (PENDING_SYNC)
  -> sequential sync service / Background Sync
  -> Express REST API
  -> JSON storage, idempotent by survey UUID
```

Every survey stores immutable `inspector` and `session` snapshots. Changing the local profile later does not rewrite existing inspection records. IndexedDB version 2 normalizes records created by the original schema so local drafts and queued surveys are preserved.

## Project Structure

```text
client/src/pages/       Home, Profile, New Survey, History and Detail
client/src/db/          IndexedDB schema and local repository functions
client/src/services/    API, sync, camera, GPS, network and export services
client/src/types/       Strongly typed profile, session and survey contracts
client/src/sw.ts        App-shell cache and Background Sync handler
client/android/         Capacitor Android project
server/src/             Express API, validation and idempotent storage
docs/                   Report, implementation checklist and screenshots
```

## Requirements

- Node.js 20 or newer
- npm 10 or newer
- Chromium for the optional browser E2E check
- Android Studio and Android SDK for APK builds
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

Open Profile first and enter the inspector identity and active session. Profile/session data remains local to the current device. Photos are resized and stored as Base64 data URLs in IndexedDB; synchronized records keep the evidence inline in server JSON storage.

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

## API

```text
GET  /health
GET  /api/surveys
GET  /api/surveys/:id
POST /api/surveys
```

`POST /api/surveys` validates the complete business payload and is idempotent. Retrying the same UUID returns the existing record instead of creating a duplicate.

## Manual Acceptance Test

1. Complete Profile and confirm it remains after refresh.
2. Create a partial inspection, reload, and confirm the draft is restored.
3. Submit normally and confirm the record becomes `SYNCED`.
4. Disable network, submit three surveys, and confirm all become `PENDING_SYNC`.
5. Restore network and confirm the queue synchronizes sequentially.
6. Stop the API and confirm a failed upload remains local as `SYNC_FAILED`.
7. Set severity to High or Critical and confirm notes/photo rules are enforced.
8. Export filtered History as CSV and JSON while offline.
9. Reopen the installed PWA offline after one successful online visit.
10. On Android, verify native Camera, Network and Geolocation permissions/plugins.

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

The connected Vercel project uses `client/` as its Root Directory. `client/vercel.json` preserves React Router deep links, serves the Vite PWA, and routes `/api/*` to the same-origin Vercel Function. The deployed demo API uses temporary function JSON storage; IndexedDB remains the durable source of truth on each device, so a server cold start cannot remove local drafts or synchronized survey history.

## Submission Assets

- Technical report: `docs/VKU_FIELD_SURVEY_REPORT.pdf`
- Report sources: `docs/TECHNICAL_REPORT.md` and `docs/TECHNICAL_REPORT.html`
- Screenshots: `docs/screenshots/`
- Live PWA, public repository and APK download links are listed at the top of this README.
