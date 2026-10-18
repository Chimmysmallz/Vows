import {randomBytes, createHash, createHmac, timingSafeEqual} from 'node:crypto';
const MAX_FILE = 20 * 1024 * 1024;
const LIMITS = Object.freeze({uploadTries:6,weddingFiles:2000,weddingBytes:5*1024**3,networkFiles:2000,networkBytes:10*1024**3,capFiles:20,capBytes:160*1024**2,globalFiles:4000,globalBytes:10*1024**3,weddingReadBytes:30*1024**3,globalReadBytes:100*1024**3,capReadBytes:512*1024**2,issueNetworkDay:3000,issueWeddingDay:5000,issueGlobalDay:5000,requestNetworkDay:20000,requestWeddingDay:30000,requestGlobalDay:40000,networkHour:10000,ownerNetworkDay:300});
const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const MIME = new Set(['image/jpeg','image/png','image/webp','image/heic']);
class Fault extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (n, m) => { throw new Fault(n, m); };
const assert = (v, n, m) => { if (!v) fail(n, m); };
const random = () => randomBytes(32).toString('base64url');
const hash = s => createHash('sha256').update(s).digest('hex');
const same = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const id = s => typeof s === 'string' && /^[a-zA-Z0-9_-]{3,100}$/.test(s);
const slugOK = s => typeof s === 'string' && /^[a-z0-9][a-z0-9-]{2,79}$/.test(s);
const cleanName = s => String(s || 'wedding-photo').normalize('NFKC').replace(/[^a-zA-Z0-9._ -]/g, '_').replace(/^\.+/, '').slice(0,100) || 'wedding-photo';
function registrySafe(w) {
  return !Object.hasOwn(w, 'registry') || Array.isArray(w.registry) && w.registry.length <= 10 && w.registry.every(x => x && typeof x === 'object' && !Array.isArray(x) && Object.keys(x).every(k => ['name','note','target','ico'].includes(k)));
}
function magic(type, b) {
  if (!Buffer.isBuffer(b) || b.length < 16 || !MIME.has(type)) return false;
  if (type === 'image/jpeg') return b[0] === 255 && b[1] === 216 && b[2] === 255;
  if (type === 'image/png') return b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (type === 'image/webp') return b.toString('ascii',0,4) === 'RIFF' && b.toString('ascii',8,12) === 'WEBP' && b.readUInt32LE(4) + 8 === b.length;
  const size = b.readUInt32BE(0);
  return b.toString('ascii',4,8) === 'ftyp' && size >= 20 && size <= Math.min(b.length,256) && (size - 16) % 4 === 0 && ['heic','heix'].includes(b.toString('ascii',8,12));
}
function animated(type,b) {
  if(type==='image/png') {for(let offset=8;offset+12<=b.length;) {const n=b.readUInt32BE(offset),kind=b.toString('ascii',offset+4,offset+8);if(kind==='acTL')return true;if(n>b.length-offset-12)break;offset+=n+12;}}
  if(type==='image/webp') {for(let offset=12;offset+8<=b.length;) {const kind=b.toString('ascii',offset,offset+4),n=b.readUInt32LE(offset+4);if(kind==='ANIM'||kind==='ANMF'||kind==='VP8X'&&n>=10&&offset+9<=b.length&&(b[offset+8]&2))return true;if(n>b.length-offset-8)break;offset+=n+8+(n%2);}}
  return false;
}
async function seal(value, secret, context) {
  const raw=Buffer.from(secret,'base64');assert(raw.length===32,503,'Invalid encryption configuration');
  const key=await crypto.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt']);
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(context)},key,new TextEncoder().encode(value));
  return Buffer.from(iv).toString('base64url')+'.'+Buffer.from(ciphertext).toString('base64url');
}
async function unseal(value,secret,context) {
  const [iv,ciphertext]=value.split('.').map(x=>Buffer.from(x,'base64url'));
  const key=await crypto.subtle.importKey('raw',Buffer.from(secret,'base64'),'AES-GCM',false,['decrypt']);
  return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(context)},key,ciphertext));
}
function makeService({store, google, verifyId, config, now = Date.now}) {
  const wp = s => `weddings/${s}`, cp = s => `driveConnections/${s}`;
  const privateKey = (name, value) => createHmac('sha256',config.key).update(name + ':' + value).digest('hex');
  const policy = c => ({uploads: c?.uploads === true, view: c?.view === true, download: c?.view === true && c?.download === true});
  function origin(req) { assert(req.origin === config.origin,403,'Approved frontend origin required'); }
  async function owner(req, s) {
    origin(req); assert(slugOK(s),400,'Invalid wedding');
    assert(typeof req.authorization === 'string' && req.authorization.startsWith('Bearer '),401,'Sign in as the wedding owner');
    let who;try { who=await verifyId(req.authorization.slice(7)); } catch { fail(401,'Firebase sign-in expired or revoked. Sign in again'); }
    const w = await store.get(wp(s)); assert(w && w.ownerUid === who.uid,403,'Wedding owner required'); return who.uid;
  }
  function live(w,c) {
    assert(w?.published === true && registrySafe(w),404,'Wedding unavailable');
    assert(c?.connected && c.folderId && c.ownerUid === w.ownerUid,403,'Photo collection unavailable');
  }
  function bound(w,c,a) {
    live(w,c); assert(a && a.expires > now() && a.slug && a.ownerUid === w.ownerUid && a.connectionId === c.connectionId && a.generation === c.generation && a.epoch === (w.driveEpoch || ''),403,'Photo access expired or changed. Refresh the page');
  }
  async function rate(req,s,label,limit) {
    const day = Math.floor(now()/86400000), hour = Math.floor(now()/3600000);
    const rules = [
      [`driveRates/${privateKey('ip',req.ip)}_${day}_${label}`,limit],
      [`driveRates/${s}_${day}_${label}`,label === 'issue' ? LIMITS.issueWeddingDay : LIMITS.requestWeddingDay],
      [`driveRates/global_${day}_${label}`,label === 'issue' ? LIMITS.issueGlobalDay : LIMITS.requestGlobalDay],
      [`driveRates/${privateKey('ip-hour',req.ip)}_${hour}`,LIMITS.networkHour]
    ];
    await store.tx(rules.map(x=>x[0]), rows => { const writes={}; for (const [p,max] of rules) { const d=rows[p]||{count:0}; assert(d.count < max,429,'Photo request limit reached. Try later'); writes[p]={count:d.count+1,expiresAt:new Date(now()+2*86400000)}; } return {writes}; });
  }
  async function guest(req,s,need) {
    origin(req); assert(slugOK(s),400,'Invalid wedding'); assert(typeof req.cap === 'string' && /^[A-Za-z0-9_-]{43}$/.test(req.cap),401,'Refresh photo access');
    await rate(req,s,'request',LIMITS.requestNetworkDay);
    const w=await store.get(wp(s)), c=await store.get(cp(s)), a=await store.get(`driveCaps/${hash(req.cap)}`);
    bound(w,c,a); assert(a.slug===s && same(a.ip,privateKey('cap-ip',req.ip)),403,'Wrong wedding or network; refresh photo access');
    if(need) assert(policy(c)[need],403,'The couple has disabled this photo action');
    return {w,c,a};
  }
  async function access(c,s) {
    try { return await google.refresh(await unseal(c.refresh,config.key,`refresh:${s}:${c.ownerUid}`)); }
    catch { fail(503,'Drive authorization unavailable. Ask the couple to reconnect'); }
  }
  const privateFolder = f => f && f.mimeType==='application/vnd.google-apps.folder' && !f.trashed && f.capabilities?.canAddChildren && !f.driveId && f.ownedByMe===true && Array.isArray(f.permissions) && f.permissions.length>0 && f.permissions.every(p=>p.type==='user' && p.role==='owner');
  async function folderLive(c,token) { const f=await google.meta(token,c.folderId); assert(f.id===c.folderId && privateFolder(f),403,'The selected Drive folder is unavailable or no longer owner-only private'); }
  const publicOwner = c => ({connected:!!c?.connected,folderSelected:!!c?.folderId,folderName:c?.folderName||'',settings:policy(c)});
  async function start(req,s,b={}) {
    assert(typeof b.browserProofHash==='string'&&/^[a-f0-9]{64}$/.test(b.browserProofHash),400,'Initiating browser proof required');
    const uid=await owner(req,s);await rate(req,s,'owner',LIMITS.ownerNetworkDay);
    const previous=await store.get(cp(s)),handoff=random(),state=random(),verifier=random();
    await store.set('driveStates/'+hash(handoff),{slug:s,uid,previousGeneration:previous?.generation||'',state,verifier,browserProof:b.browserProofHash,idToken:req.authorization.slice(7),expires:now()+600000,used:false,begun:false});
    return {url:config.backend+'/oauth/begin?handoff='+handoff};
  }
  async function begin(handoff) {
    assert(typeof handoff==='string'&&/^[A-Za-z0-9_-]{43}$/.test(handoff),400,'Invalid handoff');
    const p='driveStates/'+hash(handoff),browser=random();
    const st=await store.tx([p],r=>{const x=r[p];assert(x&&!x.begun&&!x.used&&x.expires>now(),403,'Authorization handoff expired or used');return {writes:{[p]:{...x,begun:true,cookie:hash(browser)}},result:x};});
    await store.set('driveCallbacks/'+hash(st.state),{handoff:hash(handoff),expires:st.expires});
    const q=new URLSearchParams({client_id:config.clientId,redirect_uri:config.redirect,scope:SCOPE,response_type:'code',access_type:'offline',prompt:'consent',state:st.state,code_challenge:hashChallenge(st.verifier),code_challenge_method:'S256',include_granted_scopes:'false'});
    return {url:'https://accounts.google.com/o/oauth2/v2/auth?'+q,cookie:browser};
  }
  async function callback(req) {
    assert(typeof req.state==='string'&&/^[A-Za-z0-9_-]{43}$/.test(req.state),400,'Invalid authorization state');
    const ref=await store.get('driveCallbacks/'+hash(req.state));assert(ref&&ref.expires>now(),403,'Authorization expired');
    const p='driveStates/'+ref.handoff,st=await store.get(p);
    assert(st&&same(st.cookie,hash(req.cookie||'')),403,'Authorization browser mismatch');
    assert(!st.used&&st.begun&&st.expires>now(),403,'Authorization expired or used');
    // The original Firebase session is revalidated at completion, not only at start.
    const who=await verifyId(st.idToken);store.ownerToken=st.idToken;
    const w=await store.get(wp(st.slug));assert(w?.ownerUid===st.uid&&who.uid===st.uid,403,'Wedding owner changed');
    await store.tx([p,cp(st.slug)],r=>{const x=r[p];assert(x&&x.begun&&!x.used&&x.expires>now()&&(r[cp(st.slug)]?.generation||'')===x.previousGeneration,403,'Authorization expired or used');return {writes:{[p]:{...x,used:true,idToken:'',verifier:''}}};});
    assert(!req.error&&typeof req.code==='string'&&req.code.length<4096,400,'Google authorization not completed');
    const completion=random();
    await store.tx([p],r=>{assert(r[p]?.used&&!r[p].code,403,'Authorization already completed');return {writes:{[p]:{...r[p],code:req.code,verifier:st.verifier,completed:false},['driveCompletions/'+hash(completion)]:{statePath:p,expires:st.expires}}};});
    return {slug:st.slug,completion};
  }
  async function complete(req,s,b){
    const uid=await owner(req,s);
    assert(typeof b.completion==='string'&&/^[A-Za-z0-9_-]{43}$/.test(b.completion)&&typeof b.browserProof==='string'&&/^[A-Za-z0-9_-]{43}$/.test(b.browserProof),403,'Return to the browser tab where you started connecting');
    const refPath='driveCompletions/'+hash(b.completion),ref=await store.get(refPath);assert(ref&&ref.expires>now(),403,'Completion expired');
    const st=await store.get(ref.statePath);assert(st&&st.slug===s&&st.uid===uid&&same(st.browserProof,hash(b.browserProof)),403,'Initiating browser or owner mismatch');
    await store.tx([refPath,ref.statePath,cp(s)],r=>{const x=r[ref.statePath];assert(r[refPath]&&x&&!x.completed&&x.used&&x.expires>now()&&same(x.browserProof,hash(b.browserProof))&&(r[cp(s)]?.generation||'')===x.previousGeneration,403,'Authorization expired or used');return {writes:{[ref.statePath]:{...x,completed:true,code:'',verifier:''},[refPath]:{expires:now(),used:true}}};});
    const tokens=await google.exchange(st.code,st.verifier);
    assert(tokens.refresh_token&&tokens.scope?.split(' ').includes(SCOPE)&&tokens.scope.split(' ').every(x=>x===SCOPE),400,'Offline drive.file permission required');
    await owner(req,s);
    const encrypted=await seal(tokens.refresh_token,config.key,`refresh:${s}:${uid}`);
    await store.tx([wp(s),cp(s)],r=>{assert(r[wp(s)]?.ownerUid===uid&&(r[cp(s)]?.generation||'')===st.previousGeneration,409,'Connection changed');return {writes:{[cp(s)]:{ownerUid:uid,connected:true,refresh:encrypted,connectionId:random(),generation:random(),folderId:'',folderName:'',uploads:false,view:false,download:false}}};});
    return {connected:true};
  }
  async function ownerAction(req,s,action,b) {
    const uid=await owner(req,s); await rate(req,s,'owner',LIMITS.ownerNetworkDay);
    if(action==='complete')return complete(req,s,b);
    const c=await store.get(cp(s));
    if(action==='status') {const usage=await store.get(`driveBudgets/${s}`);return {...publicOwner(c),limits:LIMITS,usage:{files:usage?.files||0,bytes:usage?.bytes||0}};}
    if(action==='disconnect') {
      await store.tx([wp(s),cp(s)],r=>{assert(r[wp(s)]?.ownerUid===uid,403,'Wedding owner required');return {writes:{[cp(s)]:{ownerUid:uid,connected:false,refresh:'',folderId:'',folderName:'',connectionId:random(),generation:random(),uploads:false,view:false,download:false}}};});
      // Revocation is best-effort; local access is already disabled even if Google is unavailable.
      if(c?.refresh)try{await google.revoke(await unseal(c.refresh,config.key,`refresh:${s}:${uid}`));}catch{}
      return {connected:false};
    }
    assert(c?.connected && c.ownerUid===uid,409,'Connect Google Drive first');
    if(action==='picker')return {accessToken:await access(c,s),developerKey:config.pickerKey,appId:config.projectNumber};
    if(action==='folder') {
      assert(id(b.folderId),400,'Invalid folder selection');
      const f=await google.meta(await access(c,s),b.folderId);
      assert(f.id===b.folderId && privateFolder(f),400,'Choose an accessible, writable, owner-only private folder in your My Drive (no sharing or shared drives)');
      await store.tx([wp(s),cp(s)],r=>{assert(r[wp(s)]?.ownerUid===uid && r[cp(s)]?.connectionId===c.connectionId,409,'Connection changed');return {writes:{[cp(s)]:{...r[cp(s)],folderId:f.id,folderName:cleanName(f.name),connectionId:random(),generation:random(),uploads:false,view:false,download:false}}};});
      return publicOwner(await store.get(cp(s)));
    }
    if(action==='settings') {
      assert(c.folderId,409,'Choose a Drive folder first');
      assert(['uploads','view','download'].every(k=>typeof b[k]==='boolean'),400,'Use true/false photo settings');
      assert(!b.download || b.view,400,'Viewing must be enabled before downloads');
      await store.tx([wp(s),cp(s)],r=>{assert(r[wp(s)]?.ownerUid===uid && r[cp(s)]?.connectionId===c.connectionId,409,'Connection changed');return {writes:{[cp(s)]:{...r[cp(s)],uploads:b.uploads,view:b.view,download:b.download,generation:random()}}};});
      return publicOwner(await store.get(cp(s)));
    }
    fail(404,'Unknown owner action');
  }
  async function issue(req,s) {
    origin(req); assert(slugOK(s),400,'Invalid wedding'); await rate(req,s,'issue',LIMITS.issueNetworkDay);
    const w=await store.get(wp(s)),c=await store.get(cp(s)); live(w,c);
    const token=random(); await store.set(`driveCaps/${hash(token)}`,{slug:s,ownerUid:w.ownerUid,epoch:w.driveEpoch||'',connectionId:c.connectionId,generation:c.generation,expires:now()+7200000,expiresAt:new Date(now()+7200000),ip:privateKey('cap-ip',req.ip)});
    return {capability:token,expires:now()+7200000,settings:policy(c),maxFileBytes:MAX_FILE,limits:LIMITS};
  }
  async function prepare(req,s,b) {
    const {w,c,a}=await guest(req,s,'uploads');
    assert(Number.isSafeInteger(b.size)&&b.size>=16&&b.size<=MAX_FILE&&MIME.has(b.type),400,'Choose JPEG, PNG, WEBP or HEIC, up to 20 MiB');
    const sessionId=random(), fileId=random(), gp=`driveBudgets/${s}`, globalPath=`driveBudgets/global_${Math.floor(now()/86400000)}`, capPath=`driveCaps/${hash(req.cap)}`, pp=`driveUploadRates/${privateKey('upload-ip',req.ip)}_${Math.floor(now()/86400000)}`;
    // Allocate a Google file ID before uploading: retrying the same session cannot create a second file.
    const token=await access(c,s);await folderLive(c,token);
    const driveId=await google.allocate(token); assert(id(driveId),502,'Drive could not allocate a photo');
    const metadata={id:driveId,name:cleanName(b.name),mimeType:b.type,parents:[c.folderId],appProperties:{vowsFile:fileId,vowsWedding:s,vowsConnection:c.connectionId}};
    const uploadUri=await google.beginUpload(token,metadata,b.size);
    const session={slug:s,ownerUid:w.ownerUid,connectionId:c.connectionId,generation:c.generation,epoch:w.driveEpoch||'',expires:now()+900000,expiresAt:new Date(now()+86400000),cap:hash(req.cap),size:b.size,type:b.type,name:cleanName(b.name),driveId,fileId,status:'pending',lease:0,offset:0,uploadUri};
    await store.tx([gp,pp,globalPath,capPath,wp(s),cp(s)],r=>{
      bound(r[wp(s)],r[cp(s)],a);assert(policy(r[cp(s)]).uploads,403,'Uploads disabled');
      const g=r[gp]||{files:0,bytes:0,readBytes:0},p=r[pp]||{files:0,bytes:0},project=r[globalPath]||{files:0,bytes:0,readBytes:0},cap=r[capPath];
      assert(g.files<LIMITS.weddingFiles && g.bytes+b.size<=LIMITS.weddingBytes && p.files<LIMITS.networkFiles && p.bytes+b.size<=LIMITS.networkBytes && (cap.files||0)<LIMITS.capFiles && (cap.bytes||0)+b.size<=LIMITS.capBytes && project.files<LIMITS.globalFiles && project.bytes+b.size<=LIMITS.globalBytes,429,'Photo upload quota reached');
      return {writes:{[gp]:{...g,files:g.files+1,bytes:g.bytes+b.size},[pp]:{files:p.files+1,bytes:p.bytes+b.size,expiresAt:new Date(now()+2*86400000)},[globalPath]:{...project,files:project.files+1,bytes:project.bytes+b.size,expiresAt:new Date(now()+2*86400000)},[capPath]:{...cap,files:(cap.files||0)+1,bytes:(cap.bytes||0)+b.size},[`driveSessions/${sessionId}`]:session}};
    });
    return {session:sessionId,chunkBytes:1024*1024,offset:0};
  }
  function fileBinding(f,c,s) { assert(f && f.slug===s && f.connectionId===c.connectionId && f.folderId===c.folderId && f.ownerUid===c.ownerUid && f.status==='complete',404,'Photo not available'); }
  function googleBinding(f,m,c) {assert(m && m.id===f.driveId && !m.trashed && m.mimeType===f.type && Number(m.size)===f.size && typeof m.version==='string' && /^[0-9]+$/.test(m.version) && (!f.version || m.version===f.version) && (!m.sha256Checksum || !f.digest || m.sha256Checksum===f.digest) && m.parents?.includes(c.folderId) && m.appProperties?.vowsFile===f.fileId && m.appProperties?.vowsWedding===f.slug && m.appProperties?.vowsConnection===c.connectionId,404,'Photo moved, changed or unavailable');}
  async function upload(req,s,sessionId,bytes,offset) {
    const {c,a}=await guest(req,s,'uploads');assert(id(sessionId),400,'Invalid session');
    assert(Number.isSafeInteger(offset)&&offset>=0&&bytes instanceof Uint8Array&&bytes.length>0&&bytes.length<=1024*1024,400,'Use bounded 1 MiB chunks');
    const p='driveSessions/'+sessionId,lease=random(),digest=hash(bytes);
    const u=await store.tx([p,wp(s),cp(s)],r=>{const x=r[p];bound(r[wp(s)],r[cp(s)],x);assert(x.slug===s&&same(x.cap,hash(req.cap)),403,'Wrong upload session');assert(policy(r[cp(s)]).uploads,403,'Uploads disabled');
      if(x.status==='complete'){assert(x.lastOffset===offset&&x.lastDigest===digest,409,'Retry must use the same final chunk');return {result:{...x,done:true}};}
      if(offset<x.offset){assert(x.lastOffset===offset&&x.lastDigest===digest,409,'Retry must use the same chunk');return {result:{...x,duplicate:true}};}
      assert(offset===x.offset&&offset+bytes.length<=x.size&&(bytes.length===1024*1024||offset+bytes.length===x.size),409,'Incorrect chunk offset or length');
      assert(!x.leaseUntil||x.leaseUntil<now(),409,'Chunk is in progress; retry shortly');
      assert(!x.pendingDigest||x.pendingOffset!==offset||x.pendingDigest===digest,409,'Retry must use the same chunk');
      assert((x.chunkTries||0)<6,429,'Chunk retry allowance reached');
      return {writes:{[p]:{...x,lease,leaseUntil:now()+120000,pendingDigest:digest,pendingOffset:offset,chunkTries:(x.chunkTries||0)+1}},result:x};});
    if(u.done)return {uploaded:true,offset:u.size};if(u.duplicate)return {uploaded:false,offset:u.offset};
    try {
      assert(offset!==0||magicChunk(u.type,bytes,u.size),400,'Photo signature does not match');
      const token=await access(c,s);await folderLive(c,token);
      // Status reconciliation makes a lost Drive response safe without exposing its URI.
      let upstream=await google.uploadStatus(token,u.uploadUri,u.size);
      if(upstream.offset===offset)upstream=await google.uploadChunk(token,u.uploadUri,bytes,offset,u.size,u.type);
      assert(upstream.offset===offset+bytes.length,409,'Drive offset mismatch; retry the same chunk');
      let m=null;if(upstream.complete){m=await google.meta(token,u.driveId);googleBinding(u,m,c);assert(m.sha256Checksum&&/^[a-f0-9]{64}$/.test(m.sha256Checksum),502,'Drive checksum unavailable');}
      const latest=await store.get(wp(s)),connection=await store.get(cp(s));bound(latest,connection,a);bound(latest,connection,u);assert(policy(connection).uploads,403,'Uploads disabled');
      await store.tx([p,wp(s),cp(s)],r=>{bound(r[wp(s)],r[cp(s)],a);bound(r[wp(s)],r[cp(s)],r[p]);assert(policy(r[cp(s)]).uploads&&r[p].lease===lease,409,'Upload changed');return {writes:{[p]:{...r[p],offset:upstream.offset,lastOffset:offset,lastDigest:digest,pendingDigest:'',chunkTries:0,status:upstream.complete?'complete':'pending',leaseUntil:0},...(m?{[`${cp(s)}/files/${u.fileId}`]:{slug:s,ownerUid:u.ownerUid,connectionId:c.connectionId,folderId:c.folderId,driveId:u.driveId,fileId:u.fileId,type:u.type,size:u.size,name:u.name,digest:m.sha256Checksum,version:m.version,status:'complete',created:now()}}:{})}};});
      return {uploaded:upstream.complete,offset:upstream.offset};
    }finally{await store.tx([p],r=>r[p]?.lease===lease&&r[p].leaseUntil>0?{writes:{[p]:{...r[p],leaseUntil:0}}}:{});}
  }
  async function gallery(req,s,b) {
    const {c}=await guest(req,s,'view');assert(!b.after||id(b.after),400,'Invalid gallery cursor');
    await folderLive(c,await access(c,s));
    const rows=await store.list(`${cp(s)}/files`,b.after||'',51),page=rows.slice(0,50);
    const items=page.filter(x=>x.data.connectionId===c.connectionId&&x.data.folderId===c.folderId&&x.data.status==='complete').map(x=>({id:x.id,name:x.data.name,preview:x.data.type!=='image/heic'}));
    return {items,next:rows.length>50?page.at(-1).id:null,download:policy(c).download};
  }
  async function media(req,s,fileId,download) {
    const {c,a}=await guest(req,s,download?'download':'view');assert(id(fileId),400,'Invalid photo');
    const f=await store.get(`${cp(s)}/files/${fileId}`); fileBinding(f,c,s);
    assert(download||f.type!=='image/heic',415,'HEIC preview unavailable. Download only if enabled');
    const budget=`driveBudgets/${s}`, globalPath=`driveBudgets/global_${Math.floor(now()/86400000)}`, capPath=`driveCaps/${hash(req.cap)}`, reserve=download?f.size:128*1024;
    await store.tx([budget,globalPath,capPath,wp(s),cp(s)],r=>{
      bound(r[wp(s)],r[cp(s)],a);assert(policy(r[cp(s)])[download?'download':'view'],403,'Photo action disabled');
      const g=r[budget]||{files:0,bytes:0,readBytes:0},project=r[globalPath]||{files:0,bytes:0,readBytes:0},cap=r[capPath];
      assert(g.readBytes+reserve<=LIMITS.weddingReadBytes && project.readBytes+reserve<=LIMITS.globalReadBytes && (cap.readBytes||0)+reserve<=LIMITS.capReadBytes,429,'Photo viewing quota reached');
      return {writes:{[budget]:{...g,readBytes:g.readBytes+reserve},[globalPath]:{...project,readBytes:project.readBytes+reserve,expiresAt:new Date(now()+2*86400000)},[capPath]:{...cap,readBytes:(cap.readBytes||0)+reserve}}};
    });
    const token=await access(c,s);await folderLive(c,token);const m=await google.meta(token,f.driveId);googleBinding(f,m,c);
    let bytes,type=f.type;
    if(download){
      // Stream originals; never buffer or hash a 20 MiB body on the Free CPU budget.
      bytes=await google.download(token,f.driveId,f.size);
    }else{
      assert(typeof m.thumbnailLink==='string',404,'Google preview unavailable');
      const preview=await google.thumbnail(token,m.thumbnailLink);bytes=preview.bytes;type=preview.type;
    }
    // Recheck after upstream I/O; private, non-cacheable proxy responses never expose Google URLs.
    const latest=await store.get(cp(s));bound(await store.get(wp(s)),latest,a);
    assert(policy(latest)[download?'download':'view'],403,'Photo action disabled');
    return {bytes,type,name:cleanName(f.name),attachment:download};
  }
  return {start,begin,callback,ownerAction,issue,prepare,upload,gallery,media,owner};
}
const hashChallenge = s => createHash('sha256').update(s).digest('base64url');
export {makeService,Fault,MAX_FILE,LIMITS,SCOPE,magic,registrySafe,seal,unseal,cleanName};
function magicChunk(type,bytes,size){const b=Buffer.from(bytes);if(type==='image/webp')return b.length>=16&&b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP'&&b.readUInt32LE(4)+8===size;return magic(type,b);}
export {magicChunk};
