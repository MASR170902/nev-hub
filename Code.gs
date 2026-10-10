/**
 * NEVHub backend — Google Apps Script + Google Sheets.
 * Deploy as Web app: Execute as Me; access Anyone.
 * Configure Script Properties before public deployment:
 * SPREADSHEET_ID, ADMIN_EMAIL, ADMIN_PASSWORD_HASH, SESSION_SECRET
 * ADMIN_PASSWORD_HASH = SHA-256 hex of "your-admin-password|SESSION_SECRET"
 */
const SHEETS = {
  Users: ['id','name','nim','kelas','prodi','angkatan','email','passwordHash','createdAt'],
  Events: ['id','title','type','description','date','deadline','quota','fee','waLink','status','fields','createdAt'],
  Applications: ['id','eventId','eventTitle','nim','name','email','answers','fileUrls','feeStatus','status','reviewNote','letterUrl','waLink','createdAt','reviewedAt']
};
function doGet(){return json_({ok:true,service:'NEVHub API',message:'API berjalan. Gunakan aplikasi web untuk mengakses data.'});}
function doPost(e){
  try{
    const p=JSON.parse((e.postData&&e.postData.contents)||'{}');
    const action=p.action;
    if(action==='register')return json_(register_(p));
    if(action==='login')return json_(login_(p));
    if(action==='listEvents')return json_({ok:true,events:rows_('Events').filter(x=>x.status==='Aktif')});
    if(action==='myApplications'){requireUser_(p);return json_({ok:true,applications:rows_('Applications').filter(x=>x.nim===String(p.nim)).map(publicApp_)});}
    if(action==='apply')return json_(apply_(p));
    if(action==='adminLogin')return json_(adminLogin_(p));
    if(action==='adminData'){requireAdmin_(p);return json_({ok:true,data:{events:rows_('Events'),users:rows_('Users').map(publicUser_),applications:rows_('Applications').map(publicApp_)}});}
    if(action==='saveEvent'){requireAdmin_(p);return json_(saveEvent_(p.event||{}));}
    if(action==='reviewApplication'){requireAdmin_(p);return json_(reviewApplication_(p));}
    return json_({ok:false,message:'Aksi tidak dikenal.'});
  }catch(err){return json_({ok:false,message:err.message||'Terjadi kesalahan.'});}
}
function db_(){const id=PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');if(!id)throw Error('SPREADSHEET_ID belum diatur di Script Properties.');return SpreadsheetApp.openById(id);}
function setupDatabase(){const ss=db_();Object.keys(SHEETS).forEach(n=>{let sh=ss.getSheetByName(n)||ss.insertSheet(n);if(sh.getLastRow()===0)sh.appendRow(SHEETS[n]);sh.setFrozenRows(1);});}
function sheet_(name){const ss=db_();let sh=ss.getSheetByName(name);if(!sh){sh=ss.insertSheet(name);sh.appendRow(SHEETS[name]);}return sh;}
function rows_(name){const sh=sheet_(name),v=sh.getDataRange().getValues();if(v.length<2)return [];const headers=v[0].map(String);return v.slice(1).filter(r=>r.some(c=>c!=='')).map(r=>{let o={};headers.forEach((h,i)=>o[h]=r[i] instanceof Date?r[i].toISOString():String(r[i]??''));return o;});}
function addRow_(name,obj){const sh=sheet_(name),headers=SHEETS[name];sh.appendRow(headers.map(h=>obj[h]===undefined?'':obj[h]));}
function updateRow_(name,id,obj){const sh=sheet_(name),v=sh.getDataRange().getValues(),headers=v[0].map(String),idx=headers.indexOf('id');for(let i=1;i<v.length;i++){if(String(v[i][idx])===String(id)){headers.forEach((h,j)=>{if(obj[h]!==undefined)sh.getRange(i+1,j+1).setValue(obj[h]);});return true;}}return false;}
function uid_(){return Utilities.getUuid();}
function prop_(k){return PropertiesService.getScriptProperties().getProperty(k)||'';}
function sha_(s){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,s,Utilities.Charset.UTF_8).map(b=>(b<0?b+256:b).toString(16).padStart(2,'0')).join('');}
function passHash_(password){const salt=prop_('SESSION_SECRET');if(!salt)throw Error('SESSION_SECRET belum dikonfigurasi.');return sha_(password+'|'+salt);}
function register_(p){
  ['name','nim','kelas','prodi','angkatan','email','password'].forEach(k=>{if(!String(p[k]||'').trim())throw Error('Semua kolom pendaftaran wajib diisi.');});
  if(String(p.password).length<8)throw Error('Password minimal 8 karakter.');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email))throw Error('Format email tidak valid.');
  if(rows_('Users').some(u=>u.nim===String(p.nim).trim()))throw Error('NIM sudah terdaftar.');
  if(rows_('Users').some(u=>u.email.toLowerCase()===String(p.email).trim().toLowerCase()))throw Error('Email sudah terdaftar.');
  addRow_('Users',{id:uid_(),name:String(p.name).trim(),nim:String(p.nim).trim(),kelas:String(p.kelas).trim(),prodi:String(p.prodi).trim(),angkatan:String(p.angkatan).trim(),email:String(p.email).trim(),passwordHash:passHash_(p.password),createdAt:new Date().toISOString()});
  return {ok:true,message:'Akun dibuat. Silakan login.'};
}
function login_(p){const u=rows_('Users').find(x=>x.nim===String(p.nim||'').trim());if(!u||u.passwordHash!==passHash_(String(p.password||'')))throw Error('NIM atau password salah.');const token=uid_()+uid_();CacheService.getScriptCache().put('user:'+token,u.nim,21600);return {ok:true,token,user:{name:u.name,nim:u.nim,kelas:u.kelas,prodi:u.prodi,angkatan:u.angkatan,email:u.email,token:token}};}
function requireUser_(p){if(!p.token||CacheService.getScriptCache().get('user:'+p.token)!==String(p.nim||''))throw Error('Sesi berakhir. Silakan login kembali.');}
function adminLogin_(p){const email=prop_('ADMIN_EMAIL').toLowerCase(),hash=prop_('ADMIN_PASSWORD_HASH');if(!email||!hash)throw Error('ADMIN_EMAIL dan ADMIN_PASSWORD_HASH belum dikonfigurasi.');if(String(p.email||'').toLowerCase()!==email||passHash_(String(p.password||''))!==hash)throw Error('Email atau password admin salah.');const token=uid_()+uid_();CacheService.getScriptCache().put('admin:'+token,email,21600);return {ok:true,token};}
function requireAdmin_(p){if(!p.token||!CacheService.getScriptCache().get('admin:'+p.token))throw Error('Sesi admin berakhir. Silakan login kembali.');}
function publicUser_(u){const x={...u};delete x.passwordHash;return x;}
function publicApp_(a){return a;}
function saveEvent_(e){
  if(!String(e.title||'').trim())throw Error('Nama kegiatan wajib diisi.');
  const now=new Date().toISOString(),obj={id:e.id||uid_(),title:String(e.title),type:String(e.type||'Open Lab'),description:String(e.description||''),date:String(e.date||''),deadline:String(e.deadline||''),quota:String(e.quota||'0'),fee:String(e.fee||'0'),waLink:String(e.waLink||''),status:String(e.status||'Aktif'),fields:String(e.fields||'[]'),createdAt:e.createdAt||now};
  if(e.id){if(!updateRow_('Events',e.id,obj))throw Error('Kegiatan tidak ditemukan.');}else addRow_('Events',obj);
  return {ok:true,event:obj};
}
function apply_(p){
  requireUser_(p);const events=rows_('Events'),event=events.find(e=>e.id===p.eventId&&e.status==='Aktif');if(!event)throw Error('Kegiatan tidak tersedia.');
  if(event.deadline&&new Date(event.deadline+'T23:59:59')<new Date())throw Error('Batas pendaftaran sudah lewat.');
  const user=rows_('Users').find(u=>u.nim===String(p.nim));if(!user)throw Error('Akun mahasiswa tidak ditemukan.');
  const apps=rows_('Applications');if(apps.some(a=>a.eventId===event.id&&a.nim===user.nim&&a.status!=='Ditolak'))throw Error('Anda sudah mendaftar kegiatan ini.');
  if(Number(event.quota)>0&&apps.filter(a=>a.eventId===event.id&&a.status!=='Ditolak').length>=Number(event.quota))throw Error('Kuota kegiatan sudah penuh.');
  const answers=p.answers||{},fileUrls={};Object.keys(answers).forEach(k=>{const a=answers[k];if(a&&a.data&&a.name){const bytes=Utilities.base64Decode(a.data);const blob=Utilities.newBlob(bytes,a.mimeType||'application/octet-stream',a.name);const folder=uploadFolder_();const file=folder.createFile(blob);file.setSharing(DriveApp.Access.PRIVATE,DriveApp.Permission.VIEW);fileUrls[k]=file.getUrl();answers[k]={fileUrl:file.getUrl(),name:a.name};}});
  addRow_('Applications',{id:uid_(),eventId:event.id,eventTitle:event.title,nim:user.nim,name:user.name,email:user.email,answers:JSON.stringify(answers),fileUrls:JSON.stringify(fileUrls),feeStatus:Number(event.fee)>0?'Belum diverifikasi':'Gratis',status:'Menunggu',reviewNote:'',letterUrl:'',waLink:'',createdAt:new Date().toISOString(),reviewedAt:''});
  return {ok:true,message:'Pendaftaran berhasil dikirim.'};
}
function uploadFolder_(){const id=prop_('UPLOAD_FOLDER_ID');if(id){try{return DriveApp.getFolderById(id);}catch(e){}}const name='NEVHub Private Uploads';const it=DriveApp.getFoldersByName(name);return it.hasNext()?it.next():DriveApp.createFolder(name);}
function reviewApplication_(p){
  const app=rows_('Applications').find(a=>a.id===p.applicationId);if(!app)throw Error('Pendaftaran tidak ditemukan.');
  if(!['Disetujui','Ditolak','Menunggu'].includes(p.status))throw Error('Status tidak valid.');
  const event=rows_('Events').find(e=>e.id===app.eventId)||{},now=new Date().toISOString();let letterUrl='',waLink=p.status==='Disetujui'?(event.waLink||''):'';
  const update={status:p.status,reviewNote:String(p.note||''),reviewedAt:now,waLink:waLink};
  if(p.status==='Disetujui'){
    const html=`<div style="font-family:Arial,sans-serif;max-width:700px;margin:auto;border:1px solid #eee;padding:32px"><h1 style="color:#d71920">NEVHub</h1><h2>Surat Persetujuan Pendaftaran</h2><p>Halo ${escapeHtml_(app.name)},</p><p>Selamat! Pendaftaran Anda pada kegiatan <b>${escapeHtml_(app.eventTitle)}</b> telah disetujui.</p><p>Silakan simpan surat ini sebagai bukti persetujuan. Informasi lanjutan akan disampaikan oleh panitia.</p>${waLink?`<p><a href="${waLink}" style="display:inline-block;background:#d71920;color:white;padding:12px 18px;text-decoration:none;border-radius:8px">Gabung Grup WhatsApp</a></p>`:''}<p>Salam,<br>Panitia NEV</p></div>`;
    const blob=Utilities.newBlob(html,'text/html','Surat-Persetujuan-NEVHub.html');const file=uploadFolder_().createFile(blob);file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);letterUrl=file.getUrl();update.letterUrl=letterUrl;
  }
  updateRow_('Applications',app.id,update);
  const subject=(p.status==='Disetujui'?'Pendaftaran disetujui':'Pembaruan status pendaftaran')+' — '+app.eventTitle;
  const body=p.status==='Disetujui'?`Halo ${app.name},\n\nPendaftaran Anda untuk ${app.eventTitle} telah disetujui.\nSurat persetujuan: ${letterUrl}\n${waLink?'Link grup WhatsApp: '+waLink:''}\n\nSalam,\nPanitia NEV`:`Halo ${app.name},\n\nStatus pendaftaran Anda untuk ${app.eventTitle}: ${p.status}.\n${p.note?'Catatan: '+p.note:''}\n\nSalam,\nPanitia NEV`;
  try{MailApp.sendEmail({to:app.email,subject:subject,body:body,name:'NEVHub'});}catch(err){console.error('Email gagal: '+err.message);}
  return {ok:true,letterUrl,waLink};
}
function escapeHtml_(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function json_(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);}
