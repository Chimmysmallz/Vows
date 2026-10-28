import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import {demoEnvironment,browserGuard,browserConfig,PROJECT} from '../demo/guard.mjs';
import {verifyEmulatorServices} from '../demo/verify-services.mjs';
import {ACCOUNTS,account,buildFixtures,SLUG,DRAFT,OTHER,CODES,QR,CEREMONIES} from '../demo/fixtures.mjs';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8');
test('strict seed requires both emulator envs and confirmation; explicit local launcher supplies only safe defaults',()=>{
 assert.throws(()=>demoEnvironment({}));assert.throws(()=>demoEnvironment({},true));assert.throws(()=>demoEnvironment({FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080'},true));assert.throws(()=>demoEnvironment({FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099'},true));
 const e=demoEnvironment({FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099'},true);assert.equal(e.GCLOUD_PROJECT,PROJECT);
 const launcher=read('scripts/local-demo.mjs');assert.ok(launcher.includes('process.env.FIREBASE_AUTH_EMULATOR_HOST??HOSTS.auth'));assert.ok(launcher.includes('process.env.FIRESTORE_EMULATOR_HOST??HOSTS.firestore'));
});
test('seed rejects real projects, remote/wrong ports, URLs and real credential discovery',()=>{
 for(const e of [{GCLOUD_PROJECT:'real-vows'},{GOOGLE_CLOUD_PROJECT:'real-vows'},{FIREBASE_PROJECT_ID:'real-vows'},{FIRESTORE_EMULATOR_HOST:'evil.example:8080'},{FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:80'},{FIRESTORE_EMULATOR_HOST:'http://127.0.0.1:8080'},{GOOGLE_APPLICATION_CREDENTIALS:''},{GOOGLE_CLOUD_KEYFILE_JSON:'x'},{FIREBASE_CONFIG:'{}'}])assert.throws(()=>demoEnvironment({FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',...e},true));
});
test('browser guard rejects remote hosting, real Firebase project, wrong port or scheme',()=>{
 browserGuard(PROJECT,'127.0.0.1','5000','http:');browserGuard(PROJECT,'localhost','5000','http:');
 for(const args of [[PROJECT,'demo.example','5000','http:'],['real-project','localhost','5000','http:'],[PROJECT,'localhost','443','https:'],[PROJECT,'localhost','5001','http:']])assert.throws(()=>browserGuard(...args));assert.equal(browserConfig.projectId,PROJECT);
});
test('fixtures use distinct local credentials and reserved example emails only',()=>{
 assert.equal(new Set(ACCOUNTS.map(a=>a.uid)).size,ACCOUNTS.length);assert.equal(new Set(ACCOUNTS.map(a=>a.password)).size,ACCOUNTS.length);
 for(const a of ACCOUNTS){assert.match(a.email,/@vows\.example$/);assert.match(a.password,/^DEMO-/);}assert.equal(account('unverified').verified,false);assert.equal(account('partner').role,undefined);
});
test('12 code/guest/pass parties, companions, seat boundaries and actual QR payloads are consistent',()=>{
 const docs=buildFixtures(new Date(0));assert.equal(CODES.length,12);assert.equal(new Set(CODES).size,12);
 for(const s of [SLUG,DRAFT,OTHER])CODES.forEach((code,i)=>{const g=docs.get(`weddings/${s}/guests/party-${String(i+1).padStart(2,'0')}`),p=docs.get(`weddings/${s}/gatePasses/${code}`),c=docs.get(`weddings/${s}/codes/${code}`);assert.match(code,/^[A-Z2-9]{6}$/);assert.equal(g.code,code);assert.equal(g.seating.companions.length,g.seats-1);assert.equal(p.seats,g.seats);assert.deepEqual(c.invited,g.invited);assert.deepEqual(p.ceremonies,CEREMONIES.filter(x=>g.invited.includes(x.name)).map(x=>x.id));assert.equal(g.phone,'');assert.equal(QR(code),`VOWS1|${SLUG}|${code}`);});
});
test('helpers have UID-bound enabled claimed invite memberships; no partner membership',()=>{
 const d=buildFixtures(new Date());for(const a of ACCOUNTS.filter(x=>x.role))for(const s of [SLUG,DRAFT]){const r=d.get(`weddings/${s}/roles/${a.uid}`),i=d.get(`weddings/${s}/invites/${r.token}`);assert.equal(i.email,a.email);assert.equal(i.role,r.role);assert.equal(i.claimedBy,a.uid);assert.equal(i.enabled,true);assert.equal(a.verified,true);}assert.equal(d.has(`weddings/${SLUG}/roles/${account('partner').uid}`),false);
});
test('published projection excludes private totals, notes and financial collection fields',()=>{
 const d=buildFixtures(new Date());assert.equal(d.get(`weddings/${DRAFT}`).published,false);assert.equal(d.get(`weddings/${OTHER}`).ownerUid,account('other').uid);
 for(const [p,v]of d){if(p.includes('/codes/'))for(const k of ['phone','seating','amount','received'])assert.equal(k in v,false);if(p.includes('/asoebiCollections/'))for(const k of ['due','claimed','amount','verifiedAmount'])assert.equal(k in v,false);}assert.equal(d.get(`weddings/${SLUG}`).registry[0].received,undefined);
});
test('stationery defaults disabled, fake order snapshots include companions and never payout numbers',()=>{
 const d=buildFixtures(new Date());assert.equal(d.get('stationeryConfig/main').enabled,false);assert.equal(d.get('stationeryConfig/main').accountNumber,'');assert.equal(buildFixtures(new Date(),true).get('stationeryConfig/main').enabled,true);assert.equal(d.get('stationeryOrders/demo-paid-order').status,'payment_confirmed');assert.equal(d.get('stationeryOrders/demo-paid-order').seating.length,24);assert.match(d.get('stationeryOrders/demo-paid-order').notes,/SYNTHETIC/);
 const validator=read('public/stationery-generator.html').split('\n').find(line=>line.startsWith('function validateOrder(o)'));
 assert.ok(validator);const order=d.get('stationeryOrders/demo-paid-order');assert.equal(vm.runInNewContext(validator+'; validateOrder(order)',{order,URL}),order);
});
test('demo preparation is idempotent, real source remains unchanged, only generated copies use emulators',()=>{
 const before=['public/app.html','public/wedding.html','firestore.rules'].map(read);
 execFileSync(process.execPath,['scripts/prepare-demo.mjs'],{cwd:new URL('../',import.meta.url),stdio:'pipe'});
 assert.deepEqual(['public/app.html','public/wedding.html','firestore.rules'].map(read),before);
 for(const p of ['app.html','wedding.html']){const s=read('.demo-public/'+p);assert.ok(s.indexOf('DEMO BLOCKED')<s.indexOf('const app = initializeApp'));assert.ok(s.includes('connectFirestoreEmulator(db,"127.0.0.1",8080)'));assert.ok(!s.includes('projectId: "YOUR_FIREBASE_PROJECT"'));for(const [,attrs,body]of s.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){if(/src=/.test(attrs))continue;new vm.Script(body.replace(/^\s*import\s+[\s\S]*?from\s*["'][^"']+["'];?\s*$/gm,''));}}
 assert.ok(read('.demo-public/app.html').includes('connectAuthEmulator(auth,"http://127.0.0.1:9099"'));assert.ok(read('public/app.html').includes('projectId: "YOUR_FIREBASE_PROJECT"'));assert.equal(existsSync(new URL('public/test-hub.html',root)),false);
});
test('emulator configuration binds loopback and deployable public has no fixture hub',()=>{
 const d=JSON.parse(read('firebase.demo.json'));assert.equal(d.hosting.public,'.demo-public');assert.equal(d.firestore.rules,'firestore.rules');for(const [k,v]of Object.entries(d.emulators))if(typeof v==='object')assert.equal(v.host,'127.0.0.1',k);assert.equal(JSON.parse(read('firebase.json')).hosting.public,'public');assert.equal(JSON.parse(read('.firebaserc')).projects.default,undefined);
});
test('seeder has no destructive listing, database wipe, fallback credentials and validates emulator service identity',async()=>{
 const s=read('scripts/seed-demo.mjs');assert.ok(s.includes("demoEnvironment(process.env,flags.has('--confirm-demo'))"));assert.ok(s.indexOf('demoEnvironment(process.env')<s.indexOf("await import('firebase-admin/app')"));assert.ok(!s.includes('applicationDefault('));for(const x of ['listUsers(','deleteUsers(','recursiveDelete(','clearFirestore(','deleteAllAccounts'])assert.ok(!s.includes(x));
 const env=demoEnvironment({FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080'},true);
 const mock=(hub={auth:{host:'127.0.0.1',port:9099},firestore:{host:'127.0.0.1',port:8080}},firestore={error:{status:'NOT_FOUND'}})=>async url=>Response.json(url.endsWith('/emulators')?hub:url.includes('/config')?{}:firestore,{status:url.includes('/documents/')?(firestore.name?200:404):200});
 const emulate=mock();await verifyEmulatorServices(env,async(url,options)=>{if(url.includes('/documents/')){assert.equal(options.headers.Authorization,'Bearer owner');assert.ok(url.startsWith('http://127.0.0.1:8080/v1/projects/demo-vows-test/'));}else assert.equal(options.headers.Authorization,undefined);return emulate(url,options);});
 await assert.rejects(()=>verifyEmulatorServices(env,async(url,options)=>url.includes('/documents/')?Response.json({error:{status:'PERMISSION_DENIED'}},{status:403}):emulate(url,options)));
 await assert.rejects(()=>verifyEmulatorServices(env,mock({auth:{host:'evil.example',port:9099}})));
 await assert.rejects(()=>verifyEmulatorServices(env,mock(undefined,{name:'projects/real-vows/databases/(default)/documents/weddings/x'})));
 await assert.rejects(()=>verifyEmulatorServices(env,async()=>new Response('<html>Not an emulator</html>',{status:200,headers:{'content-type':'text/html'}})));
 assert.ok(s.indexOf('await verifyEmulatorServices(env)')<s.indexOf("await import('firebase-admin/app')"));
});
