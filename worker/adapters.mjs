import {Fault,magicChunk} from './service.mjs';
const FIELDS='id,name,mimeType,trashed,parents,size,version,sha256Checksum,thumbnailLink,appProperties,capabilities(canAddChildren),driveId,ownedByMe,permissions(type,role)';
export async function limited(response,max){
 if(!response.ok){await response.body?.cancel();const e=new Fault(response.status===404?404:502,'Upstream photo request unavailable');throw e;}
 if(Number(response.headers.get('content-length'))>max){await response.body?.cancel();throw new Fault(502,'Upstream response too large');}
 const reader=response.body.getReader(),parts=[];let size=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>max)throw new Fault(502,'Upstream response too large');parts.push(value);}}finally{await reader.cancel();}
 const out=new Uint8Array(size);let offset=0;for(const p of parts){out.set(p,offset);offset+=p.length;}return out;
}
export function safeUpload(value){const u=new URL(value);if(u.protocol!=='https:'||u.hostname!=='www.googleapis.com'||u.port||u.username||u.password||u.pathname!=='/upload/drive/v3/files'||u.searchParams.get('uploadType')!=='resumable'||!u.searchParams.has('upload_id'))throw new Fault(502,'Invalid Drive upload session');return u.href;}
export function safeThumbnail(value){const u=new URL(value);if(u.protocol!=='https:'||!['lh3.googleusercontent.com','lh4.googleusercontent.com','lh5.googleusercontent.com','lh6.googleusercontent.com'].includes(u.hostname)||u.port||u.username||u.password)throw new Fault(502,'Google preview host unavailable');return u.href;}
export function makeAdapters(env,fetcher=fetch){
 const request=(url,options={})=>fetcher(url,{...options,redirect:'error',signal:AbortSignal.timeout(60000)});
 const json=async(url,options)=>JSON.parse(new TextDecoder().decode(await limited(await request(url,options),65536)));
 const headers=t=>({Authorization:'Bearer '+t});
 const token=body=>json('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...body,client_id:env.GOOGLE_CLIENT_ID,client_secret:env.GOOGLE_CLIENT_SECRET})});
 const meta=(t,id)=>json('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(id)+'?fields='+encodeURIComponent(FIELDS),{headers:headers(t)});
 async function transfer(t,uri,options,total){
  const r=await request(safeUpload(uri),{method:'PUT',...options,headers:{...headers(t),...options.headers}});
  if(r.status===308){const range=r.headers.get('Range');await r.body?.cancel();if(range&&!/^bytes=0-\d+$/.test(range))throw new Fault(502,'Invalid Drive offset');const offset=range?Number(range.split('-')[1])+1:0;if(offset>total)throw new Fault(502,'Invalid Drive offset');return {offset,complete:false};}
  await limited(r,65536);return {offset:total,complete:true};
 }
 return {google:{
  exchange:(code,verifier)=>token({code,code_verifier:verifier,redirect_uri:env.BACKEND_URL+'/oauth/callback',grant_type:'authorization_code'}),
  refresh:async refresh_token=>{const r=await token({refresh_token,grant_type:'refresh_token'});if(!r.access_token)throw new Fault(503,'Reconnect Google Drive');return r.access_token;},
  revoke:async value=>{await limited(await request('https://oauth2.googleapis.com/revoke',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token:value})}),65536);},
  meta,
  allocate:async t=>(await json('https://www.googleapis.com/drive/v3/files/generateIds?count=1&space=drive&type=files',{headers:headers(t)})).ids[0],
  beginUpload:async(t,metadata,size)=>{const r=await request('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields='+encodeURIComponent(FIELDS),{method:'POST',headers:{...headers(t),'Content-Type':'application/json','X-Upload-Content-Type':metadata.mimeType,'X-Upload-Content-Length':String(size)},body:JSON.stringify(metadata)});await limited(r,65536);return safeUpload(r.headers.get('Location'));},
  uploadStatus:(t,uri,total)=>transfer(t,uri,{headers:{'Content-Range':'bytes */'+total,'Content-Length':'0'}},total),
  uploadChunk:(t,uri,bytes,offset,total,type)=>transfer(t,uri,{headers:{'Content-Type':type,'Content-Range':`bytes ${offset}-${offset+bytes.length-1}/${total}`},body:bytes},total),
  thumbnail:async(t,uri)=>{const r=await request(safeThumbnail(uri),{headers:headers(t)});const type=r.headers.get('Content-Type')?.split(';')[0];if(!['image/jpeg','image/png','image/webp'].includes(type)){await r.body?.cancel();throw new Fault(502,'Unsafe Google preview type');}const bytes=await limited(r,128*1024);if(!magicChunk(type,bytes,bytes.length))throw new Fault(502,'Invalid Google preview');return {bytes,type};},
  download:async(t,id,size)=>{const r=await request('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(id)+'?alt=media',{headers:headers(t)});if(!r.ok||Number(r.headers.get('Content-Length'))!==size){await r.body?.cancel();throw new Fault(502,'Photo size changed');}let seen=0;return r.body.pipeThrough(new TransformStream({transform(chunk,controller){seen+=chunk.length;if(seen>size)throw new Error('Photo exceeds expected size');controller.enqueue(chunk);},flush(){if(seen!==size)throw new Error('Photo transfer incomplete');}}));}
 },
 async verifyId(idToken){
  // accounts:lookup validates the signed ID token. Claims below bind its project and live user state.
  let claims;try{claims=JSON.parse(atob(idToken.split('.')[1].replaceAll('-','+').replaceAll('_','/')));}catch{throw new Fault(401,'Sign in again');}
  if(claims.aud!==env.FIREBASE_PROJECT_ID||claims.iss!=='https://securetoken.google.com/'+env.FIREBASE_PROJECT_ID||claims.exp*1000<=Date.now()||!Number.isFinite(claims.auth_time))throw new Fault(401,'Firebase session invalid');
  let result;try{result=await json('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+encodeURIComponent(env.FIREBASE_API_KEY),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken})});}catch{throw new Fault(401,'Firebase sign-in expired or revoked');}
  const u=result.users?.[0];if(!u||u.disabled||u.localId!==claims.sub||Number(u.validSince||0)>claims.auth_time)throw new Fault(401,'Firebase session revoked or disabled');return {uid:u.localId};
 },
 async wedding(slug,idToken){
  const url='https://firestore.googleapis.com/v1/projects/'+encodeURIComponent(env.FIREBASE_PROJECT_ID)+'/databases/(default)/documents/weddings/'+encodeURIComponent(slug);
  let result;try{result=await json(url,idToken?{headers:headers(idToken)}:{});}catch(e){if(e.status===404||e.status===502)return null;throw e;}
  return decodeFields(result.fields||{});
 }
 };
}
function decodeFields(fields){const value=x=>'stringValue'in x?x.stringValue:'booleanValue'in x?x.booleanValue:'integerValue'in x?Number(x.integerValue):'doubleValue'in x?x.doubleValue:'mapValue'in x?decodeFields(x.mapValue.fields||{}):'arrayValue'in x?(x.arrayValue.values||[]).map(value):null;return Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,value(v)]));}
