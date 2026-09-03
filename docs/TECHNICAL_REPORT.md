# VKU Field Survey - Technical Report

## Problem

Facility inspections on campus often happen in rooms or buildings where the connection is weak or unavailable. A normal web form can lose data during refresh, close, or network failure. VKU Field Survey solves this by treating local storage as the first-class data source and syncing later.

## Features

The application provides a mobile-first inspection workflow with Home, New Survey, History, and Detail screens. Inspectors can choose a building, floor, room, equipment category, condition rating, defect notes, and photo evidence. Drafts autosave while typing. Submitted records show one of four states: Draft, Pending Sync, Synced, or Sync Failed.

## Technology Stack

The client uses React, TypeScript, Vite, Tailwind CSS, React Router, IndexedDB through `idb`, `uuid`, `vite-plugin-pwa`, and Capacitor plugins for Camera and Network. The server uses Node.js, Express, CORS, Morgan, and a local JSON file for simple mini-project storage.

## Architecture

The project is organized as an npm workspace. The `client` workspace owns the PWA and Capacitor app. The `server` workspace owns the REST API. Both sides share the same survey contract: each submitted survey has a UUID, location fields, category, rating, notes, optional photo data URL, timestamps, and sync status.

The client writes every draft and submission to IndexedDB. The server exposes `POST /api/surveys`, `GET /api/surveys`, and `GET /api/surveys/:id`. The post endpoint is idempotent by UUID, so a retry cannot create duplicate remote records.

## Offline And IndexedDB

The multi-step form uses an autosave hook that writes the current draft into IndexedDB after changes. When the New Survey screen opens, it restores the latest Draft record or creates a new one. Submitted surveys are stored locally before the app attempts any network request. This means API failure, browser refresh, app restart, or offline mode cannot erase the inspection.

## Synchronization

When the user submits offline, the survey becomes Pending Sync. When the user submits online, the client still saves locally first, then uploads to the API. Only a confirmed API success marks the survey as Synced. If upload fails, the item becomes Sync Failed and remains retryable.

The sync engine processes Pending Sync and Sync Failed records sequentially. A lock prevents overlapping sync runs. Sync is triggered on app start, browser online events, native Capacitor network events, manual Retry Sync, and Background Sync where supported. Background Sync is best effort; normal app startup and network events remain the required fallback.

## PWA And Capacitor

The Vite PWA plugin uses a custom service worker with Workbox precache to store the app shell. After the first successful load, the app can reopen with network disabled. The manifest uses the required app name, short name, standalone display, theme color, and 192/512 icons.

Capacitor uses the same React build output from `client/dist`. The app is configured with native Camera and Network plugins. On Android, the photo button uses the native camera prompt. On the web, it falls back to file selection with image resizing.

## Testing

The implemented check command runs TypeScript validation and production builds for both workspaces. Manual acceptance testing should cover online submit, offline form use, refresh recovery, offline submit, three queued offline items, automatic sync after network restore, API failure retry behavior, PWA offline boot, installability, Android APK, and native camera.

## Conclusion

VKU Field Survey focuses on reliability before extras. The important guarantee is that valid inspection data is saved locally first and never depends on immediate internet access. The PWA and Android wrapper share the same React codebase, while the Express API stays intentionally small for demonstration and grading.
