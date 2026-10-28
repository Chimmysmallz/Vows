# Vows — complete website source and localhost role-test kit

This is the **public Vows wedding website**, not the unrelated Local Marketing Studio. It contains the complete current free-backend release, original embedded artwork, Firebase rules and optional Cloudflare Worker source, plus a separate emulator-only test harness. No online accounts, deployment, billing, real payments, Google connections or messages have been created or sent.

## Important before testing

- **One couple owner account is implemented. Separate partner/co-owner access is NOT IMPLEMENTED.** Alex's distinct demo account signs into Auth but must be denied private access to Maya's wedding. Do not share Maya's password or treat a helper role as co-ownership.
- **Guests do not have email/password accounts.** They open the published wedding and enter their exact six-character invitation code to RSVP, find their table and display the genuine gate QR.
- Mother, chief bridesmaid and planner use separate Auth accounts with verified-email, UID-bound invitations. The operator uses a separately authorized stationery workspace.
- All demo identities/passwords/data are **fictional and localhost-only**. Never deploy the generated demo directory or reuse these passwords online.
- Firebase rules compilation and emulator end-to-end execution were **NOT RUN in the preparation environment**: Firebase CLI, Java and SDK dependencies were absent. The supplied emulator suite must pass on your computer before acceptance. The 26 existing feature checks, 48 existing Worker checks and 11 new harness checks passed; these are not production certification.

## Prerequisites

Use **Node.js 22.13+ (22 LTS recommended)**, npm, and **Java 21 JDK** on PATH. Check `node --version`, `npm --version`, and `java -version`. The Firebase CLI is pinned as a dev dependency; no global CLI or Firebase login is required for the demo. You need internet for npm/first emulator downloads and for the website's Firebase SDK, QR library, fonts and Google-hosted scripts. This is not an offline bundle.

Windows: extract the ZIP to a normal writable folder first. Install the official Node LTS and Java 21 JDK installers, reopen PowerShell, then `cd` into the extracted `vows-github-test-kit` folder. If PowerShell blocks `npm.ps1`, use **`npm.cmd`** for every npm command below. No Bash environment variables, admin shell, service account or billing account are required. Do not keep a production Firebase project/credential environment active in this shell.

## Six commands (two terminals)

Stop at any error. Do not substitute a real project to make an emulator error disappear.

**Terminal A**, in the extracted repository:

```sh
npm install
npm run demo:prepare
npm run demo:start
```

Keep Terminal A running. It explicitly starts only Auth, Firestore and Hosting under `demo-vows-test`; every listener, including the emulator UI, binds to `127.0.0.1`. No Storage/Functions backend or billing is involved. Do not expose the ports through tunnels, port forwarding or a public network. The demo has no authentication on its local admin emulator ports.

**Terminal B**, in the same folder, after A reports all emulators ready:

```sh
npm run demo:seed -- --confirm-demo
npm test
npm run test:rules
```

Then open **http://127.0.0.1:5000/test-hub.html**. Use the copy buttons and actual app links; sign out or use separate browser profiles between accounts. The hub never signs you in, changes roles, bypasses rules or simulates permissions. It is only a directory of local fixture credentials and real page links.

`npm run test:rules` exercises actual Firestore Rules with the emulator (including one actual email/password Auth metadata test). It resets known fixture documents before each case, so **do not run it during manual journeys**. Then reseed once to restore the known baseline. A failure is an acceptance blocker; record its output and do not switch to permissive rules.

Alternatively, after stopping Terminal A with Ctrl+C, `npm run test:rules:exec` starts Auth/Firestore, seeds the same known fixtures, runs the rules suite, then stops. It does not start Hosting. Do not run both emulator commands at once; the same ports will conflict.

## Fixture data and logins

Read **[ROLES-AND-LOGINS.md](ROLES-AND-LOGINS.md)** for every account, URL, guest code, seat allowance and QR payload. Fixtures contain Maya & Alex's published wedding, their draft wedding, a different owner's private wedding, 12 parties / 24 named people per wedding, ceremony-restricted gate passes, private synthetic gift/payment records, amount-free collection/thank-you projections and synthetic stationery orders. Phone and payout fields are blank. No QR decoder/camera success is invented.

For a fresh local reset, stop manual testing and run `npm run demo:seed -- --confirm-demo` again. It updates only the ten known emulator UIDs and deterministic fixture document IDs, resets known codes' RSVP/check-ins and fresh-invitee memberships. It never lists/wipes all users or all documents. **Random orders, guests, invitations and requests created during your manual tests remain.** To discard everything, stop the emulators and restart without importing a snapshot; this demo does not export persistence. Closing the processes loses emulator-only data. Never export local demo accounts into a live project.

Default stationery checkout stays disabled. The seed includes synthetic `payment_confirmed` and pending orders so the real operator/generator paths can be tested without banking. Optional `npm run demo:seed -- --confirm-demo --enable-stationery` changes only the emulator configuration's enabled flag; payout fields remain empty, so the browser checkout **still stays disabled**. It is not a simulated payment gateway. Do not put actual bank details or receipts in this test kit.

## Test scope and acceptance

- **[TEST-PLAN.md](TEST-PLAN.md)**: role allow/deny matrix, browser journeys, direct Rules checks, concurrent entry and print/device acceptance.
- **[KNOWN-LIMITATIONS.md](KNOWN-LIMITATIONS.md)**: partner gap, bearer-code privacy limits, pending-request processing, current authorization limits and external integrations not verified.
- **[VALIDATION.md](VALIDATION.md)**: exactly what ran and what did not.
- **[RELEASE-README.md](RELEASE-README.md)** plus retained feature/stationery/free-backend guides: original website source/setup information, not instructions to deploy the emulator.

## Production source versus demo source

```text
public/                     Complete original website, unchanged Firebase placeholders
vows-app.html               Same complete editor as public/app.html
vows-guest.html             Same complete guest page as public/wedding.html
stationery-generator.html   Same native print generator as hosted copy
firestore.rules             Original enforced rules, not broadened for fixtures
worker/                     Optional Free Worker/D1 source and 48 original tests
feature-tests.mjs           26 original feature contract/unit tests
firebase.json               Production public/ Hosting/rules configuration
firebase.core.json          Original core configuration
firebase.demo.json          LOCAL ONLY: .demo-public, loopback emulators, original rules
.firebaserc                 demo alias only; no default/real project
package.json                Pinned test dependencies; private package, not published
scripts/                    Safe local preparation and emulator-only Admin seeder
demo/                       Fictional fixtures, guard and local hub assets
test/                       New harness contracts and real emulator Rules suite
.demo-public/               GENERATED/ignored; never deploy or commit
```

`demo:prepare` copies the six complete production pages into an ignored `.demo-public`, replaces only the two Firebase config blocks, adds strict hostname/port/project guards **before initialization** and attaches Auth/Firestore emulators before any operations. It refuses to overwrite an unmarked pre-existing demo directory and does not modify `public/` or rules. The underlying seeder and Rules suite require both `FIREBASE_AUTH_EMULATOR_HOST` and `FIRESTORE_EMULATOR_HOST`; they refuse missing values, remote endpoints or unexpected ports. For cross-platform convenience, the explicit npm local launcher supplies only missing values as `127.0.0.1:9099` and `127.0.0.1:8080`; it never overwrites an existing value. A real project ID or Google credentials/config environment also causes an abort before SDK initialization. Preflight checks the local Emulator Hub's advertised services/ports, JSON service responses and any existing Firestore document's demo-project namespace. Emulators support multiple namespaces; the kit always selects only demo-vows-test, never discovers a real project. The Admin SDK uses an explicit emulator-only credential and never discovers real credentials.

### GitHub handoff

Create an empty repository you control and add this extracted folder's contents. `.gitignore` excludes dependencies, emulator output, local generated pages, logs and credentials. No lockfile is fabricated: `npm install` creates a real `package-lock.json`; review and commit that locally generated lockfile if you want reproducible installs. Test the pinned dependencies in your environment and review upstream updates before real deployment. This ZIP is not a GitHub repository URL and no repository was created for you. No license/ownership transfer is implied.

### Later staging — not performed

Complete local acceptance first. Back up your own project, select a **new staging project you own**, restore your own web Firebase configuration in the original production source, keep both downloadable/hosted copies in sync, and follow the retained original release guides using free Spark/Free limits. Use only `firebase.json`/`firebase.core.json` and **explicit `--project YOUR_OWN_STAGING_ID`** for any later controlled deployment. Never deploy `firebase.demo.json`, `.demo-public`, fixtures, keys or test passwords. Do not use the seeder against staging: it intentionally refuses real project IDs. Manually create distinct harmless staging users/records after reviewing privacy, quotas and rules; do not turn on billing or permissive rules to bypass a failed check. Optional Worker/Google photos remain off until their separate real configuration and integration tests pass.
