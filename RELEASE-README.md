# Vows.ng source: Firebase Spark + free-tier Drive backend

**Downloadable source, not a deployed app. No billing, account connection, package installation or deployment was performed.** This is the replacement for the earlier Blaze-dependent `vows-drive-release.zip`. That old ZIP is untouched and superseded for this free-tier requirement; do not deploy it.

## Budget decision

The existing website stays on Firebase **Spark** (Hosting/Auth/Firestore). Optional photos now target **Cloudflare Workers Free + D1 Free**, with originals in the couple's existing private Google Drive. There are **no Firebase Functions, service-account keys, Secret Manager, R2, paid Images, paid Durable Objects, Firebase Storage uploads or automatic paid fallback**. Remain on Free/Spark, leave Google Cloud billing unlinked, and stop if any setup step asks for billing.

Free does not mean unlimited or production-proven. Workers currently allow 100,000 requests/day but only **10 ms CPU/invocation**, 128 MB memory and 50 subrequests. D1 Free's 100,000 rows written/day and 500 MB per-database limit may bind well before app upload allowances. Firebase Spark's shared document-read quota can affect **both photos and core features**. Current Drive API has no additional cost, but Google documents planned late-2026 policy changes; storage and future policy still apply. Official links and exact caveats are in **[free-backend-setup.md](free-backend-setup.md)**.

**Status: source tested locally; Free-runtime production readiness is NOT established.** No real Worker/D1/OAuth/Picker/mobile tests or 10 ms CPU profiling were run. Do not enable paid services to pass acceptance. If the Free target fails staging capacity/CPU tests, keep photos off. A missing/off photo backend does not itself disable the existing core.

## Complete release, not a patch

```text
vows-free-drive-release/
  README.md, free-backend-setup.md, drive-setup.md
  feature-setup.md, stationery-setup.md, validation-results.txt
  firebase.json, firebase.core.json  # both no-Functions Hosting/rules configs
  firestore.rules, firestore.indexes.json, storage.rules
  vows-app.html                     # complete downloadable owner editor
  vows-guest.html                   # complete downloadable guest page
  stationery-generator.html        # preserved printable generator
  owner-drive.js, guest-drive.js     # readable snippets already embedded in HTML
  feature-tests.mjs                 # preserved original 26 baseline checks
  worker/
    index.mjs, service.mjs, adapters.mjs, store.mjs
    wrangler.toml                   # obvious placeholders; no secrets
    migrations/0001_private.sql
    test/*.test.mjs                 # Node mocks + actual native SQLite adapter tests
  public/                           # the ONLY Firebase Hosting public directory
    index.html                      # preserved illustrated landing page
    app.html                        # identical full owner replacement
    wedding.html                    # identical full guest replacement
    stationery-generator.html
    privacy.html, terms.html        # truthful operator-review drafts, not legal advice
```

Never publish the Worker source, rules, configs, tests, order briefs, receipts, keys or backups in `public/`. All original embedded artwork remains. No employer branding, messages, emails or new paid wedding app are introduced. Replace only your own project's Firebase/web/API/Worker placeholders; no real credentials ship in this package.

## What remains unchanged

The free website's original six-feature workflows, helper role boundaries, invitation/multi-ceremony RSVP, owner-side request merge, private financial records, gate check-in, seating lookup, thank-you drafts, aso-ebi tracking and stationery flow remain. Bank verification and WhatsApp sending stay manual. **Essential stationery: ₦20,000. Personalised: ₦50,000, up to 200 named people.** Printing, physical delivery and custom-size quotations remain separate. Follow `feature-setup.md` for legacy privacy migration and helper rules; publication still rotates `driveEpoch`, and unsafe legacy public registry data blocks public photos.

## Photo architecture and explicit limits

- The owner signs into Firebase. The backend uses the caller's ID token with live Firebase Auth REST lookup/project/revocation checks and Firestore ownership reads, not a service account. Helpers cannot connect/pick/change photo settings.
- OAuth authorization-code/offline consent uses PKCE, one-use state and a top-level secure Worker cookie. Final account linking additionally requires the **original tab's sessionStorage verifier, a random one-use completion fragment and fresh same-owner Firebase authentication**. A forwarded handoff cannot link a victim's Google account. Callback by itself links nothing.
- Only `drive.file` is requested. Picker receives an owner-only, short-lived in-memory access token; refresh tokens never enter frontend/Firestore. All private D1 records, including OAuth codes/state, capabilities, upload URIs, metadata and quotas, are AES-GCM encrypted using Worker secrets and row-context binding. Privileged administrators can access data and keys; this is not end-to-end encryption.
- Picker selects one accessible owner-only private My Drive folder. Sharing/shared drives are rejected; the app does not change permissions. Only originals created through this wedding and current connection enter the gallery, never existing folder contents. Reconnect/folder change starts a new gallery binding and deletes no earlier files.
- Uploads, viewing and original downloads are independent **default-off** controls; download requires viewing. Viewing means **anyone with the published wedding link**, not invitation-verified people only. Links can be forwarded. Screenshots and saving visible previews cannot be prevented.
- JPEG/PNG/WEBP/HEIC originals, 16 bytes–20 MiB. Type/size/magic checks only, **no server image decoding or malware/content scan**. SVG/HTML/video are rejected. No automatic resizing, animation rejection or decompression/pixel-count guarantee is claimed.
- Guests upload one file at a time in bounded **1 MiB chunks** (final chunk may be smaller) via a server-only Google resumable session. No Google token, Drive file ID, original URL or resumable URI reaches guests. Persisted chunk offsets, per-chunk SHA-256, CAS leases and upstream status reconciliation support same-tab retries without duplicate originals. The whole 20 MiB original is never buffered/hashed in the Worker. Reload loses the selected file/tab state; upload sessions expire after fifteen minutes, capabilities after two hours.
- D1 atomic SQL batches guard read versions with a CHECK constraint and roll back/retry conflicts. Budgets/leases are durable, not isolate-memory counters. Per-route live wedding/owner/connection/settings/publication epochs apply; final completion/media checks run after upstream work. There is no atomic transaction across Google, Firestore and D1. In-flight provider races may leave a private orphan or finish a stream already started.
- View-only uses authenticated, strictly allowlisted Google-generated thumbnails, no redirects, valid JPEG/PNG/WEBP magic and a **128 KiB byte cap**, private/no-store/nosniff. **No original fallback.** Google controls thumbnail generation; the source promises neither fixed dimensions nor metadata stripping. Missing/unsafe thumbnails fail closed. **HEIC previews are unavailable**, even if Google provides a thumbnail.
- Original download is enabled-only, attachment/nosniff, streamed with exact metadata length and bounded stream counts. Current Google file app-properties, folder, type/size, version and checksum must match the original recorded metadata. Whole-original bytes are not rehashed at delivery. Changed/moved/cross-wedding files fail closed.
- App reservation allowance: **2,000 originals / 5 GiB per wedding lifetime**, **20 / 160 MiB per capability**; network and daily project ceilings also apply. These are application ceilings, **not guaranteed Free capacity**. Failed/abandoned reservations are not refunded. See setup for read/request ceilings and realistic quota arithmetic. A realistic wedding needs measured staging acceptance, not a promise based on 100,000 Worker requests.
- Disconnect/unpublish/settings/permission changes block subsequent requests, not already-delivered/saved bytes or an active stream. Disconnect removes the usable local refresh token and attempts Google grant revocation. It does not delete Drive originals, backups or downloaded copies. A bounded D1 cleanup cron is supplied; no paid Firestore TTL is used. Lifetime metadata/budgets and orphan originals need reviewed manual deletion.

## Validation and setup

Use a modern Node with built-in `node:sqlite` for the native SQL tests (no npm packages). From the release root:

```sh
node feature-tests.mjs
node --test worker/test/*.test.mjs
node --check worker/index.mjs
node --check worker/service.mjs
node --check worker/adapters.mjs
node --check worker/store.mjs
```

See **`validation-results.txt`** for executed checks and exact gaps. Source tests use mocked Google/Firebase/HTTP/browser APIs plus real local SQLite running the actual schema and D1-store SQL. They do not emulate Cloudflare's complete runtime, a real D1 deployment, Firebase rules or Google's image codecs. The documented login-CSRF fix has a regression check and independent read-only security review; neither is a security certification.

Start with **[free-backend-setup.md](free-backend-setup.md)** for exact own-account Free setup, D1 migration, Worker secrets/config, Google OAuth/Picker/API restrictions, Firebase frontend URLs, no-billing guardrails, quota caveats and mandatory live/CPU/mobile acceptance. `drive-setup.md` is the short entry point to that same active architecture. There is no silent old-backend fallback.
