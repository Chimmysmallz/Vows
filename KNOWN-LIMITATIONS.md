# Known limitations and acceptance blockers

This kit packages the actual current website; it does not quietly implement a new backend or replace it with a fake role switcher. Passing contract tests is not evidence that Firestore rules compile, that a camera works, or that a remote integration is configured.

## Explicit product gaps

1. **Separate partner/co-owner access: NOT IMPLEMENTED.** Ownership is a single `ownerUid`. The partner Auth fixture must be denied private access. Do not share the owner login or label a helper as a partner/co-owner.
2. **Guest “login” is an exact invitation code, not email/password or verified identity.** No guest Auth users are invented. Code lookup documents reveal name, seats and table to anyone who knows a valid code while published. Code list queries are denied, but direct guesses have no application-level rate limit. Knowing someone else's code allows using their RSVP; there is no OTP or proof of identity.
3. **Instant RSVP/invitation issuance is NOT integrated.** New guest requests go into a pending dropbox. Manual approval or the current owner's auto-processing mode runs when the owner loads/processes requests, not an always-on trusted service. A submitted request is not an issued invitation; no instant code is promised. The separate unfinished instant-RSVP work is not merged into this kit.
4. Helper roles read guest contacts/seating but do not write the owner guest list. Mother cannot admit at the gate. Planner cannot access collection, thank-you or financial desks. These are actual boundaries, not all-powerful “staff” accounts.
5. One gate admission per party per ceremony. No split arrivals, later partial admissions, reset, exit/re-entry, offline authorization or photo-ID verification. A QR alone is not identity proof.

## Known trust/validation limits in unchanged source

- Public RSVP rules verify the known code, publication, allowed outer fields and map size; they do **not** validate every response value, seat count or ceremony key. The owner-side merge clamps to allowed ceremonies/seats. Do not claim invalid direct RSVP writes are universally rejected or that data can never be overwritten by a code holder. Test both the raw dropbox and merged owner result.
- Public gift claims are unverified submissions. The rules do not require a valid invitation for every gift claim; a forged name/code/amount must never be treated as a verified transfer. Aso-ebi claims do require a known code/item, but remain unverified. There is no abuse-rate limiter, automatic reconciliation or payment gateway.
- Public wedding documents intentionally include only the gift instructions/goals the owner chooses to publish; received totals are private. Helpers can view intentionally published details as public visitors too. Empty account fields in this kit are deliberate.
- Helpers' thank-you text is editable free text. Do not paste financial amounts or sensitive data into it; rules cannot infer whether text contains a secret. Revocation blocks subsequent requests, not information already cached/seen/downloaded.
- Existing owner code creation checks for collisions before a batch, rather than a create-only transaction on the code. Concurrent real code generation collisions are not proven impossible by these tests. The deterministic fixtures contain no collisions. Slug claims, invite claims and check-in races have their own atomic enforcement tests.
- A stationery paid snapshot is captured by the client; server rules validate structure/pricing/state but do not cryptographically prove a bank transfer or that every snapshot field matches the current live guest list. Operators must review payment and saved details manually. Config is publicly readable by design; never put secrets there.
- Legacy Firebase Storage token URLs may remain usable until separately revoked; rule changes cannot recall downloaded data. No new Storage uploads are enabled in this build.

## Not configured / not executed

- Firebase CLI, Java and installed emulator test SDKs were unavailable in the packaging environment. The genuine `test/rules.emulator.mjs` suite is included but **NOT RUN**; rules compilation, Auth emulation and full browser journeys are not certified. Run all six quickstart commands and stop on errors.
- The 26 feature checks use application/DOM/QR mocks, not Firebase enforcement. The 48 Worker tests include real native SQLite adapter tests but mock Google/Firebase/network/Cloudflare runtime boundaries. Neither is a live integration test or a security certification.
- QR encoding requires the pinned external CDN. Actual device decode, camera permission handling, native BarcodeDetector support and iPhone fallback are unconfirmed. Use manual code entry if camera detection is unsupported; test the real final QR/print.
- Optional Google Drive photos require your own configured Worker/D1/OAuth/Picker setup. Those services, secrets, Free CPU/capacity and Google APIs are **not emulated here**. Upload/gallery/download are intentionally not claimed working. Keep them off when unconfigured; never enable Blaze/paid fallback to pass a test.
- Stationery checkout is disabled and payout fields are empty. Synthetic existing orders support manual state/generator testing, not actual payment testing. There is no real bank verification, restricted proof hosting or automatic fulfilment. Example HTTPS .example proof strings test state validation only; they are not working hosted files.
- Generator print output needs browser print QA, measured A3/A5/A4/90 × 50 mm checks and real final QR decoding. UI state success is not proof that a file is securely hosted or correctly printed.
- Real email delivery, Google popup sign-in, password reset delivery, WhatsApp sends, physical collection, mobile/responsive/accessibility acceptance, real Firestore quota behavior and provider outages remain manual tests. The demo sends none.

## Release decision

Treat this as a **source + testing kit**, not a production-ready “all roles complete” release. Partner co-ownership and the raw RSVP/code-privacy limitations are visible acceptance gaps. Emulator failures must be resolved before deploying anything; external/device tests must be completed separately. Preserve the original rules, do not add a permissive demo exception, and keep all fixtures out of public production Hosting.
