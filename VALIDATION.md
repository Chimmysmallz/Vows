# Validation record — 2026-10-28

## Actually run in the packaging environment

Node.js **v24.7.0**, without package installation, deployment or billing changes:

- `npm test`: **PASS** — 26 preserved feature contract/unit checks, 48 preserved Worker HTTP/service/adapter/release checks, 11 new harness contracts (**85 total**).
- Worker adapter cases execute the real native Node SQLite database/migration/CAS SQL. Provider/Auth/HTTP/Cloudflare and feature DOM/QR dependencies are mocks where documented in the original suite.
- `npm run demo:prepare`: **PASS** — generated local copy from all six original public pages; a repeated run is tested for idempotency and source preservation.
- Added contracts check loopback/demo guards, forbidden credential environment, unique reserved-example accounts/passwords, 12 parties / 24 names, consistent claimed helper invites, no partner role, privacy-separated fixtures, disabled stationery payout, exact original source preservation and demo port binding.
- Node syntax checks for new scripts, test files and all Worker modules: **PASS**. HTML inline script parsing is also in the original/new test suites. Syntax parsing alone does not execute a browser or Firebase rule compiler.

## NOT RUN — mandatory local acceptance

- `npm install`: **NOT RUN here**. Dependencies are pinned in package.json; no fabricated package-lock.json is shipped. Dependency installation/audit must succeed on your computer.
- Firebase CLI: absent. Java: absent. Firebase emulator SDK dependencies: absent. **Firestore Rules compilation and genuine emulator suite execution: NOT RUN**. `test/rules.emulator.mjs` is real SDK test source, not mocked enforcement, but is not certified passing until you run it.
- Auth email/password sign-in, email verification action links, invite claim and complete browser role journeys: **NOT RUN here**. Accounts are fixture definitions until the local seed succeeds. The unrun Rules suite contains actual password Auth cases for owner, unverified helper and partner; other role cases use authenticated Rules-test contexts with verified-email metadata. Its matrix is selective automation, not exhaustive read/write coverage for every cell; complete the manual matrix too.
- Mobile camera/BarcodeDetector/iPhone manual fallback, actual CDN QR generation/decoding, print/PDF measurements, browser screenshots/responsiveness/accessibility: **NOT RUN**.
- Worker/D1 deployment, Google OAuth/Picker/Drive, remote photo upload/media, quotas/CPU profiling and real provider integration: **NOT RUN / NOT CONFIGURED**.
- No actual online accounts, payments, receipt verification, email/WhatsApp sends, physical collection, public repository creation or staging deployment occurred.

## Interpretation

These results show source contracts, SQLite behavior and harness preparation—not a production security certification. Separate partner co-ownership is still not implemented; guests still use bearer invitation codes. Read KNOWN-LIMITATIONS.md and complete TEST-PLAN.md, including direct permission-denial tests, before deployment. Never weaken rules or enable billing to turn a failed test green.

A read-only independent source review is performed before final packaging. Its eventual disposition is recorded in REVIEW-RESULTS.md; it does not replace missing emulator/device/provider execution.
