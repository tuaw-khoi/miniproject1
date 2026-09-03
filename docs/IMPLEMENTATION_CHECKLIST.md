# VKU Field Survey - Implementation Checklist

## Completed Locally

- [x] npm workspace with `client` and `server`.
- [x] React TypeScript Vite Tailwind PWA client.
- [x] Mobile-first Home, New Survey, History, and Detail screens.
- [x] Five-step inspection form.
- [x] IndexedDB persistence through `idb`.
- [x] Draft autosave and draft restore.
- [x] Offline-safe submit flow.
- [x] Sequential sync engine with duplicate-run lock.
- [x] Background Sync best effort plus startup/network/manual fallback.
- [x] Express REST API.
- [x] Idempotent `POST /api/surveys` by UUID.
- [x] PWA manifest, app shell precache, and 192/512 icons.
- [x] Capacitor Android project.
- [x] Native Camera and Network plugin integration.
- [x] README, screenshots, report source, and generated PDF report.

## Verified

- [x] `npm run check` passes.
- [x] `npm audit --audit-level=moderate` reports 0 vulnerabilities.
- [x] API runtime test: first `POST` returns 201, duplicate UUID retry returns 200, stored duplicate count remains 1.
- [x] `npm run android:sync` passes.
- [x] Screenshots generated in `docs/screenshots/`.
- [x] Report PDF generated at `docs/VKU_FIELD_SURVEY_REPORT.pdf`.

## Needs External Setup

- [ ] `npm run android:apk` requires Android SDK. Current machine is missing `ANDROID_HOME` or `client/android/local.properties`.
- [ ] Public GitHub repository requires a GitHub remote/account.
- [ ] Live HTTPS deployment requires Cloudflare Pages, Vercel, or another hosting target.
- [ ] Final APK/manual camera test requires an Android emulator or device.
