// Set this exact HTTPS Workers origin after your own Free-plan setup. No Firebase Functions fallback.
const VOWS_DRIVE_BACKEND='https://YOUR_WORKER.YOUR_SUBDOMAIN.workers.dev';
function driveBackend(){if(VOWS_DRIVE_BACKEND.includes('YOUR_'))throw Error('Optional free photo backend is not configured. The core wedding website still works.');const u=new URL(VOWS_DRIVE_BACKEND);if(u.protocol!=='https:'||u.origin!==VOWS_DRIVE_BACKEND)throw Error('Use the exact HTTPS photo backend origin');return u.origin;}
/* Optional Drive integration: every owner action is reauthorized on the server. */
async function driveOwnerCall(action,body={}){
 requireOwner();const token=await user.getIdToken();
 const response=await fetch(driveBackend()+'/api/drive/'+encodeURIComponent(slug)+'/owner/'+action,{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(body),cache:'no-store'});
 const result=await response.json().catch(()=>({error:'Drive backend is not configured. The rest of your wedding website still works.'}));
 if(!response.ok)throw Error(result.error||'Photo action failed');return result;
}
async function driveRefresh(){
 $('drive-panel').hidden=!ownerNow();if(!ownerNow())return;
 if(new URL(location.href).searchParams.get('drive')==='complete'){await completeDriveConnection();return;}
 try{const r=await driveOwnerCall('status');$('drive-owner-status').textContent=r.connected?(r.folderSelected?'Connected: '+r.folderName:'Google connected. Choose a folder next.'):'Not connected. Optional photos use a separately configured Cloudflare Workers Free + D1 Free backend, with no paid fallback.';$('drive-owner-status').textContent+=' Reserved uploads: '+r.usage.files+' / '+r.limits.weddingFiles+' attempts, '+(r.usage.bytes/1024**3).toFixed(2)+' / '+(r.limits.weddingBytes/1024**3)+' GiB. Per photo-access window: '+r.limits.capFiles+' attempts / '+(r.limits.capBytes/1024**2)+' MiB. Shared Free provider request, CPU, database and Firebase read quotas also apply; these are not guaranteed capacity.';for(const k of ['uploads','view','download'])$('drive-'+k).checked=r.settings[k];$('drive-save').disabled=!r.folderSelected;$('drive-pick').disabled=!r.connected;$('drive-disconnect').disabled=!r.connected;}
 catch(e){$('drive-owner-status').textContent=e.message;$('drive-save').disabled=true;$('drive-pick').disabled=true;}
}
function driveButton(id,fn){$(id).addEventListener('click',async()=>{const b=$(id);b.disabled=true;try{await fn();}catch(e){$('drive-owner-status').textContent=e.message;}finally{b.disabled=false;}});}
driveButton('drive-refresh',driveRefresh);
driveButton('drive-connect',async()=>{if(dirty&&!await save(true))throw Error('Save your wedding changes before connecting Drive');const proof=btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');sessionStorage.setItem('vows-drive-proof:'+slug,proof);const proofHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(proof))),x=>x.toString(16).padStart(2,'0')).join('');const r=await driveOwnerCall('start',{browserProofHash:proofHash});dirty=false;location.assign(r.url);});
driveButton('drive-disconnect',async()=>{if(!confirm('Disconnect Drive and immediately block new guest photo requests? Existing Drive files and copies already downloaded are not deleted.'))return;await driveOwnerCall('disconnect');await driveRefresh();});
driveButton('drive-save',async()=>{await driveOwnerCall('settings',{uploads:$('drive-uploads').checked,view:$('drive-view').checked,download:$('drive-view').checked&&$('drive-download').checked});await driveRefresh();$('drive-owner-status').textContent+=' Settings saved. Existing guest sessions must refresh.';});
$('drive-view').addEventListener('change',()=>{if(!$('drive-view').checked)$('drive-download').checked=false;});
let drivePickerReady;
function loadDrivePicker(){
 if(!drivePickerReady)drivePickerReady=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://apis.google.com/js/api.js';s.referrerPolicy='no-referrer';s.onload=()=>window.gapi.load('picker',{callback:resolve,onerror:()=>reject(Error('Google Picker could not load')),timeout:20000,ontimeout:()=>reject(Error('Google Picker timed out'))});s.onerror=()=>reject(Error('Google Picker could not load'));document.head.append(s);}).catch(e=>{drivePickerReady=null;throw e;});
 return drivePickerReady;
}
driveButton('drive-pick',async()=>{
 await loadDrivePicker();
 // This short-lived access token is owner-only and stays in memory for Picker. Never a refresh token.
 const r=await driveOwnerCall('picker');
 await new Promise((resolve,reject)=>{
  const view=new google.picker.DocsView(google.picker.ViewId.FOLDERS).setIncludeFolders(true).setSelectFolderEnabled(true).setMimeTypes('application/vnd.google-apps.folder');
  const picker=new google.picker.PickerBuilder().addView(view).setOAuthToken(r.accessToken).setDeveloperKey(r.developerKey).setAppId(r.appId).setOrigin(location.origin).setTitle('Choose your private wedding photo folder in My Drive').setCallback(async event=>{
   if(event.action===google.picker.Action.CANCEL){picker.dispose();resolve();}
   if(event.action===google.picker.Action.PICKED){const folder=event.docs?.[0];picker.dispose();try{await driveOwnerCall('folder',{folderId:folder.id});await driveRefresh();resolve();}catch(e){reject(e);}}
  }).build();picker.setVisible(true);
 });
});

// Callback links no account until this initiating tab proves possession and fresh owner sign-in.
async function completeDriveConnection(){
 const q=new URL(location.href).searchParams;if(q.get('drive')!=='complete')return;
 const completion=new URLSearchParams(location.hash.slice(1)).get('drive-completion'),proof=sessionStorage.getItem('vows-drive-proof:'+slug);
 history.replaceState(null,'',location.pathname+'?wedding='+encodeURIComponent(slug));
 if(!proof||!completion){$('drive-owner-status').textContent='Connection not completed. Return to the exact browser tab where you started, or start Connect again. No Google account was linked.';return;}
 try{await driveOwnerCall('complete',{completion,browserProof:proof});sessionStorage.removeItem('vows-drive-proof:'+slug);await driveRefresh();}catch(e){$('drive-owner-status').textContent=e.message;}
}
