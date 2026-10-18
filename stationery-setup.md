# Vows.ng stationery setup

Essential: ₦20,000. Personalised: ₦50,000. Wedding website remains free.

## Replace two files
1. Download vows-app.html and rename it app.html inside public.
2. Paste your existing Firebase configuration back into app.html.
3. Replace firestore.rules in the main project folder.
4. Run `firebase deploy --only hosting,firestore:rules` against staging first.
No changes to wedding.html, index.html, firebase.json or the artwork folder are needed for this stationery update.

## Keep orders closed until ready
Firebase Console → Firestore → Start collection → `stationeryConfig` → document ID `main`.
Add these fields using the console, not a public form:
- `enabled`: boolean, false initially.
- `accountName`: string, your actual stationery-business account name.
- `bank`: string, your actual bank.
- `accountNumber`: string, your actual ten-digit account number (keep leading zeroes).
- `operatorUids`: array containing your own Firebase Authentication user UID. Copy this UID from Authentication → Users after signing in. Do not use an email address or share anyone's password.
When everything below is ready, change enabled to true. Never put the couple's gift account here.

The app does not verify the bank account holder. Check the details independently before enabling payments.

## Ordering and fulfilment
Couples sign in, save wedding details, choose a package and collection, review names, table assignments and companions, confirm, transfer the exact price, and attach a receipt. Receipts must be JPG, PNG or PDF up to 200 KB. This bounded upload is stored privately with the Firestore order, so this first version does not depend on Firebase Storage.

Submitting a receipt sets Awaiting payment confirmation, not Paid. The couple and configured operators can read the order; other couples and guests cannot. Treat the receipt as an unverified document and confirm the funds in your bank.

Sign in using the operator UID configured above, open your wedding editor (use your own demo wedding if needed), and scroll to Stationery fulfilment. Refresh all orders. Download receipt and order brief. Update from Awaiting payment confirmation to Payment confirmed. After preparing a proof manually, add its HTTPS link and move to Proof ready. The couple opens the proof and approves it. Only after approval should you add the final-files HTTPS link and move to Delivered. The approved proof URL is retained and cannot be swapped during delivery.

Proofs and final files are manually prepared and shared. No PDF-generation, printing or delivery service has been built. Host proofs/files somewhere with access limited to the customer; a public anyone-with-the-link folder can expose a seating list. Do not paste credentials, bank receipts or guest information into link addresses.

## Launch scope to finalise
Three illustrative pastel layout previews: Garden whispers, Blush romance, Champagne elegance. These are not finished design templates or generated art.
Standard sizes: A3 welcome/seating signs, A5 table/gift/RSVP QR signs, 90 × 50 mm place cards. Standard sizes are labelled in the order. Agree printer-specific bleed and crop marks. Produce and scan-test a genuine RSVP QR code for the correct wedding URL; decorative QR artwork is not a usable QR code.

The Personalised package is bounded to a proposed first-launch limit of 200 people including companions. Orders above this limit or with custom print sizes are blocked pending a separate quote. No extra-guest rate has been invented. Confirm or change this limit before launch. The order preserves a snapshot of names and seating, so later guest edits do not silently change the work already purchased.

Before opening paid orders, set delivery lead time, included proof revisions, cancellation/refund terms and the larger-wedding rate. Update the terms to distinguish the free website from optional paid stationery. Update the privacy notice for private receipt processing and sharing only the necessary place-card names/table assignments with a designer or printer. Do not claim a privacy notice implements deletion or payment verification.

## Checks before accepting a real order
- On staging, submit one order of each package and verify prices stay ₦20,000 and ₦50,000.
- Confirm orders stay closed when configuration is absent or disabled.
- Check companion names and table assignments in the downloaded order brief.
- Confirm a signed-out user or a different couple cannot read receipts or orders, using Firebase rules tests.
- Confirm a couple cannot mark an order paid or delivered.
- Confirm proof approval is required before delivery.
- Test on a phone. Refresh/sign out/sign in to confirm orders persist.

HTML structure, JavaScript syntax and control references were checked. Firebase rule compilation, authorization tests, real transfers and live deployment have not been verified in this session. Do not accept real payments before those checks.
