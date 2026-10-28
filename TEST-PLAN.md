# Comprehensive Vows acceptance plan

Use the actual production HTML copied into the local demo by `demo:prepare`. Do not judge permissions from hidden controls. Use distinct browser profiles for separate users and direct SDK Rules tests for denied reads/writes. Run only on the guarded demo project; no real guests, bank records, messages or photos.

Record each case as **PASS / FAIL / BLOCKED / NOT RUN**, with date, browser/device, role UID, exact document path and sanitized error/output. Do not mark a known missing capability as passed. Any unexpected private read/write is a security blocker. Expected partner denial proves the gap, not implemented co-ownership.

## 1. Role matrix (actual intended boundaries)

“R” is read; “RW” is permitted operations only, not unrestricted document mutation. Owners still cannot rewrite immutable check-ins, configure operator UIDs as a client, enumerate code collections, or skip stationery state rules.

| Actor | Own draft/editor/publish | Guest contacts/seating | Gate admit | Collection logistics | Thank-you drafts | Vendor contacts | Gift/payment finance | Stationery orders |
|---|---|---|---|---|---|---|---|---|
| Couple owner | RW | RW | Create once | RW | RW | RW | RW | Own orders; approve exact proof |
| Partner distinct login | DENY | DENY | DENY | DENY | DENY | DENY | DENY | DENY (gap) |
| Mother of bride | DENY (sanitized staff R only) | R | DENY | R; released handover only | R; edit/manual sent | DENY | DENY | DENY |
| Chief bridesmaid | DENY (sanitized staff R only) | R | Create once | R; released handover only | R; edit/manual sent | DENY | DENY | DENY |
| Planner | DENY (sanitized staff R only) | R | Create once | DENY | DENY | R | DENY | DENY |
| Stationery operator | DENY | DENY | DENY | DENY | DENY | DENY | DENY | Read all; allowed operator transitions only |
| Other owner/outsider | DENY for Maya | DENY | DENY | DENY | DENY | DENY | DENY | Other owner sees own order only |
| Guest signed out + code | Published page only | DENY private list; exact code name/seats/table only | DENY | No private desk | DENY | DENY | May submit unverified gift/aso-ebi claim, no reads | DENY |

Helpers may intentionally see published public wedding information as any visitor; denial of private draft/finance records is separate. Permission revocation cannot erase data already viewed.

## 2. Setup and dependency-free checks

- S01 Unzip into a writable folder. Confirm complete landing, editor, guest, legal and generator files and original rules/Worker source are present. No secrets, production account credentials, local Studio app, Functions or instant-RSVP backend are included.
- S02 Check Node 22.13+, npm and Java 21. `npm install` runs on your machine only. Review generated lockfile; fail if dependencies cannot install. Do not silently upgrade/downgrade or bypass security warnings.
- S03 Run README's six commands in two terminals. Ensure all listeners report loopback and project demo-vows-test. No Firebase login/project selection/billing is required. Hub and emulator UI must respond on 5000/4000.
- S04 `npm test` must pass all 26 preserved feature checks, all 48 preserved Worker checks and all 11 added harness checks. These do not prove Rules compilation or browser behavior.
- S05 `npm run test:rules` must compile the unchanged rules and pass the genuine SDK allow/deny cases. It writes only known synthetic fixtures. Do not accept a missing emulator/SDK as a pass. Save failures. Run separately from manual sessions; reseed afterwards.
- S06 Stop/start with no imported snapshot: data is empty until reseeded. Reseeding resets known accounts, claimed memberships and known RSVP/check-in state; random UI-created documents remain. Do not assume a global wipe.

### Automated suite map

| Suite | Enforcement exercised | Required acceptance |
|---|---|---|
| feature-tests.mjs | 26 existing client/contracts, including generator mocks | Passed at packaging; rerun locally |
| worker/test/*.test.mjs | 48 HTTP/service/contracts and native SQLite tests | Passed at packaging; not live Google/Cloudflare |
| test/contracts.test.mjs | 11 fail-closed guard, fixture and preparation contracts | Passed at packaging; not emulator compile proof |
| test/rules.emulator.mjs | Real Firestore emulator, authenticated/unauthenticated SDK calls, actual email/password Auth token metadata | NOT RUN at packaging; must pass locally |

The Rules suite uses actual password Auth for owner/unverified helper/partner, and authenticated Rules-test contexts for other role cases. It does not automate every read/write matrix cell; manual journeys and selective direct write-denial checks remain mandatory. It covers owner scoping; distinct partner denial; all helper finance/draft/cross-wedding denials; allowed sanitized reads; verified atomic invite claims; wrong-email/unverified/expired/reused/incomplete claim denial; revocation; guest exact code versus collection lists; publication/RSVP/request access; gate ceremony/seat/staff enforcement and concurrent one-admission; collection release; thank-you mutation restrictions; operator scope/payment/proof approval/delivery; atomic slug ownership; legacy totals and publication epoch rotation.

## 3. Authentication and invitation journeys

- A01 Owner signs in with the owner fixture; exact Maya slug opens editor and real operations. Draft URL opens too. Owner switcher lists only owned weddings.
- A02 Sign out, sign in as partner and open Maya URL. Auth succeeds but private wedding access is denied with real app error/creation screen. Do not create a new wedding to disguise the missing role. Direct guest/finance access must fail. Mark co-owner feature **NOT IMPLEMENTED**.
- A03 Each preclaimed helper opens published and draft operations by exact slug. Guest contacts/seating and sanitized ceremony details load. Draft root document and private money collections remain denied. Planner guest-list editing is not supported (R only).
- A04 New invitee signs in through its claim link, claims once and gains planner operations. Owner sees matching claimedBy UID. Invite-only update or role-only write fails; atomic matching batch succeeds.
- A05 Unverified fixture opens its link and is blocked before claim. Direct SDK batch is also denied. Optionally verify using emulator's local action link, reload token/page and claim successfully; no message is sent. Reseed afterwards.
- A06 Wrong email, wrong UID, changed role, expired token, already-used token and fabricated invite fail in direct SDK and UI. Claimed fixture invites remain memberships until disabled; claim expiry alone is not ongoing membership expiry.
- A07 Owner revokes a helper's live invitation. The helper's next protected read/check-in/edit fails even if the tab still shows stale data. Refresh access clears privileged UI. Cannot un-see previously viewed records.
- A08 Owner revokes/reissues a fresh role for the same helper email; only a verified atomic claim replaces old membership. Confirm old privileges disappear. New random UI invites are not deleted by known-ID reseed.
- A09 Other owner can open only their own draft and order; outsider has no private Maya access. Neither may change Maya's ownerUid or steal her slug. Attempt an existing slug and a simultaneous new-slug claim as two users; exactly one owner must win.
- A10 Sign-out, reload, stale tab, denied popup, error text, wrong password and empty fields behave safely. Google sign-in/email-delivery behavior requires separate controlled staging; do not invent a success from an emulator password test.

## 4. Guest/publication/RSVP/seating

- G01 Signed out, open Maya's published wedding; landing artwork, names/date/story, ceremony details, palettes and navigation render. Legal pages are drafts requiring operator review, not personalized legal advice.
- G02 Open draft/other-owner private slug signed out; deny content and exact code reads. A published-page visitor must never list all weddings, all codes or private guests.
- G03 Use MAYA22 in RSVP/Find table; display only that code's name/seats/table and QR, not phone/private notes/finance. Try lowercase/whitespace (normalizes), invalid and five/seven-character codes (no valid invitation). QR text must decode to VOWS1|maya-and-alex-demo|MAYA22.
- G04 Exercise all 12 parties, seat counts 1/2/3 and companions. GATE27 sees reception only; it must not get a garden-ceremony selector. Main and companion print names inherit the saved table.
- G05 Submit yes/no and per-ceremony counts; reload owner dashboard so the write-only RSVP dropbox merges. Guests cannot read the RSVP collection/document back. Raw direct SDK RSVP values/ceremony keys are not fully validated by current rules: inspect owner normalization/clamping instead of falsely expecting every invalid write to be denied.
- G06 Use another known valid code as signed out: it works by design as bearer-code access. Record the privacy limitation, not a “verified guest identity” pass. Code lists deny, but direct guesses lack a rate limiter.
- G07 Owner changes table and ceremony access, saves and refreshes passes; guest lookup and generated invitations reflect current data. Clear a table to see unassigned state; restore before personalised print tests.
- G08 Submit a new invitation request with companions/private seating note. It remains pending and private. Owner approves or current owner-side automatic processing runs when opened; only then issue a code. **No instant code/trusted background approval is implemented.** Check rejection/duplicate handling without claiming unfinished instant-RSVP integration.
- G09 Publish/unpublish with fresh driveEpoch. Signed-out page/code reads fail after unpublish. Add a legacy registry received field as owner: public access blocks until owner migration removes it; private received totals remain private.

## 5. Gate and device concurrency

- C01 Owner, planner and chief can select a saved ceremony, enter actual party size and submit a valid manual code. Mother, partner, outsider and guest are denied by direct Rules requests, not only hidden UI.
- C02 Unknown code, other-wedding QR payload, missing ceremony, wrong ceremony for GATE27, zero/negative/noninteger/excess seats, wrong staffUid and caller-supplied non-server timestamp fail. Admit only after saved **ADMIT**, never merely after scanning.
- C03 Two separate authenticated planner/chief sessions submit the same code/ceremony simultaneously. Exactly one admission record; the other result must be duplicate/DO NOT ADMIT, not a second admit. Existing record cannot be updated or deleted, even by owner.
- C04 Same code may be admitted once to each allowed ceremony. Do not admit split parties assuming remaining companions can arrive later; this version intentionally has no partial second entry/reset/re-entry.
- C05 Use actual downloaded QR card / guest QR; independently decode payload. Test intended Android camera/BarcodeDetector, denied camera permission, stop camera, background tab, device rotation and wrong QR. On unsupported/iPhone browsers test external phone QR reader plus paste or manual code; native iPhone scanning is NOT confirmed.
- C06 Disconnect network / emulator, retry and open stale tabs. No successful persisted write means no admission. No offline queue/authorization is promised. Revoke helper during a gate session and check subsequent direct transaction fails.

## 6. Gift / aso-ebi / thank-you flows

- F01 Owner sees synthetic verified/pending gifts and private totals. Each helper/partner/operator/guest directly reading gifts, registry, vendors, legacy asoebi and asoebiPayments must fail. No private financial field belongs in guest/code/logistics documents.
- F02 Guest submits unverified gift claim; no transfer is performed. Forged gift fields never count as verified payment. Only owner manual verification matched to guest identity changes eligibility. Guest cannot read claims; planner cannot verify.
- F03 Baseline MAYA22 has a verified-gift draft but no seeded attendance. Build drafts twice: preserve existing edits/sent state, include recorded arrivals or verified gifts, exclude RSVP-only and pending-gift-only parties. Use no financial amounts in helper-visible messages.
- F04 Mother/chief edit draft; save persists. Empty phone prevents accidental sending. Do not add real numbers. Opening WhatsApp is not sent confirmation; only explicit manual sent action and timestamp persist. Planner cannot read or edit drafts.
- F05 Guest submits known item/code/quantity/amount claim; it stays unverified. Invalid code/item, nonpositive quantity or out-of-bounds amount fails. Owner records claim as one deterministic order; processing twice must not duplicate it.
- F06 Mother/chief read pending-order logistics without due/claimed/verified amounts. Collection before release fails; helper cannot toggle ready. Owner manually verifies synthetic received amount and releases. A helper confirms physical handover only for released ready-order; never claim a real handover happened.
- F07 Planner reads synthetic vendor contact/arrangement only, not the legacy invoice; mother/chief cannot read vendor contacts. Any published public gift instructions are separate from private received totals.

## 7. Stationery and print acceptance

- P01 Checkout shows disabled/unconfigured state; no bank account is invented. Enabled configuration flag alone still leaves checkout disabled with blank payout fields. Client cannot edit stationeryConfig/operator UIDs. No payment occurs.
- P02 Operator logs in through the real header workspace and sees synthetic pending/paid/other-owner orders. Helpers/partner are denied order reads, owner sees only own orders. Operator is intentionally authorized across stationery customers, but not wedding finances.
- P03 Operator cannot jump pending → proof_ready/delivered or approve on behalf of couple. Walk pending → payment_confirmed → proof_ready, couple-only exact URL approval, then operator delivery of the exact approved proof. Wrong owner's approval, changed URL, missing/non-HTTPS URL and skipped states fail. A .example URL tests validation only; do not pretend it is a working restricted-hosted proof.
- P04 Download the synthetic paid brief from operator workspace; open the actual stationery-generator.html; generate real editable layouts. Baseline has 24 names including companions and saved tables. No phone, seating note, receipt or amount appears on seating/name cards. Pending/unpaid orders cannot generate. This is manual operator verification and rendering, not automatic bank verification.
- P05 Exercise Essential (₦20,000, no named seating/place cards) and Personalised (₦50,000, max 200 named people) using controlled synthetic briefs or original unit cases. Missing tables, invalid/oversize names, >200 people, unsafe links and wrong pricing must block or require correction, not silently invent/truncate rows.
- P06 Print actual A3 welcome/chart, A5 table/sign and 90 × 50 mm cards on A4 cut sheets: browser Print → Save as PDF at 100%, no headers/footers; measure margins/dimensions, long-name wrap, companion count and QR readability. Edit wording, save HTML, reopen and verify literal characters are safe. Browser print, not a promised one-click PDF backend.
- P07 Real new-order receipt upload/checkout requires operator-owned valid staging payment configuration and manual review; not part of a no-bank local fixture success. Test 200 KB/JPG/PNG/PDF constraints using only synthetic files; never upload actual bank receipts to public Hosting.

## 8. Photos, environment and release decision

- X01 Unconfigured photo backend reports unavailable while core wedding flows continue. Do not point this local kit at a real Worker with demo tokens.
- X02 Optional later Free Worker/D1/Google setup needs real owner-owned configuration: OAuth/Picker/consent, private folder selection, owner-token revocation, upload/preview/download toggles, chunk retry/races, quotas/10 ms CPU, HEIC policy, unpublish/disconnect effects and final media authorization. Existing 48 mocked/SQLite tests do not complete these live tests. Stop if any service requires billing; no Blaze fallback.
- X03 Never commit .demo-public, emulator snapshots/logs, dependencies, real credentials/guest lists/order receipts, service accounts, .env or .dev.vars. Review Git status before publishing a repository. Demo config/fixture source may be in the private source repository; never serve them publicly.
- X04 Check responsive layout, keyboard/focus, labels, error announcements, 200% zoom, contrast, reduced motion, narrow phone screens, denied clipboard and slow/CDN-failed loads. Run actual browsers; parsing HTML is not visual QA.
- X05 Only after emulator/browser acceptance, plan a separate staging deployment with your own restored production web config and explicit project ID. Never deploy firebase.demo.json or use the seeder on staging. Document remaining partner gap, code trust limits, device/print/photo blocks. No “all roles complete / production secure” claim from this ZIP.
