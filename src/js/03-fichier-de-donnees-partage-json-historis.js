/* ================= Fichier de données partagé (JSON, historisé) ================= */

var GP_FIELDS=['operations','affaires','ejs','cps','profils','realise','revisions'];
var HIST={on:false, idx:-1, revCalc:null, stash:null};
function deepCopy(o){ return JSON.parse(JSON.stringify(o==null?null:o)); }
function strHash(s){ var h=5381,i; for(i=0;i<s.length;i++){ h=((h<<5)+h+s.charCodeAt(i))|0; } return (h>>>0).toString(36)+':'+s.length; }
function gpSignature(st){
  return strHash(GP_FIELDS.map(function(k){ return JSON.stringify(st[k]); }).join(''));
}
function computeRevisionsCalc(st){
  var prev=state, out={};
  state=st;
  try{
    st.affaires.forEach(function(a){
      scopeMonths(a.opId,a.id).forEach(function(m){
        var v=revisionMois(a,m);
        if(v) out[a.id+'|'+m]=Math.round(v*100)/100;
      });
    });
  }catch(e){ out={}; }
  finally{ state=prev; }
  return out;
}
function gpSnapshotOf(st){
  var snap={ id:uid(), date:new Date().toISOString(), sig:gpSignature(st) };
  GP_FIELDS.forEach(function(k){ snap[k]=deepCopy(st[k]); });
  snap.revisionsCalc=computeRevisionsCalc(st);
  return snap;
}
function copyVersionIntoState(st,v){
  GP_FIELDS.forEach(function(k){ st[k]=deepCopy(v&&v[k]!=null?v[k]:defaultState()[k]); });
}
function fmtDateVer(iso){
  var d=new Date(iso);
  if(isNaN(d)) return String(iso||'');
  return d.toLocaleDateString('fr-FR')+' '+d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
}

function dataPayload(){
  return {
    format:'cosi2-donnees',
    version:3,
    enregistre:new Date().toISOString(),
    auteur:currentUser(),
    donnees:{ indices:state.indices, versions:state.versions }
  };
}
/* Applique un contenu de fichier (v3 historisé, v3/v2 à champs plats, ou ancien
   format cosi v2 : contrats -> affaires, type -> stade). */
function applyDataPayload(p){
  var d=(p&&p.donnees&&typeof p.donnees==='object')?p.donnees:p;
  if(!d||typeof d!=='object'||Array.isArray(d)) throw new Error('format de fichier inconnu');
  var st=defaultState();
  st.ui=(state&&state.ui)||st.ui;
  if(d.indices!==undefined) st.indices=d.indices;
  /* migration ancien format cosi (contrats -> affaires) */
  if(d.contrats&&!d.affaires){
    d.affaires=d.contrats;
    if(Array.isArray(d.ejs)) d.ejs.forEach(function(e){ if(e&&e.contratId&&!e.affaireId){ e.affaireId=e.contratId; delete e.contratId; } });
    if(d.cps) st.cps=d.cps;
    if(d.revisions){ st.revisions={}; for(var k in d.revisions){ st.revisions[k.replace(/^([^|]+)\|/,'$1|')]=d.revisions[k]; } }
  }
  var prev=state; state=st;
  try{
    var hasFlat=GP_FIELDS.some(function(k){ return d[k]!==undefined; });
    if(Array.isArray(d.versions)){
      st.versions=d.versions;
      if(hasFlat){
        GP_FIELDS.forEach(function(k){ if(d[k]!==undefined) st[k]=d[k]; });
      }else if(d.versions.length){
        copyVersionIntoState(st, d.versions[d.versions.length-1]);
      }
    }else{
      GP_FIELDS.forEach(function(k){ if(d[k]!==undefined) st[k]=d[k]; });
      st.versions=[gpSnapshotOf(st)];
    }
    repairState(st);
  } finally { state=prev; }
  return st;
}
function exportPayload(){
  var p=dataPayload();
  var vers=p.donnees.versions;
  var snap=gpSnapshotOf(state);
  if(!vers.length||vers[vers.length-1].sig!==snap.sig){
    p.donnees.versions=vers.concat([snap]);
  }
  return p;
}
function fsSupported(){ return typeof window.showDirectoryPicker==='function'; }

function sanitizeFilePart(s){ return String(s||'').replace(/[\\/:*?"<>|\s]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40); }
/* Nom du fichier de sauvegarde : cosi2-donnees-<timestamp ISO assaini>-<utilisateur>.json */
function saveFileName(d, user){
  var iso=(d||new Date()).toISOString().replace(/[:.]/g,'-');
  var u=sanitizeFilePart(user);
  return 'cosi2-donnees-'+iso+(u?'-'+u:'')+'.json';
}

/* Liste les fichiers .json du dossier connecté et ne retient que ceux de format
   compatible (format 'cosi2-donnees'), triés par date d'enregistrement. */
function listDirFiles(){
  if(!DATAFILE.handle) return Promise.reject(new Error('Aucun dossier connecté'));
  var files=[];
  function pushEntry(entry){
    if(!entry||entry.kind!=='file'||!/\.json$/i.test(entry.name)) return Promise.resolve();
    return entry.getFile().then(function(f){
      return f.text().then(function(txt){
        var p; try{ p=JSON.parse(txt); }catch(e){ return; }
        if(!p||p.format!=='cosi2-donnees') return; /* format non compatible : ignoré */
        files.push({name:f.name, handle:entry, enregistre:p.enregistre||'', auteur:p.auteur||'', payload:p});
      }).catch(function(){});
    }).catch(function(){});
  }
  var it=DATAFILE.handle.values();
  function next(){
    return it.next().then(function(r){
      if(r.done) return;
      return pushEntry(r.value).then(next);
    });
  }
  return next().then(function(){
    files.sort(function(a,b){ return String(a.enregistre||'').localeCompare(String(b.enregistre||'')); });
    DATAFILE.files=files;
    return files;
  });
}

/* Toutes les versions de tous les fichiers compatibles (dédup par id), triées. */
function mergeVersionsFromFiles(files){
  var seen={}, out=[];
  files.forEach(function(f){
    var d=f.payload&&f.payload.donnees;
    var vs=(d&&Array.isArray(d.versions))?d.versions:[];
    vs.forEach(function(v){
      if(v&&typeof v==='object'&&v.id&&!seen[v.id]){ seen[v.id]=1; out.push(v); }
    });
  });
  out.sort(function(a,b){ return String(a.date).localeCompare(String(b.date)); });
  return out;
}

/* Charge depuis le dossier : le fichier le plus récent = état courant ; toutes
   les versions de tous les fichiers compatibles = historique. */
function loadFromDir(){
  if(!DATAFILE.handle) return Promise.reject(new Error('Aucun dossier connecté'));
  return listDirFiles().then(function(files){
    if(!files.length){
      /* Dossier vide ou sans JSON compatible (ex. NOUVEAU dossier choisi) : on garde
         l'état courant et on marque le dossier comme connecté — la 1ʳᵉ sauvegarde
         y créera le premier fichier cosi2-donnees-*.json. */
      DATAFILE.name=DATAFILE.handle.name||DATAFILE.name||'dossier';
      DATAFILE.loaded=true; DATAFILE.status='ok';
      save(); dataDirty=false;
      updateFileBar(); render();
      return;
    }
    var last=files[files.length-1];
    state=repairState(applyDataPayload(last.payload));
    state.versions=mergeVersionsFromFiles(files);
    VERMETA={};
    files.forEach(function(f){
      var d=f.payload&&f.payload.donnees, vs=(d&&Array.isArray(d.versions))?d.versions:[];
      vs.forEach(function(v){ if(v&&v.id) VERMETA[v.id]={file:f.name, auteur:f.auteur}; });
    });
    repairState(state);
    DATAFILE.name=DATAFILE.handle.name||DATAFILE.name||'dossier';
    DATAFILE.loaded=true; DATAFILE.status='ok';
    save(); dataDirty=false;
    updateFileBar(); render();
  });
}

function ensureDirPermission(){
  if(!DATAFILE.handle) return Promise.reject(new Error('Aucun dossier connecté'));
  var p;
  try{ p=DATAFILE.handle.queryPermission({mode:'readwrite'}); }
  catch(e){ return Promise.reject(e); }
  return p.then(function(p){
    if(p==='granted') return true;
    return DATAFILE.handle.requestPermission({mode:'readwrite'}).then(function(p2){
      if(p2!=='granted') throw new Error('accès au dossier refusé par le navigateur');
      DATAFILE.status='ok'; updateFileBar();
      return true;
    });
  });
}

/* Sauvegarde = NOUVEAU fichier dans le dossier (timestamp + utilisateur dans le
   nom, champ « auteur » dans le JSON) : rien n'est jamais écrasé. */
function saveToDir(){
  if(!DATAFILE.handle){ alert('Connectez d\'abord un dossier de données (bouton « Dossier… » ou onglet Données).'); return Promise.resolve(); }
  if(HIST.on){ alert('Quittez d\'abord le mode historique (ou restaurez la version affichée) avant de sauvegarder.'); return Promise.resolve(); }
  return ensureDirPermission().then(function(){
    var snap=gpSnapshotOf(state);
    function unique(n,k){
      return DATAFILE.handle.getFileHandle(n,{create:false})
        .then(function(){ return unique(n.replace(/\.json$/, (k>1?'-'+k:'-2')+'.json'), k+1); },
              function(){ return n; });
    }
    return unique(saveFileName(new Date(), currentUser()), 2).then(function(fname){
      return DATAFILE.handle.getFileHandle(fname,{create:true}).then(function(fh){
        return fh.createWritable().then(function(w){
          var payload={
            format:'cosi2-donnees', version:3,
            enregistre:new Date().toISOString(),
            auteur:currentUser(),
            donnees:{ indices:state.indices, versions:[snap] }
          };
          return w.write(JSON.stringify(payload,null,2)).then(function(){ return w.close(); });
        });
      }).then(function(){
        if(!state.versions.length||state.versions[state.versions.length-1].id!==snap.id) state.versions.push(snap);
        VERMETA[snap.id]={file:fname, auteur:currentUser()};
        DATAFILE.loaded=true; DATAFILE.status='ok'; DATAFILE.savedAt=new Date();
        save(); dataDirty=false; updateFileBar(); render();
      });
    });
  }).catch(function(e){ if(!e||e.message!=='abandon') alert('Enregistrement impossible : '+(e.message||e)); });
}

function refreshFromDir(){
  if(!DATAFILE.handle){ alert('Connectez d\'abord un dossier de données.'); return; }
  if(HIST.on){ alert('Quittez d\'abord le mode historique.'); return; }
  if(dataDirty && !confirm('Des modifications locales ne sont pas enregistrées.\nLes recharger depuis le dossier les écrasera. Continuer ?')) return;
  ensureDirPermission().then(loadFromDir).catch(function(e){
    DATAFILE.status='error'; updateFileBar();
    alert('Actualisation impossible : '+(e.message||e));
  });
}

function connectDirPicker(){
  if(!fsSupported()){ alert('Ce navigateur ne permet pas l\'accès direct aux dossiers. Utilisez Importer / Exporter dans l\'onglet Données, ou ouvrez l\'application dans Chrome ou Edge.'); return; }
  var p;
  try{ p=window.showDirectoryPicker(); }
  catch(e){ alert('Ouverture du sélecteur impossible dans ce contexte : '+(e.message||e)+'\nUtilisez Importer / Exporter dans l\'onglet « Données ».'); return; }
  p.then(function(dh){
    DATAFILE.handle=dh; DATAFILE.name=dh.name||'dossier'; DATAFILE.status='need-permission';
    return idbPut('data-dir',dh);
  }).then(function(){ return loadFromDir(); })
  .catch(function(e){
    if(e&&e.name==='AbortError') return;
    DATAFILE.status='error'; updateFileBar();
    alert('Ouverture impossible : '+(e.message||e));
  });
}

/* Export d'une copie JSON unique (toutes les versions) vers un fichier choisi. */
function saveAsFile(){
  if(typeof window.showSaveFilePicker!=='function'){ alert('Export fichier indisponible dans ce navigateur — utilisez « Exporter la copie (JSON) ».'); return; }
  var p;
  try{ p=window.showSaveFilePicker({ suggestedName:'cosi2-donnees-'+curMois()+'.json', types:[{description:'Données COSI (JSON)', accept:{'application/json':['.json']}}] }); }
  catch(e){ alert('Export impossible dans ce contexte : '+(e.message||e)); return; }
  p.then(function(h){
    return h.createWritable().then(function(w){
      return w.write(JSON.stringify(exportPayload(),null,2)).then(function(){ return w.close(); });
    });
  }).catch(function(e){ if(e&&e.name!=='AbortError') alert('Export impossible : '+(e.message||e)); });
}

function openDataFileAction(){
  if(DATAFILE.handle && (DATAFILE.status==='need-permission'||DATAFILE.status==='error')){
    ensureDirPermission().then(loadFromDir).catch(function(e){
      DATAFILE.status='error'; updateFileBar();
      alert('Lecture du dossier impossible : '+(e.message||e));
    });
    return;
  }
  connectDirPicker();
}

function initDataFile(){
  try{
    if(!fsSupported()){ updateFileBar(); return; }
    idbGet('data-dir').then(function(h){
      if(!h){ updateFileBar(); return; }
      DATAFILE.handle=h; DATAFILE.name=h.name||'dossier'; DATAFILE.status='need-permission';
      return h.queryPermission({mode:'readwrite'}).then(function(p){
        if(p==='granted'){
          return loadFromDir().catch(function(){ DATAFILE.status='error'; updateFileBar(); });
        }
        updateFileBar();
      });
    }).catch(function(){ updateFileBar(); });
  }catch(e){ try{ updateFileBar(); }catch(e2){} }
}

function idbOpen(){
  return new Promise(function(res, rej){
    if(typeof indexedDB==='undefined'){ rej(new Error('IndexedDB indisponible')); return; }
    var rq=indexedDB.open('cosi2-datafile',1);
    rq.onupgradeneeded=function(){ rq.result.createObjectStore('handles'); };
    rq.onsuccess=function(){ res(rq.result); };
    rq.onerror=function(){ rej(rq.error||new Error('IndexedDB indisponible')); };
  });
}
function idbPut(key,val){
  return idbOpen().then(function(db){
    return new Promise(function(res, rej){
      var tx=db.transaction('handles','readwrite');
      tx.objectStore('handles').put(val,key);
      tx.oncomplete=function(){ res(); };
      tx.onerror=function(){ rej(tx.error||new Error('écriture IndexedDB impossible')); };
    });
  });
}
function idbGet(key){
  return idbOpen().then(function(db){
    return new Promise(function(res, rej){
      var tx=db.transaction('handles','readonly');
      var rq=tx.objectStore('handles').get(key);
      rq.onsuccess=function(){ res(rq.result); };
      tx.onerror=function(){ rej(tx.error||new Error('lecture IndexedDB impossible')); };
    });
  });
}

/* Barre d'état de l'en-tête + sélecteurs de versions */
var VERKEY='';
var CMPKEY='';
function updateFileBar(){
  var st=document.getElementById('file-status');
  var bOpen=document.getElementById('btn-open'), bSave=document.getElementById('btn-save'), bRef=document.getElementById('btn-refresh');
  var bHq=document.getElementById('btn-hquit'), bHr=document.getElementById('btn-hrestore'), sel=document.getElementById('ver-sel');
  if(!st) return;
  function vis(el,on,txt){ if(!el) return; el.style.display=on?'':'none'; if(txt!=null) el.textContent=txt; }
  if(sel){
    var key=state.versions.length+'|'+(state.versions.length?String(state.versions[state.versions.length-1].id):'');
    if(key!==VERKEY){
      VERKEY=key;
      var opts='<option value="">— Travail courant —</option>';
      for(var i=state.versions.length-1;i>=0;i--){
        var vv0=state.versions[i], meta=VERMETA[vv0&&vv0.id];
        opts+='<option value="'+i+'">Version '+(i+1)+' — '+fmtDateVer(vv0&&vv0.date)+(meta?' — '+esc(meta.file)+(meta.auteur?' ('+esc(meta.auteur)+')':''):'')+'</option>';
      }
      sel.innerHTML=opts;
    }
    sel.value=HIST.on?String(HIST.idx):'';
  }
  var csel=document.getElementById('cmp-sel');
  if(csel){
    var ckey=state.versions.length+'|'+(state.versions.length?String(state.versions[state.versions.length-1].id):'');
    if(ckey!==CMPKEY){
      CMPKEY=ckey;
      var copts='<option value="">— Sans comparaison —</option>';
      for(var ci=state.versions.length-1;ci>=0;ci--){
        var vv=state.versions[ci];
        if(vv&&vv.id) copts+='<option value="'+esc(vv.id)+'">Comparer à : version '+(ci+1)+' — '+fmtDateVer(vv.date)+'</option>';
      }
      csel.innerHTML=copts;
    }
    csel.style.display=(state.versions.length&&!HIST.on)?'':'none';
    csel.value=(CMP.on&&cmpVer())?CMP.id:'';
  }
  if(HIST.on){
    var v=state.versions[HIST.idx];
    vis(bOpen,false); vis(bSave,false); vis(bRef,false);
    vis(bHq,true); vis(bHr,true); vis(sel,true);
    st.innerHTML='<span class="dot"></span>Historique : version '+(HIST.idx+1)+' sur '+state.versions.length+' (du '+fmtDateVer(v&&v.date)+') — saisie désactivée.';
    st.classList.remove('ok');
    return;
  }
  vis(bHq,false); vis(bHr,false);
  if(!fsSupported()){
    st.innerHTML='Dossiers non pris en charge par ce navigateur — utilisez Importer / Exporter (onglet Données).';
    st.classList.remove('ok');
    vis(bOpen,false); vis(bSave,false); vis(bRef,false); vis(sel,false);
    return;
  }
  vis(sel,true);
  if(!DATAFILE.handle){
    st.innerHTML='Aucun dossier de versions connecté — travail en local dans ce navigateur.';
    st.classList.remove('ok');
    vis(bOpen,true,'Connecter un dossier…'); vis(bSave,false); vis(bRef,false);
    return;
  }
  vis(bOpen,true); vis(bSave,true,'Sauvegarder (nouveau fichier)'); vis(bRef,true);
  vis(bOpen,null,(DATAFILE.status==='need-permission'||DATAFILE.status==='error')?('Reconnecter «'+DATAFILE.name+'»'):'Dossier…');
  if(DATAFILE.status==='need-permission'){
    st.innerHTML='Dossier «'+esc(DATAFILE.name)+'» connecté au passage précédent — cliquez « Reconnecter » (ou Actualiser) pour rouvrir l\'accès.';
    st.classList.remove('ok'); return;
  }
  if(DATAFILE.status==='error'){
    st.innerHTML='<span class="dot"></span>Dossier «'+esc(DATAFILE.name)+'» illisible ou injoignable — reconnectez-le ou choisissez-en un autre.';
    st.classList.remove('ok'); return;
  }
  var nbF=DATAFILE.files?DATAFILE.files.length:state.versions.length;
  if(dataDirty){
    st.innerHTML='<span class="dot"></span>Dossier «'+esc(DATAFILE.name)+'» — '+nbF+' fichier(s) de versions — modifications non enregistrées.';
    st.classList.remove('ok');
  }else{
    var t=DATAFILE.savedAt?(' — dernier enregistrement à '+DATAFILE.savedAt.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})):'';
    st.innerHTML='<span class="dot"></span>Dossier «'+esc(DATAFILE.name)+'» — '+nbF+' fichier(s) de versions'+t;
    st.classList.add('ok');
  }
}

/* ---- Historique ---- */

function enterHist(i){
  var v=state.versions[i];
  if(!v) return;
  CMP.on=false; CMP.id='';
  if(!HIST.on){
    HIST.stash={};
    GP_FIELDS.forEach(function(k){ HIST.stash[k]=deepCopy(state[k]); });
  }
  HIST.on=true; HIST.idx=i;
  GP_FIELDS.forEach(function(k){ state[k]=deepCopy(v[k]!=null?v[k]:defaultState()[k]); });
  HIST.revCalc=v.revisionsCalc||{};
  repairState(state);
  if(document.body&&document.body.classList) document.body.classList.add('histmode');
  render();
  updateFileBar();
}
function quitHist(){
  if(!HIST.on) return;
  GP_FIELDS.forEach(function(k){ state[k]=HIST.stash[k]; });
  HIST.on=false; HIST.idx=-1; HIST.revCalc=null; HIST.stash=null;
  if(document.body&&document.body.classList) document.body.classList.remove('histmode');
  render();
  updateFileBar();
}
function restoreVersion(){
  if(!HIST.on) return;
  var v=state.versions[HIST.idx];
  if(!confirm('Restaurer la version du '+fmtDateVer(v&&v.date)+' ?\nElle devient l\'état de travail courant ; cliquez ensuite « Sauvegarder » pour l\'inscrire comme un NOUVEAU fichier de version (l\'historique est conservé).')) return;
  HIST.on=false; HIST.idx=-1; HIST.revCalc=null; HIST.stash=null;
  if(document.body&&document.body.classList) document.body.classList.remove('histmode');
  save();
  render();
  updateFileBar();
}
function renderHistBanner(){
  var host=document.getElementById('hist-banner');
  if(!host) return;
  if(!HIST.on){ host.style.display='none'; host.innerHTML=''; return; }
  var v=state.versions[HIST.idx];
  host.style.display='';
  host.innerHTML='<div class="card" style="background:var(--amber-bg);border-color:#f0d8a8">'+
    '<strong>Mode historique</strong> — version '+(HIST.idx+1)+' sur '+state.versions.length+', du '+fmtDateVer(v&&v.date)+
    '. Consultation seule : la saisie est désactivée ; les révisions affichées sont celles figées à la sauvegarde.'+
    '<span style="margin-left:12px"><button class="btn small" id="hist-quit">Quitter l\'historique</button> '+
    '<button class="btn small primary" id="hist-restore">Restaurer cette version</button></span></div>';
  var q=document.getElementById('hist-quit');
  if(q) q.addEventListener('click', quitHist);
  var r=document.getElementById('hist-restore');
  if(r) r.addEventListener('click', restoreVersion);
}

/* ---- Mode comparaison ---- */

var CMP={on:false, id:''};
function cmpIdx(){
  for(var i=0;i<state.versions.length;i++){ if(state.versions[i]&&state.versions[i].id===CMP.id) return i; }
  return -1;
}
function cmpVer(){ var i=cmpIdx(); return CMP.on&&i>=0?state.versions[i]:null; }
function cmpLabel(){ var i=cmpIdx(); return i<0?'':'V'+(i+1); }
function enterCmp(vid){
  var ok=false;
  for(var i=0;i<state.versions.length;i++){ if(state.versions[i]&&state.versions[i].id===vid){ ok=true; break; } }
  if(!ok) return;
  if(HIST.on) quitHist();
  CMP.on=true; CMP.id=vid;
  render(); updateFileBar();
}
function quitCmp(){
  if(!CMP.on) return;
  CMP.on=false; CMP.id='';
  render(); updateFileBar();
}
function cmpFind(list,id){
  if(!list) return null;
  for(var i=0;i<list.length;i++){ if(list[i]&&list[i].id===id) return list[i]; }
  return null;
}
/* Agrégats d'une version pour une affaire (montants bruts figés à la sauvegarde) */
function cmpAffStats(v,aid){
  var ej=0, alea=0, rk=0, cp=0, rev=0, eids={};
  (v&&v.ejs||[]).forEach(function(e){
    if(!e||e.affaireId!==aid) return;
    var sd=e.stade||e.type||'prog';
    if(sd==='risque') rk+=(+e.montant||0);
    else if(sd==='alea') alea+=(+e.montant||0);
    else { eids[e.id]=1; ej+=(+e.montant||0); }
  });
  var cps=(v&&v.cps)||{};
  for(var k in cps){ if(eids[k.split('|')[0]]) cp+=cps[k]; }
  var rc=(v&&v.revisionsCalc)||{};
  for(var k2 in rc){ if(k2.indexOf(aid+'|')===0) rev+=rc[k2]; }
  return {ej:ej, alea:alea, rk:rk, cp:cp, rev:rev};
}
function fmtCmp(old,neu,fm){
  var f=fm||fmt0;
  if(old==null) return cmpLabel()+' : absent';
  var d=(+neu||0)-(+old||0);
  if(Math.abs(d)<0.5) return cmpLabel()+' : '+f(old)+' (inchangé)';
  return cmpLabel()+' : '+f(old)+(d>0?' + ':' − ')+f(Math.abs(d));
}
function cmpNoteHTML(old,neu,fm){
  if(!cmpVer()) return '';
  return '<span class="cmp-note">'+esc(fmtCmp(old,neu,fm))+'</span>';
}
function cmpAbsHTML(){
  return cmpVer()?('<span class="cmp-note">absent de '+cmpLabel()+'</span>'):'';
}
function renderCmpBanner(){
  var host=document.getElementById('cmp-banner');
  if(!host) return;
  var v=cmpVer();
  if(!v){ host.style.display='none'; host.innerHTML=''; return; }
  host.style.display='';
  host.innerHTML='<div class="card" style="background:var(--blue-bg);border-color:#c8d8f8">'+
    '<strong>Mode comparaison</strong> — version '+(cmpIdx()+1)+' sur '+state.versions.length+', du '+fmtDateVer(v.date)+
    ' : les données courantes (modifiables) sont accompagnées, pour mémoire, de celles de cette version'+
    ' (« '+cmpLabel()+' : valeur ancienne + écart »).'+
    '<span style="margin-left:12px"><button class="btn small" id="cmp-quit">Quitter la comparaison</button></span></div>';
  var q=document.getElementById('cmp-quit');
  if(q) q.addEventListener('click', quitCmp);
}
