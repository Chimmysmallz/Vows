export const SLUG = 'maya-and-alex-demo';
export const DRAFT = 'maya-and-alex-draft';
export const OTHER = 'other-owner-demo';
export const ACCOUNTS = Object.freeze([
  {key:'owner', uid:'demo-owner-maya', email:'maya.owner@vows.example', password:'DEMO-Maya-Owner-22!', verified:true, label:'Couple owner'},
  {key:'partner', uid:'demo-partner-alex', email:'alex.partner@vows.example', password:'DEMO-Alex-Partner-23!', verified:true, label:'Partner (NOT IMPLEMENTED; private access denied)'},
  {key:'mother', uid:'demo-helper-mother', email:'mother@vows.example', password:'DEMO-Mother-Role-24!', verified:true, role:'mother', label:'Mother of bride'},
  {key:'bridesmaid', uid:'demo-helper-bridesmaid', email:'bridesmaid@vows.example', password:'DEMO-Bridesmaid-25!', verified:true, role:'bridesmaid', label:'Chief bridesmaid'},
  {key:'planner', uid:'demo-helper-planner', email:'planner@vows.example', password:'DEMO-Planner-Role-26!', verified:true, role:'planner', label:'Event planner'},
  {key:'operator', uid:'demo-stationery-operator', email:'operator@vows.example', password:'DEMO-Operator-Role-27!', verified:true, label:'Stationery operator (own workspace)'},
  {key:'outsider', uid:'demo-outsider', email:'outsider@vows.example', password:'DEMO-Outsider-Only-28!', verified:true, label:'Outsider (private access denied)'},
  {key:'unverified', uid:'demo-unverified', email:'unverified@vows.example', password:'DEMO-Unverified-29!', verified:false, label:'Unverified helper (claim denied)'},
  {key:'other', uid:'demo-other-owner', email:'other.owner@vows.example', password:'DEMO-Other-Owner-30!', verified:true, label:'Other wedding owner'},
  {key:'invitee', uid:'demo-fresh-invitee', email:'invitee@vows.example', password:'DEMO-Fresh-Invitee-31!', verified:true, label:'New verified helper (claim real invitation)'}
]);
export const account = key => ACCOUNTS.find(a => a.key === key);
export const token = key => ('demo-local-invite-'+key+'-').padEnd(64, 'x');
export const CODES = Object.freeze(['MAYA22','ALEX23','FAM224','FRND25','TEAM26','GATE27','ROSE28','LILY29','PALM32','FERN33','IRIS34','SAGE35']);
export const CEREMONIES = Object.freeze([
  {id:'demo-ceremony', name:'Garden ceremony', date:'2027-06-12', time:'14:00', venue:'Synthetic Demo Garden', dress:'Garden colours'},
  {id:'demo-reception', name:'Evening reception', date:'2027-06-12', time:'18:00', venue:'Synthetic Demo Hall', dress:'Celebration attire'}
]);
export const QR = code => `VOWS1|${SLUG}|${code}`;

export function buildFixtures(timestamp, enableStationery = false) {
  const records = new Map();
  const add = (path, data) => records.set(path, data);
  const base = {ownerUid:account('owner').uid,names:{you:'Maya',partner:'Alex'},weddingDate:'2027-06-12',city:'Demo City',hashtag:'#MayaAlexDemo',kicker:'A synthetic wedding for testing',story:'Entirely fictional local test data. No real guests or payments.',palette:'fairy',colours:['#d8bfe6','#f8d7e3','#c9e9dd'],venueStyle:'garden',ceremonies:CEREMONIES,gift:{name:'',bank:'',number:''},registry:[{name:'Demo honeymoon goal',note:'Synthetic test only; do not transfer money',target:50000,ico:'♡'}],acceptingRequests:true,approvalMode:'manual',autoCap:200,published:true,driveEpoch:'demo-publication-epoch-000000000000000000000001',createdAt:timestamp};
  for (const [slug, value] of [[SLUG,base],[DRAFT,{...base,published:false,acceptingRequests:false}],[OTHER,{...base,ownerUid:account('other').uid,published:false,names:{you:'Robin',partner:'Casey'}}]]) {
    add(`weddings/${slug}`,value); add(`slugClaims/${slug}`,{claimed:true});
    add(`weddings/${slug}/staffInfo/main`,{names:value.names,ceremonies:CEREMONIES,weddingDate:value.weddingDate,published:value.published});
  }
  const names = ['Ari Demo','Blair Demo','Cameron Demo','Drew Demo','Ellis Demo','Finley Demo','Gray Demo','Harper Demo','Indigo Demo','Jules Demo','Kai Demo','Lane Demo'];
  CODES.forEach((code,i)=>{
    const seats = 1 + i % 3, table = ['Rose','Lily','Palm','Fern'][i%4];
    const invited = i === 5 ? ['demo-reception'] : CEREMONIES.map(c=>c.id);
    const guest = {name:names[i],code,seats,phone:'',side:['Bride','Groom','Both'][i%3],table,invited:CEREMONIES.filter(c=>invited.includes(c.id)).map(c=>c.name),seating:{printName:names[i],group:i%2?'Friends':'Family',partyRole:i===0?'Family representative':'Guest',companions:Array.from({length:seats-1},(_,j)=>`Companion ${i+1}-${j+1} Demo`),seatingNote:i===3?'Synthetic private seating note: quiet table':''},note:'Synthetic fixture; never contact',createdAt:timestamp};
    for (const slug of [SLUG,DRAFT,OTHER]) {
      add(`weddings/${slug}/guests/party-${String(i+1).padStart(2,'0')}`,guest);
      add(`weddings/${slug}/codes/${code}`,{name:guest.name,seats,table,tableName:table,invited:guest.invited});
      add(`weddings/${slug}/gatePasses/${code}`,{guestId:`party-${String(i+1).padStart(2,'0')}`,name:guest.name,seats,ceremonies:invited});
    }
  });
  for (const slug of [SLUG,DRAFT]) {
    for (const a of ACCOUNTS.filter(a=>a.role)) {
      add(`weddings/${slug}/invites/${token(a.key)}`,{email:a.email,role:a.role,enabled:true,expiresAt:new Date('2099-01-01T00:00:00Z'),claimedBy:a.uid});
      add(`weddings/${slug}/roles/${a.uid}`,{token:token(a.key),role:a.role,enabled:true});
    }
    for (const key of ['unverified','invitee']) add(`weddings/${slug}/invites/${token(key)}`,{email:account(key).email,role:'planner',enabled:true,expiresAt:new Date('2099-01-01T00:00:00Z'),claimedBy:''});
    add(`weddings/${slug}/invites/${token('expired')}`,{email:account('invitee').email,role:'planner',enabled:true,expiresAt:new Date('2000-01-01T00:00:00Z'),claimedBy:''});
  }
  for (const slug of [SLUG,DRAFT,OTHER]) {
    add(`weddings/${slug}/gifts/verified-gift`,{giver:names[0],code:CODES[0],amount:12500,item:'Demo honeymoon goal',receiptPath:'',createdAt:timestamp,verified:true,verifiedAt:timestamp});
    add(`weddings/${slug}/gifts/pending-gift`,{giver:names[1],code:CODES[1],amount:5000,item:'Demo honeymoon goal',receiptPath:'',createdAt:timestamp,verified:false});
    add(`weddings/${slug}/registry/private-total`,{received:12500});
    add(`weddings/${slug}/vendors/legacy-private`,{name:'Synthetic vendor',amount:90000,notes:'Private synthetic invoice'});
    add(`weddings/${slug}/vendorContacts/demo-florist`,{name:'Synthetic Demo Florist',phone:'',notes:'Arrangement only, no financial fields'});
    add(`weddings/${slug}/asoebiItems/demo-fabric`,{name:'Demo celebration fabric'});
    for (const [id,ready,idx] of [['pending-order',false,1],['ready-order',true,0]]) {
      add(`weddings/${slug}/asoebiCollections/${id}`,{code:CODES[idx],name:names[idx],itemId:'demo-fabric',itemName:'Demo celebration fabric',size:'M',quantity:1,ready,collected:false});
      add(`weddings/${slug}/asoebiPayments/${id}`,{code:CODES[idx],due:10000,claimed:10000,verified:ready,verifiedAmount:ready?10000:0});
    }
    add(`weddings/${slug}/asoebi/legacy-private`,{amount:10000});
    add(`weddings/${slug}/asoebiClaims/pending-claim`,{code:CODES[2],itemId:'demo-fabric',size:'L',quantity:1,amount:10000,createdAt:timestamp});
    add(`weddings/${slug}/thankYou/${CODES[0]}`,{name:names[0],phone:'',source:'verified_gift',message:'Dear Ari Demo, thank you for your thoughtful gift. With love, Maya & Alex',sent:false});
  }
  add('stationeryConfig/main',{enabled:enableStationery,operatorUids:[account('operator').uid],accountName:'',bank:'',accountNumber:''});
  const order={ownerUid:account('owner').uid,weddingSlug:SLUG,package:'personalised',price:50000,design:'Garden whispers',sizes:'A3 welcome / seating signs; A5 table / gift / QR signs; 90 × 50 mm place cards',notes:'SYNTHETIC EMULATOR FIXTURE. NO PAYMENT OCCURRED.',wedding:{names:base.names,date:base.weddingDate,colours:base.colours,invitationUrl:`http://127.0.0.1:5000/${SLUG}`,tables:['Rose','Lily','Palm','Fern']},seating:[...records].filter(([p])=>p.startsWith(`weddings/${SLUG}/guests/`)).flatMap(([,g])=>[{name:g.seating.printName,table:g.table,group:g.seating.group,role:g.seating.partyRole},...g.seating.companions.map(name=>({name,table:g.table,group:g.seating.group,role:'Companion'}))]),receipt:{name:'synthetic-demo.png',type:'image/png',data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j2ioAAAAASUVORK5CYII='},status:'awaiting_payment_confirmation',createdAt:timestamp,confirmedDetails:true,proofUrl:'',deliveryUrl:''};
  add('stationeryOrders/demo-pending-order',order);
  add('stationeryOrders/demo-paid-order',{...order,status:'payment_confirmed'});
  add('stationeryOrders/demo-other-order',{...order,ownerUid:account('other').uid,weddingSlug:OTHER});
  return records;
}
