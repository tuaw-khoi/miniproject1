# VKU Field Survey - Short Technical Report

## 1. Problem And Objective

VKU facility inspectors work in classrooms, laboratories, basements and remote buildings where Wi-Fi or mobile data may be unavailable. A network-dependent form risks losing observations, photos and unfinished work. VKU Field Survey therefore treats local storage as the source of truth: the app boots offline after its first visit, autosaves drafts, accepts offline submissions and synchronizes later.

The extended version adds a professional inspection and review workflow while preserving the original rubric. It uses local inspector/session context, category checklists, issue classification, GPS/photo evidence, editable versioned records, an Admin review dashboard and Google Sheets/Drive central reporting. A server-validated Admin access key gate protects the review screen in both the PWA and Capacitor APK; full account authentication remains outside this mini-project.

## 2. Feature Checklist

- [x] Standalone PWA manifest, theme `#0284c7`, 192px and 512px icons.
- [x] Workbox application-shell precache and offline boot.
- [x] Six-step mobile inspection form with 1-5 star rating.
- [x] IndexedDB draft autosave and recovery after refresh/restart.
- [x] Local profile and active session with immutable survey snapshots.
- [x] Facility context and category-specific inspection checklists.
- [x] Severity, priority, issue type and recommended action.
- [x] High/Critical notes and photo validation.
- [x] Photo and GPS evidence with web/native fallbacks.
- [x] UUID-based offline queue and sequential automatic synchronization.
- [x] History filters, Needs Action status, dashboard and CSV/JSON export.
- [x] Stable-UUID edits, local edit recovery and version history.
- [x] Admin assignment, notes and Open/In Review/Resolved/Rejected workflow.
- [x] Server-validated Admin access key gate for the PWA and APK.
- [x] Google Sheets UUID/version upsert, Drive photo URL and AuditLog.
- [x] REST API with idempotent POST, revision PUT and review PATCH.
- [x] Capacitor project and Camera, Network and Geolocation integration.
- [x] Java 21 Android APK build and public GitHub release download.
- [x] Public HTTPS PWA and same-origin Vercel API deployment.
- [ ] Final physical-device Camera/Network/GPS verification.

## 3. Architecture And Data

The repository is an npm workspace. `client/` contains the shared React PWA/Capacitor code; `server/` contains the small Express API and JSON persistence. The client is split into pages, reusable components, hooks, services, typed domain models and an IndexedDB repository.

```text
React UI
  -> IndexedDB v3: surveys | profile | sessions | surveyEdits
  -> local-first submit: DRAFT -> PENDING_SYNC
  -> foreground sync / Background Sync (sequential)
  -> POST/PUT /api/surveys; Admin key -> /api/admin/*
  -> Apps Script -> Google Sheets + Drive -> SYNCED
```

Each survey includes location, category checklist, rating, classification, evidence, version, timestamps, sync state and an independent review state. `inspector` and `session` are immutable snapshots. A runtime normalizer adds compatible defaults to older IndexedDB records.

## 4. Offline And Synchronization Design

Form changes are debounced and written to IndexedDB while the record is a Draft. Submission always stores a Pending Sync copy locally before contacting the API. A successful response is the only event that marks the record Synced. Network/API failures preserve the complete record as Pending Sync or Sync Failed.

The foreground sync engine prevents overlapping runs and sends queued items in creation order. Synchronization is triggered at startup, network events, manual retry and Background Sync. Editing preserves the UUID, increments the version and returns the record to the queue. Equal/older API retries cannot overwrite a newer version or create a duplicate row.

## 5. PWA, Native Bridge And Evidence

`vite-plugin-pwa` builds a custom service worker that precaches HTML, CSS, JavaScript, icons and the web manifest. The manifest uses standalone display mode and the required VKU colors/icons. Browser photos use file capture plus client resizing; Android uses Capacitor Camera. GPS uses browser Geolocation in the PWA and Capacitor Geolocation natively. A failed GPS capture records `unavailable` without blocking an otherwise valid offline survey.

The Android project declares Internet, Camera and coarse/fine location permissions. Java 21/Gradle builds a signed debug APK with package `edu.vku.fieldsurvey`, minimum SDK 23 and target SDK 35. GitHub Actions also compiles and publishes the APK, avoiding any dependency on Android Studio on the development machine.

## 6. Verification And Result

Automated tests cover business rules, migration defaults, IndexedDB snapshots/edit drafts, queue order and server/review validation. Chromium E2E verifies profile recovery, online/offline submit, edit recovery, version 2 synchronization, Admin review, reconnect auto-sync, GPS, CSV and offline boot. Production checks cover Vercel routing, service worker behavior and idempotent API requests.

The deliverables are published at `https://miniproject1-client.vercel.app`, `https://github.com/tuaw-khoi/miniproject1`, and the `apk-latest` GitHub Release. The demo Admin key is configured as `VKU-ADMIN-2026` and can be replaced with `ADMIN_ACCESS_KEY`. The remaining manual task is installing the APK on a physical Android phone and exercising native Camera, Network, GPS and Admin access permissions.
