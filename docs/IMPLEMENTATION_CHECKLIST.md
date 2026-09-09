# VKU Field Survey - Implementation Checklist

## Completed Locally

- [x] React TypeScript Vite Tailwind PWA and Express API workspaces.
- [x] Standalone manifest, Workbox app-shell cache and 192/512 icons.
- [x] Home, Profile, New Survey, History and Detail screens.
- [x] IndexedDB v2 stores for surveys, profile and inspection sessions.
- [x] Backward normalization for survey records stored by IndexedDB v1.
- [x] Local inspector profile and active session autosave.
- [x] Immutable inspector/session snapshots in every new survey.
- [x] Six-step mobile-first inspection form and draft recovery.
- [x] Room type, custom room and five category-specific checklists.
- [x] Severity, priority, issue type and recommended action.
- [x] Required photo validation for High/Critical issues.
- [x] Photo and GPS evidence with browser/native implementations.
- [x] Offline-safe submit and sequential sync queue.
- [x] Startup, network event, Background Sync and manual retry triggers.
- [x] Idempotent `POST /api/surveys` and nested server validation.
- [x] Dashboard, Needs Action badges and professional History filters.
- [x] Offline CSV/JSON export.
- [x] Capacitor Camera, Network and Geolocation dependencies/permissions.
- [x] README, updated screenshots and 4-page report source/PDF.

## Verified

- [x] `npm test`: 3 server tests and 7 client tests pass.
- [x] `npm run check`: server/client typecheck and production builds pass.
- [x] Chromium E2E profile persistence and immutable local setup.
- [x] Chromium E2E online submission becomes `SYNCED`.
- [x] Chromium E2E offline submission becomes `PENDING_SYNC`.
- [x] Chromium E2E network restoration automatically syncs the queue.
- [x] Chromium E2E GPS capture and offline CSV export.
- [x] Chromium E2E PWA close/reopen while offline.
- [x] E2E uses temporary API storage and does not alter repository survey data.
- [x] `npm run android:sync` copies the final PWA and registers native plugins.
- [x] GitHub Actions workflow can build and upload a debug APK without local Android SDK.
- [x] Vercel Function, Capacitor CORS and SPA deep-link routing pass local smoke tests.
- [x] Android assets embed the public HTTPS API instead of `localhost`.
- [x] Public GitHub repository: `https://github.com/tuaw-khoi/miniproject1`.
- [x] Connected Vercel production URL: `https://miniproject1-client.vercel.app`.
- [x] Public Vercel API health, CORS, POST, duplicate UUID and detail GET verified.
- [x] Production service worker controls the PWA and reloads it offline.
- [x] Local Java 21/SDK build creates a valid signed 7.1 MB debug APK.
- [x] GitHub Actions Java 21 build, artifact upload and APK release pass.
- [x] Public APK downloaded and verified with APK Signature Scheme v1/v2.

## Needs External Setup

- [ ] Install the APK on an emulator/device and manually verify Camera, Network and GPS permissions.
- [ ] Manually repeat the canonical offline/reconnect flow on the physical phone.
