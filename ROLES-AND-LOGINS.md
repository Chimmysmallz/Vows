# Local-only role logins and wedding fixtures

**These accounts exist only after you run the seeder against your local emulators. They are not online/public demo logins. Never reuse the passwords on a deployed service.** All addresses end in the reserved .example domain. No emails or messages are sent. The seed sets Auth emailVerified explicitly except for the negative unverified case; those are real emulator users, not browser view switches.

Start from README's six commands. Hub: http://127.0.0.1:5000/test-hub.html

## Auth accounts

| Journey | Email | LOCAL DEMO password | Email verified |
|---|---|---|---|
| Couple owner | `maya.owner@vows.example` | `DEMO-Maya-Owner-22!` | Yes |
| Partner (NOT IMPLEMENTED; private access denied) | `alex.partner@vows.example` | `DEMO-Alex-Partner-23!` | Yes |
| Mother of bride | `mother@vows.example` | `DEMO-Mother-Role-24!` | Yes |
| Chief bridesmaid | `bridesmaid@vows.example` | `DEMO-Bridesmaid-25!` | Yes |
| Event planner | `planner@vows.example` | `DEMO-Planner-Role-26!` | Yes |
| Stationery operator (own workspace) | `operator@vows.example` | `DEMO-Operator-Role-27!` | Yes |
| Outsider (private access denied) | `outsider@vows.example` | `DEMO-Outsider-Only-28!` | Yes |
| Unverified helper (claim denied) | `unverified@vows.example` | `DEMO-Unverified-29!` | NO |
| Other wedding owner | `other.owner@vows.example` | `DEMO-Other-Owner-30!` | Yes |
| New verified helper (claim real invitation) | `invitee@vows.example` | `DEMO-Fresh-Invitee-31!` | Yes |

Owner URL: http://127.0.0.1:5000/app.html?wedding=maya-and-alex-demo

Use the same URL for mother, chief bridesmaid and planner. Their enabled memberships are keyed to their individual Auth UIDs and matching, already-claimed private invitations. The owner can revoke them in the actual operations desk. For a fresh invitation journey, use the new invitee:

http://127.0.0.1:5000/app.html?wedding=maya-and-alex-demo&invite=demo-local-invite-invitee-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

Unverified negative invitation:

http://127.0.0.1:5000/app.html?wedding=maya-and-alex-demo&invite=demo-local-invite-unverified-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

For a true email-verification journey, use the link printed by the local Auth emulator / emulator UI; it sends no email. After verifying the unverified user, reload its private link, then claim. That changes the negative baseline; reseed before repeating denials. Do not use actual email delivery or real recipients.

**Partner expectation:** Alex signs in with the distinct partner account, then opens Maya's URL. Expect “No active helper access” / creation screen with an access error; private guest/financial requests must be denied. Public published details remain publicly readable like any visitor. There is no partner co-owner implementation, invite, shared credential workaround or supported partner role. This is a deliberately visible product gap, not a successful co-owner demo.

**Operator expectation:** sign in and click **Stationery operator workspace** in the header. The wedding link can show the creation/error screen first because operators have no wedding membership; use the header workspace, not a helper permission. Operator UID is listed in emulator-only stationeryConfig/main. Operators see stationery orders (including another owner's order), not wedding gift/payment records. Configuration stays disabled for new checkout; synthetic paid/pending fixtures are already present.

Other owner's private wedding: http://127.0.0.1:5000/app.html?wedding=other-owner-demo

Maya's draft operations: http://127.0.0.1:5000/app.html?wedding=maya-and-alex-draft

Signed-out draft wedding: http://127.0.0.1:5000/maya-and-alex-draft — expect unavailable/denied. Authorized helpers can read its sanitized staffInfo but not the private draft wedding document itself.

## Guests: invitation code, not an Auth login

Open http://127.0.0.1:5000/maya-and-alex-demo in a separate signed-out browser profile. Use the actual RSVP / Find my table form. Codes are exact, case-normalized six-character lookups. Their corresponding QR payload is actual text encoded by the existing pinned QR library on the owner/guest page; no fake QR artwork is substituted.

| Party | Code | Seats | Table | Ceremony access | Actual QR payload |
|---|---|---|---|---|---|
| 1 | `MAYA22` | 1 | Rose | Both | `VOWS1|maya-and-alex-demo|MAYA22` |
| 2 | `ALEX23` | 2 | Lily | Both | `VOWS1|maya-and-alex-demo|ALEX23` |
| 3 | `FAM224` | 3 | Palm | Both | `VOWS1|maya-and-alex-demo|FAM224` |
| 4 | `FRND25` | 1 | Fern | Both | `VOWS1|maya-and-alex-demo|FRND25` |
| 5 | `TEAM26` | 2 | Rose | Both | `VOWS1|maya-and-alex-demo|TEAM26` |
| 6 | `GATE27` | 3 | Lily | Reception only | `VOWS1|maya-and-alex-demo|GATE27` |
| 7 | `ROSE28` | 1 | Palm | Both | `VOWS1|maya-and-alex-demo|ROSE28` |
| 8 | `LILY29` | 2 | Fern | Both | `VOWS1|maya-and-alex-demo|LILY29` |
| 9 | `PALM32` | 3 | Rose | Both | `VOWS1|maya-and-alex-demo|PALM32` |
| 10 | `FERN33` | 1 | Lily | Both | `VOWS1|maya-and-alex-demo|FERN33` |
| 11 | `IRIS34` | 2 | Palm | Both | `VOWS1|maya-and-alex-demo|IRIS34` |
| 12 | `SAGE35` | 3 | Fern | Both | `VOWS1|maya-and-alex-demo|SAGE35` |

There are 12 synthetic parties and 24 named people per wedding. Companions have synthetic names and inherit the main invitation's table. All phone fields and bank/payout account fields are blank to prevent accidental sending/transfers. Private gift/payment values are synthetic numbers only. Guest contact, private note, payment and receipt fields are not placed in code lookup documents.

Codes are **bearer knowledge**, not identity authentication. Anyone who knows another valid code for a published wedding can retrieve that code's public name/seats/table and submit/overwrite its RSVP. Code lists are denied, but there is no client rate-limiting/OTP identity check on direct Firestore code gets. Do not represent this as a per-person verified login or a brute-force-proof system.

Wedding slugs and codes intentionally repeat across the three synthetic weddings to test path scoping: a code under Maya's published wedding does not grant draft/other-owner access. Draft and other-owner private guests/finances remain protected by the unchanged rules.

## Seeded operational states

- All ceremonies have stable IDs: demo-ceremony and demo-reception. Party 6 is reception-only. All 12 codes have matching guest IDs/seats/gate passes; none has been checked in at baseline.
- verified-gift and pending-gift are synthetic owner-only claims; a verified-gift thank-you draft exists for MAYA22. No attendance is fabricated. Rebuilding drafts should preserve the existing draft and exclude pending-gift until the owner explicitly verifies it.
- pending-order and ready-order separate asoebiCollections from private asoebiPayments. Mother/chief may collect only ready-order. pending-claim is an unprocessed guest claim.
- demo-pending-order and demo-paid-order are synthetic stationery state fixtures; the latter is labelled payment_confirmed for generator testing, **not evidence of any payment**. demo-other-order belongs to the other wedding owner. Operator authorization crosses orders intentionally, not wedding finances.
- Resetting overwrites known synthetic records and users, not arbitrary new records. Stop/restart without import for a completely empty emulator, then reseed. Do not attempt a production reset.
