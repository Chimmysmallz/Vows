import {makeService,Fault,MAX_FILE} from './service.mjs';
import {makeStore} from './store.mjs';
import {makeAdapters,limited} from './adapters.mjs';
const BASE={'Cache-Control':'private, no-store, max-age=0','Pragma':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"};
export function makeHandler(adapterFactory=makeAdapters,storeFactory=makeStore){return async function handle(request,env){
 const headers={...BASE};
 try{
  for(const key of ['FRONTEND_ORIGIN','BACKEND_URL']){const u=new URL(env[key]);if(u.origin!==env[key]||u.protocol!=='https:'||/REPLACE|YOUR_|example\.invalid/.test(env[key]))throw new Error('Unconfigured origin');}
  if(!env.DB||!env.DRIVE_KEY||!env.GOOGLE_CLIENT_SECRET||!env.FIREBASE_API_KEY)throw new Error('Unconfigured secrets');
  const url=new URL(request.url),origin=request.headers.get('Origin');if(url.origin!==env.BACKEND_URL)throw new Fault(403,'Wrong backend origin');
  if(origin===env.FRONTEND_ORIGIN){headers['Access-Control-Allow-Origin']=origin;headers.Vary='Origin';}
  const adapters=adapterFactory(env),store=storeFactory(env.DB,env.DRIVE_KEY,adapters.wedding);
  const service=makeService({store,google:adapters.google,verifyId:adapters.verifyId,config:{origin:env.FRONTEND_ORIGIN,backend:env.BACKEND_URL,redirect:env.BACKEND_URL+'/oauth/callback',clientId:env.GOOGLE_CLIENT_ID,pickerKey:env.PICKER_KEY,projectNumber:env.GOOGLE_PROJECT_NUMBER,key:env.DRIVE_KEY}});
  const cookie=(request.headers.get('Cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('__Host-vows-oauth='))?.slice('__Host-vows-oauth='.length)||'';
  if(url.pathname==='/oauth/begin'||url.pathname==='/oauth/callback'){
   if(request.method!=='GET')throw new Fault(405,'GET required');
   let target;
   if(url.pathname==='/oauth/begin'){
    const result=await service.begin(url.searchParams.get('handoff'));target=result.url;
    headers['Set-Cookie']='__Host-vows-oauth='+result.cookie+'; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=600';
   }else{
    const result=await service.callback({state:url.searchParams.get('state'),code:url.searchParams.get('code'),error:url.searchParams.get('error'),cookie});
    target=env.FRONTEND_ORIGIN+'/app.html?wedding='+encodeURIComponent(result.slug)+'&drive=complete#drive-completion='+encodeURIComponent(result.completion);
    headers['Set-Cookie']='__Host-vows-oauth=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0';
   }
   return new Response(null,{status:303,headers:{...headers,Location:target}});
  }
  if(origin!==env.FRONTEND_ORIGIN)throw new Fault(403,'Approved frontend origin required');
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'POST','Access-Control-Allow-Headers':'Content-Type, Authorization, X-Vows-Cap, X-Vows-Offset','Access-Control-Max-Age':'600'}});
  if(request.method!=='POST')throw new Fault(405,'POST required');
  const m=url.pathname.match(/^\/api\/drive\/([a-z0-9][a-z0-9-]{2,79})\/(owner\/([a-z]+)|guest\/([a-z]+))(?:\/([A-Za-z0-9_-]{3,100}))?$/);if(!m)throw new Fault(404,'Unknown photo route');
  const [,,group,owner,action,object]=m,slug=m[1];
  const ctx={origin,authorization:request.headers.get('Authorization'),cap:request.headers.get('X-Vows-Cap'),ip:request.headers.get('CF-Connecting-IP')||'unknown'};
  store.ownerToken=owner?ctx.authorization?.replace(/^Bearer /,'')||'':'';
  const type=request.headers.get('Content-Type')?.split(';')[0];let body={},bytes;
  if(action==='upload'){
   if(type!=='application/octet-stream'||Number(request.headers.get('Content-Length'))>1024*1024)throw new Fault(400,'Use 1 MiB binary chunks');
   bytes=await limited(new Response(request.body),1024*1024);
  }else{
   if(type!=='application/json'||Number(request.headers.get('Content-Length'))>16384)throw new Fault(400,'Small JSON body required');
   try{body=JSON.parse(new TextDecoder().decode(await limited(new Response(request.body),16384)));}catch{throw new Fault(400,'Small JSON body required');}
   if(!body||Array.isArray(body)||typeof body!=='object')throw new Fault(400,'JSON object required');
  }
  let result;
  if(owner==='start')result=await service.start(ctx,slug,body);
  else if(owner)result=await service.ownerAction(ctx,slug,owner,body);
  else if(action==='session')result=await service.issue(ctx,slug);
  else if(action==='prepare')result=await service.prepare(ctx,slug,body);
  else if(action==='upload'&&object){const raw=request.headers.get('X-Vows-Offset');if(!raw||!/^\d{1,8}$/.test(raw))throw new Fault(400,'Chunk offset required');result=await service.upload(ctx,slug,object,bytes,Number(raw));}
  else if(action==='gallery')result=await service.gallery(ctx,slug,body);
  else if((action==='thumbnail'||action==='download')&&object){
   const media=await service.media(ctx,slug,object,action==='download');
   return new Response(media.bytes,{headers:{...headers,'Content-Type':media.type,'Content-Disposition':(media.attachment?'attachment':'inline')+'; filename="'+media.name+'"'}});
  }else throw new Fault(404,'Unknown photo action');
  return new Response(JSON.stringify(result),{headers:{...headers,'Content-Type':'application/json'}});
 }catch(e){return new Response(JSON.stringify({error:e instanceof Fault?e.message:'Photo service unavailable or free quota exhausted. Retry later; no paid fallback is used.'}),{status:e instanceof Fault?e.status:503,headers:{...headers,'Content-Type':'application/json'}});}
};}
export default {fetch:makeHandler(),async scheduled(_event,env){
 // D1 cleanup, not Firestore TTL (which would require billing). Indexed, bounded work.
 await env.DB.prepare('DELETE FROM private_records WHERE key IN (SELECT key FROM private_records WHERE expires>0 AND expires<? LIMIT 250)').bind(Date.now()).run();
}};
