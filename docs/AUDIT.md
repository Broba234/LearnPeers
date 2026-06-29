# LearnPeers — Code Audit (dead code, professionalism & security)

**Date:** 2026-06-29
**Scope:** ~296 source files / ~45K LOC (`app/`, `components/`, `lib/`, `prisma/`, `scripts/`, root config). Excludes `node_modules`, `.next`, `prisma/generated`, `ios/`.
**Stack:** Next.js 16 (App Router) · React 18 · Prisma · Supabase (auth + storage) · Stripe Connect · LiveKit · Capacitor.
**Method:** Multi-agent sweep — 7 directory-slice finders + 4 cross-cutting lenses (dead-export graph, dependencies, secrets, polish). Every "unused/dead" claim was re-verified with repo-wide `rg` (63/64 confirmed, 1 false positive rejected). The auth/IDOR cluster was independently re-verified route-by-route (12/13 confirmed, 1 refuted).

> The brief was "find dead code or anything unprofessional." Both are covered below. The sweep also surfaced **critical security holes** (committed live secrets, a systemic authorization flaw) that "unprofessional" undersells — they lead the report.

## Severity summary

| Severity | Count | Headline items |
|---|---|---|
| 🔴 Critical | 2 | Live secrets committed to git; Stripe payout-account takeover via IDOR (`/api/earnings`, connect routes) |
| 🟠 High | 12 | Systemic IDOR family (~25 route files); JWT logged to browser; demo bypass flags shipping enabled |
| 🟡 Medium | 17 | Type checking disabled; raw Prisma errors to clients; swallowed errors; debug logging; abandoned migrations |
| ⚪ Low | 35 | Dead code, unused deps, commented-out blocks, legacy naming, UI polish |

Status legend: **✅ Fixed** (applied on branch `chore/audit-cleanup`) · **⏳ Manual** (needs your action) · **🔍 Confirm** (verified, fix is a code change for review).

---

## 1. 🔴 Committed secrets & live credentials

| # | Sev | Location | Issue | Status |
|---|---|---|---|---|
| 1.1 | 🔴 | `.env.local.backup`, `.env.backup` | **Tracked in git with live secrets**: Supabase **service-role JWT** (bypasses all RLS), Postgres password, anon key, LiveKit API key + secret. `.gitignore` covered `.env*` but not `*.backup`. | ✅ untracked + gitignore fixed · ⏳ **rotate all credentials + purge history** |
| 1.2 | 🟠 | `scripts/deck-shots.mjs:21-22` | Developer's real Gmail + iCloud logins hardcoded with a **reused password** (`Baba$123`). | ⏳ Manual + rotate |
| 1.3 | 🟡 | `scripts/seed-deck.mjs:158`, `seed-showcase.mjs` | Hardcoded shared password (`Deck$Seed123`) creates sign-in-able seeded auth users. | 🔍 Confirm |
| 1.4 | ⚪ | `.env.example:37` | Real-looking `pk_test_…` Stripe key instead of a placeholder. | ✅ Fixed (placeholder) |
| 1.5 | ⚪ | `prisma/sql/2026-06-24_admin_seats_permissions.sql:12-15` | Product-owner email hardcoded to bootstrap admin in a committed migration. | 🔍 Confirm |

**⏳ Required manual follow-up for 1.1 (the local files were kept so you can read the values to rotate):**
```bash
# 1. Already done on this branch: git rm --cached + .gitignore now ignores *.backup & .DS_Store
# 2. ROTATE every leaked credential (they must be treated as compromised):
#    - Supabase: roll the service-role key AND anon key (Project Settings → API)
#    - Postgres: reset the DB password (updates DATABASE_URL)
#    - LiveKit: regenerate API key/secret
# 3. Purge them from history (they remain in every prior commit):
git filter-repo --invert-paths --path .env.local.backup --path .env.backup   # or BFG
git push --force-with-lease   # coordinate with anyone who has the repo cloned
```

---

## 2. 🟠 Broken access control (IDOR) — a systemic flaw, route-verified

**Root cause (one pattern, ~25 files):** handlers derive the acted-on identity from a **client-supplied** value (body `email`, or query `tutorId`/`studentId`/`userId`/`email`) and use it directly as a DB key against the **service-role client (RLS bypassed)**. The route authenticates (middleware requires a session) but never *authorizes*. `lib/api-auth.ts` already ships `getAuthedUser()` and even documents *"Never trust a user/profile id sent in the request body for authorization"* — it was simply never adopted in these routes. **12 of 13 groups confirmed vulnerable; 1 refuted.**

| # | Sev | Route(s) | Impact | Status |
|---|---|---|---|---|
| 2.1 | 🔴 | `GET /api/earnings` | `?tutorId=<victim>` returns earnings, student PII, **and a `stripe.accounts.createLoginLink` URL** → log straight into the victim's Stripe Express dashboard (payout/bank takeover). | 🔍 Confirm |
| 2.2 | 🔴 | `POST /api/stripe/connect/account-session` + `create-account-link` | Trusts `body.email`; creates/binds a Stripe account to a victim and returns onboarding `client_secret`/URL → KYC/bank-redirect payout takeover. | 🔍 Confirm |
| 2.3 | 🟠 | `GET /api/contacts` | **Fully unauthenticated** (method-agnostic `PUBLIC_API` allowlist meant for the public POST) — dumps the entire contacts table (name/email/subject/message) to anyone. | 🔍 Confirm |
| 2.4 | 🟠 | `PUT /api/profiles/update-bio` (+ `update`, `update-education`, `complete-setup`, `student/update-subjects`) | Mass-assignment writes keyed on `body.email`; `update-bio` also flips `is_tutor` (**role tampering**) and can null `hourlyRate` on any account. | 🔍 Confirm |
| 2.5 | 🟠 | `DELETE /api/subjects/delete` (+ `subjects/create`, `institutions`, `curricula`, `institution-courses`) | No admin gate on **global** reference data — any user can destroy marketplace-wide catalog rows or inject spam. | 🔍 Confirm |
| 2.6 | 🟠 | `DELETE/PUT/POST /api/tutor-availability/{delete,update,save}` | Delete any tutor's slot by guessable `eventId` (no check at all); overwrite slots; create availability under any victim's email. `update` even computes `tutorId` then never uses it (a dropped check). | 🔍 Confirm |
| 2.7 | 🟠 | `PUT /api/profiles/update-subjects` (+ `subjects/update-subjects-and-prices`, `subjects/tutor-subjects`) | Cross-tenant CourseAsset write/delete + price overwrite keyed on client email. | 🔍 Confirm |
| 2.8 | 🟠 | `GET /api/profiles/get-full?email=` | Any authed user harvests any profile by email — leaks phone, `stripe_account_id`, `email_verified` across the whole user base via email enumeration. | 🔍 Confirm |
| 2.9 | 🟠 | `GET /api/stripe/connect/status?email=` | Enumeration oracle: any email → `acct_…` + onboarding/verification state. | 🔍 Confirm |
| 2.10 | 🟠 | `GET /api/sessions/student` + `tutor` | Any user reads any user's sessions + counterparty PII (name/avatar/bio/hourlyRate). | 🔍 Confirm |
| 2.11 | 🟠 | `GET /api/notifications/list` + `PATCH /mark-read` | Read/tamper any user's notifications via `userId` param. | 🔍 Confirm |
| 2.12 | 🟠 | `GET /api/feedback` | Commented "for the admin dashboard" but no admin gate — any authed user exfiltrates all feedback + submitter PII. | 🔍 Confirm |
| — | ✅ refuted | `POST /api/stripe/complete-payment-return` | **Not a vuln**: the session id comes from unforgeable server-set `PaymentIntent.metadata` with a succeeded/pending-only write. Optional ownership assertion for defense-in-depth only. | — |

**Shared fix (closes the whole family at once)** — add two helpers to `lib/api-auth.ts` and adopt mechanically:

1. **`requireUser()`** — wraps `getAuthedUser()`, returns the user or 401. Every per-user route calls it first and derives its scoping id from `user.id` (which equals `profiles.id`). Replace `where: { email }` / `.eq('tutor_id', tutorId)` / `searchParams.get('userId')` etc. with `user.id`, and stop reading the client identifier entirely. (This is the shape already correct in `app/api/saved-tutors/route.ts`.) Closes 2.1, 2.4, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11 and the persistence side of 2.2.
2. **`requireAdminApi(pageKey?)`** — wraps `getAuthedUser()` + `getAdminContext().can(pageKey)`; 401/403 otherwise. Gate `/api/contacts` GET, `/api/feedback` GET, and the catalog mutations (2.3, 2.5, 2.12) on the page keys already in `lib/admin-pages.ts`; keep the public POST/listing surfaces unchanged.
3. **Admin-overridable target** — only honor a client-supplied target id *after* `requireAdminApi()` confirms admin; otherwise force it to `user.id`. Default-deny: self unless proven admin.

All current callers already send their own email/id, so switching to session-derived identity is **behavior-preserving** for legitimate use.

> Not auto-applied: these change request/response behavior and touch payment-critical routes, so they're left for review. Recommended order = the table above (criticals first, then the unauthenticated dump 2.3, then destructive/role-tampering writes, then read-only disclosures).

---

## 3. 🟠 Verification & payment bypass flags shipping enabled

`NEXT_PUBLIC_DEMO_MODE` is currently `true` in `.env.local`, and because it's `NEXT_PUBLIC` (client-readable) and **fail-open**, if it ever reaches a production build the trust model collapses.

| # | Sev | Location | Effect | Status |
|---|---|---|---|---|
| 3.1 | 🟠 | `app/api/courses/verify/route.ts:24-102` | Server-side: instantly sets a CourseAsset to `verified` with no transcript/admin review. | ⏳ Confirm off in prod |
| 3.2 | 🟠 | `components/courses/VerifyGradeModal.tsx:29`, `onboarding/EducationStep.tsx` | Client: makes transcript upload optional; adds "skip verification" bypassing the school-email code. | ⏳ Confirm off in prod |
| 3.3 | 🟡 | `components/ui/SetupWizard.tsx:40` | Lets tutors finish onboarding without connecting Stripe. | ⏳ Confirm off in prod |

**Recommendation:** make it a **server-only**, fail-closed flag (not `NEXT_PUBLIC`); confirm it's unset in every non-demo environment; track its removal before launch.

---

## 4. 🟠 Sensitive data exposure (logs & UI)

| # | Sev | Location | Issue | Status |
|---|---|---|---|---|
| 4.1 | 🟠 | `app/home/page.tsx:14,18` | `console.log` printed the **full Supabase session (access/refresh JWT)** + profile to the browser console on every load. | ✅ Fixed |
| 4.2 | 🟠 | `app/auth/reset/page.tsx:46-49,81` | Shows real users Supabase/SMTP/Mailpit operational internals ("set up custom SMTP… check Mailpit"). | 🔍 Confirm |
| 4.3 | 🟡 | ~43 API handlers | Return `details: error?.message` in 500 bodies, leaking Prisma/table/column internals. | 🔍 Confirm |
| 4.4 | ⚪ | `app/home/session/[id]/recording/page.tsx:44,172-213` | Non-functional demo player (hardcoded `currentTime = 88`) ships whenever `recording_url` isn't an http(s) URL. | 🔍 Confirm |

---

## 5. 🟡 Debug logging left in production — ✅ all 22 removed

Repo-wide `console.log` count went **22 → 0** on this branch (`console.error`/`warn` for genuine failures kept).

| Location | What | Status |
|---|---|---|
| `components/LiveKitRoom.tsx` (×10) | Screen-share lifecycle traces | ✅ Fixed |
| `components/EventDetailModal.tsx:132,158,210` | incl. keyboard-mash `console.log('even2222t', …)` | ✅ Fixed |
| `app/api/sessions/student/route.ts:41` | Dumped session rows (+ tutor PII) to server logs | ✅ Fixed |
| `lib/screenShare.ts:139,207,213` | Success traces duplicating toasts | ✅ Fixed |
| `app/home/tutor/availability/page.tsx:66`, `WizardTimeSlot.tsx:72`, `admin/AddSubject.tsx:100` | Misc debug dumps | ✅ Fixed |

---

## 6. 🟡 Type-safety & loose build/security config

| # | Sev | Location | Issue | Status |
|---|---|---|---|---|
| 6.1 | 🟡 | `next.config.js:4-6`, `tsconfig.json:11` | `ignoreBuildErrors: true` + `strict: false` — builds pass with real type errors; root cause behind ~219 `any` in a payments/auth codebase. | 🔍 Recommend |
| 6.2 | 🟡 | `next.config.js:21` | CSP `script-src` allows both `'unsafe-eval'` **and** `'unsafe-inline'`, defeating most XSS protection. | 🔍 Review |
| 6.3 | 🟡 | `components/admin/AddSubject.tsx:33`, `WizardTimeSlot`, `UsersTable` | Whole props bags / datasets typed `any`, hiding field-name typos. | 🔍 Recommend |
| 6.4 | ⚪ | `components/LiveKitRoom.tsx:66` | Hardcoded `wss://eclero-livekit…` fallback if `NEXT_PUBLIC_LIVEKIT_URL` unset — connects to a stale project instead of failing loudly. | 🔍 Recommend |
| 6.5 | ⚪ | `lib/analytics.ts:49` | Local `interface Window` shadows the global DOM type. | 🔍 Recommend |

---

## 7. 🟡 Swallowed errors & empty branches

| # | Sev | Location | Issue | Status |
|---|---|---|---|---|
| 7.1 | 🟡 | `SignUpWizard.tsx:101,187`, `SetupWizard.tsx:162`, `WizardTimeSlot.tsx:56`, `availability/page.tsx:80`, `student/sessions/page.tsx:62`, `EventDetailModal.tsx:143` | 7+ empty `catch {}` blocks hide fetch/submit failures from users and devs. | 🔍 Recommend |
| 7.2 | ⚪ | `app/api/earnings/route.ts:76-85`, `courses/review:108` | Bare `} catch {` swallow Stripe errors → silently returns zeros/null. | 🔍 Recommend |
| 7.3 | ⚪ | `student/sessions/page.tsx:58,60,103` | Empty `else` branches; `errorData` parsed then never used. | 🔍 Recommend |

---

## 8. ⚪ Dead code & unused exports (grep-verified)

| # | Location | Issue | Status |
|---|---|---|---|
| 8.1 | `components/ui/components/SubjectSelectProfile.tsx` (539 L), `UpdateProfileTimeSlot.tsx` (298 L) | Imported nowhere; ~90% copy-paste forks of live components. `SubjectSelectProfile` would crash if rendered. | ✅ Deleted |
| 8.2 | `components/ui/wizardIcons.tsx` (+ import in `SetupWizard.tsx:28`) | Whole file dead — icons imported but never rendered. | ✅ Deleted |
| 8.3 | `app/api/booking/create/route.ts` | `export {};` no-op route; `instant-request` superseded by `instant-authorize`; empty branches in `connect/return`, `sessions/update-status:52`. | 🔍 Recommend |
| 8.4 | `app/home/tutor/sessions/page.tsx:208-239` | Computes `totalEarnings` then discards it; ships a permanent `'$—'` placeholder card. | 🔍 Recommend |
| 8.5 | `app/(admin)/dashboard/subjects/page.tsx:35-50,165-218` | `handleCreateSubject` + state reachable only from a commented-out form (see 10.1). | 🔍 Recommend |
| 8.6 | `app/home/student/sessions/page.tsx:30-35`, `tutor/availability/page.tsx:6-7`, `explore/components/TutorCard.tsx:11,28` | Dead modal scaffolding, duplicate import, dead `onBook` prop + `tzTime` (orphans `currentTimeInTz`). | 🔍 Recommend |
| 8.7 | `AddSubject`, `SetupWizard`, `EventModal`, `FilterModal`, `WizardTimeSlot`, `EventDetailModal`, `tutor/[id]`, `admin/login`, `approvals` | Long tail of unused imports/interfaces/props/state (incl. `AddSubject`'s unused `loading` → unreachable spinner). | 🔍 Recommend |
| 8.8 | `lib/courses.ts` etc. + `components/ui/primitives` | Redundant `export` on module-internal symbols; Card/Badge/Spinner/Modal primitives effectively dead (consumers import only Button/Input). | 🔍 Recommend |

---

## 9. ⚪ Unused & redundant dependencies — ✅ unused removed

| # | Issue | Status |
|---|---|---|
| 9.1 | `date-fns`, `prop-types`, `react-date-range` (+ `@types/react-date-range`), `@swc/helpers` — **zero imports**. | ✅ Removed (36 pkgs pruned; build green) |
| 9.2 | `tsx` orphaned; `start` script pointed at a missing `server.ts`. | ✅ Removed `tsx`; `start` → `next start` |
| 9.3 | Redundant: `moment` + `moment-timezone` + `date-fns`; `sweetalert2` (1 file) vs `sonner` (22); `react-icons` (5 footer icons) vs `lucide-react` (47). | 🔍 Recommend (consolidate) |
| 9.4 | `dotenv` is dev-only (seed scripts) → belongs in devDependencies; `overrides.mermaid` pin is a transitive-of-Excalidraw smell. | 🔍 Recommend |

---

## 10. ⚪ Commented-out code & editing cruft

| # | Location | Issue | Status |
|---|---|---|---|
| 10.1 | `app/(admin)/dashboard/subjects/page.tsx:585-676` | ~90-line commented-out "Create New Subject" form (live page uses `<AddSubject>`). | 🔍 Recommend |
| 10.2 | `SetupWizard.tsx:433,445,529-531`, `SignUpWizard.tsx:249` | Dead commented JSX; a `cursor-pointer` row whose `onClick` is commented out (looks interactive, does nothing). | 🔍 Recommend |
| 10.3 | `app/globals.css:90`, `admin/login/page.tsx:37`, `availability/page.tsx:50`, `tsconfig.json:15-16` | Stray placeholder/instruction comments and misplaced tsconfig comments. | 🔍 Recommend |

---

## 11. ⚪ Legacy naming, stale infra & UI polish

| # | Location | Issue | Status |
|---|---|---|---|
| 11.1 | `prisma/migrations/` | **Migration history abandoned & contradicts `schema.prisma`** (2026 changes applied via hand-written `prisma/sql/*.sql`) — `migrate deploy` on a fresh DB yields a wrong schema. | 🔍 Recommend (re-baseline or document) |
| 11.2 | `scripts/seed-education.cjs`, `prisma/seed.ts` | Broken/orphaned seeders superseded by `seed-provinces-curricula.cjs`. | 🔍 Recommend (delete) |
| 11.3 | `.DS_Store`, `data/ontario_school_codes.xlsx`, `.gitignore` `eclero2.0.zip` | Committed OS/data artifacts; stale ignore rule. | ✅ Untracked + gitignore cleaned |
| 11.4 | `components/EventCalender.tsx` | Misspelled module; default export named `Selectable` (unrelated to a calendar). | 🔍 Recommend (rename) |
| 11.5 | `sessions-rls-policies.sql:17-34` | RLS compares `auth.uid()::text = <uuid column>` → type-mismatch error at eval. | 🔍 Confirm + fix |
| 11.6 | `app/api/subjects/create/route.ts:18` | Copy-paste log tag `[SUBJECTS_GET]` in the POST/create handler. | ✅ Fixed (`[SUBJECTS_CREATE]`) |
| 11.7 | `prisma/sql/2026-06-12_…sql:2` | Header references `scripts/run-sql.cjs` that doesn't exist. | 🔍 Recommend |
| 11.8 | `contacts/page.tsx:208-301` | React list `key` on inner `<tr>` instead of the mapped Fragment. | 🔍 Recommend |
| 11.9 | 6 admin ops pages | Double-wrapped layout (nested max-width/padding) + off-brand loading gradient. | 🔍 Recommend |
| 11.10 | `TutorProfileBubble.tsx:392` (+ ~15 files) | Avatars fall back to non-existent `/default-avatar.png` → broken image, despite a purpose-built `Avatar` primitive. | 🔍 Recommend |
| 11.11 | `SignUpWizard.tsx:134`, `student/page.tsx:180`, `admin/login/page.tsx:62` | Convoluted boolean; redirect-during-render; silent non-admin login loop. | 🔍 Recommend |

---

## Appendix A — Changes applied on branch `chore/audit-cleanup`

22 files changed, **+12 / −1512**. Verified with `npm install` (36 pkgs pruned), `tsc --noEmit` (clean apart from a pre-existing stale `.next` artifact), `eslint .`, and a full `next build` (**exit 0**).

- **Secrets/artifacts untracked** (local copies kept for rotation): `.env.local.backup`, `.env.backup`, `.DS_Store`, `data/ontario_school_codes.xlsx`.
- **`.gitignore`** now ignores `.DS_Store`, `.env*.backup`, `*.backup`; dropped obsolete `eclero2.0.zip`.
- **Deleted dead files:** `SubjectSelectProfile.tsx`, `UpdateProfileTimeSlot.tsx`, `wizardIcons.tsx` (+ its import).
- **Removed unused deps:** `date-fns`, `prop-types`, `react-date-range`, `@types/react-date-range`, `@swc/helpers`, `tsx`; fixed broken `start` script.
- **Removed all 22 debug `console.log`s** (incl. the JWT-leaking ones).
- **Hygiene:** `.env.example` Stripe key → placeholder; `[SUBJECTS_GET]` → `[SUBJECTS_CREATE]`.

## Appendix B — Required manual follow-up (cannot be auto-applied)

1. **Rotate** the leaked Supabase service-role + anon keys, Postgres password, and LiveKit key/secret (§1.1), plus the reused `Baba$123` (§1.2). **Purge git history** of the backup files.
2. **Confirm `NEXT_PUBLIC_DEMO_MODE` is unset in production** (§3) and make it server-only/fail-closed.
3. **Fix the IDOR family** (§2) via `requireUser()` / `requireAdminApi()` — criticals first.
4. Then work the 🔍 items in §4–§11 (error handling, dead code, dep consolidation, migrations, polish).
