# VKU Field Survey — Project Context

This file is the persistent source of truth for future implementation work in
this repository. It consolidates the supplied project context and master prompt.

## 1. Product goal

Build **VKU Field Survey — Offline Data Collection**, a mobile-first campus
facility inspection application for VKU.

The defining requirement is **offline-first operation**. After the first online
visit, a user must be able to reopen the application without Wi-Fi/mobile data,
complete an inspection, take or choose a photo, submit it locally, close/reload
the app, and retain all data. When connectivity returns, queued surveys must be
synchronized automatically.

Priority order:

1. Offline-first behavior
2. IndexedDB persistence
3. Reliable automatic synchronization
4. Installable PWA
5. Capacitor Android APK with native camera and network monitoring

Do not trade away these requirements for optional UI features.

## 2. Required technology stack

- Frontend: React, TypeScript, Vite
- UI: Tailwind CSS; mobile-first and responsive
- PWA: `vite-plugin-pwa`, Web App Manifest, Service Worker, Cache First app shell
- Local storage: IndexedDB through the **`idb`** package
- IDs: UUID
- Native wrapper: Capacitor and `@capacitor/android`
- Native plugins: `@capacitor/camera`, `@capacitor/network`
- Backend: Node.js, Express, REST API
- Deployment: Cloudflare Pages or Vercel over HTTPS
- Source control/delivery: Git and a public GitHub repository

Web/PWA and Android must share the same React codebase. Do not create a separate
Android application.

## 3. Core lifecycle

```text
Open app
  -> create/edit survey
  -> auto-save draft to IndexedDB
  -> take or choose photo
  -> submit
       online  -> send API -> SYNCED
       offline -> save locally -> PENDING_SYNC
                                  -> network returns
                                  -> sequential automatic sync
                                  -> SYNCED
```

A failed request must never delete the local survey or require the user to
re-enter it.

## 4. Required screens and UX

Suggested routes/screens:

- Home: welcome, network state, New Inspection action, pending count, recent surveys
- New Survey: multi-step form
- Survey History: all local surveys, filters/statuses, sync badges
- Survey Detail: complete inspection information and photo

Suggested form steps:

1. Location
2. Equipment/category
3. Condition
4. Notes and photo
5. Review and submit

Required fields:

- Building (examples: A, B, C, V)
- Floor (examples: 1, 2, 3, 4)
- Room number (examples: V301, V303, A201)
- Category: Hardware, Projector, AC, Electrical, or Furniture
- Condition rating: integer from 1 to 5, presented as stars
- Defect notes
- Photo: native camera on Capacitor; camera/file selection fallback on web

Visual direction:

- Clean, modern, professional university inspection UI
- Mobile-first and responsive
- Primary/theme color: `#0284c7`
- Functionality and clarity take precedence over decorative animation
- Clearly show Online/Offline state
- While offline, explain that surveys are saved locally and will sync later

## 5. Domain model

```ts
export type SurveyCategory =
  | "Hardware"
  | "Projector"
  | "AC"
  | "Electrical"
  | "Furniture";

export type SurveyStatus =
  | "DRAFT"
  | "PENDING_SYNC"
  | "SYNCED"
  | "SYNC_FAILED";

export interface Survey {
  id: string;
  building: string;
  floor: string;
  room: string;
  category: SurveyCategory;
  rating: number;
  notes: string;
  photo?: string;
  createdAt: string;
  status: SurveyStatus;
}
```

Every submitted survey has a UUID, ISO-style timestamp, and explicit sync
status. The app must preserve drafts, completed surveys, and the pending sync
queue in IndexedDB. Refreshing or restarting must not erase them.

## 6. Offline and synchronization rules

### Drafts

- Auto-save form changes to IndexedDB.
- Restore the unfinished form after refresh/restart.
- An unfinished record has status `DRAFT`.

### Submission

- Never reject a valid submission only because the device is offline.
- Persist the completed survey locally before/while attempting remote delivery.
- Offline submission becomes `PENDING_SYNC`.
- Online submission becomes `SYNCED` only after confirmed API success.

### Connectivity

- Web: use `navigator.onLine` plus `online`/`offline` window events.
- Capacitor: use `@capacitor/network`.
- Use Background Sync where supported.
- Never depend solely on Background Sync; always keep the network-event fallback.

### Queue processing

- On restored connectivity, query all `PENDING_SYNC` surveys.
- Upload them sequentially.
- Mark an item `SYNCED` only after success.
- On failure, keep all local data and retain `PENDING_SYNC` or mark
  `SYNC_FAILED` so it can be retried.
- Prevent overlapping sync runs and duplicate remote records.
- The API must treat a repeated client UUID idempotently.

## 7. PWA requirements

- Installable on Android and usable with Add to Home Screen
- Standalone display mode
- Manifest name: `VKU Field Survey`
- Manifest short name: `VKU Survey`
- Theme color: `#0284c7`
- Icons: 192x192 and 512x512
- Service worker caches the application shell: HTML, CSS, JavaScript, fonts, and
  static assets
- After at least one successful visit, the application must boot with all
  network access disabled

## 8. Capacitor requirements

Only begin Capacitor integration after the web/PWA flow is stable.

```text
React source -> Vite build -> Capacitor -> Android -> APK
```

- Build/install a working Android APK.
- Use `@capacitor/camera` for native photo capture.
- Use `@capacitor/network` for native connectivity monitoring.
- Provide suitable web fallbacks when not running natively.

## 9. Backend requirements

Keep the backend intentionally small; offline behavior is the focus.

Minimum endpoints:

```text
POST /api/surveys
GET  /api/surveys
GET  /api/surveys/:id
```

`POST /api/surveys` must avoid duplicates when a queued item with the same UUID
is retried. A simple database/storage choice is acceptable for the mini-project.

## 10. Suggested frontend structure

```text
src/
├── components/
│   ├── NetworkStatus.tsx
│   ├── RatingInput.tsx
│   ├── SurveyCard.tsx
│   └── PhotoPicker.tsx
├── pages/
│   ├── HomePage.tsx
│   ├── NewSurveyPage.tsx
│   ├── SurveysPage.tsx
│   └── SurveyDetailPage.tsx
├── db/
│   └── indexedDB.ts
├── services/
│   ├── api.ts
│   ├── syncService.ts
│   ├── cameraService.ts
│   └── networkService.ts
├── stores/
│   └── surveyStore.ts
├── hooks/
│   ├── useNetwork.ts
│   └── useSurveyDraft.ts
├── types/
│   └── survey.ts
├── utils/
├── App.tsx
└── main.tsx
```

This structure may be adjusted for a clear reason, but the code should remain
modular, strongly typed, readable, and appropriately simple.

## 11. Required implementation order

Implement incrementally and preserve working behavior from earlier phases:

1. Environment check and React + TypeScript + Vite + Tailwind setup
2. Mobile-first UI and routing
3. Multi-step survey form
4. IndexedDB database
5. Draft auto-save and restoration
6. Offline submission queue
7. Express REST API
8. Automatic sync engine
9. PWA manifest, service worker, icons, and caching
10. Offline/PWA testing
11. Capacitor integration
12. Native camera
13. Native network monitoring
14. Android APK build/test
15. HTTPS deployment
16. README, screenshots, and technical report

Do not skip directly to Capacitor before the browser/PWA implementation is
working reliably.

## 12. Acceptance tests

The project is not complete until all of these pass:

1. **Normal online:** create and submit -> API success -> `SYNCED`.
2. **Offline form:** with networking disabled, the loaded app and form still work.
3. **Refresh protection:** partially complete the form, refresh, and recover it.
4. **Offline submit:** submit while offline -> `PENDING_SYNC`.
5. **Multiple offline items:** create three offline surveys; all three remain local.
6. **Automatic sync:** restore Internet; all three upload and become `SYNCED`.
7. **Failed API:** server failure loses no data and the item remains retryable.
8. **Offline boot:** after one visit, close/reopen with Internet off; app still opens.
9. **Android:** build and install the APK; the app functions.
10. **Native camera:** camera button opens the native camera and the photo appears
    in the survey.
11. **PWA install:** application can be installed and launched standalone.

Canonical end-to-end demo:

```text
Open app -> turn Internet off -> create survey -> add photo -> submit
-> see PENDING_SYNC -> close/reload -> survey still exists
-> turn Internet on -> automatic upload -> see SYNCED
```

## 13. Required deliverables

1. Live HTTPS PWA URL on Cloudflare Pages or Vercel
2. Public GitHub repository
3. Installable Android APK/demo
4. Technical report PDF, approximately 2–4 pages

The README must include project overview, features, stack, architecture, setup,
run/build commands, Android build instructions, and screenshots.

The report must cover the problem, features, stack, architecture, offline and
IndexedDB mechanisms, synchronization, Capacitor, screenshots, and conclusion.

## 14. Working rules for future implementation

- Inspect the repository before every phase and do not replace working code
  unnecessarily.
- Keep changes incremental; implement one phase at a time unless explicitly
  requested otherwise.
- Before a phase, briefly state what it will add.
- After a phase, run proportionate checks and provide run/test instructions.
- Preserve the required stack and strong TypeScript types.
- Prefer understandable student-project code over unnecessary abstraction.
- Implement fallbacks for features with uneven browser support.
- Satisfy rubric requirements before adding optional features.
- Never remove or weaken offline persistence/synchronization for convenience.

## 15. Professional review extension

The implemented extension keeps the original offline-first lifecycle and adds:

- Survey versioning and offline autosaved edit drafts in IndexedDB v3.
- Submitted surveys retain their UUID; an edit increments `version` and returns
  to `PENDING_SYNC` until the newer version is acknowledged.
- `status` remains the required synchronization state. `reviewStatus` is a
  separate workflow state: `OPEN`, `IN_REVIEW`, `RESOLVED`, or `REJECTED`.
- An online Admin Review screen reads centralized records, filters and exports
  them, assigns follow-up work, and records an admin note/status.
- Production Vercel API synchronizes centralized records to Google Sheets
  through a server-side Apps Script webhook. Webhook credentials never enter
  the React bundle.
- Google Sheets upserts by survey UUID/version, keeps one row per survey, stores
  audit events separately, and can move Base64 evidence into Google Drive.

The extension does not add authentication or make Google Sheets a dependency
for offline data entry. IndexedDB remains the durable device-side source of
truth and failed central delivery remains retryable.
