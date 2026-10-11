/*
 * NEVHub Google Apps Script backend
 * Setup: run setup() once, then create admin with createAdmin(email, password, name).
 * Deploy as Web App, execute as owner, access: Anyone.
 * NOTE: prototype auth uses SHA-256 password hashes and short-lived bearer tokens in ScriptProperties.
 * For production, review security/privacy requirements before handling real student IDs/payment evidence.
 */
const CFG={SHEET_ID:"",UPLOAD_FOLDER_ID:"",ADMIN_EMAILS:[],TOKEN_TTL_HOURS:12,MAX_FILE_BYTES:1024*1024};
const SHEETS={
 Users:["id","createdAt","name","nim","kelas","prodi","angkatan","google","passwordHash","active"],
 Admins:["id","createdAt","name","email","passwordHash","active"],
 Events:["id","createdAt","updatedAt","title","type","date","deadline","location","quota","fee","wa","description","requirements","reqReason","reqPhoto","reqPayment","reqPortfolio","documentLabel","status","createdBy","posterFileId","posterUrl"],
 Applications:["id","createdAt","updatedAt","eventId","nim","name","email","reason","portfolio","extra","photoFileId","photoFileName","paymentFileId","paymentFileName","status","note","decidedBy","decisionAt","letterNo"],
 Attendance:["id","createdAt","eventId","applicationId","nim","name","checkInAt","method","checkedBy"],
 Settings:["key","value"]
};
const TEXT_COLS=["id","nim","kelas","angkatan","google","date","deadline","wa","eventId","applicationId","photoFileId","paymentFileId","posterFileId","letterNo","passwordHash","email"];
const DATE_COLS=["date","deadline"];
function setup(){
 const props=PropertiesService.getScriptProperties();
 let ssId=CFG.SHEET_ID||props.getProperty("SHEET_ID");
 if(!ssId){const ss=SpreadsheetApp.create("NEVHub Database");ssId=ss.getId();props.setProperty("SHEET_ID",ssId);}
 const ss=SpreadsheetApp.openById(ssId);
 Object.keys(SHEETS).forEach(name=>{
   let sh=ss.getSheetByName(name)||ss.insertSheet(name);
   if(sh.getLastRow()===0) sh.appendRow(SHEETS[name]);
   else { const existing=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String); const missing=SHEETS[name].filter(h=>!existing.includes(h)); if(missing.length) sh.getRange(1,sh.getLastColumn()+1,1,missing.length).setValues([missing]); }
   sh.setFrozenRows(1);
   try{const hd=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];hd.forEach((h,i)=>{if(TEXT_COLS.indexOf(String(h))>=0)sh.getRange(2,i+1,Math.max(sh.getMaxRows()-1,1),1).setNumberFormat("@");});}catch(err){Logger.log("Format kolom: "+err.message);}
 });
 let folderId=CFG.UPLOAD_FOLDER_ID||props.getProperty("UPLOAD_FOLDER_ID");
 if(!folderId){const folder=DriveApp.createFolder("NEVHub Private Uploads");folderId=folder.getId();props.setProperty("UPLOAD_FOLDER_ID",folderId);}
 Logger.log("Spreadsheet URL: "+ss.getUrl());
 Logger.log("Upload folder ID: "+folderId);
 return {spreadsheetUrl:ss.getUrl(),uploadFolderId:folderId};
}
function createAdmin(email,password,name){
 if(!email||!password||String(password).length<10)throw new Error("Email wajib dan password minimal 10 karakter.");
 const sh=sheet_("Admins"),existing=rows_("Admins").some(x=>String(x.email).toLowerCase()===String(email).toLowerCase());
 if(existing)throw new Error("Admin sudah ada.");
 append_("Admins",{id:id_(),createdAt:new Date(),name:name||"Admin",email:String(email).toLowerCase(),passwordHash:hashPw_(password),active:true});
 return "Admin dibuat: "+email;
}
function doGet(e){
 const p=(e&&e.parameter)||{},callback=String(p.callback||"").replace(/[^\w.$]/g,"");
 let result;
 try{result=route_(p.action,p);}catch(err){result={ok:false,error:err.message||String(err)};}
 const payload=JSON.stringify(result);
 if(callback)return ContentService.createTextOutput(callback+"("+payload+");").setMimeType(ContentService.MimeType.JAVASCRIPT);
 return ContentService.createTextOutput(payload).setMimeType(ContentService.MimeType.JSON);
}
function route_(action,p){
 if(action==="listEvents"){const m=filled_(rows_("Applications"));return {ok:true,events:rows_("Events").filter(x=>x.status==="Published").map(e=>publicEvent_(e,m))};}
 if(action==="getEvent"){const m=filled_(rows_("Applications")),e=rows_("Events").find(x=>x.id===p.id&&x.status==="Published");if(!e)throw Error("Kegiatan tidak ditemukan.");return {ok:true,event:publicEvent_(e,m)};}
 if(action==="registerUser")return registerUser_(p);
 if(action==="loginUser")return loginUser_(p);
 if(action==="myApplications"){const u=authUser_(p.token),em=evMap_();return {ok:true,applications:rows_("Applications").filter(a=>String(a.nim)===String(u.nim)).map(a=>applicationPublic_(a,em)).reverse()};}
 if(action==="adminLogin")return adminLogin_(p);
 if(action==="adminDashboard"){authAdmin_(p.adminToken);const em=evMap_(),apps=rows_("Applications"),m=filled_(apps);return {ok:true,events:rows_("Events").filter(x=>x.status!=="Archived").map(e=>publicEvent_(e,m)),users:rows_("Users").map(userPublic_),applications:apps.map(a=>applicationAdmin_(a,em)).reverse()};}
 if(action==="saveEvent"){authAdmin_(p.adminToken);return saveEvent_(p);}
 if(action==="posterChunk")return posterChunk_(p);
 if(action==="finishPosterUpload")return finishPosterUpload_(p);
 if(action==="deleteEvent"){authAdmin_(p.adminToken);return deleteEvent_(p.id);}
 if(action==="decideApplication"){const a=authAdmin_(p.adminToken);return decide_(a,p);}
 if(action==="apply"){const u=authUser_(p.token);return apply_(u,p);}
 if(action==="attendanceCheckIn"){const u=authUser_(p.token);return checkIn_(u,p);}
 if(action==="attendanceList"){authAdmin_(p.adminToken);return {ok:true,attendance:rows_("Attendance").filter(a=>!p.eventId||a.eventId===p.eventId)};}
 if(action==="changeUserPassword"){authAdmin_(p.adminToken);return changeUserPassword_(p);}
 if(action==="fileChunk"){const u=authUser_(p.token);return fileChunk_(u,p);}
 if(action==="getApplicationFile"){authAdmin_(p.adminToken);return getApplicationFile_(p);}
 if(action==="logout"){dropToken_(p);return {ok:true};}
 throw Error("Aksi tidak dikenal.");
}
function registerUser_(p){
 const lock=LockService.getScriptLock(); lock.waitLock(15000);
 try {
  const name=String(p.name||"").trim(),nim=String(p.nim||"").trim(),kelas=String(p.kelas||"").trim(),prodi=String(p.prodi||"").trim(),angkatan=String(p.angkatan||"").trim(),google=String(p.google||"").trim().toLowerCase(),password=String(p.password||"");
  if(!name||!nim||!kelas||!prodi||!angkatan||!google||password.length<8)throw Error("Lengkapi semua data. Password minimal 8 karakter.");
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(google))throw Error("Email Google tidak valid.");
 if(!/^[A-Za-z0-9._-]{4,30}$/.test(nim))throw Error("Format NIM tidak valid (4-30 karakter huruf/angka).");
  if(rows_("Users").some(u=>String(u.nim).trim()===nim))throw Error("NIM sudah terdaftar. Silakan login, jangan membuat akun baru.");
  const user={id:id_(),createdAt:new Date(),name,nim,kelas,prodi,angkatan,google,passwordHash:hashPw_(password),active:true}; append_("Users",user); return {ok:true,user:issueUserToken_(user)};
 } finally { lock.releaseLock(); }
}
function loginUser_(p){
 const nim=String(p.nim||"").trim(),pass=String(p.password||""),k=throttle_("u:"+nim);
 const u=rows_("Users").find(x=>String(x.nim).trim()===nim&&bool_(x.active));
 if(!u||!checkPw_(pass,u.passwordHash)){fail_(k);throw Error("NIM atau password salah.");}
 CacheService.getScriptCache().remove(k);
 if(String(u.passwordHash).indexOf("v2$")!==0)update_("Users","id",u.id,{passwordHash:hashPw_(pass)});
 return {ok:true,user:issueUserToken_(u)};
}
function adminLogin_(p){
 const email=String(p.email||"").toLowerCase().trim(),pass=String(p.password||""),k=throttle_("a:"+email);
 const a=rows_("Admins").find(x=>String(x.email).toLowerCase()===email&&bool_(x.active));
 if(!a||!checkPw_(pass,a.passwordHash)){fail_(k);throw Error("Email atau password admin salah.");}
 CacheService.getScriptCache().remove(k);purgeTokens_();
 if(String(a.passwordHash).indexOf("v2$")!==0)update_("Admins","id",a.id,{passwordHash:hashPw_(pass)});
 const token=Utilities.getUuid()+Utilities.getUuid().replace(/-/g,"");
 PropertiesService.getScriptProperties().setProperty("ADM_"+token,JSON.stringify({id:a.id,email:a.email,exp:Date.now()+CFG.TOKEN_TTL_HOURS*3600000}));
 return {ok:true,admin:{name:a.name,email:a.email,token}};
}
function issueUserToken_(u){purgeTokens_();const token=Utilities.getUuid()+Utilities.getUuid().replace(/-/g,"");PropertiesService.getScriptProperties().setProperty("USR_"+token,JSON.stringify({id:u.id,nim:u.nim,exp:Date.now()+CFG.TOKEN_TTL_HOURS*3600000}));return {name:u.name,nim:u.nim,kelas:u.kelas,prodi:u.prodi,angkatan:u.angkatan,google:u.google,token};}
function authUser_(token){const x=tokenData_("USR_",token);const u=rows_("Users").find(u=>u.id===x.id&&bool_(u.active));if(!u)throw Error("Akun tidak aktif.");return u;}
function authAdmin_(token){const x=tokenData_("ADM_",token);const a=rows_("Admins").find(a=>a.id===x.id&&bool_(a.active));if(!a)throw Error("Akun admin tidak aktif.");return a;}
function tokenData_(prefix,token){if(!token)throw Error("Silakan login kembali.");const props=PropertiesService.getScriptProperties(),raw=props.getProperty(prefix+token);if(!raw)throw Error("Sesi tidak valid, silakan login kembali.");const x=JSON.parse(raw);if(x.exp<Date.now()){props.deleteProperty(prefix+token);throw Error("Sesi kedaluwarsa, silakan login kembali.");}return x;}
function posterChunk_(p){
 const admin=authAdmin_(p.adminToken);
 const uploadId=String(p.uploadId||"").replace(/[^a-zA-Z0-9_-]/g,"");
 const index=Number(p.index),data=String(p.data||"");
 if(!uploadId||!Number.isInteger(index)||index<0||!data||data.length>4000)throw Error("Potongan poster tidak valid.");
 CacheService.getScriptCache().put("NEVPOSTER_"+admin.id+"_"+uploadId+"_"+index,data,21600);
 return {ok:true,index};
}
function finishPosterUpload_(p){
 const admin=authAdmin_(p.adminToken);
 const uploadId=String(p.uploadId||"").replace(/[^a-zA-Z0-9_-]/g,"");
 const total=Number(p.totalChunks),mime=String(p.type||"image/jpeg"),name=String(p.name||"poster");
 if(!uploadId||!Number.isInteger(total)||total<1||total>120)throw Error("Metadata poster tidak valid.");
 if(!["image/jpeg","image/png","image/webp"].includes(mime))throw Error("Poster harus berupa JPG, PNG, atau WEBP.");
 const cache=CacheService.getScriptCache(),parts=[];
 for(let i=0;i<total;i++){const part=cache.get("NEVPOSTER_"+admin.id+"_"+uploadId+"_"+i);if(part===null)throw Error("Upload poster belum lengkap. Coba simpan ulang.");parts.push(part);}
 const bytes=Utilities.base64Decode(parts.join(""));
 if(!bytes.length||bytes.length>250*1024)throw Error("Poster maksimal 250 KB.");
 const folderId=PropertiesService.getScriptProperties().getProperty("UPLOAD_FOLDER_ID")||CFG.UPLOAD_FOLDER_ID;
 if(!folderId)throw Error("UPLOAD_FOLDER_ID belum diatur.");
 const file=DriveApp.getFolderById(folderId).createFile(Utilities.newBlob(bytes,mime,"NEVHub_Poster_"+Date.now()+"_"+name));
 file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);
 for(let i=0;i<total;i++)cache.remove("NEVPOSTER_"+admin.id+"_"+uploadId+"_"+i);
 return {ok:true,posterFileId:file.getId(),posterUrl:"https://drive.google.com/uc?export=view&id="+file.getId()};
}
function saveEvent_(p){
 const lock=LockService.getScriptLock(); lock.waitLock(15000);
 try {
  const id=String(p.eventId||"").trim()||id_(),all=rows_("Events"),old=all.find(x=>x.id===id),admin=authAdmin_(p.adminToken);
  const date=dateOnly_(p.date),deadline=dateOnly_(p.deadline);
  if(!date||!deadline) throw Error("Tanggal kegiatan dan batas pendaftaran wajib diisi dengan format tanggal yang valid.");
  if(deadline>date) throw Error("Batas pendaftaran tidak boleh setelah tanggal kegiatan.");
  let posterFileId=old?String(old.posterFileId||""):"",posterUrl=old?String(old.posterUrl||""):"";
  if(p.posterFileId){posterFileId=String(p.posterFileId);posterUrl=String(p.posterUrl||"");}
  if(p.posterData){const pd=typeof p.posterData==="string"?JSON.parse(p.posterData):p.posterData;if(pd&&pd.data){const poster=savePoster_(pd);posterFileId=poster.id;posterUrl=poster.url;}}
  const e={id,createdAt:old?old.createdAt:new Date(),updatedAt:new Date(),title:String(p.title||"").trim(),type:String(p.type||""),date,deadline,location:String(p.location||"").trim(),quota:Number(p.quota||0),fee:Number(p.fee||0),wa:String(p.wa||""),description:String(p.description||"").trim(),requirements:String(p.requirements||""),reqReason:bool_(p.reqReason),reqPhoto:bool_(p.reqPhoto),reqPayment:bool_(p.reqPayment),reqPortfolio:bool_(p.reqPortfolio),documentLabel:String(p.documentLabel||""),status:"Published",createdBy:admin.email,posterFileId,posterUrl};
  if(!e.title||!e.location||e.quota<1)throw Error("Lengkapi nama, lokasi, dan kuota kegiatan.");
  if(e.wa&&!/^https?:\/\//i.test(e.wa))throw Error("Link WhatsApp harus diawali https://");
  if(!old&&all.some(x=>String(x.title).trim().toLowerCase()===e.title.toLowerCase()&&String(x.type)===e.type&&dateOnly_(x.date)===e.date&&x.status!=="Archived"))throw Error("Kegiatan serupa sudah ada pada tanggal tersebut. Buka Edit untuk mengubah kegiatan yang sudah ada.");
  if(old)update_("Events","id",id,e);else append_("Events",e); return {ok:true,event:publicEvent_(e)};
 } finally { lock.releaseLock(); }
}
function changeUserPassword_(p){const nim=String(p.nim||"").trim(),password=String(p.newPassword||"");if(!nim||password.length<8)throw Error("NIM wajib dan password baru minimal 8 karakter.");const user=rows_("Users").find(u=>String(u.nim).trim()===nim);if(!user)throw Error("Mahasiswa dengan NIM tersebut tidak ditemukan.");update_("Users","nim",nim,{passwordHash:hashPw_(password)});return {ok:true,message:"Password mahasiswa berhasil diperbarui."};}
function dateOnly_(v){if(v===null||v===undefined||v==="")return "";if(v instanceof Date&&!isNaN(v.getTime()))return Utilities.formatDate(v,Session.getScriptTimeZone()||"Asia/Jakarta","yyyy-MM-dd");const s=String(v).trim(),m=s.match(/^(\d{4}-\d{2}-\d{2})/);if(m)return m[1];const d=new Date(s);if(isNaN(d.getTime()))return "";return Utilities.formatDate(d,Session.getScriptTimeZone()||"Asia/Jakarta","yyyy-MM-dd");}
function savePoster_(f){const bytes=Utilities.base64Decode(String(f.data||"")),mime=String(f.type||"image/jpeg");if(!bytes.length)throw Error("File poster kosong.");if(bytes.length>250*1024)throw Error("Poster maksimal 250 KB. Kompres gambar sebelum diunggah.");if(!["image/jpeg","image/png","image/webp"].includes(mime))throw Error("Poster harus berupa JPG, PNG, atau WEBP.");const folderId=PropertiesService.getScriptProperties().getProperty("UPLOAD_FOLDER_ID")||CFG.UPLOAD_FOLDER_ID;if(!folderId)throw Error("UPLOAD_FOLDER_ID belum diatur.");const file=DriveApp.getFolderById(folderId).createFile(Utilities.newBlob(bytes,mime,"NEVHub_Poster_"+Date.now()));file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);return {id:file.getId(),url:"https://drive.google.com/uc?export=view&id="+file.getId()};}
function deleteEvent_(id){update_("Events","id",id,{status:"Archived",updatedAt:new Date()});return {ok:true};}
function apply_(u,p){
 const lock=LockService.getScriptLock(); lock.waitLock(15000);
 try {
  const e=rows_("Events").find(x=>x.id===p.eventId&&x.status==="Published");if(!e)throw Error("Kegiatan tidak tersedia.");
  const deadline=dateOnly_(e.deadline);if(deadline&&deadline<Utilities.formatDate(new Date(),tz_(),"yyyy-MM-dd"))throw Error("Pendaftaran sudah ditutup.");
  const apps=rows_("Applications").filter(a=>a.eventId===e.id);
  if(apps.some(a=>String(a.nim)===String(u.nim)))throw Error("Anda sudah mendaftar kegiatan ini.");
  if(apps.filter(a=>a.status!=="Ditolak").length>=Number(e.quota))throw Error("Kuota kegiatan sudah penuh.");
  const docs=p.docs?JSON.parse(p.docs):{},ph=assembleUpload_(u,docs.photo),pay=assembleUpload_(u,docs.payment);
  if(bool_(e.reqPhoto)&&!ph)throw Error("Bukti foto/dokumen wajib diunggah.");
  if(bool_(e.reqPayment)&&!pay)throw Error("Bukti pembayaran wajib diunggah.");
  if(bool_(e.reqReason)&&!String(p.reason||"").trim())throw Error("Alasan pendaftaran wajib diisi.");
  if(bool_(e.reqPortfolio)&&!String(p.portfolio||"").trim())throw Error("Link portofolio wajib diisi.");
  const photo=ph?saveFile_({name:ph.name,type:ph.type,data:ph.parts.join("")},u.nim):null,payment=pay?saveFile_({name:pay.name,type:pay.type,data:pay.parts.join("")},u.nim):null;
  const a={id:id_(),createdAt:new Date(),updatedAt:new Date(),eventId:e.id,nim:u.nim,name:u.name,email:u.google,reason:String(p.reason||""),portfolio:String(p.portfolio||""),extra:String(p.extra||""),photoFileId:photo?photo.id:"",photoFileName:photo?photo.name:"",paymentFileId:payment?payment.id:"",paymentFileName:payment?payment.name:"",status:"Menunggu",note:"",decidedBy:"",decisionAt:"",letterNo:""};
  append_("Applications",a);
  [ph,pay].forEach(x=>{if(x)for(let i=0;i<x.total;i++)CacheService.getScriptCache().remove("NEVFILE_"+u.id+"_"+x.id+"_"+i);});
  return {ok:true,id:a.id,status:a.status};
 } finally { lock.releaseLock(); }
}
function saveFile_(f,nim){
 if(!f||!f.data)return null;const bytes=Utilities.base64Decode(f.data),mime=String(f.type||"application/octet-stream"),name=String(f.name||"upload").replace(/[^\w.\-]/g,"_");
 if(bytes.length>250*1024)throw Error("Ukuran file maksimal 250 KB. Kompres gambar atau PDF sebelum mengunggah.");
 if(!["image/jpeg","image/png","image/webp","application/pdf"].includes(mime))throw Error("Tipe file hanya JPG, PNG, WEBP, atau PDF.");
 const folder=DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty("UPLOAD_FOLDER_ID"));
 const file=folder.createFile(Utilities.newBlob(bytes,mime,Date.now()+"_"+nim+"_"+name));file.setSharing(DriveApp.Access.PRIVATE,DriveApp.Permission.NONE);return {id:file.getId(),name};
}
function decide_(admin,p){
 const a=rows_("Applications").find(x=>x.id===p.id);if(!a)throw Error("Pendaftaran tidak ditemukan.");
 if(!["Disetujui","Ditolak"].includes(p.status))throw Error("Status tidak valid.");
 if(a.status===p.status)return {ok:true,status:p.status};
 const e=rows_("Events").find(x=>x.id===a.eventId);const letterNo="NEV/"+new Date().getFullYear()+"/"+a.id.slice(-6).toUpperCase();
 update_("Applications","id",a.id,{status:p.status,note:String(p.note||""),updatedAt:new Date(),decidedBy:admin.email,decisionAt:new Date(),letterNo:p.status==="Disetujui"?letterNo:""});
 if(p.status==="Disetujui"){const wa=e?e.wa:"";const subject="Persetujuan pendaftaran NEVHub — "+(e?e.title:"Kegiatan NEV");const body="Halo "+a.name+",\n\nPendaftaran Anda pada kegiatan "+(e?e.title:"NEVHub")+" telah DISETUJUI.\nNomor surat: "+letterNo+"\nTanggal: "+(e?e.date:"")+"\nLokasi: "+(e?e.location:"")+"\n"+(wa?"Link grup WhatsApp: "+wa+"\n":"")+"\nSurat persetujuan juga dapat dilihat melalui portal NEVHub.\n\nSalam,\nAdmin NEVHub";
   try{GmailApp.sendEmail(a.email,subject,body,{name:"NEVHub"});}catch(err){console.error("Gmail send failed: "+err.message);}
 }
 return {ok:true,status:p.status};
}
function checkIn_(u,p){
 const a=rows_("Applications").find(x=>x.id===p.applicationId&&x.nim===u.nim&&x.status==="Disetujui");if(!a)throw Error("Peserta belum disetujui atau data tidak cocok.");
 const e=rows_("Events").find(x=>x.id===a.eventId);if(!e)throw Error("Kegiatan tidak ditemukan.");
 if(rows_("Attendance").some(x=>x.applicationId===a.id))throw Error("Presensi sudah tercatat.");
 append_("Attendance",{id:id_(),createdAt:new Date(),eventId:e.id,applicationId:a.id,nim:u.nim,name:u.name,checkInAt:new Date(),method:"token",checkedBy:"self"});
 return {ok:true,message:"Presensi berhasil dicatat."};
}
function publicEvent_(e,m){return {id:e.id,title:e.title,type:e.type,date:dateOnly_(e.date),deadline:dateOnly_(e.deadline),location:e.location,quota:e.quota,fee:e.fee,wa:e.wa,description:e.description,requirements:e.requirements,reqReason:bool_(e.reqReason),reqPhoto:bool_(e.reqPhoto),reqPayment:bool_(e.reqPayment),reqPortfolio:bool_(e.reqPortfolio),documentLabel:e.documentLabel,status:e.status,posterFileId:e.posterFileId||"",posterUrl:e.posterUrl||"",filled:(m&&m[e.id])||0};}
function userPublic_(u){return {name:u.name,nim:u.nim,kelas:u.kelas,prodi:u.prodi,angkatan:u.angkatan,google:u.google,createdAt:u.createdAt};}
function applicationPublic_(a,em){const e=(em&&em[a.eventId])||{};return {id:a.id,eventId:a.eventId,eventTitle:e.title||"Kegiatan",eventType:e.type||"",eventDate:e.date||"",location:e.location||"",wa:e.wa||"",created:a.createdAt,status:a.status,note:a.note,letterNo:a.letterNo};}
function applicationAdmin_(a,em){const e=(em&&em[a.eventId])||{};return {id:a.id,eventId:a.eventId,eventTitle:e.title||"Kegiatan",eventType:e.type||"",eventDate:e.date||"",location:e.location||"",wa:e.wa||"",created:a.createdAt,status:a.status,note:a.note,letterNo:a.letterNo,name:a.name,nim:a.nim,email:a.email,reason:a.reason,portfolio:a.portfolio,extra:a.extra,documentNames:[a.photoFileName,a.paymentFileName].filter(Boolean).join(" · "),photoFileId:a.photoFileId,paymentFileId:a.paymentFileId};}
let _ss=null;
function ss_(){if(_ss)return _ss;const id=PropertiesService.getScriptProperties().getProperty("SHEET_ID")||CFG.SHEET_ID;if(!id)throw Error("Jalankan setup() terlebih dahulu.");_ss=SpreadsheetApp.openById(id);return _ss;}
function tz_(){try{return ss_().getSpreadsheetTimeZone()||"Asia/Jakarta";}catch(e){return "Asia/Jakarta";}}
function sheet_(name){const sh=ss_().getSheetByName(name);if(!sh)throw Error("Sheet "+name+" belum ada. Jalankan setup().");return sh;}
function cell_(h,x){if(x instanceof Date)return DATE_COLS.indexOf(h)>=0?Utilities.formatDate(x,tz_(),"yyyy-MM-dd"):x;if(TEXT_COLS.indexOf(h)>=0&&x!==""&&x!==null&&x!==undefined)return String(x);return x;}
function fmts_(headers,vals){return [headers.map((h,i)=>(TEXT_COLS.indexOf(h)>=0||(typeof vals[i]==="string"&&/^[=+\-@]/.test(vals[i])))?"@":"General")];}
function rows_(name){const sh=sheet_(name),v=sh.getDataRange().getValues();if(v.length<2)return [];const headers=v[0];return v.slice(1).filter(r=>r.some(c=>c!=="")).map(r=>{const o={};headers.forEach((h,i)=>{let c=r[i];if(c instanceof Date)c=DATE_COLS.indexOf(h)>=0?Utilities.formatDate(c,tz_(),"yyyy-MM-dd"):c.toISOString();else if(TEXT_COLS.indexOf(h)>=0&&c!==""&&c!==null)c=String(c);o[h]=c;});return o;});}
function append_(name,obj){const sh=sheet_(name),headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0],vals=headers.map(h=>cell_(h,obj[h]===undefined?"":obj[h])),rg=sh.getRange(sh.getLastRow()+1,1,1,headers.length);rg.setNumberFormats(fmts_(headers,vals));rg.setValues([vals]);}
function update_(name,key,value,changes){const sh=sheet_(name),v=sh.getDataRange().getValues(),headers=v[0],col=headers.indexOf(key);if(col<0)return;for(let i=1;i<v.length;i++){if(String(v[i][col])===String(value)){const row=v[i].map((x,c)=>cell_(headers[c],x));Object.keys(changes).forEach(k=>{const c=headers.indexOf(k);if(c>=0)row[c]=cell_(k,changes[k]);});const rg=sh.getRange(i+1,1,1,headers.length);rg.setNumberFormats(fmts_(headers,row));rg.setValues([row]);return;}}}
function id_(){return Utilities.getUuid();}
function hash_(s){const b=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(s),Utilities.Charset.UTF_8);return b.map(x=>("0"+((x+256)%256).toString(16)).slice(-2)).join("");}
function bool_(v){return v===true||String(v).toLowerCase()==="true"||String(v)==="1";}

function filled_(apps){const m={};apps.forEach(a=>{if(a.status!=="Ditolak")m[a.eventId]=(m[a.eventId]||0)+1;});return m;}
function evMap_(){const m={};rows_("Events").forEach(e=>m[e.id]=e);return m;}
function hashPw_(pw){const salt=Utilities.getUuid().replace(/-/g,"").slice(0,16);return "v2$"+salt+"$"+hash_(salt+String(pw));}
function checkPw_(pw,stored){stored=String(stored||"");if(stored.indexOf("v2$")===0){const p=stored.split("$");return p.length===3&&hash_(p[1]+String(pw))===p[2];}return hash_(pw)===stored;}
function throttle_(id){const c=CacheService.getScriptCache(),k="FAIL_"+hash_(id).slice(0,30);if(Number(c.get(k)||0)>=5)throw Error("Terlalu banyak percobaan gagal. Coba lagi dalam 15 menit.");return k;}
function fail_(k){const c=CacheService.getScriptCache();c.put(k,String(Number(c.get(k)||0)+1),900);}
function purgeTokens_(){const pr=PropertiesService.getScriptProperties(),all=pr.getProperties(),now=Date.now();Object.keys(all).forEach(k=>{if(k.indexOf("USR_")===0||k.indexOf("ADM_")===0){try{if(JSON.parse(all[k]).exp<now)pr.deleteProperty(k);}catch(e){pr.deleteProperty(k);}}});}
function dropToken_(p){const pr=PropertiesService.getScriptProperties();["token","adminToken"].forEach(k=>{if(p[k]){pr.deleteProperty("USR_"+p[k]);pr.deleteProperty("ADM_"+p[k]);}});}
function fileChunk_(u,p){const uploadId=String(p.uploadId||"").replace(/[^a-zA-Z0-9_-]/g,""),index=Number(p.index),data=String(p.data||"");if(!uploadId||!Number.isInteger(index)||index<0||index>=130||!data||data.length>4000)throw Error("Potongan file tidak valid.");CacheService.getScriptCache().put("NEVFILE_"+u.id+"_"+uploadId+"_"+index,data,21600);return {ok:true,index};}
function assembleUpload_(u,ref){if(!ref||!ref.uploadId)return null;const id=String(ref.uploadId).replace(/[^a-zA-Z0-9_-]/g,""),total=Number(ref.totalChunks);if(!Number.isInteger(total)||total<1||total>130)throw Error("Metadata file tidak valid.");const c=CacheService.getScriptCache(),parts=[];for(let i=0;i<total;i++){const x=c.get("NEVFILE_"+u.id+"_"+id+"_"+i);if(x===null)throw Error("Upload file belum lengkap. Coba kirim ulang.");parts.push(x);}return {parts,id,total,name:ref.name,type:ref.type};}
function getApplicationFile_(p){const a=rows_("Applications").find(x=>x.id===p.id);if(!a)throw Error("Pendaftaran tidak ditemukan.");const fid=p.kind==="payment"?a.paymentFileId:a.photoFileId;if(!fid)throw Error("Berkas tidak ada.");const blob=DriveApp.getFileById(fid).getBlob();return {ok:true,name:blob.getName(),type:blob.getContentType(),data:Utilities.base64Encode(blob.getBytes())};}
function resetAdminPassword(email,newPassword){if(!newPassword||String(newPassword).length<10)throw Error("Password minimal 10 karakter.");const a=rows_("Admins").find(x=>String(x.email).toLowerCase()===String(email).toLowerCase());if(!a)throw Error("Admin tidak ditemukan.");update_("Admins","id",a.id,{passwordHash:hashPw_(newPassword)});return "Password admin diperbarui.";}
function authorizeAll(){DriveApp.getRootFolder();GmailApp.getAliases();CacheService.getScriptCache().put("auth","1",5);PropertiesService.getScriptProperties().getKeys();return "Izin lengkap. Lanjutkan deploy.";}
