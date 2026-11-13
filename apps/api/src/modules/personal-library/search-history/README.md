# FR13 — Search history (Personal Library)

FR13 adds the History button/panel to the existing page. It does not replace
search v1, change the 2D/3D scene, add FR12 login, or implement FR19.
`unified-search.ts` contains shared DTO/schema definitions, no FR19 routes/services.

## Guest/device history

Without `historyAccess`, App saves query, filters and device timestamp in the
separate IndexedDB `paper-magic-device-history`. Guests can view/delete history
without login or network while the app is loaded. Data persists on this browser;
clearing browser data removes it. It is not shared with another device/account.

A submit creates IDs once. IndexedDB readwrite transactions and a unique queryId
index deduplicate retries; tombstones prevent old retries resurrecting a deleted
record. List pagination is newest first with a stable timestamp/ID cursor.

Offline search replay also requires the local dataset/embedding resources. This
feature does not guarantee the whole app can cold-start offline before its shell
and required resources have been cached. It does not add a full sync outbox.

## Account history / FR12 integration

The account path remains separate: controller/service/repository/types under
personal-library/search-history, Mongo searchHistoryV4, ETag/If-Match on delete,
owner-scoped records and idempotency/tombstones. No users/session storage or DB
connection pool is introduced here.

FR12 wiring: configurePersonalLibraryIntegration({principal,authorizeMutation,database})
in src/bootstrap/personal-library.ts. Supply App historyAccess={accountId,send}
from the same authenticated identity/HTTP transport. Account API fails closed
until configured. Guest data is never automatically merged into an account.
Account sync/offline outbox and full live FR12/Mongo integration are not completed.

History supports the filters used by the existing paper UI. Extra FR19 filters
require that feature integration before re-search; unsupported filters are not
silently discarded. History creation remains in submit, not render/search effects.

## Verification

Base: main 28056dd363bf74250b44e305bf61abb07b486723.

- `pnpm exec vitest run tests/history.unit.test.ts`: 7 tests.
- Run Vite dev, then `pnpm exec playwright test tests/e2e/history.spec.ts`: 5 UI
  tests including real browser IndexedDB, offline save/read/delete, persistence,
  concurrent retry, tombstones and pagination. On Linux set
  PLAYWRIGHT_BROWSER_PATH=/usr/bin/chromium and E2E_BASE_URL as needed.
- Account UI/API unit tests use isolated identity/repository fixtures; no claim
  of a live Mongo/account end-to-end test.
- The clean base main already has web typecheck errors: App omits newly required
  MagicBook props, and create-book-scene.ts has a PropertyDescriptor.enumerable
  type issue. This FR13 change preserves those scene files; full build is not
  reported as passing on this base. Core/API typechecks are checked separately.
