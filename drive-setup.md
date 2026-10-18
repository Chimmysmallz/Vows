# Google Drive photos: free-tier edition

The active setup is **[free-backend-setup.md](free-backend-setup.md)**. Read that complete guide before configuration. This source replaces the former optional Firebase Functions/Blaze route, which is **not included** in this release. The old `vows-drive-release.zip` is retained only as a superseded historical artifact and must not be deployed for the free-tier requirement.

- Firebase stays **Spark** for Hosting/Auth/Firestore; both Firebase JSON files omit Functions and API rewrites.
- Optional photo backend is a separate **Cloudflare Workers Free + D1 Free** Worker origin, explicitly configured in owner/guest pages. No paid fallback, R2, Images, service-account key or Secret Manager.
- Originals are private Google Drive files, uploaded through server-only 1 MiB resumable chunks; only Google-generated bounded thumbnails are proxied for view-only. Guests receive neither tokens nor upload URIs. No Sharp/full-image decoder is used.
- Setup performs no paid upgrade by itself. Leave billing unlinked, and stop if the current provider console requires billing. No account connection, installation or deployment has been performed here.
- Free provider limits, shared Firebase quotas and Google's announced policy changes must be checked. Nominal 2,000-photo/5 GiB app allowances are not verified Free capacity.
- Source tests and native SQLite checks are not real Workers/D1/Google/Firebase/mobile tests. **10 ms Free CPU profiling and the guide's live acceptance checklist remain mandatory production blockers.** Keep photos off if Free is insufficient; do not solve it by charging the user.

The complete source, legal drafts, six-feature setup, stationery prices and validation receipts are described in `README.md` and `validation-results.txt`.
