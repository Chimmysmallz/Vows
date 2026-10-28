import {readFile,writeFile,mkdir,cp,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {browserConfig,browserGuard,PROJECT} from '../demo/guard.mjs';
import {ACCOUNTS,CODES,SLUG,DRAFT,OTHER,QR,token} from '../demo/fixtures.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const target=path.join(root,'.demo-public');
await mkdir(target,{recursive:true});
const marker=path.join(target,'.vows-demo-marker');
try {await access(marker);} catch {
  const {readdir}=await import('node:fs/promises');
  if ((await readdir(target)).length) throw Error('Refusing to overwrite a pre-existing unmarked .demo-public folder.');
  await writeFile(marker,'Local demo generated from public/. Never deploy.\n');
}
const production=['index.html','app.html','wedding.html','privacy.html','terms.html','stationery-generator.html'];
const exactReplace=(s,needle,replacement)=>{
  if (s.split(needle).length!==2) throw Error('Source layout changed; refusing unsafe demo patch: '+needle.slice(0,80));
  return s.replace(needle,replacement);
};
const guard=`const PROJECT=${JSON.stringify(PROJECT)};\n(${browserGuard.toString()})(firebaseConfig.projectId,location.hostname,location.port,location.protocol);\n`;
for (const name of production) {
  let html=await readFile(path.join(root,'public',name),'utf8');
  if (name==='app.html'||name==='wedding.html') {
    const config=html.match(/const firebaseConfig = \{[\s\S]*?\n\};/g);
    if(config?.length!==1) throw Error('Expected exactly one Firebase config in '+name);
    html=exactReplace(html,config[0],'const firebaseConfig = '+JSON.stringify(browserConfig,null,2)+';');
    html=exactReplace(html,'getFirestore, doc,','getFirestore, connectFirestoreEmulator, doc,');
    html=exactReplace(html,'const app '+(name==='app.html'?' ':'')+'= initializeApp(firebaseConfig);',guard+'const app = initializeApp(firebaseConfig);');
    const dbLine=name==='app.html'?'const db   = getFirestore(app);':'const db  = getFirestore(app);';
    html=exactReplace(html,dbLine,dbLine+'\nconnectFirestoreEmulator(db,"127.0.0.1",8080);');
    if(name==='app.html') {
      html=exactReplace(html,'getAuth, GoogleAuthProvider,','getAuth, connectAuthEmulator, GoogleAuthProvider,');
      html=exactReplace(html,'const auth = getAuth(app);','const auth = getAuth(app);\nconnectAuthEmulator(auth,"http://127.0.0.1:9099",{disableWarnings:false});');
    }
  }
  await writeFile(path.join(target,name),html);
}
await cp(new URL('../demo/hub.css',import.meta.url),path.join(target,'hub.css'));
await cp(new URL('../demo/hub.js',import.meta.url),path.join(target,'hub.js'));
const esc=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const rows=ACCOUNTS.map(a=>`<tr><td>${esc(a.label)}</td><td><code>${esc(a.email)}</code><button data-copy="${esc(a.email)}">Copy email</button></td><td><code>${esc(a.password)}</code><button data-copy="${esc(a.password)}">Copy password</button></td><td><a href="/app.html?wedding=${a.key==='other'?OTHER:SLUG}">Open real app</a>${['invitee','unverified'].includes(a.key)?` · <a href="/app.html?wedding=${SLUG}&amp;invite=${token(a.key)}">Claim invitation</a>`:''}</td></tr>`).join('');
const guestRows=CODES.map((code,i)=>`<tr><td>Party ${i+1}</td><td><code>${code}</code> <button data-copy="${code}">Copy code</button></td><td>${1+i%3}</td><td>${i===5?'Reception only':'Both ceremonies'}</td><td><code>${QR(code)}</code></td></tr>`).join('');
await writeFile(path.join(target,'test-hub.html'),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vows localhost role test hub</title><link rel="stylesheet" href="/hub.css"><script src="/hub.js" defer></script></head><body><main><p class="badge">LOCAL EMULATOR ONLY · FICTIONAL DATA · NEVER DEPLOY</p><h1>Maya &amp; Alex: real role journeys</h1><p>Sign in inside the actual app with the separate emulator accounts below. This page only copies values and opens pages. It does not sign you in, assign permissions or switch views.</p><p class="warning"><strong>Partner/co-owner login is NOT IMPLEMENTED.</strong> Alex can authenticate but has no private access to Maya's wedding. Guests use invitation codes, not email/password. These are not publicly usable online accounts.</p><nav><a href="/${SLUG}">Published wedding / guest RSVP</a><a href="/${DRAFT}">Draft wedding (guest denied)</a><a href="/app.html?wedding=${DRAFT}">Draft owner/helper operations</a><a href="/stationery-generator.html">Real stationery generator</a><a href="http://127.0.0.1:4000">Local emulator UI</a></nav><h2>Account credentials</h2><p>Sign out before changing accounts, or use separate browser profiles. Operator: sign in, then click Stationery operator workspace; an owned wedding is not required. Auth email verification is pre-seeded except for the explicit unverified account. No email is sent. Use npm run demo:seed -- --confirm-demo to reset known fixture documents only; see README before rerunning.</p><div class="scroll"><table><thead><tr><th>Journey</th><th>Email</th><th>Local-only password</th><th>Actual app</th></tr></thead><tbody>${rows}</tbody></table></div><h2>Guest access — no account</h2><p>Open the published wedding above, find RSVP or Find my table, and enter a code. QR cards are generated by the actual owner/guest page using these exact payloads. No fake QR images are supplied. Party 6 is reception-only. All parties have assigned tables; clear one as owner to test the unassigned-table warning.</p><div class="scroll"><table><thead><tr><th>Party</th><th>Code</th><th>Seats</th><th>Access</th><th>Actual QR payload</th></tr></thead><tbody>${guestRows}</tbody></table></div><h2>Limits and test evidence</h2><ul><li>Read TEST-PLAN.md and KNOWN-LIMITATIONS.md from the repository, not Hosting.</li><li>Same production Firestore rules. Denials must be tested with direct SDK requests, not hidden buttons.</li><li>Optional Google Drive/Worker photos are unconfigured, not emulated. No Blaze, live payment or real sends.</li><li>Stationery checkout is disabled by default; pre-seeded synthetic paid/pending orders exercise the existing operator flow only.</li><li>Firebase SDK, fonts and QR encoder require internet/CDN access. The data endpoints remain loopback-only.</li></ul><p id="copy-status" role="status"></p></main></body></html>`);
console.log('Prepared .demo-public from unchanged public/. Use npm run demo:start, then http://127.0.0.1:5000/test-hub.html. Never deploy firebase.demo.json.');
