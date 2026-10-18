import {seal,unseal,Fault} from './service.mjs';
export const GUARD_SQL='INSERT INTO transaction_guards(id,ok) SELECT ?, CASE WHEN ';
// D1 batch is atomic. A failed CHECK rolls every preceding/following write back.
export function guardStatement(db,entries,id){const checks=entries.map(()=>'(COALESCE((SELECT version FROM private_records WHERE key=?),0)=?)').join(' AND ')||'1';return db.prepare(GUARD_SQL+checks+' THEN 1 ELSE 0 END').bind(id,...entries.flat());}
export function makeStore(db,key,wedding){
 const store={ownerToken:'',
  async read(p){const r=await db.prepare('SELECT value,version FROM private_records WHERE key=?').bind(p).first();return {version:r?.version||0,data:r?JSON.parse(await unseal(r.value,key,'row:'+p)):null};},
  async get(p){if(p.startsWith('weddings/'))return wedding(p.split('/')[1],store.ownerToken);return (await store.read(p)).data;},
  async set(p,v){return store.tx([p],()=>({writes:{[p]:v}}));},
  async tx(paths,fn){
   paths=[...new Set(paths)];
   for(let attempt=0;attempt<5;attempt++){
    const versions=[],rows={};
    for(const p of paths){if(p.startsWith('weddings/'))rows[p]=await store.get(p);else{const r=await store.read(p);rows[p]=r.data;versions.push([p,r.version]);}}
    const answer=fn(rows)||{},writes=Object.entries(answer.writes||{});if(!writes.length)return answer.result;
    if(writes.some(([p])=>p.startsWith('weddings/')))throw new Fault(500,'Backend cannot write wedding records');
    const id=crypto.randomUUID(),batch=[guardStatement(db,versions,id)];
    for(const [p,v] of writes){const expiry=Number(v.expires)||Number(v.expiresAt&&new Date(v.expiresAt))||0;batch.push(db.prepare('INSERT INTO private_records(key,value,version,expires) VALUES(?,?,1,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,version=private_records.version+1,expires=excluded.expires').bind(p,await seal(JSON.stringify(v),key,'row:'+p),expiry));}
    batch.push(db.prepare('DELETE FROM transaction_guards WHERE id=?').bind(id));
    try{await db.batch(batch);return answer.result;}catch(e){if(!String(e.message).includes('CHECK constraint failed'))throw e;}
   }throw new Fault(409,'Photo service busy; retry shortly');
  },
  async list(prefix,after,n){const start=prefix+'/'+after,end=prefix+'0';const result=await db.prepare('SELECT key,value FROM private_records WHERE key>? AND key<? ORDER BY key LIMIT ?').bind(start,end,n).all();return Promise.all(result.results.map(async r=>({id:r.key.slice(prefix.length+1),data:JSON.parse(await unseal(r.value,key,'row:'+r.key))})));}
 };return store;
}
