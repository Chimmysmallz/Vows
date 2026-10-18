# Vows.ng: six-feature update and beginner setup

> **Free-backend edition.** The existing core guide is retained. Both Firebase configurations now omit Functions and keep Hosting/Auth/Firestore on Spark. Optional photos use only the separate Workers Free + D1 Free source described in `free-backend-setup.md`; do not deploy the superseded Blaze package. Rules still require a fresh `driveEpoch` on publication changes. Complete the updated privacy/terms drafts before publication.

## What this download is

Updated Firebase website source, not a deployed or fully live-tested service. The website remains free. Essential stationery is **₦20,000**; Personalised is **₦50,000**, with up to 200 named people. Printing, physical delivery and custom-size quotations are separate. No Cloud Functions, billing enablement, payment gateway, automatic WhatsApp sending or automatic bank verification is included.

The existing Firebase placeholders are retained. The staging project identifiers already in the source are **not an instruction to deploy into that project**. Replace every Firebase configuration field with the configuration of the project you control.

### Files

- `vows-app.html`: couple editor, authenticated helper operations and stationery operator workspace. Venue artwork is now embedded in the HTML.
- `vows-guest.html`: public wedding page, invitation requests, RSVP, genuine gate QR display, find-table form and aso-ebi payment claims. Artwork is embedded.
- `stationery-generator.html`: automatically constructs editable, native print layouts from a real payment-confirmed order brief. QR encoding requires the pinned public CDN library to load. Generated stationery embeds its QR SVG and needs no network or Firebase login to print.
- `firestore.rules`: actual access boundaries, private roles/invites, immutable check-ins, separated money/collection documents and paid proof state transitions.
- `storage.rules`: legacy Storage reads gated by publication and photo approval. All new Storage uploads are disabled in this no-billing build.
- `firebase.json`, `firestore.indexes.json`: existing Hosting routing and Firestore configuration; no new composite index is needed by these queries.
- `feature-tests.mjs`: dependency-free Node contract/unit tests; run alongside the HTML and rules files with `node feature-tests.mjs`.
- `validation-results.txt`: checks performed and important limits.
- `feature-setup.md`: this guide.

Your existing landing, privacy and terms pages are unchanged and should remain in your site. The two updated HTML files do not require the old `art/` directory. Keep that directory if your unchanged landing page still uses it.

## 1. Back up before replacing files

Save copies of your current HTML files, rules and Firebase data. Do this on your computer, not by making a public backup page. Use a staging project first. Do not paste service-account keys, administrator credentials or bank login details into any HTML file. The browser Firebase web configuration is not an administrator secret; authorization comes from these rules.

Create this folder layout on your computer:

```text
vows-release/
  firebase.json
  firestore.indexes.json
  firestore.rules
  storage.rules
  feature-setup.md
  feature-tests.mjs
  validation-results.txt
  vows-app.html                 # original downloaded source, useful for tests
  vows-guest.html
  stationery-generator.html
  public/
    index.html                 # retain your existing landing page
    privacy.html               # retain your existing privacy page
    terms.html                 # retain your existing terms page
    app.html                   # COPY vows-app.html here
    wedding.html               # COPY vows-guest.html here
    stationery-generator.html  # COPY the generator here
```

Do not upload `feature-tests.mjs`, rules, backups or order JSON briefs into `public/`. A file in Firebase Hosting is public, even if the app does not link to it. Never put private guest lists, bank statements, receipts or proofs containing guest names in public Hosting.

The supplied `firebase.json` routes `/app.html` to the editor and `/<wedding-slug>` to the guest page. Existing static files are served before the guest-page fallback. Retain your current landing/legal-page files when deploying; replacing Hosting with only these two pages would remove them.

## 2. Set up Firebase without enabling billing

1. Open the Firebase console for your own project. Use its free Spark plan. Stop if a requested service requires a billing upgrade; this build does not need that upgrade.
2. Under Project settings → Your apps, register/open your Web app and copy its Firebase configuration.
3. In both downloaded HTML sources, replace the six fields in `const firebaseConfig = {...}`. Then copy the edited files into `public/` using the names above. Both pages must use the same project. Do not leave `PASTE_YOURS` or someone else's staging project ID in production.
4. Enable Cloud Firestore. Do not choose public test-mode rules. Paste/deploy `firestore.rules` before testing real guest data.
5. Under Authentication → Sign-in method, enable Email/Password and Google. Add your actual Hosting/custom domain to Authorized domains. Helpers using email/password must verify their email before accepting an invite. Google accounts normally supply a verified email claim.
6. Do not enable Cloud Functions or Storage for this build. Stationery receipts are small authenticated Firestore order attachments, not Storage uploads. Gift/aso-ebi claims have no receipt upload; verify them against your own bank statement.
7. If you already have Firebase Storage, install `storage.rules` using its Rules editor. Do not provision a new paid bucket just to install these rules.

Use the official Firebase CLI setup guide if the CLI is not already installed: https://firebase.google.com/docs/cli. No packages or emulator tooling were installed during this implementation.

From your release folder, select **your own project**, not the identifiers left in the example source:

```sh
firebase login
firebase use --add
node feature-tests.mjs
firebase deploy --only firestore:rules,hosting
```

These are instructions for you to run after staging acceptance, not commands executed on your behalf. Do not deploy to an employer's project or a project you do not own. If you already have Storage, paste its rules in the console separately or deploy `--only storage` only to your existing configured bucket.

## 3. Required migration for existing weddings

New weddings use an atomic, create-only slug claim. Existing weddings still load through an owner-filtered query. Unclaimed old slugs cannot be overwritten by another account: the wedding update rule rejects that attempt. An old conflict may show “address unavailable” instead of revealing a draft.

For **every existing wedding**, sign in as its actual owner and open the updated editor. This removes old embedded `registry[].received` totals and creates `staffInfo/main`, a sanitized helper projection. Save the wedding details and assign/save ceremony IDs. Public reads of legacy wedding documents containing embedded `received` totals are blocked by the new rules until migration. Before exposing an existing published page, remove any embedded `received` totals in the Firebase console if you have not yet opened it with the updated owner editor. Historic public copies cannot be recalled.

Important document separation:

- `guests`: private contacts, seating and RSVP records. Never add financial fields here.
- `gifts`, `registry`, `asoebiPayments`, old `asoebi`, old `vendors`: owner-only financial/legacy data.
- `asoebiCollections`: new logistics-only documents, distinct from old `asoebi` documents. No price, due, transfer amount or balance fields.
- `vendorContacts`: new planner-readable contact documents. Copy only contact/arrangement information from old vendor records, not private bills or financial notes.
- `thankYou`: names, phone, draft message and manual send state. Generated drafts never contain gift amounts or totals. Do not intentionally put financial amounts in messages that helpers can read.
- `staffInfo/main`: names, ceremony details, wedding date and publication state. Helpers do not read the bank/registry-bearing draft wedding document.

Published pages intentionally expose the gift bank details and gift goals the couple chooses to publish. **Actual gift amounts/received totals are not published.** If you do not want an account number public, leave the gift account fields blank. Helpers, like any member of the public, can visit an intentionally published public page, but their helper permissions cannot retrieve owner-only financial records.

### Existing Storage files and download-token warning

Changing rules does **not** revoke an existing Firebase token-bearing download URL, someone else's copy, or a file already downloaded. If you previously issued `getDownloadURL` links for private or draft files, revoke/remove their `firebaseStorageDownloadTokens` metadata with the Storage console or a trusted administrator tool. Do not reissue permanent download tokens for private files. Until old tokens are revoked, do not claim those legacy URLs are private.

Legacy public photo reads now require a published parent wedding, a photo document whose ID exactly matches the Storage filename, `approved: true`, and matching `storagePath`. Without matching approved metadata, only the owner can read it. Gallery reads require a published parent. This build does not upload new photos or receipts to Storage.

## 4. Helper roles that are actually enforced

Sign in as the couple. Under Wedding operations, enter the helper's exact sign-in email, choose a role and create a private invitation link. Send it yourself. No directory lookup, shared PIN or password document is used.

The helper signs in with that email, verifies it using the header button if needed, reloads the link, then claims it. The random invitation token is single-use and expires after seven days **for claiming**. Claimed membership continues until the owner revokes it. Rules bind the invite email to Firebase's verified authentication identity and require the invite claim and UID membership to be written in the same batch.

| Permission | Couple | Mother of bride | Chief bridesmaid | Planner |
|---|---:|---:|---:|---:|
| Draft wedding editor, ownership, publishing | Yes | No | No | No |
| Sanitized draft operations, guest contacts/seating | Yes | Yes | Yes | Yes |
| Gate admission | Yes | No | Yes | Yes |
| Aso-ebi collection, without amounts | Yes | Yes | Yes | No |
| Thank-you drafts/manual sent confirmation | Yes | Yes | Yes | No |
| Vendor contacts/arrangements | Yes | No | No | Yes |
| Gift/payment verification, amounts, stationery orders | Yes | No | No | No |

A separately console-authorized stationery operator has its own paid-order privileges; a wedding helper role does not grant operator privileges.

Click Revoke to switch an invite off. Rules check the membership **and** live invitation on each protected request. This blocks new reads/writes immediately; it cannot erase information already seen or downloaded. To change a role, revoke the old invite, create a fresh invitation for the same email, and have the helper claim it. The fresh owner-issued invitation can securely replace their old membership.

Owners can select their own weddings from the switcher. Helpers reopen with the exact slug or `app.html?wedding=<slug>`. They cannot scan/list all weddings to discover drafts. “Refresh access and operations” rechecks their active access. Newly invited helpers need the couple to have saved the wedding so its sanitized projection exists.

## 5. Gate QR and duplicate-entry prevention

1. Add/approve real guests. Save named ceremonies, up to eight. Each ceremony has a persistent ID.
2. Use Edit ceremony access beside a guest to restrict that invitation; leaving it blank means all saved ceremonies.
3. Click Refresh approved gate passes after editing existing ceremonies/invitations. New guest creation also writes a gate pass when ceremonies exist.
4. Download the guest's real QR invitation from the guest row, or have the guest retain the QR shown when they find their invitation on the public page. The QR encodes `VOWS1|actual-wedding-slug|actual-code`, not a decorative pattern. The pinned library is `qrcode-generator@1.4.4`; a working network connection is needed for the editor/guest page to load it. If it fails, the six-character code remains usable.
5. At the gate, use a couple, chief-bridesmaid or planner account. Select the correct ceremony, enter the people actually entering, scan/paste the QR or type the code, then press Check and admit once.
6. Admit only after the saved **ADMIT** result. A camera scan alone does not record or authorize entry. Offline, failed, unknown, wrong-wedding, wrong-ceremony or excessive-seat attempts must not admit a party.

The Firestore transaction writes a create-only `checkins/<ceremony-id>_<code>` record. Concurrent devices should yield one successful admission and one duplicate result; the rules prohibit updating/deleting that first record. An invitation admits one party once per ceremony. Do not admit a partial party if companions plan to arrive separately: this version intentionally does not support later partial admissions, gate-record resets, exit/re-entry or offline admission. Confirm group identity at the desk; QR possession alone is not photo identification.

Camera detection requires HTTPS plus native `BarcodeDetector` QR support. It is commonly available on Android Chrome but varies by device. iPhone Safari and unsupported browsers must use a phone QR reader and paste its text, or manually enter the printed code. No image-upload decoder is included. Camera scanning and real-device concurrency still need the acceptance tests below.

## 6. Thank-you desk

The couple verifies gift claims against bank records and matches each to a real invitation code. Then Build drafts uses **recorded check-ins** and **verified gifts** only; RSVP alone and unverified transfer claims do not count. It creates one draft per invitation and preserves already edited/sent drafts on repeated runs.

Mother/chief-bridesmaid can help with the amount-free drafts. Edit and save a draft, open WhatsApp, press Send yourself there, then return and explicitly confirm it was sent. Opening WhatsApp does not set `sent`. If popups or WhatsApp are unavailable, copy the editable message and send it manually; do not confirm until it really was sent. There is no automatic/background thank-you sender, invented guest photo or generated recipient.

## 7. Aso-ebi payment and physical collection

The couple first saves actual item names. Guests can submit an unverified payment claim with their valid invitation code, item, size, quantity and amount. They transfer only using instructions from the couple; this update supplies no invented payment account or recipient.

The couple records a claim as an order, enters the actual total due and checks the bank statement before entering the actual received total. Claimed transfers are **not** verified automatically. The amount/verification document is owner-only. When the verified total covers the amount due, the separate logistics record becomes ready for collection. Mother/chief-bridesmaid see only name/code, item, size, quantity, released/collected state; they confirm a real physical handover. Unreleased orders cannot be marked collected by helpers. Legacy aso-ebi documents do not become helper-readable.

This is manual order/payment/collection tracking, not stock control, a refund gateway or an automated bank reconciliation service. Duplicate guest claims can be rejected by the couple; processing the same claim twice is prevented by a deterministic claim/order transaction.

## 8. Automatic stationery layouts and paid proof flow

In the console, create `stationeryConfig/main`. Start with `enabled: false`, `operatorUids: []`. Add only the **actual Firebase Auth UID(s)** of your stationery operators, plus the real stationery business `accountName`, `bank` and ten-digit `accountNumber`. Set `enabled: true` only once those details are correct. Configuration writes are console-only. Do not put administrator credentials in it.

The couple submits Essential ₦20,000 or Personalised ₦50,000 with a JPG/PNG/PDF transfer receipt, at most 200 KB, and confirmed saved details. Order snapshots are read from persisted wedding/guest documents, not unsaved form fields. Personalised snapshots include each companion's actual name and inherited table. Correct the real guest records before paying/ordering.

The operator signs in and clicks **Stationery operator workspace** in the header; no owned wedding is required. Authorized operators can read orders and download receipts and JSON order briefs. The operator checks the real transfer and advances the order to `payment_confirmed`.

Open `stationery-generator.html`, select the downloaded **payment-confirmed** brief, and generate. It downloads real editable HTML layouts:

- A3 welcome sign;
- A5 table-number cards from actual table assignments, gift-table sign and genuine RSVP-link QR sign;
- for Personalised, A3 seating chart pages and 90 × 50 mm named place cards on A4 cut sheets, up to 200 people, including companions.

Only names and tables appear on charts/cards. Phone numbers, medical/seating requests, receipts, guest group/party notes and transfer amounts are excluded. No names, tables or financial accounts are invented. Empty table assignments produce no fictional table cards. Personalised printing requires actual table assignments. Standard sizes only; custom sizes still require an agreed quote. Long print names/table labels must be corrected in the source records, not silently truncated.

Open the generated HTML in a browser, click wording to edit, and download the edited HTML. Use **Print → Save as PDF**, 100% scale, no browser headers/footers; print separate page ranges if the printer cannot handle mixed paper sizes. Enable background graphics for the chosen colours. This is a supported browser print workflow, **not a promise of a one-click binary PDF**. Review actual margins, names, QR readability and cut sizes on a test print before sending a proof.

Share a private, versioned HTTPS proof link accessible to the couple and operator, not a public guest-list file. In the operator workspace, move `payment_confirmed → proof_ready` with that link. Only the couple can approve their specific proof URL (`proof_ready → proof_approved`). The operator cannot approve for them. After approval, deliver only that exact approved proof/version, with a valid HTTPS final-file link, then mark `delivered`. Do not overwrite a proof's contents behind a previously approved URL. Changed artwork should use a fresh version and a new order/proof agreement; this version has no post-approval revision reset.

Layout construction is automatic from the real paid snapshot. Payment confirmation, proof inspection, restricted file hosting and delivery remain human actions. No background renderer, paid server or automated WhatsApp fulfilment is included.

## Acceptance checklist before real use

The supplied tests are a baseline, not a security certification. Firebase CLI/Java/emulator packages, a browser camera and browser print engine were unavailable here. The rules were **not compiled/executed against a Firebase emulator**. The CDN source could not be downloaded in this environment, so actual QR decode testing is still outstanding; the generator-only unit tests use DOM/QR mocks.

On a staging project, complete these tests with genuine test accounts and your own harmless test data before using real guests or payments:

1. Unpublish a wedding. In an incognito browser signed out, direct wedding gets and exact code gets must be denied; all-wedding lists must be denied. Owner-filtered queries must work. Enabled helpers must read only sanitized operations, not the draft wedding.
2. Invite each role. Wrong email, unverified email, expired token, reuse by another UID and attempted self-promotion must fail. Revoke each helper and confirm their next protected read/write fails. Reissue a different role and confirm only the fresh invite grants it.
3. In the Firestore Rules simulator or a genuine emulator test suite, try direct reads of gifts, payment documents, legacy financial collections and another owner's stationery orders as each helper. They must fail. Do not treat hidden UI as proof of authorization.
4. Issue an actual QR from the deployed source. Decode it on your phone and verify its exact wedding/code payload. Scan on the intended gate devices, check unsupported-browser manual fallback and denied camera permission. From two signed-in devices, submit the same card/ceremony simultaneously: one admission only. Test changed ceremony, too many seats, removed guest, expired/revoked helper and loss of internet.
5. Verify RSVP-only guests do not get attendance thank-yous; unverified gifts do not get gift drafts; opening WhatsApp never marks sent; explicit confirmation persists after reload. Check that helper drafts contain no amounts.
6. Submit an aso-ebi claim. Confirm helpers cannot read due/claimed/verified amounts or collect it before release. Verify payment as owner, physically collect as mother/chief, refresh and confirm saved state. Retry processing the same claim; it must not duplicate an order.
7. Confirm both package prices and the payment → proof → couple approval → delivery transitions. Operators must be unable to skip payment or approve the couple's proof; owners must not approve someone else's order.
8. Generate both packages from actual order snapshots. Check companions, all table assignments, 200-person limits and that charts contain no phone/medical notes. Print at measured A3/A5/90 × 50 mm sizes. Decode the RSVP QR on the final print. Confirm browser-edited output safely preserves literal characters rather than treating names as HTML.
9. For any legacy Storage objects, test publication and approval checks with SDK requests, and separately confirm old download tokens were revoked. Never assume rule changes revoke token URLs or previously downloaded copies.

If you have the Firebase emulator toolchain locally, use the official suite to compile these rules and run authenticated allow/deny tests against them before production: https://firebase.google.com/docs/rules/unit-tests. Do not enable billing or deploy production just to bypass a failed test.
