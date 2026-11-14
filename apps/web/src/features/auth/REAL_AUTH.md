# FR12 frontend integration — Stage 5.4

## Configuration

Development defaults to real FR12. Copy `apps/web/.env.example` to `.env.development.local` if desired and restart Vite after changes:

- `VITE_AUTH_MODE=real`: real Next.js adapter.
- `VITE_AUTH_MODE=mock`: explicit development demo, with independent memory accounts/bookmarks. Never sends mock sessions to FR12.
- `VITE_AUTH_MODE=disabled`: development-only unavailable authentication for testing.
- Production builds always select real, including when the build environment says mock or disabled. Mock credentials/stores are removed by Vite's DEV guard.

The adapter uses relative `/api/v4/...`, `credentials: include`, `cache: no-store`, and refuses redirects. Vite forwards `/api` to `http://127.0.0.1:3001`; an optional **process environment** `API_PROXY_TARGET` overrides that local target. This is a development/preview proxy, not production routing. `changeOrigin: false` preserves the incoming Origin; no cookie Domain/Path rewriting or security downgrade is applied.

Use a trusted HTTPS origin in deployment and for reliable real-session development. Backend cookies are always `__Host-pm_session; Secure; HttpOnly; Path=/`, without Domain, with the Backend-configured SameSite/TTL. Do not remove Secure for HTTP development. Put an HTTPS reverse proxy in front of Vite locally, with Next.js behind Vite's API proxy. In production, serve frontend and `/api` under the same HTTPS origin through the deployment reverse proxy; the existing `scripts/serve-production.mjs` also supports TLS and a local API upstream. The Backend's `IDENTITY_ALLOWED_ORIGINS` must include the **browser's exact origin**, including port. Backend MongoDB/session/rate-limit configuration remains mandatory; consult the API Stage 5.2/5.3 documentation. No CORS behavior was added; separate browser origins require a separately reviewed deployment configuration.

## API behavior

| API | Frontend behavior |
| --- | --- |
| POST `/users` | Email, password and displayName only; UUID Idempotency-Key. Registration requires a 1–100 character displayName and 12–256 character password, with matching confirmation in UI only. Success closes the dialog and asks the user to log in; no session is fabricated. |
| POST `/sessions` | Email/password; wrong credentials remain in the modal. An additional GET current must confirm the cookie before authentication is published. |
| GET `/sessions/current` | Startup recovery, focus/visibility refresh, and expiry timer. Anonymous response means Guest; network/server failure means error. CSRF and expiry are validated. |
| DELETE `/sessions/current` | Refresh CSRF, revoke on Backend, then publish Guest. Network failure displays an error without claiming safe logout; a later refresh can recover the actual server state. |
| GET `/users/me` | Validate an allowlisted user representation, retain ETag in memory and update context only after confirmation. |
| PATCH `/users/me` | displayName only, CSRF, UUID key and If-Match. Preserve a previously loaded ETag so concurrent updates yield a visible conflict. No automatic write retry or role editing. |

All paths in the table are prefixed `/api/v4`. Writes use `X-CSRF-Token` from the session endpoint. The browser supplies Origin; application code does not forge it. Token/CSRF/ETag cache is memory-only. Passwords are submitted directly and never persisted or logged. Session credentials remain in the Backend's HttpOnly cookie, not browser storage. Safe Vietnamese errors are used instead of displaying raw server response bodies.

`AuthProvider` exposes login, register, logout, getProfile, updateProfile, refreshSession and current state. Existing forms contain no fetch calls. Profile methods are available for the subsequent profile UI; no new profile editor was added. Requests are serialized by the Provider and aborted on unmount/close. Startup is cancelled before an explicit operation; adapter epochs invalidate late reads after login/logout. Expired sessions clear identity and pending actions. Failed verification clears trusted frontend identity into error state. No fallback to mock is used.

Guest exploration remains available without an automatic login prompt. Existing App, main, search/filter and Three.js source were not edited in this stage. TopNav shows verified account name/email and a real logout action. Demo wording remains limited to demo mode.

## Bookmark boundary

Only a mock session can read/write the Stage 4 memory bookmark store. Real account saves show that FR14 is not supported yet; they make no FR14 requests and do not claim account persistence. Legacy IndexedDB data is untouched and never imported into a real account. Pending intents are consumed once, discarded on cancellation/logout/account changes, and cannot grant Backend access. Adapter changes require a Vite restart/page reload; mock identity is not hydrated into real auth.

## Files changed in this stage

- New `services/real-auth-client.ts`: real six-endpoint adapter.
- Updated `services/auth-client.ts`, `types/auth.types.ts`: adapter selection and shared interface.
- Updated `context/AuthProvider.tsx`: real lifecycle, recovery, profile methods and safe errors/races.
- Updated `context/useProtectedBookmarks.ts`: explicit FR14 unavailable boundary for real accounts.
- Updated `components/AuthModal.tsx`, `components/RegisterForm.tsx`: pass real mode and collect the Backend-required displayName; reuse existing styles.
- Updated `../../components/layout/TopNav.tsx`: real versus demo account labels.
- Updated `../../../vite.config.ts`, `../../../.env.example`: configurable local proxy and adapter settings.
- New `tests/real-auth.unit.test.ts`, `tests/real-auth.browser.mjs` at repository root; updated `tests/auth.unit.test.ts` for production's real adapter.
- Documentation: this file and the earlier README's Stage 5.4 notice. No Backend or dependency changes in this stage.

## Reproducible verification

Run from repository root `jsts`:

```powershell
pnpm.cmd --filter @paper-galaxy/web typecheck
pnpm.cmd --filter @paper-galaxy/web build
pnpm.cmd exec vitest run tests/auth.unit.test.ts tests/bookmarks.unit.test.ts tests/real-auth.unit.test.ts
```

The real browser harness requires an existing API build (`pnpm.cmd --filter @paper-galaxy/api build`), Edge or `PLAYWRIGHT_BROWSER_PATH`, the cached MongoDB binary (or its normal test download), and a test-only localhost certificate at `.local/fr12-browser-tls/{key,cert}.pem`. For example, generate one using a local OpenSSL installation:

```powershell
New-Item -ItemType Directory -Force .local/fr12-browser-tls
& 'C:/Program Files/Git/usr/bin/openssl.exe' req -x509 -newkey rsa:2048 -nodes -keyout .local/fr12-browser-tls/key.pem -out .local/fr12-browser-tls/cert.pem -days 2 -subj '/CN=localhost' -addext 'subjectAltName=DNS:localhost,IP:127.0.0.1'
node tests/real-auth.browser.mjs
```

The harness starts isolated Mongo replica/Next/Vite/HTTPS servers on free ports, sets test secrets in child-process environment, and uses a separate browser context. Certificate errors are ignored **only in that test context**, not in product code. Public search responses are fixtures; all six FR12 endpoints use the actual Backend and MongoDB, with no auth response mocks. Network aborts are injected only for failure assertions. It verifies real registration without auto-login, duplicate email, bad/good login, profile GET/PATCH and TopNav name, reload, logout/recovery from a failed logout, forced server expiry, network error, secure HttpOnly cookie, no cookie token in local/session storage, unchanged selected scene/cast/query through auth, retained legacy IndexedDB, and no FR14 request. Test servers and temporary replica are stopped in finally.

The earlier `tests/protected-bookmarks.browser.mjs` remains the mock regression harness; run with separate Vite mock/disabled servers as documented in PROTECTED_BOOKMARKS.md. No lint script is configured. Build retains the existing large-chunk warning. These checks cover Edge/Chromium locally, not a deployed HTTPS environment, Safari/Firefox or multi-tab write races. Backend account-disabled policy remains dependent on the team's schema; no Backend policy was added here.

Verified on 2026-11-14: web TypeScript and production build passed; the three auth/bookmark unit files passed 22/22. The real HTTPS browser harness passed all six APIs and the failure/expiry assertions above. The existing mock/disabled browser harness passed, including 320/390/768/1440px checks and preservation of canvas/context/cast/selection/query/filter/IndexedDB. A production build with `VITE_AUTH_MODE=mock` contained neither demo credentials nor mock auth/bookmark modules. Full workspace unit run: 148 passed, 1 existing failure in `tests/ritual.unit.test.ts:21` (`Tương đồng vừa` expected versus `Tương đồng trung bình` returned); unrelated scene/test code was left unchanged.
