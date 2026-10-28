import {PROJECT,HOSTS,demoEnvironment} from './guard.mjs';
import {SLUG} from './fixtures.mjs';

export async function verifyEmulatorServices(env,request=fetch) {
  env=demoEnvironment(env,true);
  async function json(url,statuses,headers={}) {
    const r=await request(url,{redirect:'error',headers,signal:AbortSignal.timeout(4000)});
    if(!statuses.includes(r.status))throw Error('Wrong/unavailable emulator endpoint: '+url+' ('+r.status+')');
    if(!r.headers.get('content-type')?.includes('application/json'))throw Error('Expected emulator JSON, not an arbitrary HTTP service.');
    const value=await r.json();
    if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid emulator JSON response.');
    return {status:r.status,value};
  }
  const {value:hub}=await json('http://127.0.0.1:4400/emulators',[200]);
  for(const [name,host]of Object.entries(HOSTS)) {
    const port=Number(host.split(':')[1]);
    if(!hub[name]||hub[name].port!==port||!['127.0.0.1','localhost'].includes(hub[name].host))throw Error('Local Emulator Hub does not advertise the expected '+name+' service.');
  }
  await json(`http://${env.FIREBASE_AUTH_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/config`,[200]);
  const prefix=`projects/${PROJECT}/databases/(default)/documents/`;
  // A nonexistent wedding is not publicly readable under the real rules. Use only
  // the emulator's fixed admin token on the already-guarded loopback endpoint.
  const {status,value}=await json(`http://${env.FIRESTORE_EMULATOR_HOST}/v1/${prefix}weddings/${SLUG}`,[200,404],{Authorization:'Bearer owner'});
  if(status===200&&!value.name?.startsWith(prefix))throw Error('Firestore response is outside the required demo project namespace.');
  if(status===404&&value.error?.status!=='NOT_FOUND')throw Error('Expected Firestore NOT_FOUND for an unseeded demo namespace.');
  // Firebase emulators can host multiple project namespaces; never discover/select a real project.
  // The strict project ID and requested paths determine the namespace, including on an empty emulator.
}
