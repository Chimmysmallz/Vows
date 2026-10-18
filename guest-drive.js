// Set this exact HTTPS Workers origin after your own Free-plan setup. No Firebase Functions fallback.
const VOWS_DRIVE_BACKEND='https://YOUR_WORKER.YOUR_SUBDOMAIN.workers.dev';
function driveBackend(){if(VOWS_DRIVE_BACKEND.includes('YOUR_'))throw Error('Optional free photo backend is not configured. The core wedding website still works.');const u=new URL(VOWS_DRIVE_BACKEND);if(u.protocol!=='https:'||u.origin!==VOWS_DRIVE_BACKEND)throw Error('Use the exact HTTPS photo backend origin');return u.origin;}
/* Guest Drive capabilities are wedding-scoped, expire, and are kept only in memory. */
let driveGuestAccess=null,drivePending=null,driveNext=null,driveObjectUrls=[],driveUploadBusy=false;
const DRIVE_MAX=20*1024*1024;
async function guestDriveCall(action,body={},raw=false,offset=0){
 const response=await fetch(driveBackend()+'/api/drive/'+encodeURIComponent(slug)+'/guest/'+action,{method:'POST',credentials:'omit',cache:'no-store',headers:raw?{'Content-Type':'application/octet-stream','X-Vows-Cap':driveGuestAccess?.capability||'','X-Vows-Offset':String(offset)}:{'Content-Type':'application/json',...(driveGuestAccess?{'X-Vows-Cap':driveGuestAccess.capability}:{})},body:raw?body:JSON.stringify(body)});
 if(!response.ok){const r=await response.json().catch(()=>({}));throw Error(r.error||'Photo service unavailable. Refresh photo access and retry.');}
 if(action.startsWith('thumbnail/')||action.startsWith('download/'))return response.blob();return response.json();
}
function driveGuestStatus(s){$('drive-guest-status').textContent=s;}
async function initDrivePhotos(){
 if(!W?.published)return;
 if(driveUploadBusy)throw Error('Wait for the current upload to finish before refreshing photo access');
 if(drivePending){drivePending=null;$('drive-retry').hidden=true;$('drive-photo').value='';}clearDriveGallery();
 try{driveGuestAccess=null;driveGuestAccess=await guestDriveCall('session');const p=driveGuestAccess.settings;$('drive-guest').hidden=false;$('drive-upload-area').hidden=!p.uploads;$('drive-gallery-area').hidden=!p.view;$('drive-guest-policy').textContent=p.view?'The couple allows anyone with this published wedding link to see Vows.ng uploads. Links can be forwarded; no invitation-code verification is required for photos.'+(p.download?' Original downloads are enabled.':' Original downloads are disabled; visible previews can still be saved or screenshotted.'):'Gallery is private. Other guests cannot see your uploads here.';driveGuestStatus('Photo allowance: '+driveGuestAccess.limits.weddingFiles+' reserved attempts / '+(driveGuestAccess.limits.weddingBytes/1024**3)+' GiB per wedding; up to '+driveGuestAccess.limits.capFiles+' attempts / '+(driveGuestAccess.limits.capBytes/1024**2)+' MiB in this photo-access window. Not unlimited; shared Workers/D1/Firebase free quotas also apply; this allowance does not guarantee capacity. Only photos uploaded through this wedding on Vows.ng are included, not existing files from the folder.');clearDriveGallery();driveNext=null;if(p.view)await loadDriveGallery(true);}
 catch(e){$('drive-guest').hidden=false;$('drive-upload-area').hidden=true;$('drive-gallery-area').hidden=true;driveGuestStatus('Photos are unavailable or not enabled. The rest of your wedding page is unaffected.');}
}
function clearDriveGallery(){for(const url of driveObjectUrls)URL.revokeObjectURL(url);driveObjectUrls=[];$('drive-gallery').textContent='';}
async function loadDriveGallery(reset=false){
 if(reset){clearDriveGallery();driveNext=null;}
 const r=await guestDriveCall('gallery',{after:driveNext});driveNext=r.next;$('drive-more').hidden=!r.next;
 for(const photo of r.items){
  const box=document.createElement('div');box.className='card';const name=document.createElement('p');name.textContent=photo.name;box.append(name);$('drive-gallery').append(box);
  if(photo.preview){try{const blob=await guestDriveCall('thumbnail/'+encodeURIComponent(photo.id)),url=URL.createObjectURL(blob);driveObjectUrls.push(url);const img=document.createElement('img');img.src=url;img.alt=photo.name;img.loading='lazy';img.style.maxInlineSize='100%';box.prepend(img);}catch(e){const p=document.createElement('p');p.textContent='Preview unavailable. '+e.message;box.append(p);}}
  else{const p=document.createElement('p');p.textContent='Preview unavailable. HEIC is download-only when the couple permits downloads.';box.append(p);}
  if(r.download){const b=document.createElement('button');b.className='btn sm';b.type='button';b.textContent='Download original';b.addEventListener('click',async()=>{b.disabled=true;try{const blob=await guestDriveCall('download/'+encodeURIComponent(photo.id)),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=photo.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}catch(e){driveGuestStatus(e.message);}finally{b.disabled=false;}});box.append(b);}
 }
 if(!r.items.length&&!r.next)driveGuestStatus('No photos in this gallery yet. Only Vows.ng uploads for the current folder connection appear here.');
}
async function sendDrivePending(){
 if(!drivePending)throw Error('Choose a photo first');
 if(driveUploadBusy)throw Error('An upload is already in progress');
 const p=drivePending;driveUploadBusy=true;
 try{for(let attempt=0;attempt<3;attempt++){
  try{while(p.offset<p.file.size){const chunk=p.file.slice(p.offset,Math.min(p.offset+p.chunkBytes,p.file.size));const r=await guestDriveCall('upload/'+p.session,chunk,true,p.offset);if(!Number.isSafeInteger(r.offset)||r.offset<=p.offset||r.offset>p.file.size)throw Error('Invalid photo offset');p.offset=r.offset;driveGuestStatus('Uploading photo: '+Math.floor(100*p.offset/p.file.size)+'%. Keep this tab open.');if(r.uploaded&&p.offset!==p.file.size)throw Error('Photo completed unexpectedly');}drivePending=null;$('drive-retry').hidden=true;$('drive-photo').value='';driveGuestStatus('Photo delivered to the couple’s private Drive folder. Thank you!');return;}
  catch(e){if(attempt===2){$('drive-retry').hidden=false;throw Error(e.message+' The same file and session are retained in this tab: wait a moment, then Retry last upload. Do not reload if you want to retry this session.');}await new Promise(r=>setTimeout(r,2000*(attempt+1)));}
 }}finally{driveUploadBusy=false;}
}
function driveGuestButton(id,fn){$(id).addEventListener('click',async()=>{const b=$(id);b.disabled=true;try{await fn();}catch(e){driveGuestStatus(e.message);}finally{b.disabled=false;}});}
driveGuestButton('drive-guest-refresh',initDrivePhotos);
driveGuestButton('drive-gallery-refresh',()=>loadDriveGallery(true));
driveGuestButton('drive-more',()=>loadDriveGallery(false));
driveGuestButton('drive-retry',sendDrivePending);
driveGuestButton('drive-send',async()=>{
 if(drivePending)throw Error('Retry your pending photo first, or refresh the whole page to abandon it. Reserved quota is not refunded.');
 const file=$('drive-photo').files?.[0];if(!file)throw Error('Choose a photo');
 if(file.size<16||file.size>DRIVE_MAX)throw Error('This MVP accepts originals up to 20 MiB each. Compress/export a copy yourself if larger; Vows.ng never silently resizes your original.');
 let type=file.type.toLowerCase();if(type==='image/heif'||(!type&&/\.heic$/i.test(file.name)))type='image/heic';if(!['image/jpeg','image/png','image/webp','image/heic'].includes(type))throw Error('Choose a JPEG, PNG, WEBP or HEIC photo. SVG, HTML, video and other formats are not supported.');
 const r=await guestDriveCall('prepare',{size:file.size,type,name:file.name});drivePending={file,session:r.session,offset:0,chunkBytes:r.chunkBytes};driveGuestStatus('Uploading original in bounded 1 MiB chunks. Keep this tab open; retries resume this tab’s last chunk and use mobile data.');await sendDrivePending();
});
window.addEventListener('pagehide',clearDriveGallery);
