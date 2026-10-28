import {demoEnvironment,PROJECT} from '../demo/guard.mjs';
import {verifyEmulatorServices} from '../demo/verify-services.mjs';
import {ACCOUNTS,buildFixtures,SLUG,DRAFT,OTHER,CODES,CEREMONIES} from '../demo/fixtures.mjs';
const flags=new Set(process.argv.slice(2));
for(const flag of flags) if(!['--confirm-demo','--enable-stationery'].includes(flag)) throw Error('Unknown flag: '+flag);
const env=demoEnvironment(process.env,flags.has('--confirm-demo'));
Object.assign(process.env,env);

await verifyEmulatorServices(env);
const {initializeApp,deleteApp}=await import('firebase-admin/app');
const {getAuth}=await import('firebase-admin/auth');
const {getFirestore,Timestamp}=await import('firebase-admin/firestore');
// Explicit emulator credential avoids real credential discovery entirely.
const app=initializeApp({projectId:PROJECT,credential:{getAccessToken:async()=>({access_token:'owner',expires_in:3600})}},'vows-local-seed');
try {
  const auth=getAuth(app),db=getFirestore(app);
  for(const a of ACCOUNTS) {
    const value={email:a.email,password:a.password,emailVerified:a.verified,displayName:a.label,disabled:false};
    try {await auth.getUser(a.uid);await auth.updateUser(a.uid,value);}
    catch(e) {if(e.code!=='auth/user-not-found')throw e;await auth.createUser({uid:a.uid,...value});}
  }
  const records=buildFixtures(Timestamp.fromDate(new Date('2026-10-28T00:00:00Z')),flags.has('--enable-stationery'));
  const batch=db.batch();
  for(const [p,data] of records) batch.set(db.doc(p),data);
  // Only deterministic fixture IDs: never list or wipe a database or user directory.
  for(const s of [SLUG,DRAFT,OTHER]) {
    for(const key of ['invitee','unverified']) batch.delete(db.doc(`weddings/${s}/roles/${ACCOUNTS.find(a=>a.key===key).uid}`));
    for(const code of CODES) {
      batch.delete(db.doc(`weddings/${s}/rsvps/${code}`));
      for(const c of CEREMONIES) batch.delete(db.doc(`weddings/${s}/checkins/${c.id}_${code}`));
    }
  }
  await batch.commit();
  console.log(`Seeded ${ACCOUNTS.length} emulator accounts and ${records.size} known synthetic documents into ${PROJECT}. No real accounts/payments/sends.\nStationery checkout ${flags.has('--enable-stationery')?'configuration flag enabled locally; UI checkout remains disabled because payout fields are intentionally empty':'disabled (default)'}.\nOpen http://127.0.0.1:5000/test-hub.html. Random documents you added manually are not deleted.`);
} finally {await deleteApp(app);}
