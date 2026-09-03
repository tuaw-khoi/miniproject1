# VKU Field Survey

Offline-first field inspection app for VKU campus facilities. The app lets an inspector create surveys, attach photos, submit while offline, keep all data in IndexedDB, and automatically sync queued records when the API becomes reachable.

## Features

- React, TypeScript, Vite, Tailwind mobile-first PWA.
- IndexedDB persistence with `idb` for drafts, completed surveys, and sync queue.
- Autosaved multi-step inspection form with refresh protection.
- Offline submit flow using `DRAFT`, `PENDING_SYNC`, `SYNCED`, and `SYNC_FAILED`.
- Sequential retry sync with duplicate protection through client UUIDs.
- Express REST API with idempotent `POST /api/surveys`.
- PWA manifest, app shell precache, offline boot after first visit, and Background Sync best effort.
- Capacitor config for Android plus native Camera and Network plugins.

## Project Structure

```text
client/   React PWA and Capacitor app
server/   Express REST API with local JSON storage
docs/     Technical report and screenshots
```

## Requirements

- Node.js 20 or newer
- npm 10 or newer
- Android Studio and Android SDK for APK builds

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

The default local URLs are:

- Frontend: `http://localhost:5173`
- API: `http://localhost:4000`

## Commands

```bash
npm run dev          # run client and server together
npm run check        # typecheck and build both workspaces
npm run build:pwa    # build the installable PWA
npm run android:add  # create Capacitor Android project once
npm run android:sync # build web assets and sync Android
npm run android:apk  # build Android debug APK when Android SDK exists
```

## API

```text
GET  /health
GET  /api/surveys
GET  /api/surveys/:id
POST /api/surveys
```

`POST /api/surveys` is idempotent. If the server already has a survey with the same UUID, it returns the existing survey instead of creating a duplicate.

## Manual Acceptance Tests

1. Online: create a survey and submit. It should become `SYNCED`.
2. Refresh protection: partially fill the form, reload, and confirm the draft returns.
3. Offline submit: disable network, create a survey, submit, and confirm `PENDING_SYNC`.
4. Multiple offline items: create three offline surveys and confirm all remain in History.
5. Automatic sync: re-enable network while the API is running. Pending items should become `SYNCED`.
6. Failed API: stop the server, submit online, and confirm the survey remains local as `SYNC_FAILED`.
7. PWA offline boot: build/preview the PWA, load it once, disable network, close/reopen, and confirm the app shell still opens.
8. Android: run `npm run android:apk` on a machine with Android SDK, install the debug APK, and test camera/network.

## Deployment Notes

Deploy `client/dist` to Cloudflare Pages or Vercel over HTTPS after running:

```bash
npm run build:pwa
```

For public sync, deploy `server/` separately and set `VITE_API_URL` to the hosted API URL before building the client.

## Screenshots

Generated screenshots can be placed in `docs/screenshots/`:

- `docs/screenshots/home.png`
- `docs/screenshots/new-survey.png`
- `docs/screenshots/history.png`

## Report

The technical report source is in `docs/TECHNICAL_REPORT.html`. The generated PDF deliverable is `docs/VKU_FIELD_SURVEY_REPORT.pdf`.
