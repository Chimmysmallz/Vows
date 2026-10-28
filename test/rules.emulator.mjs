import {before,after,beforeEach,test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {demoEnvironment,PROJECT,browserConfig} from '../demo/guard.mjs';
import {verifyEmulatorServices} from '../demo/verify-services.mjs';
import {account,ACCOUNTS,buildFixtures,SLUG,DRAFT,OTHER,CODES,CEREMONIES,token} from '../demo/fixtures.mjs';
// Checked before importing SDKs: no live endpoints or ambient real credentials.
Object.assign(process.env,demoEnvironment(process.env,true));
await verifyEmulatorServices(process.env);
const {initializeTestEnvironment,assertSucceeds,assertFails}=await import('@firebase/rules-unit-testing');
const {doc,getDoc,getDocs,collection,query,where,setDoc,updateDoc,deleteDoc,writeBatch,serverTimestamp,runTransaction}=await import('firebase/firestore');
let env;
const context=key=>env.authenticatedContext(account(key).uid,{email:account(key).email,email_verified:account(key).verified});
const db=key=>key?context(key).firestore():env.unauthenticatedContext().firestore();
const ref=(d,kind,id,s=SLUG)=>doc(d,'weddings',s,kind,id);
const get=(d,kind,id,s=SLUG)=>getDoc(ref(d,kind,id,s));
const claim=async(d,key,t=token(key),role='planner')=>{
 const b=writeBatch(d);b.update(ref(d,'invites',t),{claimedBy:account(key).uid});b.set(ref(d,'roles',account(key).uid),{token:t,role,enabled:true});return b.commit();
};
before(async()=>{env=await initializeTestEnvironment({projectId:PROJECT,firestore:{host:'127.0.0.1',port:8080,rules:await readFile(new URL('../firestore.rules',import.meta.url),'utf8')}});});
after(async()=>{await env?.cleanup();});
beforeEach(async()=>{
 await env.withSecurityRulesDisabled(async c=>{
  const d=c.firestore(),b=writeBatch(d);for(const [p,v]of buildFixtures(new Date('2026-10-28T00:00:00Z')))b.set(doc(d,p),v);
  for(const s of [SLUG,DRAFT,OTHER]){for(const key of ['invitee','unverified'])b.delete(ref(d,'roles',account(key).uid,s));for(const code of CODES){b.delete(ref(d,'rsvps',code,s));for(const cer of CEREMONIES)b.delete(ref(d,'checkins',cer.id+'_'+code,s));}}
  for(const p of ['slugClaims/demo-collision','weddings/demo-collision','weddings/'+SLUG+'/requests/demo-request','weddings/'+SLUG+'/gifts/demo-claim','weddings/'+SLUG+'/guests/demo-new-party'])b.delete(doc(d,p));
  await b.commit();
 });
});

test('actual emulator Email/Password Auth produces verified/unverified metadata and enforces Firestore',async()=>{
 const {initializeApp,deleteApp}=await import('firebase/app');
 const {getAuth,connectAuthEmulator,signInWithEmailAndPassword,getIdTokenResult}=await import('firebase/auth');
 const {getFirestore,connectFirestoreEmulator}=await import('firebase/firestore');
 for(const key of ['owner','unverified','partner']){
  const app=initializeApp(browserConfig,'real-auth-'+key),auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
  const d=getFirestore(app);connectFirestoreEmulator(d,'127.0.0.1',8080);
  try{
   const a=account(key),result=await signInWithEmailAndPassword(auth,a.email,a.password),claims=(await getIdTokenResult(result.user)).claims;
   assert.equal(result.user.uid,a.uid);assert.equal(claims.email_verified,a.verified);
   if(key==='owner')await assertSucceeds(get(d,'gifts','verified-gift'));
   if(key==='unverified')await assertFails(claim(d,key));
   if(key==='partner')await assertFails(get(d,'guests','party-01'));
  }finally{await deleteApp(app);}
 }
});
test('owner reads draft, queries only their weddings, private finance and sanitized operations',async()=>{
 const d=db('owner');for(const s of [SLUG,DRAFT]){await assertSucceeds(getDoc(doc(d,'weddings',s)));await assertSucceeds(get(d,'gifts','verified-gift',s));}
 await assertSucceeds(getDocs(query(collection(d,'weddings'),where('ownerUid','==',account('owner').uid))));
 await assertFails(getDocs(collection(d,'weddings')));await assertFails(getDoc(doc(d,'weddings',OTHER)));await assertFails(get(d,'gifts','verified-gift',OTHER));
});
test('partner and outsider authenticate but have no private wedding membership',async()=>{
 for(const key of ['partner','outsider','other']){const d=db(key);await assertFails(get(d,'guests','party-01'));await assertFails(get(d,'staffInfo','main'));await assertFails(get(d,'gifts','verified-gift'));await assertFails(getDoc(doc(d,'weddings',DRAFT)));await assertFails(updateDoc(doc(d,'weddings',SLUG),{ownerUid:account(key).uid}));}
});
for(const key of ['mother','bridesmaid','planner'])test(key+' reads draft staff/contacts/seating but never draft financial document or private collections',async()=>{
 const d=db(key);for(const s of [SLUG,DRAFT]){await assertSucceeds(get(d,'staffInfo','main',s));await assertSucceeds(getDocs(collection(d,'weddings',s,'guests')));}
 await assertFails(getDoc(doc(d,'weddings',DRAFT)));
 for(const [kind,id]of [['gifts','verified-gift'],['registry','private-total'],['vendors','legacy-private'],['asoebi','legacy-private'],['asoebiPayments','ready-order'],['asoebiClaims','pending-claim']])await assertFails(get(d,kind,id));
 await assertFails(updateDoc(ref(d,'guests','party-01'),{table:'Other'}));await assertFails(get(d,'guests','party-01',OTHER));
 await assertFails(updateDoc(doc(d,'weddings',SLUG),{published:false,driveEpoch:'demo-replaced-epoch-00000000000000000000000002'}));
});
test('planner alone reads vendor arrangements; mother/chief alone read amount-free collection and thank-you desks',async()=>{
 for(const key of ['mother','bridesmaid','planner']){const d=db(key),isPlanner=key==='planner';await (isPlanner?assertSucceeds:assertFails)(get(d,'vendorContacts','demo-florist'));for(const [kind,id]of [['asoebiCollections','ready-order'],['thankYou',CODES[0]]])await (isPlanner?assertFails:assertSucceeds)(get(d,kind,id));}
});
test('helpers cannot self-promote, forge an invite or claim with wrong email/unverified state/expired token',async()=>{
 await assertFails(updateDoc(ref(db('planner'),'roles',account('planner').uid),{role:'owner'}));
 await assertFails(setDoc(ref(db('outsider'),'invites',token('forged')),{email:account('outsider').email,role:'planner',enabled:true,expiresAt:new Date('2099-01-01'),claimedBy:''}));
 await assertFails(claim(db('unverified'),'unverified'));
 await assertFails(claim(db('outsider'),'outsider',token('invitee')));
 await assertFails(claim(db('invitee'),'invitee',token('expired')));
 await assertFails(claim(db('invitee'),'invitee',token('invitee'),'mother'));
});
test('invite claim and UID role must be atomic and matching; claimed invite cannot be reused',async()=>{
 const d=db('invitee');await assertFails(updateDoc(ref(d,'invites',token('invitee')),{claimedBy:account('invitee').uid}));
 await assertFails(setDoc(ref(d,'roles',account('invitee').uid),{token:token('invitee'),role:'planner',enabled:true}));
 await assertSucceeds(claim(d,'invitee'));await assertSucceeds(get(d,'staffInfo','main'));
 await assertFails(claim(db('outsider'),'outsider',token('invitee')));
});
test('live invite revocation blocks next helper read/write without relying on hidden UI',async()=>{
 const d=db('bridesmaid');await assertSucceeds(get(d,'guests','party-01'));
 await assertSucceeds(updateDoc(ref(db('owner'),'invites',token('bridesmaid')),{enabled:false}));
 await assertFails(get(d,'guests','party-01'));await assertFails(get(d,'gatePasses',CODES[0]));await assertFails(updateDoc(ref(d,'thankYou',CODES[0]),{message:'After revocation'}));
});
test('public exact code lookup works but all wedding/code/guest lists and draft code lookup are denied',async()=>{
 const d=db();await assertSucceeds(getDoc(doc(d,'weddings',SLUG)));await assertSucceeds(get(d,'codes',CODES[0]));
 const code=(await get(d,'codes',CODES[0])).data();for(const k of ['phone','seating','note','received'])assert.equal(k in code,false);
 await assertFails(getDocs(collection(d,'weddings')));await assertFails(getDocs(collection(d,'weddings',SLUG,'codes')));await assertFails(getDocs(collection(d,'weddings',SLUG,'guests')));await assertFails(get(d,'codes',CODES[0],DRAFT));await assertFails(get(d,'guests','party-01'));
});
test('guest RSVP is write-only, publication/code bound and rejects extra private fields',async()=>{
 const d=db(),v={code:CODES[0],responses:{'Garden ceremony':1},note:'Synthetic RSVP',submittedAt:serverTimestamp()};
 await assertSucceeds(setDoc(ref(d,'rsvps',CODES[0]),v));await assertFails(get(d,'rsvps',CODES[0]));await assertSucceeds(get(db('owner'),'rsvps',CODES[0]));
 await assertFails(setDoc(ref(d,'rsvps','ZZZZZZ'),{...v,code:'ZZZZZZ'}));await assertFails(setDoc(ref(d,'rsvps',CODES[0],DRAFT),v));await assertFails(setDoc(ref(d,'rsvps',CODES[0]),{...v,phone:'private'}));
});
test('request is pending and owner-readable only; no instant invitation code is issued',async()=>{
 const d=db(),r={name:'New Demo Guest',phone:'',seats:2,side:'Both',note:'Synthetic request',createdAt:serverTimestamp(),seating:{printName:'New Demo Guest',group:'Friends',partyRole:'Guest',companions:['New Companion Demo'],seatingNote:''}};
 await assertSucceeds(setDoc(ref(d,'requests','demo-request'),r));await assertFails(get(d,'requests','demo-request'));await assertSucceeds(get(db('owner'),'requests','demo-request'));await assertFails(setDoc(ref(d,'requests','demo-request',DRAFT),r));
});
const arrival=(key,code=CODES[0],ceremony='demo-ceremony',admitted=1)=>({code,ceremony,admitted,staffUid:account(key).uid,checkedAt:serverTimestamp()});
test('gate allows planner/chief/owner, denies mother/partner; wrong ceremony/excess seats/spoofed staff fail',async()=>{
 for(const key of ['mother','partner','outsider'])await assertFails(setDoc(ref(db(key),'checkins','demo-ceremony_'+CODES[0]),arrival(key)));
 for(const [key,code]of [['planner',CODES[1]],['bridesmaid',CODES[2]],['owner',CODES[3]]])await assertSucceeds(setDoc(ref(db(key),'checkins','demo-ceremony_'+code),arrival(key,code)));
 await assertFails(setDoc(ref(db('planner'),'checkins','demo-ceremony_'+CODES[5]),arrival('planner',CODES[5])));
 await assertFails(setDoc(ref(db('planner'),'checkins','demo-ceremony_'+CODES[0]),arrival('planner',CODES[0],'demo-ceremony',2)));
 await assertFails(setDoc(ref(db('planner'),'checkins','demo-ceremony_'+CODES[0]),{...arrival('planner'),staffUid:account('owner').uid}));
});
test('concurrent immutable check-in creates admit exactly once; update/delete always denied',async()=>{
 const admit=async key=>{const d=db(key),r=ref(d,'checkins','demo-ceremony_'+CODES[0]);return runTransaction(d,async tx=>{const p=await tx.get(ref(d,'gatePasses',CODES[0])),used=await tx.get(r);if(used.exists())return false;assert.ok(p.exists());tx.set(r,arrival(key));return true;});};
 const results=await Promise.all([admit('planner'),admit('bridesmaid')]);assert.equal(results.filter(Boolean).length,1);
 const r=ref(db('owner'),'checkins','demo-ceremony_'+CODES[0]);await assertFails(updateDoc(r,{admitted:2}));await assertFails(deleteDoc(r));
});
test('collection release is owner-only; mother can confirm released handover without reading money',async()=>{
 const d=db('mother');await assertFails(updateDoc(ref(d,'asoebiCollections','pending-order'),{collected:true,collectedAt:serverTimestamp()}));
 await assertFails(updateDoc(ref(d,'asoebiCollections','pending-order'),{ready:true}));await assertSucceeds(updateDoc(ref(d,'asoebiCollections','ready-order'),{collected:true,collectedAt:serverTimestamp()}));await assertFails(get(d,'asoebiPayments','ready-order'));
});
test('thank-you helper edits/manual sent confirmation allowed but financial/source tampering denied',async()=>{
 const d=db('mother'),r=ref(d,'thankYou',CODES[0]);await assertSucceeds(updateDoc(r,{message:'Synthetic edited message'}));await assertFails(updateDoc(r,{sent:true}));await assertSucceeds(updateDoc(r,{sent:true,sentAt:serverTimestamp()}));await assertFails(updateDoc(r,{source:'invented',amount:10}));
});
test('operator sees orders but not wedding finances; default checkout disabled and config client writes denied',async()=>{
 const d=db('operator');await assertSucceeds(getDoc(doc(d,'stationeryOrders','demo-paid-order')));await assertFails(get(d,'gifts','verified-gift'));await assertFails(get(db('planner'),'gifts','verified-gift'));
 await assertFails(getDoc(doc(db('owner'),'stationeryOrders','demo-other-order')));await assertFails(getDoc(doc(db('partner'),'stationeryOrders','demo-paid-order')));await assertFails(updateDoc(doc(db('owner'),'stationeryConfig','main'),{enabled:true}));
 const order=(await getDoc(doc(db('owner'),'stationeryOrders','demo-pending-order'))).data();await assertFails(setDoc(doc(db('owner'),'stationeryOrders','demo-disabled-new'),{...order,createdAt:serverTimestamp()}));
});
test('operator cannot skip payment or approve proof; owner approves exact proof before operator delivery',async()=>{
 const op=doc(db('operator'),'stationeryOrders','demo-pending-order'),owner=doc(db('owner'),'stationeryOrders','demo-pending-order'),proof='https://proofs.vows.example/demo-v1';
 const change=status=>({status,proofUrl:proof,deliveryUrl:'',updatedAt:serverTimestamp()});
 await assertFails(updateDoc(op,change('proof_ready')));await assertSucceeds(updateDoc(op,change('payment_confirmed')));await assertSucceeds(updateDoc(op,change('proof_ready')));await assertFails(updateDoc(op,change('proof_approved')));
 await assertFails(updateDoc(owner,{status:'proof_approved',approvedProofUrl:'https://proofs.vows.example/wrong',approvedAt:serverTimestamp()}));await assertSucceeds(updateDoc(owner,{status:'proof_approved',approvedProofUrl:proof,approvedAt:serverTimestamp()}));
 await assertSucceeds(updateDoc(op,{...change('delivered'),deliveryUrl:'https://proofs.vows.example/final-v1'}));
});
test('slug ownership is atomic, cannot be stolen or re-claimed by another account',async()=>{
 const d=db('owner'),b=writeBatch(d);b.set(doc(d,'slugClaims','demo-collision'),{claimed:true});b.set(doc(d,'weddings','demo-collision'),{ownerUid:account('owner').uid,published:false});await assertSucceeds(b.commit());
 await assertFails(setDoc(doc(db('outsider'),'slugClaims','demo-collision'),{claimed:true}));await assertFails(setDoc(doc(db('outsider'),'weddings','demo-collision'),{ownerUid:account('outsider').uid,published:false}));await assertFails(updateDoc(doc(d,'weddings',SLUG),{ownerUid:account('partner').uid}));
});
test('legacy received totals block public reads until owner migrates; publication changes need fresh driveEpoch',async()=>{
 const d=db('owner'),w=doc(d,'weddings',SLUG);await assertSucceeds(updateDoc(w,{registry:[{name:'Legacy synthetic',received:999}]}));await assertFails(getDoc(doc(db(),'weddings',SLUG)));await assertSucceeds(updateDoc(w,{registry:[{name:'Migrated demo',target:50000}]}));await assertSucceeds(getDoc(doc(db(),'weddings',SLUG)));await assertFails(updateDoc(w,{published:false}));await assertSucceeds(updateDoc(w,{published:false,driveEpoch:'demo-rotated-epoch-000000000000000000000002'}));
});
