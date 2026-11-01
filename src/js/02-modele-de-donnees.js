/* ================= Modèle de données ================= */
/* Hiérarchie : opérations -> affaires -> EJ.
   Chaque EJ est à un stade : 'prog' (EJ programmé), 'alea' (aléa forfaitaire),
   'risque' (risque, avec probabilité et date d'apparition), 'engage'
   (risque/aléa matérialisé : vrai EJ à date fixée).
   profils[ejId] : profil de consommation des CP de l'EJ
   {type:'ponctuelle'|'uniforme'|'perso', debut:'AAAA-MM', fin:'AAAA-MM'}.
   cps["ejId|AAAA-MM"] : CP (saisis en 'perso', calculés sinon).
   realise["affaireId|AAAA-MM"] : {ej, cp} réellement constaté.
   revisions["affaireId|AAAA-MM"] : montant forcé ou "=formule" (révisions de prix, par affaire). */

function defaultState(){
  return {
    operations:[], affaires:[], ejs:[],
    cps:{},
    profils:{},
    realise:{},
    revisions:{},
    indices:[],
    versions:[],
    ui:{ view:'dashboard', op:'', aff:'', ext:0, idxSerie:'', gpRpDec:false, gpNoCpDec:false, gpNoCpJan:false, dashFrom:'', dashTo:'', gpExp:{} }
  };
}

function demoState(){
  var st=defaultState();
  st.operations=[
    {id:'op1', numero:'101', nom:'Extension tramway — Ligne B', description:'Prolongement de 3,2 km avec viaduc et nouvelle station'},
    {id:'op2', numero:'102', nom:'Rénovation station d\'épuration', description:'Mise aux normes de la STEP du nord'}
  ];
  function a(id,opId,nom,tit,ref,montant,fi){ return {id:id,opId:opId,nom:nom,titulaire:tit,refContrat:ref,montantInitial:montant,dateRefRev:'2026-01',formule:(fi||'')}; }
  st.affaires=[
    a('a1','op1','Génie civil — Viaduc','Colas TP','CTR-2026-014',12400000,'=0.6*{BT01}+0.4*{TP}'),
    a('a2','op1','Équipements électromécaniques','Alstom','CTR-2026-021',6800000),
    a('a3','op1','Maîtrise d\'œuvre','Egis','CTR-2026-030',900000),
    a('a4','op2','Travaux hydrauliques','Vincent TP','CTR-2026-041',3200000),
    a('a5','op2','Automatismes & régulation','Schneider','CTR-2026-052',1100000),
    a('a6','op2','Maîtrise d\'œuvre','Artelia','CTR-2026-058',240000)
  ];
  function e(id,affaireId,numero,libelle,mois,montant){ return {id:id,affaireId:affaireId,numero:numero,libelle:libelle,stade:'prog',mois:mois,montant:montant}; }
  st.ejs=[
    e('e1','a1','GC-01','Installation de chantier','2026-09',2400000),
    e('e2','a1','GC-02','Fondations piles P1 à P4','2026-11',3100000),
    e('e3','a1','GC-03','Tablier métallique','2027-03',2800000),
    e('e4','a2','EM-01','Sous-station électrique','2027-01',1500000),
    e('e5','a2','EM-02','Signalisation embarquée','2027-05',2000000),
    e('e6','a3','MOE-01','Études phase PRO','2026-08',300000),
    e('e7','a3','MOE-02','Supervision travaux','2027-08',600000),
    e('e8','a4','HYD-01','Bassin biologique','2027-02',1200000),
    e('e9','a5','AUT-01','Automate de conduite','2027-04',600000),
    e('e10','a6','MOE-B1','Mission de maîtrise d\'œuvre','2027-01',240000),
    {id:'al1',affaireId:'a1',numero:'AL-01',libelle:'Aléa forfaitaire (5 % du reste à payer)',stade:'alea',mois:'2027-12',montant:0,montantExplicite:false,aleaPct:5,dateType:'ponctuelle'},
    {id:'r1',affaireId:'a1',numero:'GC-R1',libelle:'Risque géotechnique — reprise fondations',stade:'risque',mois:'2026-12',montant:400000,
     distType:'fixe',distA:400000,probabilite:30,dateType:'ponctuelle'},
    {id:'r2',affaireId:'a2',numero:'EM-R1',libelle:'Risque approvisionnement matériel',stade:'risque',mois:'2027-01',montant:0,
     distType:'uniforme',distA:200000,distB:300000,probabilite:40,dateType:'uniforme',dateA:'2027-01',dateB:'2027-06'},
    {id:'r3',affaireId:'a4',numero:'HYD-R1',libelle:'Découverte de réseaux enterrés',stade:'risque',mois:'2027-06',montant:0,
     distType:'triangulaire',distA:100000,distB:150000,distC:250000,probabilite:25,dateType:'recurrente',dateA:'2027-03',dateB:'2027-12',freq:3}
  ];
  st.profils={
    e1:{type:'uniforme',debut:'2026-10',fin:'2027-03'},
    e2:{type:'perso'},
    e3:{type:'ponctuelle',debut:'2027-03',fin:'2027-03'},
    e4:{type:'uniforme',debut:'2027-02',fin:'2027-04'},
    e5:{type:'ponctuelle',debut:'2027-05',fin:'2027-05'},
    e6:{type:'ponctuelle',debut:'2026-08',fin:'2026-08'},
    e7:{type:'uniforme',debut:'2027-08',fin:'2027-12'},
    e8:{type:'uniforme',debut:'2027-03',fin:'2027-06'},
    e9:{type:'ponctuelle',debut:'2027-04',fin:'2027-04'},
    e10:{type:'uniforme',debut:'2027-01',fin:'2027-06'},
    al1:{type:'ponctuelle',debut:'2027-12',fin:'2027-12'},
    r1:{type:'uniforme',debut:'2026-12',fin:'2027-03'},
    r2:{type:'uniforme',debut:'2027-01',fin:'2027-06'},
    r3:{type:'uniforme',debut:'2027-03',fin:'2027-12'}
  };
  /* CP saisis manuellement pour l'EJ au profil personnalisé */
  var set=function(ejId,mois,v){ st.cps[ejId+'|'+mois]=v; };
  set('e2','2026-12',1000000); set('e2','2027-01',1000000); set('e2','2027-02',600000); set('e2','2027-03',500000);
  /* Réalisé (constaté) sur les mois passés */
  st.realise={
    'a1|2026-08':{ej:0,cp:200000},
    'a1|2026-09':{ej:2400000,cp:900000},
    'a1|2026-10':{ej:0,cp:1100000},
    'a3|2026-08':{ej:300000,cp:300000},
    'a3|2026-09':{ej:0,cp:0}
  };
  /* démo : une valeur d'indice PAR MOIS (2026-01 .. 2027-12) par série, + nouvel indice ING */
  function serieMensuelle(base, pas){
    var v={}, m='2026-01', k=0;
    while(m<='2027-12'){ v[m]=base+Math.round(k*pas); m=mAdd(m,1); k++; }
    return v;
  }
  st.indices=[
    {id:'ix1', nom:'BT01', valeurs:serieMensuelle(1000, 2.6)},
    {id:'ix2', nom:'TP',   valeurs:serieMensuelle(1000, 3.9)},
    {id:'ix3', nom:'ING',  valeurs:serieMensuelle(1000, 1.7)}
  ];
  st.ui.op='op1'; st.ui.aff='';
  return st;
}

var state=null;

/* Dossier de versions : DATAFILE.handle = FileSystemDirectoryHandle choisi par
   le client. Chaque sauvegarde écrit un NOUVEAU fichier JSON dans ce dossier
   (cosi2-donnees-<timestamp>-<utilisateur>.json) ; la liste des versions est la
   liste des fichiers .json de format compatible ('cosi2-donnees') du dossier. */
var DATAFILE={handle:null, name:'', loaded:false, status:'none', savedAt:null, files:[]};
var VERMETA={}; /* id de version -> {file, auteur} (rempli au listage du dossier) */
var dataDirty=false;
var USER_KEY='cosi2.user';
function currentUser(){ try{ return String(localStorage.getItem(USER_KEY)||'').trim(); }catch(e){ return ''; } }
function setCurrentUser(u){ try{ localStorage.setItem(USER_KEY,String(u||'').trim()); }catch(e){} }

function normalizeIndices(st){
  if(!Array.isArray(st.indices)){
    var old=(st.indices&&typeof st.indices==='object')?st.indices:{};
    st.indices=Object.keys(old).length?[{id:'ixdef',nom:'Indice',valeurs:old}]:[];
  }
  st.indices=st.indices.filter(function(s){ return s&&typeof s==='object'; });
  st.indices.forEach(function(s){
    if(!s.id) s.id=uid();
    if(!s.nom) s.nom='Indice';
    if(!s.valeurs||typeof s.valeurs!=='object') s.valeurs={};
    /* cellules vides (null) non conservées */
    for(var vk in s.valeurs){ var vv=s.valeurs[vk]; if(typeof vv!=='number'||!isFinite(vv)) delete s.valeurs[vk]; }
  });
}

var STADES=['prog','alea','risque','engage'];
var PROF_TYPES=['ponctuelle','uniforme','perso'];
var DIST_TYPES=['fixe','uniforme','triangulaire','gauss'];
var DATE_TYPES=['ponctuelle','recurrente','uniforme'];

function numOrNull(v){ var n=parseFloat(v); return isNaN(n)?null:n; }

/* Répare un état de forme inattendue (sauvegarde locale ou fichier JSON) */
/* Premier mois connu parmi les séries d'indices (sert de date de référence
   par défaut lors de la migration d'anciennes affaires). */
function firstIndexMonth(st){
  var m=null, arr=Array.isArray(st.indices)?st.indices:[];
  arr.forEach(function(s){ if(s&&s.valeurs){ for(var k in s.valeurs){ if(/^\d{4}-\d{2}$/.test(k)&&(!m||k<m)) m=k; } } });
  return m;
}

function repairState(st){
  if(!st||typeof st!=='object'){ st=demoState(); }
  if(!Array.isArray(st.operations)) st.operations=[];
  if(!Array.isArray(st.affaires)) st.affaires=[];
  if(!Array.isArray(st.ejs)) st.ejs=[];
  if(!st.cps||typeof st.cps!=='object'||Array.isArray(st.cps)) st.cps={};
  if(!st.profils||typeof st.profils!=='object'||Array.isArray(st.profils)) st.profils={};
  if(!st.realise||typeof st.realise!=='object'||Array.isArray(st.realise)) st.realise={};
  if(!st.revisions||typeof st.revisions!=='object'||Array.isArray(st.revisions)) st.revisions={};
  if(!Array.isArray(st.versions)) st.versions=[];
  st.operations.forEach(function(o,i){ if(!o.id) o.id=uid(); if(!o.nom) o.nom='Opération'; if(typeof o.numero!=='string'||!/^\d*$/.test(o.numero)) o.numero=String(i+1); });
  st.affaires.forEach(function(a){
    if(!a.id) a.id=uid();
    if(!a.opId||!opByIdRaw(st,a.opId)) a.opId=(st.operations[0]&&st.operations[0].id)||'';
    if(!a.nom) a.nom='Affaire';
    a.montantInitial=+a.montantInitial||0;
    if(typeof a.refContrat!=='string') a.refContrat='';
    if(a.dateRefRev&&!/^\d{4}-\d{2}$/.test(a.dateRefRev)) a.dateRefRev=null;
    if(!a.dateRefRev) a.dateRefRev=firstIndexMonth(st)||curMois();
    /* migration : formule d'indice et formule de révision fusionnées en « formule » */
    if(typeof a.formule!=='string') a.formule=(typeof a.formuleIndice==='string'&&a.formuleIndice.trim())?a.formuleIndice:'';
    if(/\{cf\}|\{cv\}/i.test(a.formule)) a.formule='';
    delete a.formuleIndice; delete a.formuleRev;
    /* anciens champs supprimés du modèle affaire */
    delete a.partRevisable; delete a.indiceBase; delete a.coefFixe; delete a.coefVar;
  });
  var ejIds={};
  st.ejs.forEach(function(e){
    if(!e||typeof e!=='object') return;
    if(!e.id) e.id=uid();
    ejIds[e.id]=1;
    if(!e.affaireId||!affaireByIdRaw(st,e.affaireId)) e.affaireId=(st.affaires[0]&&st.affaires[0].id)||'';
    var sd=e.stade||e.type||'prog';
    if(STADES.indexOf(sd)<0) sd='prog';
    e.stade=sd; delete e.type;
    if(!e.numero) e.numero='EJ';
    if(!e.mois||!/^\d{4}-\d{2}$/.test(e.mois)) e.mois=curMois();
    e.montant=numOrNull(e.montant);
    if(e.stade==='risque'){
      e.probabilite=numOrNull(e.probabilite);
      if(DIST_TYPES.indexOf(e.distType)<0) e.distType='fixe';
      e.distA=numOrNull(e.distA); e.distB=numOrNull(e.distB); e.distC=numOrNull(e.distC);
      if(DATE_TYPES.indexOf(e.dateType)<0) e.dateType='ponctuelle';
      if(e.dateA&&!/^\d{4}-\d{2}$/.test(e.dateA)) e.dateA=null;
      if(e.dateB&&!/^\d{4}-\d{2}$/.test(e.dateB)) e.dateB=null;
      e.freq=numOrNull(e.freq);
    }
    if(e.stade==='alea'){
      e.aleaPct=numOrNull(e.aleaPct); if(e.aleaPct==null) e.aleaPct=5;
      if(e.montant==null) e.montantExplicite=false;
    }
  });
  ['cps','profils'].forEach(function(kk){ for(var pk in st[kk]){ if(!ejIds[pk.split('|')[0]]) delete st[kk][pk]; } });
  var affIds={}; st.affaires.forEach(function(a){ affIds[a.id]=1; });
  ['realise','revisions'].forEach(function(kk){ for(var pk2 in st[kk]){ if(!affIds[pk2.split('|')[0]]) delete st[kk][pk2]; } });
  for(var rk in st.realise){ var rv=st.realise[rk]; if(!rv||typeof rv!=='object'){ st.realise[rk]={ej:0,cp:0}; } else { rv.ej=+rv.ej||0; rv.cp=+rv.cp||0; } }
  st.profils=Object.keys(st.profils).reduce(function(acc,k){
    var p=st.profils[k];
    if(p&&PROF_TYPES.indexOf(p.type)>=0){ acc[k]={type:p.type, debut:p.debut||'', fin:p.fin||''}; }
    return acc;
  },{});
  if(!st.ui||typeof st.ui!=='object') st.ui=defaultState().ui;
  var dui=defaultState().ui;
  for(var uk in dui){ if(st.ui[uk]===undefined) st.ui[uk]=dui[uk]; }
  normalizeIndices(st);
  try{ recomputeProfils(st); }catch(e){}
  return st;
}
function opByIdRaw(st,id){ for(var i=0;i<st.operations.length;i++){ if(st.operations[i].id===id) return st.operations[i]; } return null; }
function affaireByIdRaw(st,id){ for(var i=0;i<st.affaires.length;i++){ if(st.affaires[i].id===id) return st.affaires[i]; } return null; }

function load(){
  try{
    var raw=localStorage.getItem(LS_KEY);
    if(raw){ state=repairState(JSON.parse(raw)); }
    else { state=demoState(); save(); }
  }catch(e){ state=demoState(); save(); }
}
function save(){
  dataDirty=true;
  try{ localStorage.setItem(LS_KEY, JSON.stringify(state)); }catch(e){}
  updateFileBar();
}

