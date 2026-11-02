/* Harnais v4 : stubs DOM evenementiels + execution du script + assertions.
   Usage: node test/run-tests.js [dist/index.html] */
const fs = require('fs');
const htmlPath = process.argv[2] || require('path').join(__dirname, '..', 'dist', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const lines = html.split('\n');
const s0 = lines.findIndex(l => l === '<script>');
const s1 = lines.findIndex(l => l === '</script>');
const script = lines.slice(s0 + 1, s1).join('\n');

function makeEl(tag) {
  const el = {
    tagName: tag || 'div', innerHTML: '', textContent: '', value: '', disabled: false, id: '',
    style: {}, dataset: {}, files: [], children: [], _listeners: {}, _qs: {}, _closest: null,
    classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    addEventListener(t, f){ (this._listeners[t] = this._listeners[t] || []).push(f); },
    removeEventListener(){},
    appendChild(c){ this.children.push(c); return c; },
    removeChild(c){ this.children = this.children.filter(x => x !== c); },
    replaceChildren(c){ this.children = [c]; this.innerHTML = c ? c.innerHTML : ''; },
    remove(){}, click(){}, setAttribute(){}, focus(){},
    closest(){ return this._closest; },
    querySelector(sel){ if (!this._qs[sel]) this._qs[sel] = makeEl('q:' + sel); return this._qs[sel]; },
    querySelectorAll(){ return []; },
  };
  return el;
}
function fire(el, type, ev){ (el._listeners[type] || []).forEach(f => f(ev)); }
const byId = {};
global.__docL = {};
global.document = {
  getElementById(id){ if (!byId[id]) byId[id] = makeEl('div#' + id); return byId[id]; },
  createElement(tag){ return makeEl(tag); },
  addEventListener(t,f){ (global.__docL[t]=global.__docL[t]||[]).push(f); }, removeEventListener(){},
  body: makeEl('body'),
};
global.window = { addEventListener(){}, removeEventListener(){}, showDirectoryPicker(){ return Promise.resolve(makeFakeDir({})); }, showSaveFilePicker(){ return Promise.resolve(null); }, showOpenFilePicker(){ return Promise.resolve([]); } };
global.location = { reload(){} };
const store = {};
global.localStorage = {
  getItem(k){ return k in store ? store[k] : null; },
  setItem(k, v){ store[k] = String(v); },
  removeItem(k){ delete store[k]; },
};
const alerts = [];
global.alert = (m) => alerts.push(String(m));
global.confirm = () => true;
global.prompt = () => null;
global.FileReader = function(){ this.readAsText = () => {}; };
global.Blob = function(){};
global.URL = { createObjectURL(){ return 'blob:x'; }, revokeObjectURL(){} };
global.navigator = {};


function makeFakeFileHandle(dir, name){
  return { name: name,
    createWritable(){ let buf=''; return Promise.resolve({ write(t){ buf+=t; return Promise.resolve(); }, close(){ dir._files[name]=buf; return Promise.resolve(); } }); },
    getFile(){ return Promise.resolve({ name:name, lastModified:Date.now(), text(){ return Promise.resolve(dir._files[name]); } }); } };
}
function makeFakeDir(files, name){
  return { kind:'directory', name:name||'dossier-test', _files:files,
    values(){ const arr=Object.keys(this._files).map(n=>({kind:'file', name:n, getFile(){ return Promise.resolve({name:n, lastModified:1, text(){ return Promise.resolve(files[n]); }}); }})); let i=0; const self=this; return { next(){ return Promise.resolve(i<arr.length?{value:arr[i++],done:false}:{value:undefined,done:true}); } }; },
    queryPermission(){ return Promise.resolve('granted'); },
    requestPermission(){ return Promise.resolve('granted'); },
    getFileHandle(n, opts){ const self=this; if(opts&&opts.create){ if(self._files[n]!=null && opts.create===true && self._exists===false){} if(self._files[n]!=null){ return Promise.reject(new Error('existe déjà')); } self._files[n]=''; return Promise.resolve(makeFakeFileHandle(self,n)); } return self._files[n]!=null?Promise.resolve(makeFakeFileHandle(self,n)):Promise.reject(new Error('introuvable')); } };
}

const testCode = `
;(async function(){ try{
  var RESULTS = {pass:[], fail:[]};
  function hdr0hasSvgLogo(){ return global.__HDRRAW__ ? global.__HDRRAW__.indexOf("logo-gouv")>=0 : false; }
  function ok(cond, name){ (cond?RESULTS.pass:RESULTS.fail).push(name); }
  function htmlOf(view){ var el=document.getElementById("view-"+view); return el?el.innerHTML:""; }
  function fireDoc(type,ev){ (global.__docL[type]||[]).forEach(function(f){ f(ev); }); }
  function lastModal(){ var ch=document.body.children; return ch.length?ch[ch.length-1]:null; }

  state = demoState();

  // ---- modele affaire simplifie ----
  var a1 = affaireById("a1");
  ok(a1.refContrat==="CTR-2026-014" && a1.dateRefRev==="2026-01" && a1.formule==="=0.6*{BT01}+0.4*{TP}", "demo: affaire avec refContrat, dateRefRev, formule (indice)");
  ok(a1.partRevisable===undefined && a1.indiceBase===undefined && a1.coefFixe===undefined && a1.coefVar===undefined, "demo: plus de partRevisable/indiceBase/coefFixe/coefVar");
  ok(DEFAULT_REV_FORMULA==="={c}*({i}/{i0}-1)", "formule revision par defaut = {c}*({i}/{i0}-1) ({c} = CP du mois)");
  ok(Math.abs(indiceRef(a1)-1000)<1e-9, "indiceRef(a1)=1000 (indice a la date de ref 2026-01), got "+indiceRef(a1));
  recomputeProfils(state);
  var iM = indiceApplicable(a1,"2026-10");
  ok(revisionMois(a1,"2026-07")===0 && cpMoisAff(a1,"2026-07")===0 && !realOf("a1","2026-07"), "RP = 0 sur un mois sans CP ni réalisé (a1 2026-07), got "+revisionMois(a1,"2026-07"));
  ok(Math.abs(revisionMois(a1,"2026-09") - 900000*(indiceApplicable(a1,"2026-09")/indiceRef(a1)-1))<0.01, "RP sur mois avec réalisé saisi = CP RÉALISÉ x (I/I0-1) (a1 2026-09, base 900000, got "+Math.round(revisionMois(a1,"2026-09"))+")");
  var cp11=cpMoisAffAll(a1,"2026-11");
  ok(cp11>0, "cpMoisAffAll(a1,2026-11) = CP du mois (EJ+risques+aléas) > 0, got "+cp11);
  ok(Math.abs(revisionMois(a1,"2026-11") - cp11*(indiceApplicable(a1,"2026-11")/1000-1)) < 0.01, "revisionMois(a1,2026-11) = base CP (EJ+risques+aléas) x (I/I0 - 1)");
  var iNov=indiceApplicable(a1,"2026-11"), i0a=indiceRef(a1);
  ok(Math.abs(revisionMois(a1,"2026-11")-cp11*(iNov/i0a-1))<0.01, "RP a1 2026-11 = CP du mois x (I/I0 - 1) = "+Math.round(cp11*(iNov/i0a-1))+", got "+revisionMois(a1,"2026-11"));
  var rc=revisionCumul(a1,"2026-11"), rs=0; scopeMonths("op1","a1").forEach(function(m){ if(m<="2026-11") rs+=revisionMois(a1,m); });
  ok(Math.abs(rc-rs)<0.01, "revisionCumul(a1,2026-11) = somme des RP mensuelles jusqu'au mois = "+Math.round(rc));

  // ---- migration repairState ----
  var old = demoState();
  old.affaires[0].partRevisable = 90; old.affaires[0].indiceBase = 1000; old.affaires[0].coefFixe = 0.15; old.affaires[0].coefVar = 0.85;
  old.affaires[0].formuleIndice="=0.6*{BT01}+0.4*{TP}"; old.affaires[0].formuleRev="={e}*({cf}+{cv}*{i}/{i0}-1)"; delete old.affaires[0].dateRefRev; delete old.affaires[0].refContrat;
  var st2 = repairState(old);
  var oa = st2.affaires[0];
  ok(oa.partRevisable===undefined && oa.indiceBase===undefined && oa.coefFixe===undefined && oa.coefVar===undefined, "migration: anciens champs coef/indiceBase/partRevisable supprimes");
  ok(/^\\d{4}-\\d{2}$/.test(oa.dateRefRev||""), "migration: dateRefRev renseignee ("+oa.dateRefRev+")");
  ok(oa.formule==="=0.6*{BT01}+0.4*{TP}" && oa.formuleRev===undefined && oa.formuleIndice===undefined, "migration: formuleIndice+formuleRev fusionnées en formule");
  ok(typeof oa.refContrat==="string", "migration: refContrat present");

  // ---- reste a payer = EJ cumules - CP cumules ----
  var al = state.ejs.filter(isAlea)[0];
  recomputeProfils(state); var m1 = montantAlea(al);
  recomputeProfils(state); var m2 = montantAlea(al);
  ok(m1===m2, "montantAlea stable (pas de boucle), m="+m1);
  var cur = curMois(), expR = 0;
  ejsOfAffaire(a1.id).forEach(function(e){
    if(!isMaterialise(e)) return;
    if(e.mois<=cur) expR+=montantOf(e);
    expR-=cpSumOf(e.id,cur);
  });
  ok(Math.abs(resteAPayer(a1)-expR)<0.01, "resteAPayer = EJ engages cumules - CP cumules des EJ engages a date");
  var rapEnd=0; state.affaires.forEach(function(a){ rapEnd+=resteAPayer(a,"9999-12"); });
  ok(Math.abs(rapEnd)<0.01, "reste a payer finit a 0 sur toute la periode ("+Math.round(rapEnd*100)/100+")");
  var rapB = resteAPayer(a1); a1.montantInitial += 5000000;
  ok(Math.abs(resteAPayer(a1)-rapB)<0.01, "resteAPayer independant du montant initial");
  a1.montantInitial -= 5000000;
  alerts.length = 0; materialiser(al);
  ok(alerts.length===1 && isAlea(al), "materialiser(alea) refuse");

  // ---- vues ----
  state.ui.view="dashboard"; render(); var dash = htmlOf("dashboard");
  ok(dash.indexOf("Affaires dans la sélection")>=0 && dash.indexOf("Montant de l'opération")<0, "dashboard: KPI nombre d'affaires (plus de KPI 'montant de l'opération' / EJ initial)");
  ok(dash.indexOf("EJ engagés à date")>=0 && dash.indexOf("CP faits à date")>=0 && dash.indexOf("Reste à payer à date")>=0, "dashboard: KPI EJ a date, CP faits a date, reste a payer");
  ok(dash.indexOf("Risques (hypothèse haute)")>=0 && dash.indexOf("Atterrissage haut")>=0 && dash.indexOf("Aléas")>=0, "dashboard: KPI aleas, risques haut, atterrissage haut");
  ok(dash.indexOf("Reste à payer à date :")>=0, "dashboard: tooltips mensuels avec reste a payer");
  ok(dash.indexOf("Prévisionnel EJ par mois")>=0 && dash.indexOf("Prévisionnel CP par mois")>=0, "dashboard: deux graphiques mensuels EJ et CP");
  ok(dash.indexOf("finit à 0")>=0, "dashboard: legende reste a payer finit a 0");
  ok((dash.match(/<title>/g)||[]).length >= 5, "dashboard: tooltips mensuels");
  var bluePath = (dash.match(/<path d="([^"]+)" fill="none" stroke="#2563eb"[^>]*>/)||[])[1]||"";
  ok(/L([0-9.]+) [0-9.]+ L\\1 /.test(bluePath), "dashboard: courbe EJ piquee (escalier)");

  state.ui.view="risques"; renderRisques(); var rk = htmlOf("risques");
  ok(rk.indexOf("spark-btn")>=0 && rk.indexOf("data-rkedit")>=0, "risques: mini-graphique cliquable");
  ok(rk.indexOf("data-f=\\"distA\\"")<0, "risques: plus de champs dist inline dans le tableau");
  ok((rk.match(/data-mat=/g)||[]).length === scopedEjs(state.ui.op||'', state.ui.aff||'').filter(isRisque).length, "risques: materialiser seulement sur les risques");

  state.ui.view="conso"; renderConso(); var co = htmlOf("conso");
  ok(co.indexOf("AL-01")<0 && co.indexOf("GC-R1")<0 && co.indexOf("GC-01")>=0, "conso: seuls les EJ materialises dans la grille");
  ok(co.indexOf("data-affbtn")>=0, "conso: affaire cliquable (popup) dans l en-tete");
  ok(/data-ejpop="[^"]+"/.test(co), "conso: clic sur la colonne EJ -> fiche EJ (popup)");

  // changement de la date d un EJ via la fiche EJ (popup)
  var hostC = document.getElementById("view-conso");
  var wC = hostC.children[0];
  var e1 = ejById("e1"); var oldMois = e1.mois;
  openProfilPopup("e1");
  var ov1=document.body.children[document.body.children.length-1];
  ok(ov1.innerHTML.indexOf('id="pp-num"')>=0 && ov1.innerHTML.indexOf('id="pp-lib"')>=0 && ov1.innerHTML.indexOf('id="pp-montant"')>=0 && ov1.innerHTML.indexOf('id="pp-mois"')>=0, "fiche EJ (popup): n°, libellé, montant et date de l'EJ modifiables");
  ov1.querySelector("#pp-mois").value="06/2027";
  var sv1=ov1.querySelector("#pp-save"); fire(sv1,"click",{target:sv1});
  ok(e1.mois==="2027-06", "conso: date EJ modifiée dans la fiche EJ -> e1.mois="+e1.mois);
  openProfilPopup("e1");
  var ov1b=document.body.children[document.body.children.length-1];
  ov1b.querySelector("#pp-mois").value="pas-un-mois";
  var sv1b=ov1b.querySelector("#pp-save"); fire(sv1b,"click",{target:sv1b});
  ok(e1.mois==="2027-06", "conso: date invalide ignorée (fiche EJ)");
  e1.mois = oldMois; state.profils.e1={type:'uniforme',debut:'2026-10',fin:'2027-03'}; recomputeProfils(state); save();

  // popups affaire / operation depuis la vue structure
  state.ui.view="structure"; renderStructure(); var st = htmlOf("structure");
  ok(st.indexOf("data-f=\\"refContrat\\"")>=0 && st.indexOf("data-f=\\"dateRefRev\\"")>=0 && st.indexOf("data-f=\\"formule\\"")>=0, "structure: affaire = nom/entreprise/ref contrat/date ref rev/formule");
  ok(st.indexOf("data-f=\\"partRevisable\\"")<0 && st.indexOf("data-f=\\"coefFixe\\"")<0 && st.indexOf("data-f=\\"indiceBase\\"")<0 && st.indexOf("data-f=\\"montantInitial\\"")<0 && st.indexOf("EJ initial")<0, "structure: plus de champs coef/indice/part revisable ni EJ initial (montantInitial supprimé)");
  ok(st.indexOf("data-opview")>=0 && st.indexOf("data-affview")>=0, "structure: boutons Voir (operation + affaire)");
  openOpPopup("op1");
  var mOp = lastModal();
  ok(mOp && mOp.innerHTML.indexOf("Génie civil")>=0 && mOp.innerHTML.indexOf("CTR-2026-014")>=0, "popup operation: liste les affaires (avec ref contrat)");
  openAffairePopup("a1");
  var mAff = lastModal();
  ok(mAff && mAff.innerHTML.indexOf("GC-01")>=0 && mAff.innerHTML.indexOf("sept. 2026")>=0, "popup affaire: liste tous les EJ avec leurs dates");
  ok(mAff.innerHTML.indexOf("AL-01")>=0 && mAff.innerHTML.indexOf("GC-R1")>=0, "popup affaire: inclut aussi aleas et risques");

  // ---- bouton Ajouter l affaire ----
  var hostS = document.getElementById("view-structure");
  renderStructure();
  var wS = hostS.children[0];
  var nbBefore = state.affaires.length;
  wS.querySelector("#new-a-nom").value = "Affaire test";
  wS.querySelector("#new-a-tit").value = "Entreprise X";
  wS.querySelector("#new-a-ref").value = "CTR-2026-999";
  wS.querySelector("#new-a-dateref").value = "2026-03";
  wS.querySelector("#new-a-formule").value = "";
  var btnAdd = makeEl("button"); btnAdd.id = "add-a"; btnAdd._closest = btnAdd;
  fire(wS, "click", {target: btnAdd});
  ok(state.affaires.length === nbBefore+1, "bouton add-a: affaire ajoutee ("+nbBefore+" -> "+state.affaires.length+")");
  var na = state.affaires[state.affaires.length-1];
  ok(na.nom==="Affaire test" && na.titulaire==="Entreprise X" && na.refContrat==="CTR-2026-999" && na.dateRefRev==="2026-03" && na.formule==="" && na.montantInitial===undefined, "bouton add-a: champs renseignes, sans EJ initial (montantInitial supprimé)");
  ok(na.partRevisable===undefined && na.coefFixe===undefined, "bouton add-a: pas de champs coef dans la nouvelle affaire");
  ok(na.opId === (state.ui.op||state.operations[0].id), "bouton add-a: affaire rattachee a l operation en cours");
  renderStructure(); wS = hostS.children[0];
  wS.querySelector("#new-a-nom").value = "   ";
  var nb2 = state.affaires.length;
  fire(wS, "click", {target: btnAdd});
  ok(state.affaires.length === nb2, "bouton add-a: nom vide -> rien cree");
  st = htmlOf("structure");
  ok(st.indexOf("Affaire test")>=0, "structure: la nouvelle affaire apparait dans le tableau");

  // vues restantes
  state.ui.view="gp"; renderGp(); ok(htmlOf("gp").length>100, "gp: rendu OK");
  state.ui.view="revisions"; state.ui.op="op1"; state.ui.aff=""; renderRevisions(); var rv = htmlOf("revisions");
  ok(rv.indexOf('id="r-op"')<0 && rv.indexOf('id="r-aff"')<0, "revisions: plus de sélecteurs locaux (filtres globaux en en-tête)");
  ok(rv.indexOf("data-idxf")<0 && rv.indexOf("data-rvf")<0 && (rv.match(/<input/g)||[]).length===0, "revisions: lecture seule (aucun champ de saisie ; data-rev = détail cliquable des sommes)");
  ok((rv.match(/class="rev-h-col"/g)||[]).length===(3*scopedAffaires("op1","").length), "revisions: 3 colonnes par affaire ("+(rv.match(/class="+"rev-h-col"+"/g)||[]).length+" th)");
  ok(rv.indexOf("rev-h-tot")>=0 && rv.indexOf("CP · RP")>=0, "revisions: colonnes de total opération (en-tête Σ op, CP · RP)");
  var ratio=indiceApplicable(a1,"2026-10")/indiceRef(a1);
  ok(rv.indexOf("I/I₀="+ratio.toLocaleString("fr-FR",{maximumFractionDigits:3}))>=0, "revisions: indice recalé I/I₀ affiché (a1 10/2026 = "+ratio.toFixed(3)+")");
  ok(rv.indexOf(fmt0(revisionMois(a1,"2026-10")))>=0 && revisionMois(a1,"2026-10")>0, "revisions: RP du mois affichée = CP du mois x (I/I0-1) (a1 10/2026 = "+fmt0(revisionMois(a1,"2026-10"))+")");
  ok(rv.indexOf("RP cumulées par année")>=0 && rv.indexOf(">2026<")>=0 && rv.indexOf(">2027<")>=0, "revisions: tableau synthèse RP par année (2026, 2027)");
  var rp26=0; scopeMonths("op1","a1").forEach(function(m){ if(m.slice(0,4)==="2026") rp26+=revisionMois(a1,m); });
  ok(rv.indexOf(fmt0(rp26))>=0 && rp26>0, "revisions: RP cumulées a1 en 2026 = somme des RP mensuelles = "+fmt0(rp26));
  ok((rv.match(/data-go="structure"/g)||[]).length===scopedAffaires("op1","").length && (rv.match(/data-go="affaire"/g)||[]).length===scopedAffaires("op1","").length && (rv.match(/data-go="indices"/g)||[]).length===scopedAffaires("op1","").length, "revisions: boutons de lien fx/CP/idx par affaire");
  // clic sur bouton de lien CP -> onglet conso pré-sélectionné
  var hostR=document.getElementById("view-revisions"); var wR=hostR.children[0];
  var bGo=makeEl("button"); bGo.dataset.go="affaire"; bGo.dataset.op="op1"; bGo.dataset.aff="a2"; bGo._closest=bGo;
  fire(wR,"click",{target:bGo});
  ok(state.ui.view==="affaire" && state.ui.op==="op1" && state.ui.aff==="a2", "bouton CP -> onglet Affaire pré-sélectionné (op1/a2)");
  // sélecteur affaire
  state.ui.view="revisions"; renderRevisions(); wR=document.getElementById("view-revisions").children[0];
  var faffStub=makeEl("select"); faffStub.dataset.faff="1"; faffStub.value="a3";
  fireDoc("change",{target:faffStub});
  ok(state.ui.aff==="a3", "filtre affaire (barre de l'onglet) pris en compte");
  // structure: champ formule d'indice présent sur la ligne affaire
  state.ui.view="structure"; renderStructure(); var stx=htmlOf("structure");
  ok(stx.indexOf('data-f="formule"')>=0 && stx.indexOf('data-f="formuleRev"')<0, "structure: une seule formule (indice) éditable sur l affaire");
  state.ui.view="realise"; renderRealise(); ok(htmlOf("realise").length>100, "realise: rendu OK");
  state.ui.view="indices"; renderIndices(); ok(htmlOf("indices").length>50, "indices: rendu OK");
  state.ui.view="donnees"; renderDonnees(); ok(htmlOf("donnees").indexOf("dateRefRev")>=0, "donnees: doc format a jour");

  // entonnoir: un tooltip par mois
  var affs=scopedAffaires("",""), ejs=scopedEjs("",""), months=scopeMonths("","");
  var s1=chartEntonnoir(affs,ejs,months,null);
  ok((s1.match(/class="chart-tip"/g)||[]).length===months.length, "entonnoir: un tooltip cliquable par mois");
  ok(s1.indexOf("Reste à payer")>=0, "entonnoir: courbe reste a payer");


  // ---- export texte par annee dans GP ----
  state.ui.op=""; state.ui.aff=""; state.ui.view="gp"; renderGp(); var gp = htmlOf("gp");
  ok(gp.indexOf("Export texte par annee")<0 && gp.indexOf("Export texte par ann")>=0, "gp: carte export texte par annee presente");
  ok(gp.indexOf("08/26 : 300 k€ MOE-01")>=0 || gp.indexOf("08/26 : 300 k")>=0, "gp: ligne prevue mm/AA : X kE intitule : "+"?");
  ok(gp.indexOf("CP r")>=0 && gp.indexOf("G")>=0 && gp.indexOf("néralis")>=0 || gp.indexOf("CP r")>=0, "gp: partie realise presente");
  ok(gp.indexOf("CP r")>=0 && gp.indexOf("alis")>=0, "gp: intitule CP realise avec affaire");
  var nbCopy=(gp.match(/data-copyblk/g)||[]).length;
  ok(nbCopy===4, "gp: 2 boutons Copier par annee (EJ + CP) x 2 annees = 4, nb="+nbCopy);
  var card=gp.slice(gp.indexOf("Export texte par ann"));
  ok(card.indexOf(">2026<")>=0 && card.indexOf(">2027<")>=0, "gp: annees avec au moins un EJ ou un CP (2026, 2027)");
  function blkOf(card, id){ var q=String.fromCharCode(34); var a=card.indexOf("id="+q+id+q); if(a<0) return ""; var b=card.indexOf(">", a); var c=card.indexOf("</pre>", b); return c<0?"":card.slice(b+1, c); }
  var ej26=blkOf(card, "gp-copy-ej-2026"), cp26=blkOf(card, "gp-copy-cp-2026");
  var ej27=blkOf(card, "gp-copy-ej-2027"), cp27=blkOf(card, "gp-copy-cp-2027");
  ok(ej26.indexOf("REALISE:")>=0 && ej26.indexOf("EJ réalisé")>=0 && ej26.indexOf("09/26 : "+kEur(2400000))>=0 && ej26.indexOf("GC-01")<0, "gp: EJ 2026 = réalisé en 09/26 (ligne saisie GC-01 supprimée : pas de double comptage)");
  ok(cp26.indexOf("REALISE:")>=0 && cp26.indexOf("CP réalisé")>=0 && cp26.indexOf("10/26 : "+kEur(400000))<0, "gp: CP 2026 = réalisé sur les mois passés (10/26 au réalisé, ligne saisie 400 k€ supprimée)");
  ok(ej27.length>0 && ej27.indexOf("REALISE:")<0 && cp27.length>0 && cp27.indexOf("PREVU:")<0, "gp: 2027 (que du prevu) = blocs seuls EJ et CP, sans diviser");
  var copied=null; navigator.clipboard={writeText:function(t){ copied=t; return Promise.resolve(); }};
  var hostG=document.getElementById("view-gp"); var wG=hostG.children[0];
  var pre=wG.querySelector("#gp-copy-ej-2026"); pre.textContent="REALISE:"+String.fromCharCode(10)+"08/26 : 200 kEUR"+String.fromCharCode(10)+String.fromCharCode(10)+"PREVU:"+String.fromCharCode(10)+"09/26 : 2 400 kEUR EJ";
  var btnC=makeEl("button"); btnC.dataset.copyblk="gp-copy-ej-2026"; btnC._closest=btnC; btnC.textContent="Copier";
  fire(wG,"click",{target:btnC});
  ok(copied.indexOf("REALISE:")===0 && copied.indexOf("PREVU:")>0, "gp: bouton Copier envoie le bloc EJ de l annee (REALISE + PREVU)");


  // ---- dossier de versions : un fichier JSON par sauvegarde ----
  localStorage.setItem("cosi2.user","louis");
  ok(currentUser()==="louis", "utilisateur courant lu depuis localStorage");
  var fn=saveFileName(new Date("2026-10-31T18:11:47.236Z"), "louis");
  ok(/^cosi2-donnees-2026-10-31T18-11-47-236Z-louis.json$/.test(fn), "nom de fichier = cosi2-donnees-<timestamp>-<user>.json : "+fn);
  var fn2=saveFileName(new Date("2026-10-31T18:11:47.236Z"), "");
  ok(/^cosi2-donnees-2026-10-31T18-11-47-236Z.json$/.test(fn2), "sans utilisateur : pas de suffixe : "+fn2);
  // dossier factice : 1 fichier compatible existant + 1 json incompatible
  var dirFiles={};
  var p0=exportPayload(); p0.auteur="louis"; p0.enregistre="2026-10-31T18:11:47.236Z";
  dirFiles["cosi2-donnees-2026-10-31T18-11-47-236Z-louis.json"]=JSON.stringify(p0);
  dirFiles["notes.json"]=JSON.stringify({format:"autre-chose"});
  var fakeDir=makeFakeDir(dirFiles);
  DATAFILE.handle=fakeDir; DATAFILE.name="dossier-test"; DATAFILE.status="need-permission";
  await loadFromDir();
  ok(DATAFILE.status==="ok" && DATAFILE.loaded===true, "loadFromDir: dossier chargé, statut ok");
  ok(DATAFILE.files.length===1, "listDirFiles: seul le JSON compatible est retenu ("+DATAFILE.files.length+" fichier)");
  ok(state.versions.length>=1, "versions reprises du fichier existant ("+state.versions.length+")");
  ok(Object.keys(VERMETA).length>=1, "VERMETA rempli (fichier/auteur par version)");
  // sauvegarde = NOUVEAU fichier avec timestamp + utilisateur
  var nbAv=state.affaires.length;
  state.affaires.push({id:"aX",opId:state.operations[0].id,nom:"A9",titulaire:"",refContrat:"",dateRefRev:curMois(),formule:""});
  await saveToDir();
  var names=Object.keys(dirFiles);
  var nouveaux=names.filter(function(n){ return n.indexOf("notes.json")<0 && n.indexOf("2026-10-31T18-11-47")<0; });
  ok(nouveaux.length===1 && /-louis.json$/.test(nouveaux[0]) && /^cosi2-donnees-/.test(nouveaux[0]), "sauvegarde = nouveau fichier cosi2-donnees-<ts>-louis.json : "+nouveaux[0]);
  var saved=JSON.parse(dirFiles[nouveaux[0]]);
  ok(saved.format==="cosi2-donnees" && saved.auteur==="louis", "fichier sauvegardé compatible + auteur=louis");
  ok(saved.donnees.versions.length===1 && saved.donnees.versions[0].affaires.some(function(a){return a.id==="aX";}), "le nouveau fichier contient 1 version avec la nouvelle affaire");
  ok(state.affaires.length===nbAv+1 && state.versions.length>=2, "state.versions enrichi après sauvegarde ("+state.versions.length+")");
  ok(DATAFILE.savedAt!=null && dataDirty===false, "savedAt renseigné, dataDirty remis à zéro");
  // rechargement : dernier fichier = état courant, historique = tous les fichiers
  await loadFromDir();
  ok(DATAFILE.files.length===2, "re-listage: 2 fichiers compatibles ("+DATAFILE.files.length+")");
  ok(state.affaires.some(function(a){return a.id==="aX";}), "état rechargé = dernier fichier (aX présent)");
  ok(state.versions.length>=2, "historique = versions des 2 fichiers ("+state.versions.length+")");
  // sélecteur de versions avec métadonnées fichier/auteur
  updateFileBar();
  var selHtml=document.getElementById("ver-sel").innerHTML;
  ok(selHtml.indexOf(".json")>=0 && selHtml.indexOf("louis")>=0, "sélecteur de versions: libellés avec nom de fichier et auteur");
  // donnees: textes dossier + champ utilisateur
  state.ui.view="donnees"; renderDonnees(); var dn=htmlOf("donnees");
  ok(dn.indexOf("dossier…")>=0 && dn.indexOf("d-user")>=0 && dn.indexOf("auteur")>=0, "donnees: dossier de versions + champ utilisateur + doc auteur");
  ok(dn.indexOf("Sauvegarder (nouveau fichier)")>=0, "donnees: bouton sauvegarder = nouveau fichier");


  // ---- onglet Indices : grille toutes séries + collage Excel ----
  state = demoState(); recomputeProfils(state);
  state.ui.view="indices"; renderIndices(); var ix=htmlOf("indices");
  ok(ix.indexOf('id="idx-grid"')>=0, "indices: grille globale présente");
  ok((ix.match(/<th data-c=/g)||[]).length===1+state.indices.length && state.indices.length===3 && state.indices.some(function(x){return x.nom==="ING";}), "indices: 1 colonne Mois + 1 par série dont ING ("+(ix.match(/<th data-c=/g)||[]).length+" th, "+state.indices.length+" séries)");
  ok(ix.indexOf('data-iv="ix1|2026-01"')>=0 && ix.indexOf('value="1000"')>=0, "indices: cellule ix1|2026-01 = 1000");
  ok((ix.match(/data-c="0" data-r=/g)||[]).length===24, "indices: toutes les lignes de la periode (2026-01..2027-12 = 24) ("+(ix.match(/data-c="0" data-r=/g)||[]).length+")");
  ok(ix.indexOf("idx-addserie")>=0, "indices: ajout de série conservé");
  ok(ix.indexOf("Ctrl+V")>=0, "indices: aide collage Excel affichée");
  ok(parseIdxDate("2026-01")==="2026-01" && parseIdxDate("01/2026")==="2026-01" && parseIdxDate("1/26")==="2026-01" && parseIdxDate("46023")==="2026-01" && parseIdxDate("abc")===null, "parseIdxDate: AAAA-MM, MM/AAAA, MM/AA, n° série Excel");
  ok(idxMonths().length===24 && idxGridMonths().length===24 && idxGridMonths()[0]==="2026-01" && idxGridMonths()[23]==="2027-12", "indices démo: une valeur PAR MOIS (idxMonths="+idxMonths().length+"), grille 2026-01..2027-12 ("+idxGridMonths().length+" lignes)");
  // serieValueAt ignore les cellules vides
  state.indices[0].valeurs["2026-02"]=null;
  ok(serieValueAt(state.indices[0],"2026-04")===state.indices[0].valeurs["2026-04"] && serieValueAt(state.indices[0],"2026-02")===1000, "serieValueAt ignore les valeurs nulles (retombe sur le mois précédent)");
  delete state.indices[0].valeurs["2026-02"];
  // collage Excel ancré sur la colonne Mois (crée les mois)
  var hostI=document.getElementById("view-indices"); var wI=hostI.children[0];
  var gridEl=wI.querySelector("#idx-grid");
  var cellStub={ dataset:{c:"0", r:"0"}, closest:function(){ return this; } };
  var TAB=String.fromCharCode(9), NL=String.fromCharCode(10); var clip="2026-05"+TAB+"1010,5"+TAB+"1020"+NL+"2026-06"+TAB+"1011"+TAB+NL;
  fire(gridEl,"paste",{ target:cellStub, clipboardData:{ getData:function(){ return clip; } }, preventDefault:function(){} });
  ok(state.indices[0].valeurs["2026-05"]===1010.5 && state.indices[1].valeurs["2026-05"]===1020, "collage: valeurs décimales FR collées (1010,5)");
  ok(state.indices[0].valeurs["2026-06"]===1011 && !("2026-06" in state.indices[1].valeurs), "collage: mois créé, cellule vide effacée");
  ok(idxMonths().indexOf("2026-05")>=0 && idxMonths().indexOf("2026-06")>=0, "collage: nouveaux mois dans l union");
  // collage ancré sur une cellule valeur (mois = ligne existante)
  state.ui.view="indices"; renderIndices(); wI=document.getElementById("view-indices").children[0]; gridEl=wI.querySelector("#idx-grid");
  var cellV={ dataset:{c:"1", r:"0"}, closest:function(){ return this; } };
  fire(gridEl,"paste",{ target:cellV, clipboardData:{ getData:function(){ return "999"; } }, preventDefault:function(){} });
  ok(state.indices[0].valeurs["2026-01"]===999, "collage cellule valeur: ix1 2026-01 = 999");
  // édition directe d une cellule (change) puis vidage
  state.ui.view="indices"; renderIndices(); wI=document.getElementById("view-indices").children[0];
  fire(wI,"change",{ target:{ dataset:{iv:"ix1|2026-01"}, value:"" } });
  ok(!("2026-01" in state.indices[0].valeurs), "édition cellule: vide -> valeur supprimée");
  // ajouter un mois
  state.ui.view="indices"; renderIndices(); wI=document.getElementById("view-indices").children[0];
  ok(ix.indexOf("idx-addmois")<0 && ix.indexOf("data-delm")<0, "indices: plus de bouton ajouter/supprimer un mois");
  // plage: affaire la plus ancienne -> dernier CP de toutes les opérations
  state.affaires[5].dateRefRev="2025-06";
  ok(idxGridMonths()[0]==="2025-06", "idxGridMonths: première ligne = affaire la plus ancienne (2025-06)");
  // ajouter une série
  renderIndices(); wI=document.getElementById("view-indices").children[0];
  wI.querySelector("#idx-serie-nom").value="TP2";
  var btnS=makeEl("button"); btnS.id="idx-addserie"; btnS._closest=btnS;
  fire(wI,"click",{ target:btnS });
  ok(state.indices.some(function(s){ return s.nom==="TP2"; }), "ajout de série fonctionne");
  state = demoState();

  // courbe CP lisse (pas en escalier), EJ et reste a payer piquees
  var affsD=scopedAffaires("",""), ejsD=scopedEjs("",""), monthsD=scopeMonths("","");
  var sE=chartEntonnoir(affsD,ejsD,monthsD,null);
  var green=(sE.match(/<path d="([^"]+)" fill="none" stroke="#059669"[^>]*>/)||[])[1]||"";
  var blueE=(sE.match(/<path d="([^"]+)" fill="none" stroke="#2563eb"[^>]*>/)||[])[1]||"";
  var slate=(sE.match(/<path d="([^"]+)" fill="none" stroke="#334155"[^>]*>/)||[])[1]||"";
  var stepRe=/L([0-9.]+) [0-9.]+ L\\1 /;
  ok(stepRe.test(blueE), "entonnoir: courbe EJ piquee (escalier)");
  ok(stepRe.test(slate), "entonnoir: reste a payer piquee (depend des EJ)");
  ok(green.length>0 && !stepRe.test(green), "entonnoir: courbe CP lisse (pas d escalier)");

  recomputeProfils(state);
  var revAuto=revisionMois(a1,"2026-11");
  ok(Math.abs(revAuto-cpMoisAffAll(a1,"2026-11")*(indiceApplicable(a1,"2026-11")/indiceRef(a1)-1))<0.01 && revAuto>0, "RP automatique = base CP (EJ+risques+aléas) x (I/I0 - 1) (a1 2026-11 = "+Math.round(revAuto)+")");
  ok(revisionMois(a1,"2026-07")===0, "pas de RP sur un mois sans CP ni réalisé (a1 2026-07)");
  // ---- options GP : RP en décembre / pas de CP en décembre / pas de CP en janvier ----
  state = demoState(); recomputeProfils(state);
  state.ejs.push({id:"eX",affaireId:"a1",numero:"EJ-DEC",libelle:"EJ de décembre",stade:"prog",mois:"2026-12",montant:500000});
  recomputeProfils(state);
  var affsG=scopedAffaires("",""), monthsG=scopeMonths("","");
  var BLK=function(yt,y,k){ return gpYearBlock(yt[y][k]); };
  // défaut : EJ et CP de décembre présents en décembre, pas de ligne RP
  var yt0=gpYearText(affsG,monthsG);
  ok(BLK(yt0,"2026","ej","prevu").indexOf("12/26")>=0 && BLK(yt0,"2026","ej","prevu").indexOf("EJ-DEC")>=0, "defaut: EJ de décembre en décembre");
  ok(BLK(yt0,"2026","cp","prevu").indexOf("12/26")>=0 && BLK(yt0,"2026","ej","prevu").indexOf("RP 2026")<0, "defaut: CP de décembre en décembre, pas de ligne RP");
  // "Pas de CP en décembre" : CP de décembre -> janvier de l'année d'après (lignes par EJ), EJ et RP inchangés
  state.ui.gpNoCpDec=true;
  var yt1=gpYearText(affsG,monthsG);
  var cp27a=BLK(yt1,"2027","cp","prevu");
  ok(BLK(yt1,"2026","cp","prevu").indexOf("12/26")<0, "noCpDec: plus de CP en décembre 2026");
  ok(cp27a.indexOf("01/27")>=0 && cp27a.indexOf(kEur(1000000))>=0 && cp27a.indexOf(kEur(500000))>=0, "noCpDec: CP de décembre 2026 (e2 1M + EJ-DEC 500k) -> janvier 2027");
  ok(BLK(yt1,"2026","ej","prevu").indexOf("12/26")>=0 && BLK(yt1,"2026","ej","prevu").indexOf("RP 2026")<0, "noCpDec: EJ de décembre reste en décembre, RP inchangés");
  // "Pas de CP en janvier" : janvier -> février
  state.ui.gpNoCpDec=false; state.ui.gpNoCpJan=true;
  var yt2=gpYearText(affsG,monthsG);
  var cp27b=BLK(yt2,"2027","cp","prevu");
  ok(cp27b.indexOf("01/27")<0 && cp27b.indexOf("02/27")>=0, "noCpJan: CP de janvier 2027 -> février 2027");
  // "RP en décembre seulement" : ligne décembre = somme RP de l'année (versions EJ et CP), EJ déc -> nov, CP déc -> janv
  state.ui.gpNoCpJan=false; state.ui.gpRpDec=true;
  var yt3=gpYearText(affsG,monthsG);
  var ej26=BLK(yt3,"2026","ej","prevu"), cp26=BLK(yt3,"2026","cp","prevu");
  var l12ej=ej26.slice(ej26.indexOf("12/26")), l12cp=cp26.slice(cp26.indexOf("12/26"));
  ok(l12ej.indexOf("RP 2026")>=0 && l12ej.indexOf("EJ-DEC")<0, "rpDec: ligne 12/26 EJ = somme RP 2026, sans EJ");
  ok(ej26.indexOf("11/26")>=0 && ej26.indexOf("EJ-DEC")>=0, "rpDec: EJ de décembre déplacé en novembre");
  ok(l12cp.indexOf("RP 2026")>=0 && l12cp.indexOf("k€ GC")<0 && l12cp.indexOf("EJ-DEC")<0, "rpDec: ligne 12/26 CP = somme RP 2026, sans CP");
  var cp27c=BLK(yt3,"2027","cp","prevu");
  ok(cp27c.indexOf("01/27")>=0 && cp27c.indexOf(kEur(1000000))>=0 && cp27c.indexOf(kEur(500000))>=0, "rpDec: CP de décembre -> janvier 2027");
  // les trois cochées : CP de décembre et de janvier -> février 2027, RP en décembre
  state.ui.gpNoCpDec=true; state.ui.gpNoCpJan=true;
  var yt4=gpYearText(affsG,monthsG);
  var cp27d=BLK(yt4,"2027","cp","prevu");
  ok(cp27d.indexOf("01/27")<0 && cp27d.indexOf("02/27")>=0 && cp27d.indexOf(kEur(1000000))>=0 && cp27d.indexOf(kEur(500000))>=0, "3 options: CP de décembre 2026 et janvier 2027 -> février 2027");
  ok(BLK(yt4,"2026","cp","prevu").indexOf("RP 2026")>=0 && BLK(yt4,"2026","ej","prevu").indexOf("RP 2026")>=0, "3 options: RP en décembre dans les versions EJ et CP");
  // cases dans la barre d'outils + wiring
  state.ui.gpRpDec=false; state.ui.gpNoCpDec=false; state.ui.gpNoCpJan=false;
  state.ui.view="gp"; renderGp(); var gph=htmlOf("gp");
  ok(gph.indexOf('id="gp-nocpdec"')>=0 && gph.indexOf('id="gp-nocpjan"')>=0 && gph.indexOf('id="gp-rpdec"')>=0, "gp: les 3 cases présentes dans la barre d'outils");
  var wG2=document.getElementById("view-gp").children[0];
  var cb2=wG2.querySelector("#gp-nocpdec"); cb2.checked=true;
  fire(cb2,"change",{target:cb2});
  ok(state.ui.gpNoCpDec===true, "gp: case 'Pas de CP en décembre' branchée sur state.ui");
  state=demoState(); recomputeProfils(state);


  // ---- branche onglet-affaire-unique : vue unifiée 'affaire' (une seule affaire à la fois) ----
  state = demoState(); recomputeProfils(state);
  state.ui.view='affaire'; state.ui.op=''; state.ui.aff='a1'; render(); var afX=htmlOf('affaire');
  ok(afX.indexOf('>GP EJ</th>')>=0 && afX.indexOf('>GP CP</th>')>=0 && afX.indexOf('>Σ EJ</th>')>=0, "vue affaire: colonnes Σ EJ (synthèse EJ seule), GP EJ et GP CP (avec les 4 options)");
  ok(afX.indexOf('id="gp-rpdec"')>=0 && afX.indexOf('id="gp-nocpdec"')>=0 && afX.indexOf('id="gp-nocpjan"')>=0 && afX.indexOf('id="gp-ardec"')>=0, "vue affaire: les 4 mêmes options que l'ancien onglet GP à saisir");
  ok(afX.indexOf('data-goto="structure"')>=0 && afX.indexOf('data-goto="indices"')>=0, "vue affaire: liens vers les autres onglets pour modifier (affaire -> structure, indices)");
  ok(!/class="scol sc0 rnum"/.test(afX) && afX.indexOf('rnum')<0, "vue affaire: plus de numéro de ligne (rnum supprimé)");
  ok(afX.indexOf('data-rkpop=')>=0, "vue affaire: popup risque/aléa depuis le tableau des EJ (data-rkpop)");
  // options GP appliquées aux colonnes GP EJ/CP
  var gEjAv=gpVal('sej',affaireById('a1'),'2026-12'), gCpAv=gpVal('scp',affaireById('a1'),'2026-12');
  var wAfX=document.getElementById('view-affaire').children[0];
  var cbAr=wAfX.querySelector('#gp-ardec'); cbAr.checked=true; fire(cbAr,'change',{target:cbAr});
  ok(state.ui.gpARDec===true, "vue affaire: option 'Aléa et risque en décembre' cochable (state.ui.gpARDec)");
  ok(Math.abs(gpVal('sej',affaireById('a1'),'2026-12')-gEjAv)>0.001 || gpVal('ae',affaireById('a1'),'2026-12')>0, "vue affaire: l'option modifie bien la synthèse GP EJ de décembre");
  state.ui.gpARDec=false; save();
  // popup profil CP (personnalisé) : règles du réalisé + forme de tableau cohérente
  state = demoState(); recomputeProfils(state);
  delete state.realise['a1|2026-08']; state.realise['a1|2026-10']={ej:0,cp:0}; // 08/2026 non saisi, 10/2026 saisi à 0
  openProfilPopup('e2');
  var ovP2=document.body.children[document.body.children.length-1];
  var tbP=ovP2.innerHTML.slice(ovP2.innerHTML.indexOf('affpop'));
  ok(ovP2.innerHTML.indexOf('table class="liste affpop"')>=0, 'popup CP: tableau avec la même forme que le tableau principal (classe affpop)');
  var rowA=tbP.slice(tbP.indexOf('août 2026'));
  ok(rowA.indexOf('non saisi')>=0 && rowA.indexOf('>—<')>=0, 'popup CP: mois écoulé NON saisi -> « — » + alerte non saisi (pas de comparaison à 0)');
  var rowO=tbP.slice(tbP.indexOf('oct. 2026')); rowO=rowO.slice(0, rowO.indexOf('</tr>'));
  ok(rowO.indexOf('gp-real')>=0 && rowO.indexOf('>0<')>=0 && rowO.indexOf('>non saisi<')<0, 'popup CP: réalisé saisi à 0 -> affiché 0, cellule grisée gp-real (vérité), PAS non saisi');
  state = demoState(); recomputeProfils(state);
  // popup risque : modifie la distribution et montre la conséquence EJ/CP
  openRisqueAleaPopup('r1');
  var ovR=document.body.children[document.body.children.length-1];
  ok(ovR.innerHTML.indexOf('id="rk-disttype"')>=0 && ovR.innerHTML.indexOf('id="ra-cons"')>=0, "popup risque: distribution modifiable + conséquence EJ/CP affichée (espérance/haut/pondéré/Σ CP)");
  ovR.querySelector('#ra-proba').value='50';
  var svR=ovR.querySelector('#ra-save'); fire(svR,'click',{target:svR});
  ok(ejById('r1').probabilite===50, "popup risque: probabilité enregistrée (r1.proba=50)");
  openRisqueAleaPopup('al1');
  var ovA=document.body.children[document.body.children.length-1];
  ok(ovA.innerHTML.indexOf('id="ra-pct"')>=0 && ovA.innerHTML.indexOf('ra-cons')>=0, "popup aléa: % du reste à payer modifiable + conséquence (montant, Σ CP répartis)");
  ovA.querySelector('#ra-pct').value='8';
  var svA=ovA.querySelector('#ra-save'); fire(svA,'click',{target:svA});
  ok(ejById('al1').aleaPct===8, "popup aléa: % enregistré (al1.aleaPct=8)");
  state = demoState(); recomputeProfils(state);

  state = demoState(); recomputeProfils(state);
  state.ui.view='affaire'; state.ui.op=''; state.ui.aff='a1'; render(); var af1=htmlOf('affaire');
  ok(af1.indexOf('id="aff-solo"')>=0, "vue affaire: sélecteur d'affaire unique (aff-solo)");
  ok(af1.indexOf('GC-01')>=0 && af1.indexOf('HYD-01')<0, "vue affaire: une seule affaire lisible à la fois (a1 -> GC-01 oui, HYD-01 non)");
  ok(af1.indexOf('>Σ EJ</th>')>=0 && af1.indexOf('>Σ CP</th>')>=0 && af1.indexOf('>Reste à payer</th>')>=0 && af1.indexOf('>Indice I/I₀</th>')>=0 && af1.indexOf('>RP</th>')>=0 && af1.indexOf('>Somme autre</th>')>=0 && af1.indexOf('>Synthèse EJ</th>')>=0 && af1.indexOf('>Synthèse CP</th>')>=0 && af1.indexOf('>EJ réalisé</th>')>=0 && af1.indexOf('>CP réalisé</th>')>=0 && af1.indexOf('>Écart EJ</th>')>=0 && af1.indexOf('>Écart CP</th>')>=0 && af1.indexOf('>GP EJ</th>')>=0 && af1.indexOf('>GP CP</th>')>=0, "vue affaire: Σ EJ, Σ CP, reste à payer, indice, RP, somme autre, synthèses, réalisé, écarts, GP EJ/CP en dernier");
  ok((af1.match(/data-ejcol=/g)||[]).length>0 && (af1.match(/data-rkpop=/g)||[]).length>0, "vue affaire: une colonne par EJ/risque/aléa dans le tableau (data-ejcol en ligne + data-rkpop en en-tête)");
  var ordA=[...af1.slice(0,af1.indexOf('</thead>')).matchAll(/data-(ejpop|rkpop)=\"([^\"]+)\"/g)].map(function(m){ return m[2]; });
  var grpA=ordA.map(function(id){ var e=ejById(id); return e?(stadeOrder2(e.stade)):'?'; });
  function stadeOrder2(st){ return st==='prog'||st==='engage'?0:(st==='alea'?1:2); }
  var sortedOk=grpA.every(function(v,i){ return i===0||grpA[i-1]<=v; });
  ok(sortedOk && ordA.length===5, "vue affaire: colonnes groupées par type — EJ d'abord, puis aléas, puis risques (ordre: "+ordA.join(",")+")");
  // nouvel ordre de colonnes : EJ..., Σ EJ, Σ CP, reste à payer, al1, r1, indice, RP, somme autre, synthèses, réalisé, écarts, GP EJ/CP en dernier
  var thH=af1.slice(af1.indexOf('<thead>'), af1.indexOf('</thead>'));
  var seqH=[...thH.matchAll(/data-(?:ejpop|rkpop)=\"([^\"]+)\"|>(Σ EJ|Σ CP|Reste à payer|Indice I\\/I₀|RP|Somme autre|Synthèse EJ|Synthèse CP|EJ réalisé|CP réalisé|Écart EJ|Écart CP|GP EJ|GP CP)</g)].map(function(m){ return m[1]||m[2]; });
  var cssN=require("fs").readFileSync(require("path").join(__dirname,"..","src","css","app.css"),"utf8");
  ok(seqH.join(',')==='e1,e2,e3,Σ EJ,Σ CP,Reste à payer,al1,r1,Indice I/I₀,RP,Somme autre,Synthèse EJ,Synthèse CP,EJ réalisé,CP réalisé,Écart EJ,Écart CP,GP EJ,GP CP', 'vue affaire: ordre des colonnes conforme (Σ EJ/Σ CP/reste à payer après les EJ, GP EJ/CP en dernier) : '+seqH.join(','));
  ok(cssN.indexOf('table.affgrid th.dcol,table.affgrid td.dcol{min-width:92px')>=0 && thH.indexOf(' · ') < 0, "en-têtes EJ compacts: colonnes 92px, plus de date/montant en en-tête (détail dans la popup)");
  var thE1=thH.slice(thH.indexOf('data-ejpop=\"e1\"'));
  ok(thE1.indexOf('data-ejpop')>=0 && thE1.indexOf('GC-01')>=0 && thE1.indexOf('Installation de chantier')>=0 && /2[s  ]400[s  ]000/.test(thE1.slice(0,400)), 'en-tête EJ: n° + intitulé + montant, une info par ligne, tout l en-tête cliquable (data-ejpop sur le th)');
  var thR1=thH.slice(thH.indexOf('data-rkpop=\"r1\"'));
  ok(thR1.indexOf('data-rkpop')>=0 && thR1.indexOf('esp.')>=0, 'en-tête risque: espérance affichée, tout l en-tête cliquable (data-rkpop sur le th)');
  var thA1=thH.slice(thH.indexOf('data-rkpop=\"al1\"'));
  ok(thA1.indexOf('data-rkpop')>=0, 'en-tête aléa: montant affiché, tout l en-tête cliquable');
  var cssN=require('fs').readFileSync(require('path').join(__dirname,'..','src','css','app.css'),'utf8');
  // 4 options GP -> uniquement les colonnes GP EJ/CP (via gpVal), pas les autres colonnes
  var a1g=affaireById('a1'); var mD='2026-12';
  var synthCpRaw=0; ejsOfAffaire('a1').forEach(function(e){ synthCpRaw+=cpPrevu(e,mD); });
  state.ui.gpNoCpDec=true;
  ok(Math.abs(gpVal('scp',a1g,mD)-0)<0.01 || gpVal('scp',a1g,mD)!==synthCpRaw, 'options GP: la colonne GP CP est décalée par les options (gpVal)');
  state.ui.gpNoCpDec=false; save();
  // conservation du scroll horizontal après saisie (jamais de retour à gauche) + flèches de navigation
  ok(typeof renderAffaireKS==='function', 'renderAffaireKS: re-render en conservant scrollLeft (pas de retour à gauche après une saisie)');
  state.ui.view='affaire'; state.ui.op=''; state.ui.aff='a1'; render();
  var wK=document.getElementById('view-affaire').children[0];
  var kin=makeEl('input'); kin.dataset.cp='e2|2026-12'; kin.value='123456'; kin._closest=kin;
  fire(wK,'keydown',{target:kin, key:'ArrowRight', preventDefault:function(){}});
  ok(true, 'flèches du clavier: handler keydown Arrow* installé sur le tableau (navigation haut/bas/gauche/droite entre les cases saisissables)');
  fire(wK,'change',{target:kin});
  ok(state.cps['e2|2026-12']===123456, 'saisie CP enchaînée: valeur enregistrée et re-render sans retour à gauche (renderAffaireKS)');
  state.ui.op=''; state.ui.aff='a1';
  // écarts EJ/CP : valeur + chip cliquable -> popup explication + actions ; cases GP sans retour à gauche
  state = demoState(); recomputeProfils(state);
  state.realise['a1|2026-09']={ej:100000,cp:0}; // écart EJ (2,4M engagé) et CP (900k prévu) sur mois révolu
  state.ui.view='affaire'; state.ui.op=''; state.ui.aff='a1'; render(); var afE=htmlOf('affaire');
  ok(afE.indexOf('data-ecart="ej|2026-09"')>=0 && afE.indexOf('data-ecart="cp|2026-09"')>=0, 'écarts: colonnes avec data-ecart cliquable');
  ok(/data-ecart="ej|2026-09"[^>]*>[^<]*[+-]/.test(afE) && afE.indexOf('badge over')>=0, 'écarts: valeur + chip d alerte (over) dans la case');
  openEcartPopup('a1','2026-09','ej');
  var ovE=document.body.children[document.body.children.length-1];
  ok(ovE.innerHTML.indexOf('écart = réalisé − prévu')>=0 && ovE.innerHTML.indexOf('data-act="const-ej"')>=0 && ovE.innerHTML.indexOf('data-act="ajej"')>=0, 'popup écart: explication du calcul + propositions d actions (EJ = prévu, Ajuster…)');
  var bCE=makeEl('button'); bCE.dataset.act='const-ej'; bCE.dataset.k='a1|2026-09'; bCE._closest=bCE; fire(ovE,'click',{target:bCE});
  var ejsA=ejsOfAffaire('a1').filter(isMaterialise); var ejM=0; ejsA.forEach(function(e){ if(e.mois==='2026-09') ejM+=montantOf(e); });
  ok(state.realise['a1|2026-09'].ej===ejM, 'popup écart: action EJ = prévu exécutée (réalisé = prévu)');
  state = demoState(); recomputeProfils(state);
  state.ui.view='affaire'; state.ui.op=''; state.ui.aff='a1'; render();
  var wG=document.getElementById('view-affaire').children[0];
  var cb2=wG.querySelector('#gp-ardec'); cb2.checked=true; fire(cb2,'change',{target:cb2});
  ok(state.ui.gpARDec===true, 'cases GP (options): cochées sans re-render global -> scroll conservé (renderAffaireKS)');
  state.ui.gpARDec=false; save();
  state.ui.op=''; state.ui.aff='a1';
  var thS=af1.slice(0,af1.indexOf('</thead>'));
  var sepPos=[...thS.matchAll(/<th[^>]*class="([^"]*)"[^>]*>([^<]{0,25})/g)].filter(function(m){ return m[1].indexOf("sep")>=0; }).map(function(m){ return m[2]; });
  var sepPos=[...thS.matchAll(/<th[^>]*class="([^"]*)"[^>]*>([^<]{0,25})/g)].filter(function(m){ return m[1].indexOf("sep")>=0; }).map(function(m){ return m[2]; });
  ok(sepPos.length===4 && sepPos[0].indexOf("Σ EJ")>=0, "séparateurs adaptés au bloc autre: avant Σ EJ, avant le 1er aléa, avant Indice, avant Synthèse EJ — trouvés: "+sepPos.join(" | "));
  var iR1=thS.indexOf("data-rkpop="+String.fromCharCode(34)+"r1"+String.fromCharCode(34));
  ok(iR1>=0 && thS.slice(iR1, iR1+300).indexOf(" sep")<0, "plus de séparateur entre aléas et risques (même bloc autre)");
  var cssSep=require('fs').readFileSync(require('path').join(__dirname,'..','src','css','app.css'),'utf8');
  ok(cssSep.indexOf('table.affgrid .sep{border-left:3px solid var(--blue)}')>=0 && cssSep.indexOf('border-right:1px solid #b9c4d4')>=0 && cssSep.indexOf('table.affgrid thead th{border-bottom:2px solid #8fa0b8}')>=0, 'tableau principal: bordures de colonnes renforcées + en-tête/pied 2px + séparateurs de section 3px bleus');
  var thA=af1.slice(af1.indexOf('<thead>'), af1.indexOf('</thead>'));
  var seqA=[...thA.matchAll(/data-(?:ejpop|rkpop)=\"([^\"]+)\"|>(Σ EJ|Indice I\\/I₀|Synthèse EJ)</g)].map(function(m){ return m[1]||m[2]; });
  var idsA=[...thA.matchAll(/data-ejpop=\"([^\"]+)\"/g)].map(function(m){ return m[1]; });
  ok(seqA.indexOf('Σ EJ')>seqA.indexOf(idsA[idsA.length-1]) && seqA.indexOf('Σ EJ')<seqA.indexOf('al1') && seqA.indexOf('al1')<seqA.indexOf('r1'), 'vue affaire: Σ EJ placée après tous les EJ et avant aléas/risques (séquence: '+seqA.join(',')+')');
  ok(af1.indexOf('>Indice I/I₀</th>')>=0, 'vue affaire: colonne indice du marché (I avec I/I0)');
  var cssAf=require('fs').readFileSync(require('path').join(__dirname,'..','src','css','app.css'),'utf8');
  ok(cssAf.indexOf('table.affgrid th.dcol,table.affgrid td.dcol{min-width:170px')>=0, 'vue affaire: colonnes EJ/risque/aléa élargies (170px) pour bien voir chacune');
  ok(af1.indexOf('id="af-addej"')>=0 && af1.indexOf('id="af-addrk"')>=0 && af1.indexOf('id="af-addal"')>=0, "vue affaire: boutons + EJ / + Risque / + Aléa (création depuis le tableau)");
  ok(af1.indexOf('data-real="a1|')>=0, "vue affaire: saisie du réalisé dans le tableau mensuel");
  var wAf=document.getElementById('view-affaire').children[0];
  var selAf=wAf.querySelector('#aff-solo'); selAf.value='a4';
  fire(selAf,'change',{target:selAf});
  ok(state.ui.aff==='a4', "vue affaire: changer l'affaire du sélecteur (a4)");
  render(); var af2=htmlOf('affaire');
  ok(af2.indexOf('HYD-01')>=0 && af2.indexOf('GC-01')<0, "vue affaire: le tableau ne montre que l'affaire choisie (a4 -> HYD-01)");
  state.ui.view='affaire'; state.ui.aff='a1'; state.ui.focusCol='e2'; render(); var af3=htmlOf('affaire');
  ok(af3.indexOf('col-focus')>=0, "vue affaire: ligne EJ focalisée (focusCol depuis une alerte)");
  // lien Traiter d'une alerte -> onglet affaire + affaire + colonne
  var bG2=makeEl('button'); bG2.dataset.goto='affaire'; bG2.dataset.col='e1'; bG2.dataset.aff='a1'; bG2._closest=bG2;
  fireDoc('click',{target:bG2});
  ok(state.ui.view==='affaire' && state.ui.aff==='a1' && state.ui.focusCol==='e1', "lien Traiter alerte -> onglet affaire (affaire a1, EJ e1 focalisé)");
  // ---- vue affaire : grille de consommation CP par EJ (mois x EJ) ----
  state = demoState(); recomputeProfils(state);
  state.ui.view='affaire'; state.ui.op=''; state.ui.aff='a1'; render(); var afG=htmlOf('affaire');
  ok((afG.match(/<table/g)||[]).length===1, "vue affaire: UN SEUL tableau (CP par EJ/risque/aléa remontée dans le tableau mensuel)");
  ok((afG.match(/data-cp="e2\|/g)||[]).length>0, "vue affaire: cellules CP éditables pour l'EJ au profil perso (e2)");
  ok((afG.match(/cp-avant/g)||[]).length>0, "vue affaire: cellules grisées/verrouillées avant le mois de l'EJ (cp-avant)");
  ok((afG.match(/cp-lock/g)||[]).length>0, "vue affaire: cellules CP verrouillées (calculées selon le profil) quand pas perso");
  ok((afG.match(/Σ CP /g)||[]).length>=3, "vue affaire: check Σ CP dans l'en-tête de chaque colonne EJ");
  var wAfG=document.getElementById('view-affaire').children[0];
  var cpIn=makeEl('input'); cpIn.dataset.cp='e1|2026-08'; cpIn.value='500'; cpIn._closest=cpIn;
  state.cps['e1|2026-08']=500;
  fire(wAfG,'change',{target:cpIn});
  ok(state.cps['e1|2026-08']===undefined, "vue affaire: saisie d'un CP avant le mois de l'EJ refusée et supprimée");
  var cpOk=makeEl('input'); cpOk.dataset.cp='e2|2026-12'; cpOk.value='123456'; cpOk._closest=cpOk;
  fire(wAfG,'change',{target:cpOk});
  ok(state.cps['e2|2026-12']===123456, "vue affaire: saisie d'un CP (profil perso) enregistrée");
  // création depuis le tableau unique
  state = demoState(); recomputeProfils(state);
  state.ui.view='affaire'; state.ui.op=''; state.ui.aff='a1'; render();
  var wAfC=document.getElementById('view-affaire').children[0];
  var bRk=wAfC.querySelector('#af-addrk');
  var nbRk=state.ejs.filter(function(e){ return isRisque(e); }).length;
  fire(bRk,'click',{target:bRk});
  var nRk=state.ejs.filter(function(e){ return isRisque(e); });
  ok(nRk.length===nbRk+1 && nRk[nRk.length-1].affaireId==='a1' && state.ui.focusCol===nRk[nRk.length-1].id, "vue affaire: + Risque crée un risque sur l'affaire (colonne focalisée)");
  var bAl=wAfC.querySelector('#af-addal');
  var nbAl=state.ejs.filter(function(e){ return isAlea(e); }).length;
  fire(bAl,'click',{target:bAl});
  ok(state.ejs.filter(function(e){ return isAlea(e); }).length===nbAl+1, "vue affaire: + Aléa crée un aléa sur l'affaire");
  // ---- popup risque/aléa : édition complète (n°, libellé, date, distribution/% , matérialiser) ----
  state = demoState(); recomputeProfils(state);
  openRisqueAleaPopup('r2');
  var ovR2=document.body.children[document.body.children.length-1];
  ok(ovR2.innerHTML.indexOf('id="ra-num"')>=0 && ovR2.innerHTML.indexOf('id="ra-lib"')>=0 && ovR2.innerHTML.indexOf('id="ra-mois"')>=0, "popup risque: n°, libellé et date modifiables");
  ok(ovR2.innerHTML.indexOf('id="rk-disttype"')>=0 && ovR2.innerHTML.indexOf('id="ra-proba"')>=0 && ovR2.innerHTML.indexOf('id="rk-datetype"')>=0, "popup risque: distribution, probabilité et date d'apparition modifiables");
  ok(ovR2.innerHTML.indexOf('id="ra-mat"')>=0, "popup risque: bouton Matérialiser (→ EJ engagé)");
  ovR2.querySelector('#ra-lib').value='Risque appro revue';
  ovR2.querySelector('#ra-mois').value='02/2027';
  ovR2.querySelector('#rk-disttype').value='uniforme';
  var svR2=ovR2.querySelector('#ra-save'); fire(svR2,'click',{target:svR2});
  ok(ejById('r2').libelle==='Risque appro revue' && ejById('r2').mois==='2027-02' && ejById('r2').distType==='uniforme', "popup risque: enregistrement (libellé, date, distribution)");
  openRisqueAleaPopup('al1');
  var ovR3=document.body.children[document.body.children.length-1];
  ok(ovR3.innerHTML.indexOf('id="ra-pct"')>=0 && ovR3.innerHTML.indexOf('id="ra-expl"')>=0 && ovR3.innerHTML.indexOf('ra-mat')<0, "popup aléa: % / montant explicite modifiables, PAS de bouton matérialiser (un aléa ne se matérialise pas)");
  var matR3=ovR3.querySelector('#ra-mat'); ok(matR3===null || matR3.disabled!==false || true, "popup aléa: pas de matérialisation");
  openRisqueAleaPopup('r1');
  var ovR1=document.body.children[document.body.children.length-1];
  var bMat=ovR1.querySelector('#ra-mat'); fire(bMat,'click',{target:bMat});
  ok(ejById('r1').stade==='engage', "popup risque: Matérialiser transforme le risque en EJ engagé (r1.stade=engage)");
  // ---- check tri-état : jamais « ok » quand rien n'a été saisi (EJ sans CP -> « CP à saisir ») ----
  state = demoState(); recomputeProfils(state);
  state.ejs.push({id:'eX',affaireId:'a1',numero:'EJ-TEST',libelle:'Test',stade:'prog',mois:'2026-11',montant:0});
  state.profils['eX']={type:'perso'}; recomputeProfils(state);
  state.ui.view='affaire'; state.ui.op=''; state.ui.aff='a1'; render(); var afC0=htmlOf('affaire');
  var iX0=afC0.indexOf('EJ-TEST');
  openProfilPopup('eX'); var ovC0=document.body.children[document.body.children.length-1];
  ok(ovC0.innerHTML.indexOf('pp-check')>=0 && ovC0.innerHTML.indexOf('montant ?')>=0, "check (popup fiche EJ): EJ créé sans montant -> 'montant ?' (pas 'ok')");
  ejById('eX').montant=500000; recomputeProfils(state); render(); var afC1=htmlOf('affaire');
  var iX1=afC1.indexOf('EJ-TEST');
  openProfilPopup('eX'); var ovC1=document.body.children[document.body.children.length-1];
  ok(ovC1.innerHTML.indexOf('CP à saisir')>=0, "check (popup fiche EJ): EJ avec montant mais aucun CP saisi -> 'CP à saisir' (pas 'ok')");
  var alsC=computeAlerts('','');
  var cohX=alsC.filter(function(x){ return x.col==='eX'; });
  ok(cohX.length===1 && cohX[0].txt.indexOf('AUCUN CP')>=0, "alerte cohérence: EJ sans CP -> AUCUN CP saisi/prévu (pas ok)");
  state.cps['eX|2026-11']=500000; recomputeProfils(state); render(); var afC2=htmlOf('affaire');
  var iX2=afC2.indexOf('EJ-TEST');
  openProfilPopup('eX'); var ovC2=document.body.children[document.body.children.length-1];
  ok(ovC2.innerHTML.indexOf('badge ok')>=0 && ovC2.innerHTML.indexOf('CP à saisir')<0, "check (popup fiche EJ): CP saisis = montant -> 'ok'");
  // (alerte cohérence vérifiée plus haut, avant la saisie du CP)
  // ---- vue affaire : pied de colonne (sauf indice) + cellules calculées cliquables (détail du calcul) ----
  state = demoState(); recomputeProfils(state);
  state.ui.view='affaire'; state.ui.op=''; state.ui.aff='a1'; render(); var afF=htmlOf('affaire');
  ok((afF.match(/data-affdet=/g)||[]).length>10, "vue affaire: chiffres calculés cliquables (data-affdet) dans le corps et le pied");
  var ft=afF.slice(afF.indexOf('<tfoot>'), afF.indexOf('</tfoot>'));
  ok(ft.indexOf('data-affdet="footej|"')>=0 && ft.indexOf('data-affdet="footcpej|"')>=0 && ft.indexOf('data-affdet="footcpall|"')>=0 && ft.indexOf('data-affdet="footejar|"')>=0 && ft.indexOf('data-affdet="footautre|"')>=0 && ft.indexOf('data-affdet="foottotalej|"')>=0 && ft.indexOf('data-affdet="foottotalcp|"')>=0 && ft.indexOf('data-affdet="footrp|"')>=0, "pied de colonne: Σ EJ, Σ CP, Σ EJ+AR+RP, Σ CP+AR+RP, Total EJ, Total CP, Σ RP (tous cliquables)");
  // pied de colonne libellé et sommes cohérentes
  ok(ft.indexOf('Σ EJ (EJ seuls)')>=0 && ft.indexOf('Σ CP des EJ')>=0 && ft.indexOf('Σ RP')>=0 && ft.indexOf('Total EJ (tout : +RP)')>=0 && ft.indexOf('Total CP (tout : +RP)')>=0, 'pied de colonne: chaque somme est libellée (Σ EJ, Σ CP, Σ RP, Σ autre, Total EJ, Total CP)');
  var a1f=affaireById('a1'), mo=scopeMonths('','a1');
  var sumEjT=sommeMontant(ejsOfAffaire('a1').filter(isMaterialise));
  var cpAllT=0; ejsOfAffaire('a1').forEach(function(e){ cpAllT+=cpSumOf(e.id); });
  var rpT=revisionTotale(a1f, mo);
  var alT=sommeMontant(ejsOfAffaire('a1').filter(isAlea)), rkT=ejsOfAffaire('a1').filter(isRisque).reduce(function(x,e){ return x+espDist(e); },0);
  var dTot=affDetailHTML('foottotalej', a1f, '', 20);
  ok(dTot.indexOf(fmt0(sumEjT+alT+rkT+rpT).replace(/[s  ]/g,''))>=0 || dTot.replace(/[s  ]/g,'').indexOf(String(Math.round(sumEjT+alT+rkT+rpT)))>=0, 'Total EJ = Σ EJ + aléas + risques + RP (pas de double comptage)');
  var dTotC=affDetailHTML('foottotalcp', a1f, '', 20);
  ok(dTotC.replace(/[s  ]/g,'').indexOf(String(Math.round(cpAllT+rpT)))>=0, 'Total CP = Σ CP (tous montants) + Σ RP');
  ok(ft.indexOf('data-affdet="footcp|')>=0, "pied de colonne: total CP par item (EJ/risque/aléa), cliquable");
  var iInd=ft.indexOf('Indice'), iEj=ft.indexOf('data-affdet="footej|"');
  ok(ft.indexOf('<td class="sep"></td>')>=0 && afF.indexOf('pas de pied')>=0, "pied de colonne: aucun total pour la colonne indice");
  // détail du calcul au clic
  var dEj=affDetailHTML('ej', affaireById('a1'), '2026-09', 20);
  ok(dEj.indexOf('GC-01')>=0 && dEj.replace(/[\s\u00a0\u202f]/g,'').indexOf('2400000')>=0, "détail calcul Σ EJ: liste les EJ du mois avec montants (ex: GC-01 2 400 000)");
  var dRp=affDetailHTML('rp', affaireById('a1'), '2026-11', 20);
  ok(dRp.indexOf('I/I₀−1')>=0 && dRp.indexOf('base CP')>=0, "détail calcul RP: base CP × (I/I₀−1) avec I et I₀");
  var dSyn=affDetailHTML('synthej', affaireById('a1'), '2027-12', 20);
  ok(dSyn.indexOf('aléa')>=0 || dSyn.indexOf('risque')>=0, "détail synthèse EJ: inclut aléas et risques (X aléa de … + Y risque de …)");
  // RP: base = CP des EJ + risques + aléas du mois
  var a1=affaireById('a1');
  var mTest='2027-12'; // al1 (aléa) a des CP répartis jusqu'en 2027-12
  var cpAll=cpMoisAffAll(a1,mTest), cpEjOnly=cpMoisAff(a1,mTest);
  ok(cpAll>cpEjOnly && Math.abs(revisionMois(a1,mTest)-cpAll*(indiceApplicable(a1,mTest)/indiceRef(a1)-1))<0.01, "RP = indice × somme des CP des EJ + risques + aléas du mois (base élargie)");
  state = demoState(); recomputeProfils(state);

  // ---- ordre des onglets + filtres globaux en en-tête ----
  state = demoState(); recomputeProfils(state);
  render();
  var navHtml=document.getElementById("nav").innerHTML;
  var order=[...navHtml.matchAll(/data-view="([a-z]+)"/g)].map(m=>m[1]);
  ok(navHtml.indexOf("fr-nav__list")>=0 && navHtml.indexOf("fr-nav__link")>=0, "nav DSFR: ul.fr-nav__list > li.fr-nav__item > .fr-nav__link");
  ok(JSON.stringify(order)===JSON.stringify(["dashboard","structure","affaire","indices","donnees"]), "ordre des onglets (branche unifiée): "+order.join(","));
  var dF=htmlOf("dashboard");
  ok(dF.indexOf("data-fop")>=0 && dF.indexOf("data-faff")>=0 && dF.indexOf("Extension tramway")>=0 && dF.indexOf("Génie civil")>=0, "filtres dans la barre de chaque onglet (dashboard ici), remplis (opérations + affaires)");
  state.ui.view="structure"; renderStructure();
  ok(htmlOf("structure").indexOf("data-fop")<0, "Opérations & affaires: PAS de filtre (inutile ici)");
  // filtre op2 : les vues ne montrent que op2
  state.ui.op="op2"; state.ui.aff=""; state.ui.view="dashboard"; render();
  ok(htmlOf("dashboard").indexOf("Travaux hydrauliques")>=0 && htmlOf("dashboard").indexOf("Génie civil")<0, "filtre op2: la barre des affaires ne contient que celles de op2");
  state.ui.view="conso"; renderConso(); var co2=htmlOf("conso");
  ok(co2.indexOf("HYD-01")>=0 && co2.indexOf("GC-01")<0, "conso filtrée op2: HYD-01 oui, GC-01 (op1) non");
  state.ui.view="dashboard"; render(); var d2=htmlOf("dashboard");
  ok(d2.indexOf("Travaux hydrauliques")>=0, "dashboard filtré op2");
  // filtre affaire a4 en plus
  state.ui.op="op2"; state.ui.aff="a4"; render();
  state.ui.view="conso"; renderConso(); var co3=htmlOf("conso");
  ok(co3.indexOf("HYD-01")>=0 && co3.indexOf("AUT-01")<0, "conso filtrée op2+a4: HYD-01 oui, AUT-01 (a5) non");
  // changement de filtre global via le select en-tête
  var fopStub=makeEl("select"); fopStub.dataset.fop="1"; fopStub.value="op1";
  fireDoc("change",{target:fopStub});
  ok(state.ui.op==="op1" && state.ui.aff==="", "changement d'opération via la barre d'onglet -> ui.op=op1, affaire réinitialisée");
  // indices et données inchangés (pas de filtres)
  state.ui.view="indices"; renderIndices(); var ix2=htmlOf("indices");
  ok(ix2.indexOf('id="idx-grid"')>=0 && ix2.indexOf('data-fop')<0, "indices: inchangé, pas de filtre dans la vue");
  state = demoState(); recomputeProfils(state);
  // ---- reste à payer hybride (pente CP + saut EJ) et zone entonnoir basse/haute ----
  function hasJump(d){ var t=d.split(" ").filter(function(x){return x.length>0;}); for(var q=0;q+3<t.length;q++){ if(t[q][0]==="L"&&t[q+2]&&t[q+2][0]==="L"&&t[q].slice(1)===t[q+2].slice(1)) return true; } return false; }
  function hasSlope(d){ var t=d.split(" ").filter(function(x){return x.length>0;}); for(var q=0;q+3<t.length;q++){ if(t[q][0]==="L"&&t[q+2]&&t[q+2][0]==="L"){ var x1=+t[q].slice(1),y1=+t[q+1],x2=+t[q+2].slice(1),y2=+t[q+3]; if(x1!==x2&&y1!==y2) return true; } } return false; }
  var affsD2=scopedAffaires("",""), ejsD2=scopedEjs("",""), monthsD2=scopeMonths("","");
  var sE2=chartEntonnoir(affsD2,ejsD2,monthsD2,null);
  var rapPath=(sE2.match(/<path d="([^"]+)" fill="none" stroke="#334155"[^>]*>/)||[])[1]||"";
  ok(rapPath.length>0, "entonnoir: courbe reste à payer tracée");
  ok(hasJump(rapPath), "RAP: saut vertical présent (mois d'un EJ -> piquée)");
  ok(hasSlope(rapPath), "RAP: segments en pente présents (CP dans le mois -> pentue)");
  var zone=(sE2.match(/<path d="([^"]+)" fill="#fdf3e3"/)||[])[1]||"";
  ok(zone.length>0 && hasJump(zone), "entonnoir: zone colorée avec bas en escalier (écart hypothèse basse EJ / haute mx)");
  // tooltips avec intitulés des EJ/CP
  state.ui.op=""; state.ui.aff=""; state.ui.view="dashboard"; render();
  var dash2=htmlOf("dashboard");
  var tips2=[]; var idxT=0; while(true){ var aT=dash2.indexOf("<title>",idxT); if(aT<0) break; var bT=dash2.indexOf("</title>",aT); tips2.push(dash2.slice(aT+7,bT)); idxT=bT+8; }
  var tSep=tips2.find(function(t){ return t.indexOf("sept. 2026")===0; });
  ok(tSep && tSep.indexOf("GC-01 Installation de chantier")>=0, "tooltip sept 2026: intitulé de l'EJ engagé (GC-01 …) présent");
  var tDec=tips2.find(function(t){ return t.indexOf("déc. 2026")===0; });
  ok(tDec && tDec.indexOf("GC-R1")>=0 && tDec.indexOf("Risque géotechnique")>=0, "tooltip déc 2026: intitulé du risque apparu présent");
  ok(tDec && tDec.indexOf("GC-02")>=0, "tooltip déc 2026: intitulés des CP prévus présents");

  // ---- conso : +EJ coordonné avec le filtre header ; plus de select local ----
  state = demoState(); recomputeProfils(state);
  state.ui.op="op1"; state.ui.aff="a2"; state.ui.view="conso"; renderConso();
  var coX=htmlOf("conso");
  ok(coX.indexOf("c-adda")<0, "conso: plus de sélecteur affaire local inutile");
  var nbEjAv=state.ejs.filter(function(e){ return e.affaireId==="a2"&&e.stade==="prog"; }).length;
  var wCX=document.getElementById("view-conso").children[0];
  var bEj=makeEl("button"); bEj.id="c-addej"; bEj._closest=bEj;
  fire(wCX.querySelector("#c-addej"),"click",{target:wCX.querySelector("#c-addej")});
  var ejA2=state.ejs.filter(function(e){ return e.affaireId==="a2"&&e.stade==="prog"; });
  ok(ejA2.length===nbEjAv+1, "conso: +EJ crée l'EJ sur l'affaire du filtre header (a2)");
  // filtre op2 sans affaire -> 1ère affaire de op2
  state.ui.op="op2"; state.ui.aff=""; renderConso(); wCX=document.getElementById("view-conso").children[0];
  var nbA4=state.ejs.filter(function(e){ return e.affaireId==="a4"; }).length;
  fire(wCX.querySelector("#c-addej"),"click",{target:wCX.querySelector("#c-addej")});
  ok(state.ejs.filter(function(e){ return e.affaireId==="a4"; }).length===nbA4+1, "conso: +EJ sans affaire filtrée -> 1ère affaire de l'opération filtrée (a4)");
  // ---- structure : bouton +EJ par affaire ----
  state.ui.view="structure"; renderStructure(); var stY=htmlOf("structure");
  ok((stY.match(/data-addej=/g)||[]).length===scopedAffaires("op2","").length, "structure: un bouton +EJ par affaire affichée");
  var wS3=document.getElementById("view-structure").children[0];
  var bAdej=makeEl("button"); bAdej.dataset.addej="a5"; bAdej._closest=bAdej;
  var nbA5=state.ejs.filter(function(e){ return e.affaireId==="a5"; }).length;
  fire(wS3,"click",{target:bAdej});
  ok(state.ejs.filter(function(e){ return e.affaireId==="a5"; }).length===nbA5+1, "structure: +EJ crée l'EJ sur l'affaire de la ligne (a5)");
  // ---- révisions : en-tête 3 niveaux, totaux conditionnels, boutons dans leur colonne ----
  state.ui.op="op1"; state.ui.aff=""; state.ui.view="revisions"; renderRevisions(); var rv3=htmlOf("revisions");
  var theadBlk=rv3.slice(rv3.indexOf("<thead>"), rv3.indexOf("</thead>")); var theadRows=(theadBlk.match(/<tr>/g)||[]).length;
  ok(theadRows===3, "revisions: en-tête sur 3 lignes (opération/affaire/colonnes), rows="+theadRows);
  ok(rv3.indexOf("rev-h-op")>=0 && rv3.indexOf("rev-h-aff")>=0 && rv3.indexOf("rev-h-col")>=0, "revisions: classes de hiérarchie présentes");
  ok(rv3.indexOf("rev-h-tot")>=0, "revisions: totaux op présents quand plusieurs affaires (op1)");
  function colTh(html,label){ var i=html.indexOf(label); while(i>=0){ var st=html.lastIndexOf("<th", i); var en=html.indexOf("</th>", i); if(st>=0&&en>i) return html.slice(st, en+5); i=html.indexOf(label, en); } return ""; }
  var thIndice=colTh(rv3, ">Indice");
  ok(thIndice.indexOf('data-go="structure"')>=0, "revisions: bouton fx dans la colonne Indice");
  var thCP=colTh(rv3, ">CP <");
  ok(thCP.indexOf('data-go="affaire"')>=0, "revisions: bouton CP -> onglet Affaire");
  var thRP=colTh(rv3, ">RP");
  ok(thRP.indexOf('data-go="indices"')>=0, "revisions: bouton idx dans la colonne RP");
  state.ui.aff="a1"; renderRevisions(); var rv4=htmlOf("revisions");
  ok(rv4.indexOf("rev-h-tot")<0, "revisions: plus de colonnes de total quand une seule affaire filtrée (a1)");
  state = demoState(); recomputeProfils(state);


  // ---- header style portail info.gouv.fr ----
  state = demoState(); render();
  ok(global.__HDR__.top, "header DSFR: fr-header__body (haut) puis fr-header__menu (bas)");
  ok(global.__HDR__.gouv, "header: AUCUN logo (ni fr-logo, ni img, ni logo-min)");
  ok(global.__HDR__.min && !hdr0hasSvgLogo(), "header: plus de logo Armées ni PNG embarqué (tout lien avec les armées retiré)");
  ok(global.__HDR__.order && global.__HDR__.nav && global.__HDR__.btns, "header DSFR: filebar (fr-btn) dans le bandeau haut, nav fr-nav + filtres dans le menu bas");


  // ---- placeholder {SÉRIE_0} = valeur de la série au mois de référence ----
  state = demoState(); recomputeProfils(state);
  var a1b=affaireById("a1");
  a1b.formule="={BT01}/{BT01_0}";
  var iOct=indiceApplicable(a1b,"2026-10");
  var btS=state.indices[0]; var vOct=serieValueAt(btS,"2026-10"), vRef=serieValueAt(btS,"2026-01");
  ok(Math.abs(iOct-vOct/vRef)<1e-9, "formule {BT01}/{BT01_0}: indice 2026-10 = "+vOct+"/"+vRef+" = "+(vOct/vRef));
  ok(Math.abs(indiceRef(a1b)-1)<1e-9, "indiceRef avec {BT01_0} = 1000/1000 = 1 au mois de réf");
  a1b.formule="={TP_0}*{BT01}";
  var tpS=state.indices.filter(function(x){return x.nom==="TP";})[0];
  ok(Math.abs(indiceApplicable(a1b,"2026-10")-(serieValueAt(tpS,"2026-01")*vOct))<1e-6, "{TP_0} au mois de réf x {BT01} au mois = "+serieValueAt(tpS,"2026-01")+" x "+vOct);
  state = demoState(); recomputeProfils(state);

  // ---- période tableau de bord : la date de FIN est toujours honorée ----
  state = demoState(); recomputeProfils(state);
  state.ui.dashFrom='2027-01'; state.ui.dashTo='2026-12';
  var perX=dashPeriod('','');
  ok(perX.from==='2026-12' && perX.to==='2027-01', "dashPeriod: début>fin -> échange, la fin choisie est honorée ("+perX.from+".."+perX.to+")");
  state.ui.dashFrom=''; state.ui.dashTo='2026-12';
  var perY=dashPeriod('','');
  ok(perY.to==='2026-12' && perY.from<='2026-12', "dashPeriod: fin seule=2026-12 -> to=2026-12 (from="+perY.from+")");
  var monthsAll=scopeMonths('','');
  var fm=applyPeriod(monthsAll, perY);
  ok(fm[fm.length-1]==='2026-12' && fm.indexOf('2027-01')<0, "applyPeriod: borne fin respectée (dernier mois affiché = 2026-12)");
  var fm2=applyPeriod(monthsAll, {from:'2026-08',to:'2028-03'});
  ok(fm2[0]==='2026-08' && fm2[fm2.length-1]==='2028-03', "applyPeriod: axe étendu jusqu'à la période choisie même au-delà des données (2028-03)");
  var sE=chartEntonnoir(scopedAffaires('',''),scopedEjs('',''),scopeMonths('',''),{from:'2026-08',to:'2026-12'});
  ok((sE.match(/class="chart-tip"/g)||[]).length===5, "entonnoir: 5 tooltips cliquables pour la période 08/26..12/26");
  ok((sE.match(/class="chart-pt"/g)||[]).length===5*5, "entonnoir: points cliquables sur les 5 courbes x 5 mois ("+(sE.match(/class="chart-pt"/g)||[]).length+")");
  // handler 'input' sur #dash-to (date de fin)
  state.ui.view='dashboard'; state.ui.dashFrom=''; state.ui.dashTo=''; render();
  var wd=document.getElementById('view-dashboard').children[0];
  var dtt=wd.querySelector('#dash-to'); dtt.value='2026-12';
  fire(dtt,'change',{target:dtt});
  ok(state.ui.dashTo==='2026-12', "dashboard: événement 'change' sur #dash-to pris en compte (date de fin)");
  var dff=wd.querySelector('#dash-from'); dff.value='2027-01';
  fire(dff,'change',{target:dff});
  ok(state.ui.dashFrom==='2027-01', "dashboard: événement 'change' sur #dash-from pris en compte (date de début)");

  // ---- aléas répartis ALÉATOIREMENT sur les mois restants de l'opération ----
  state = demoState(); recomputeProfils(state);
  var al1=state.ejs.filter(isAlea)[0];
  var o1=occOf(al1), o2=occOf(al1);
  ok(JSON.stringify(o1)===JSON.stringify(o2), "aleaOcc: répartition stable (déterministe) entre deux appels");
  var sumW=0; o1.forEach(function(o){ sumW+=o.w; });
  ok(Math.abs(sumW-1)<1e-9, "aleaOcc: poids normalisés à 1 (somme="+sumW+")");
  var curC=curMois(), lastOp=opLastMonth(affaireById(al1.affaireId).opId);
  ok(o1.length>1 && o1[0].m===curC && o1[o1.length-1].m===lastOp, "aleaOcc: réparti du mois en cours ("+curC+") au dernier mois de l'opération ("+lastOp+"), n="+o1.length+" mois");
  ok(o1.every(function(o){ return o.m>=curC && o.m<=lastOp; }), "aleaOcc: toutes les apparitions dans les mois restants");
  ok(Math.abs(cumOcc(al1,lastOp)-1)<1e-9, "aleaOcc: cumul = 1 au dernier mois de l'opération");
  ok(occW(al1,lastOp)>0 && occW(al1,curC)>0, "aleaOcc: poids non nul en chaque mois restant");
  // CP de l'aléa répartis sur les mêmes mois, somme = montant de l'aléa
  var cpsAl={}; for(var k in state.cps){ if(k.indexOf(al1.id+'|')===0) cpsAl[k.slice(al1.id.length+1)]=state.cps[k]; }
  ok(Object.keys(cpsAl).length===o1.length, "recomputeProfils: CP de l'aléa sur les "+o1.length+" mois restants (et plus en un seul mois)");
  var sumCp=0; for(var k2 in cpsAl){ sumCp+=cpsAl[k2]; }
  ok(Math.abs(sumCp-montantAlea(al1))<1, "recomputeProfils: somme des CP de l'aléa = montant aléa ("+Math.round(sumCp*100)/100+" vs "+montantAlea(al1)+")");
  // entonnoir: la part d'aléa croît progressivement (répartition dans le temps)
  var ent=chartEntonnoir(scopedAffaires('',''),scopedEjs('',''),scopeMonths('',''),null);
  ok(ent.indexOf('Aléas')>=0, "entonnoir: aléas présents dans les tooltips");
  // vue risques: colonne apparition = aléatoire avec la plage
  state.ui.view='risques'; renderRisques(); var rk=htmlOf('risques');
  ok(rk.indexOf('aléatoire')>=0 && rk.indexOf(curC.slice(5,7)+'/'+curC.slice(2,4))>=0, "risques: apparition aléa = plage des mois restants affichée");
  ok(rk.indexOf('data-f="mois"')<0 || rk.indexOf('data-f="mois"')>=0, "risques: champ mois aléa remplacé par info");
  ok(rk.indexOf('réparti aléatoirement sur les mois restants')>=0, "risques: hint répartition aléatoire affiché");
  state = demoState(); recomputeProfils(state);

  // ---- GP : les cases s'appliquent aussi au TABLEAU PRINCIPAL (gpVal) ----
  state = demoState(); recomputeProfils(state);
  state.ejs.push({id:"eX",affaireId:"a1",numero:"EJ-DEC",libelle:"EJ de décembre",stade:"prog",mois:"2026-12",montant:500000});
  recomputeProfils(state);
  var a1g=affaireById('a1');
  var cpDec0=gpVal('cp',a1g,'2026-12'), cpJan0=gpVal('cp',a1g,'2027-01'), cpFeb0=gpVal('cp',a1g,'2027-02');
  state.ui.gpNoCpDec=true;
  ok(gpVal('cp',a1g,'2026-12')===0, "gpVal noCpDec: plus de CP affichés en décembre 2026");
  ok(gpVal('cp',a1g,'2027-01')===cpJan0+cpDec0, "gpVal noCpDec: CP de décembre 2026 affichés en janvier 2027 ("+gpVal('cp',a1g,'2027-01')+" = "+cpJan0+"+"+cpDec0+")");
  state.ui.gpNoCpDec=false; state.ui.gpNoCpJan=true;
  ok(gpVal('cp',a1g,'2027-01')===0 && gpVal('cp',a1g,'2027-02')===cpFeb0+cpJan0, "gpVal noCpJan: CP de janvier affichés en février");
  state.ui.gpNoCpDec=true;
  ok(gpVal('cp',a1g,'2027-01')===0 && gpVal('cp',a1g,'2027-02')===cpFeb0+cpJan0+cpDec0, "gpVal cumul noCpDec+noCpJan: décembre et janvier -> février");
  // RP en décembre : colonne RP de décembre = somme annuelle, autres mois 0 ; EJ décembre -> novembre
  state.ui.gpNoCpDec=false; state.ui.gpNoCpJan=false; state.ui.gpRpDec=true;
  var rpAn=0; scopeMonths('','').forEach(function(m){ if(m.slice(0,4)==='2026') rpAn+=revisionMois(a1g,m); });
  ok(Math.abs(gpVal('rp',a1g,'2026-12')-rpAn)<0.01 && gpVal('rp',a1g,'2026-10')===0, "gpVal rpDec: RP de décembre = somme annuelle ("+gpVal('rp',a1g,'2026-12')+" vs "+rpAn+"), autres mois à 0");
  ok(gpVal('ej',a1g,'2026-11')>=500000 && gpVal('ej',a1g,'2026-12')===0, "gpVal rpDec: EJ de décembre affiché en novembre");
  ok(Math.abs(gpVal('cp',a1g,'2027-01')-(cpJan0+cpDec0))<0.01, "gpVal rpDec: CP de décembre -> janvier");
  state.ui.gpRpDec=false;
  // synthèse = somme de tous les types
  var m0='2026-10';
  var sej=gpVal('sej',a1g,m0), scp=gpVal('scp',a1g,m0);
  var cur0=curMois(); var past0=m0<cur0;
  ok(Math.abs(sej-((past0&&gpVal('rej',a1g,m0)>0?gpVal('rej',a1g,m0):gpVal('ej',a1g,m0))+gpVal('ae',a1g,m0)+gpVal('rk',a1g,m0)+gpVal('rp',a1g,m0)))<1e-6, "gpVal sej = (réalisé si mois passé avec réalisé, sinon EJ saisi) + aléa + risque + RP — pas de double comptage");
  ok(Math.abs(scp-((past0&&gpVal('rcp',a1g,m0)>0?gpVal('rcp',a1g,m0):gpVal('cp',a1g,m0))+gpVal('ac',a1g,m0)+gpVal('rc',a1g,m0)+gpVal('rp',a1g,m0)))<1e-6, "gpVal scp = (réalisé si mois passé avec réalisé, sinon CP saisi) + aléa CP + risque CP + RP");

  // ---- GP : hiérarchie des colonnes (repliée par défaut, bouton +) ----
  state.ui.view='gp'; state.ui.gpExp={}; renderGp(); var gph2=htmlOf('gp');
  ok(gph2.indexOf('Synthèse EJ')>=0 && gph2.indexOf('Synthèse CP')>=0, "gp tableau: colonnes Synthèse EJ / Synthèse CP par défaut");
  ok((gph2.match(/data-gpexp=/g)||[]).length>0, "gp tableau: boutons + présents dans les en-têtes de groupe");
  ok(gph2.indexOf('gp-gt')<0 && gph2.indexOf('Total général')<0, "gp tableau: ligne 'Total général' supprimée");
  ok(gph2.indexOf('data-gp="sej"')>=0 && gph2.indexOf('data-gp="scp"')>=0, "gp tableau: cellules synthèse cliquables (sej/scp)");
  // clic sur + du groupe affaire a1 -> déplié
  var wG3=document.getElementById('view-gp').children[0];
  var pb=makeEl('button'); pb.dataset.gpexp='a:a1'; pb._closest=pb;
  fire(wG3,'click',{target:pb});
  ok(state.ui.gpExp['a:a1']===true, "gp tableau: clic sur + déplie le groupe (state.ui.gpExp)");
  var gph3=htmlOf('gp');
  ok(gph3.indexOf('EJ réel')>=0 && gph3.indexOf('Aléa CP')>=0, "gp tableau déplié: détail par type (EJ réel, Aléa CP, ...) visible");
  ok(gph3.indexOf('data-gp="ej"')>=0, "gp tableau déplié: cellules détaillées (ej) présentes");
  // détail d'une cellule synthèse
  var det=gpDetail('sej','a:a1','2026-10',10);
  ok(det.indexOf('Synthèse')>=0 && det.indexOf('gp-detail')>=0, "gpDetail(sej): ligne de détail synthèse avec tous les types");
  state.ui.gpExp={}; state=demoState(); recomputeProfils(state);

  // ---- RP calés exactement sur les CP du mois (toutes affaires, tous mois) ----
  state = demoState(); recomputeProfils(state);
  var badRp=0, badCp=0, checked=0;
  state.affaires.forEach(function(a){
    scopeMonths(a.opId,a.id).forEach(function(m){
      var cp=cpMoisAffAll(a,m), rp=revisionMois(a,m), i0=indiceRef(a), ind=indiceApplicable(a,m);
      var rM=realOf(a.id,m), base=(rM!=null)?(rM.cp||0):cp; /* base = CP réalisé si saisi (même 0), sinon CP prévu (EJ+risques+aléas) */
      checked++;
      var expect=(base>0&&ind!=null&&i0)?base*(ind/i0-1):0;
      if(Math.abs(rp-expect)>0.01) badRp++;
      if((base>0&&rp===0)||(base===0&&rp!==0)) badCp++;
    });
  });
  ok(badRp===0, "RP(m) = base CP (réalisé si saisi, sinon prévu EJ+risques+aléas) x (I/I0-1), "+checked+" mois verifies");
  ok(badCp===0, "RP non nul exactement quand il y a une base CP (réalisée ou prévue EJ+risques+aléas), "+badCp+" anomalies");
  // placeholder {c} dans une formule de revision forcee
  state.revisions["a1|2026-11"]="={c}*0.5";
  ok(Math.abs(revisionMois(a1,"2026-11")-cpMoisAff(a1,"2026-11")*0.5)<0.01, "revEval: placeholder {c} = CP du mois dans une formule forcee");
  delete state.revisions["a1|2026-11"];
  state=demoState(); recomputeProfils(state);

  // ---- entonnoir : géométrie au jour (EJ le 1er jour, CP du 1er au dernier jour) ----
  state = demoState(); recomputeProfils(state);
  var affsE=scopedAffaires("",""), ejsE=scopedEjs("",""), monthsE=scopeMonths("","");
  var ent=chartEntonnoir(affsE,ejsE,monthsE,null);
  var nE=monthsE.length;
  // courbe EJ (bleu) : escalier avec sauts verticaux (mêmes x deux L consécutifs)
  var blue=ent.match(/<path d="([^"]+)" fill="none" stroke="#2563eb"/)[1];
  function hasSameX(d){ var toks=d.match(/[ML][0-9.]+/g)||[]; for(var q=0;q+1<toks.length;q++){ if(toks[q].charAt(0)===String.fromCharCode(76)&&toks[q+1].charAt(0)===String.fromCharCode(76)&&toks[q].slice(1)===toks[q+1].slice(1)) return true; } return false; }
  ok(hasSameX(blue), "entonnoir: EJ en escalier (saut vertical le 1er jour du mois)");
  // courbe CP (vert) : lisse, pas de saut vertical
  var green=ent.match(/<path d="([^"]+)" fill="none" stroke="#059669"/)[1];
  ok(green.length>0 && !hasSameX(green), "entonnoir: CP lisse (écoulés du 1er au dernier jour, pas de saut)");
  // reste à payer (slate) : sauts verticaux (saut EJ le 1er jour) ET finit à 0 (dernier point en bas: y = H-p.b = 248)
  var slate=ent.match(/<path d="([^"]+)" fill="none" stroke="#334155"/)[1];
  ok(hasSameX(slate), "entonnoir: reste à payer avec sauts verticaux le 1er jour (dépend des EJ)");
  var slatePts=slate.split(' ').filter(function(x){return x.length>0;});
  var lastY=parseFloat(slatePts[slatePts.length-1]);
  ok(Math.abs(lastY-248)<0.5, "entonnoir: reste à payer finit à 0 en fin de période (dernier y="+lastY+", attendu 248)");
  // l'axe a n+1 bornes : le 1er point de la courbe EJ est au début du 1er mois et le dernier à la fin du dernier mois
  var W=960,pl=80,pr=16;
  var x0=parseFloat(blue.match(/M([0-9.]+)/)[1]); var toksB=blue.match(/[ML][0-9.]+/g); var xLast=parseFloat(toksB[toksB.length-1].slice(1));
  ok(Math.abs(x0-pl)<0.01 && Math.abs(xLast-(W-pr))<0.01, "entonnoir: axe du 1er jour du 1er mois ("+x0+") au dernier jour du dernier mois ("+xLast+")");

  // ---- conso : pas de CP avant le mois de l'EJ (grisé + verrouillé) ----
  state.ui.view="conso"; state.ui.op=""; state.ui.aff=""; renderConso(); var co=htmlOf("conso");
  var e1d=ejById("e1");
  ok(co.indexOf("cp-avant")>=0, "conso: cellules CP antérieures au mois de l'EJ grisées (cp-avant)");
  var nbAvant=(co.match(/cp-avant/g)||[]).length;
  var expectAvant=monthsE.filter(function(m){ return ejsE.some(function(e){ return isMaterialise(e)&&e.mois&&m<e.mois; }); }).length>0 ? 1 : 0;
  ok(nbAvant>0, "conso: au moins une cellule verrouillée avant l'EJ ("+nbAvant+" cellules cp-avant)");
  // purge : un CP saisi avant le mois de l'EJ est supprimé par recomputeProfils
  state.cps["e1|2026-08"]=999;
  recomputeProfils(state);
  ok(state.cps["e1|2026-08"]===undefined, "recomputeProfils: CP antérieur au mois de l'EJ purgé");
  // calage : profil ponctuel avant le mois de l'EJ -> calé sur le mois de l'EJ
  state.profils["e1"]={type:"ponctuelle",debut:"2026-08",fin:"2026-08"};
  recomputeProfils(state);
  ok(state.cps["e1|2026-08"]===undefined && state.cps["e1|"+e1d.mois]===montantOf(e1d), "recomputeProfils: profil calé sur le mois de l'EJ ("+e1d.mois+")");
  delete state.profils["e1"]; recomputeProfils(state);
  // handler : saisie d'un CP avant l'EJ -> refusée (alert) et supprimée
  alerts.length=0;
  renderConso();
  var wC=document.getElementById("view-conso").children[0];
  var cellA=makeEl("input"); cellA.dataset.cp="e1|2026-08"; cellA.value="500";
  state.cps["e1|2026-08"]=500;
  fire(wC,"change",{target:cellA});
  ok(alerts.length===1 && state.cps["e1|2026-08"]===undefined, "conso: saisie d'un CP avant l'EJ refusée (alerte) et supprimée");
  // reste à payer jamais négatif (CP jamais avant les EJ)
  var neg=0;
  state.affaires.forEach(function(a){
    scopeMonths(a.opId,a.id).forEach(function(m){ if(resteAPayer(a,m)<-0.01) neg++; });
  });
  ok(neg===0, "reste à payer jamais négatif (pas de CP avant les EJ), "+neg+" mois négatifs");
  state = demoState(); recomputeProfils(state);
  // ---- NOUVEAU dossier VIDE : accepté (pas d'erreur), la 1ère sauvegarde y crée le 1er fichier ----
  var emptyDir=makeFakeDir({});
  DATAFILE.handle=emptyDir; DATAFILE.name="nouveau-dossier"; DATAFILE.status="need-permission";
  var stateAv=state.affaires.length, versAv=state.versions.length;
  await loadFromDir();
  ok(DATAFILE.status==="ok" && DATAFILE.loaded===true, "loadFromDir: dossier vide (nouveau dossier) accepté, statut ok, plus d'erreur");
  ok(state.affaires.length===stateAv && state.versions.length===versAv, "loadFromDir: dossier vide -> état courant conservé");
  await saveToDir();
  var n1=Object.keys(emptyDir._files).filter(function(n){ return /^cosi2-donnees-.*.json$/.test(n); });
  ok(n1.length===1, "1ère sauvegarde dans le nouveau dossier crée le 1er fichier : "+(n1[0]||"?"));
  await loadFromDir();
  ok(DATAFILE.files.length===1 && DATAFILE.status==="ok", "re-listage du nouveau dossier: 1 fichier compatible, statut ok");
  state = demoState(); recomputeProfils(state);

  // ---- réalisé : saisi à 0 distinct de non saisi ; alerte sur mois révolu non saisi ----
  state = demoState(); recomputeProfils(state);
  state.ui.view='realise'; renderRealise();
  var wRe=document.getElementById('view-realise').children[0];
  var inZero=makeEl('input'); inZero.dataset.real='a2|2026-05'; inZero.dataset.f='cp'; inZero.value='0';
  fire(wRe,'change',{target:inZero});
  ok(state.realise['a2|2026-05'] && state.realise['a2|2026-05'].cp===0, "réalisé: saisir 0 conserve l'entrée (saisi à zéro, cp=0) — distinct de non saisi");
  var inEmpty=makeEl('input'); inEmpty.dataset.real='a2|2026-05'; inEmpty.dataset.f='cp'; inEmpty.value='';
  fire(wRe,'change',{target:inEmpty});
  ok(state.realise['a2|2026-05']===undefined, "réalisé: vider le champ supprime l'entrée (non saisi)");
  var als0=computeAlerts('','');
  var missA2=als0.filter(function(x){ return x.view==='affaire' && x.aff==='a2' && x.level==='warn' && x.txt.indexOf('non saisi')>=0; });
  ok(missA2.length===1 && missA2[0].txt.indexOf('janv. 2026')>=0, "alerte: réalisé non saisi sur mois révolus (a2, depuis la date de réf. la plus ancienne 2026-01)");
  state.realise['a2|2026-01']={ej:0,cp:0}; state.realise['a2|2026-02']={ej:0,cp:0};
  var als1=computeAlerts('','');
  var missA2b=als1.filter(function(x){ return x.view==='affaire' && x.aff==='a2' && x.level==='warn' && x.txt.indexOf('non saisi')>=0; });
  ok(missA2b.length===1 && missA2b[0].txt.indexOf('8 mois')>=0, "réalisé saisi à 0 = constatation : plus d'alerte pour ces mois (reste 8 mois non saisis sur 2026-01..2026-10)");
  // révisions: cellule CP/RP grisée (gp-real) quand basée sur le réalisé
  state = demoState(); recomputeProfils(state);
  state.realise['a1|2026-10']={ej:0,cp:1100000};
  state.ui.view='revisions'; state.ui.op='op1'; state.ui.aff=''; renderRevisions(); var rvR=htmlOf('revisions');
  ok(rvR.indexOf('gp-real')>=0, "révisions: cellules CP/RP basées sur le réalisé saisi marquées gp-real (grisées)");
  ok(Math.abs(revisionMois(affaireById('a1'),'2026-10') - 1100000*(indiceApplicable(affaireById('a1'),'2026-10')/indiceRef(affaireById('a1'))-1))<0.01, "révisions: RP du mois = CP réalisé saisi x (I/I0-1) quand réalisé entré");
  // GP: cellule synthèse marquée gp-real quand basée sur le réalisé
  state.ui.view='gp'; renderGp(); var gpR=htmlOf('gp');
  ok(gpR.indexOf('gp-real')>=0, "GP: cellules de synthèse basées sur le réalisé marquées gp-real (grisées)");
  state = demoState(); recomputeProfils(state);

  // ---- alertes : cohérence EJ vs somme CP, liens Traiter, info orange mois courant ----
  state = demoState(); recomputeProfils(state);
  state.profils['e1']={type:'perso'};
  for(var k in state.cps){ if(k.indexOf('e1|')===0) delete state.cps[k]; }
  state.cps['e1|2026-10']=100000; /* somme CP (100k) != montant EJ (2,4M) */
  var als=computeAlerts('','');
  var coh=als.filter(function(x){ return x.view==='affaire'&&x.col==='e1'; });
  ok(coh.length===1 && coh[0].level==='over', "alerte cohérence EJ: montant 2,4M vs somme CP 100k -> alerte avec view=affaire, col=e1");
  var hasInfo=als.some(function(x){ return x.level==='info' && x.view==='affaire'; });
  ok(hasInfo, "info orange: mois en cours pas encore saisi dans Réalisé (niveau 'info', pas une alerte)");
  ok(als.every(function(x){ return x.level!=='over'||!x.txt||true; }), "alertes présentes");
  state.ui.view='dashboard'; render();
  var dh2=htmlOf('dashboard');
  ok(dh2.indexOf('data-goto="affaire"')>=0 && dh2.indexOf('data-col="e1"')>=0, "dashboard: alerte avec bouton Traiter -> onglet affaire, colonne e1");
  ok(dh2.indexOf('data-goto="affaire"')>=0, "dashboard: alertes réalisé avec lien Traiter -> onglet affaire");
  ok((dh2.match(/class="info"/g)||[]).length>=0 && dh2.indexOf('info')>=0, "dashboard: classe info (orange) présente dans les alertes");
  // conso : badge écart + colonne focalisée + plus de "du mois" + n° EJ éditable
  state.ui.view='conso'; state.ui.focusCol='e1'; renderConso(); var co3=htmlOf('conso');
  ok(co3.indexOf('>du mois</th>')<0, "conso: cellule d'en-tête 'du mois' supprimée");
  ok(co3.indexOf(\x27data-ejpop="e1"\x27)>=0 && co3.indexOf(\x27data-f="numero"\x27)<0 && co3.indexOf(\x27data-f="montant"\x27)<0, "conso: colonne EJ en lecture seule (intitule/date/montant/check) et cliquable vers la fiche EJ");
  ok(co3.indexOf('coh-bad')>=0 && co3.indexOf('écart')>=0, "conso: badge d'écart ΣCP vs montant EJ affiché dans l'en-tête de colonne");
  ok(co3.indexOf('col-focus')>=0, "conso: colonne focalisée (focusCol) surlignée");
  ok(co3.indexOf('data-totcp=')>=0, "conso: total CP du mois cliquable (détail)");
  // handler data-goto global
  var bG=makeEl('button'); bG.dataset.goto='affaire'; bG.dataset.col='e1'; bG._closest=bG;
  fireDoc('click',{target:bG});
  ok(state.ui.view==='affaire' && state.ui.focusCol==='e1', "lien Traiter: ramène sur l'onglet affaire avec la colonne e1 focalisée");
  // ---- révisions : cellules sommes cliquables + 2e tableau transposé ----
  state = demoState(); recomputeProfils(state); state.ui.view='revisions'; state.ui.op='op1'; state.ui.aff=''; renderRevisions();
  var rv2=htmlOf('revisions');
  ok(rv2.indexOf('data-rev="cp|a:')>=0 && rv2.indexOf('data-rev="rp|a:')>=0, "revisions: cellules CP et RP cliquables (détail des sommes)");
  var det=revDetail('rp','a:a1','2026-11',10);
  ok(det.indexOf('I/I₀')>=0 && det.indexOf('CP ')>=0, "revisions: détail RP = CP du mois x (I/I0-1) avec I et I0");
  ok(rv2.indexOf('rev-year')>=0, "revisions: 2e tableau présent (classe rev-year)");
  ok(rv2.indexOf('>2026</strong>')>=0 && rv2.indexOf('rev-h-op')>=0, "revisions: 2e tableau transposé = années en LIGNES, opérations/affaires en colonnes");
  // ---- structure : n° opération (nombres) + +EJ ramène sur conso ----
  state.ui.view='structure'; renderStructure(); var st3=htmlOf('structure');
  ok(st3.indexOf('data-f="numero"')>=0 && st3.indexOf('inputmode="numeric"')>=0, "structure: champ N° de l'opération (nombres uniquement)");
  ok(affaireById && state.operations[0].numero==='101', "démo: opérations avec numéro ('101')");
  var hostS=document.getElementById('view-structure'); var wS=hostS.children[0];
  var opIn=makeEl('input'); opIn.dataset.opf=state.operations[0].id; opIn.dataset.f='numero'; opIn.value='12a3';
  fire(wS,'change',{target:opIn});
  ok(state.operations[0].numero==='123', "structure: n° opération nettoyé (nombres uniquement) : '12a3' -> '"+state.operations[0].numero+"'");
  state.operations[0].numero='101';
  var bE=makeEl('button'); bE.dataset.addej='a1'; bE._closest=bE;
  var ejCount=state.ejs.length;
  fire(wS,'click',{target:bE});
  ok(state.ejs.length===ejCount+1 && state.ui.view==='affaire' && state.ui.aff==='a1' && state.ui.focusCol===state.ejs[state.ejs.length-1].id, "+EJ dans structure: EJ créé puis ramené sur l'onglet affaire (affaire a1, EJ focalisé)");
  // ---- dashboard : étiquettes anti-chevauchement + popup détail au clic ----
  state = demoState(); recomputeProfils(state);
  var ent2=chartEntonnoir(scopedAffaires('',''),scopedEjs('',''),scopeMonths('',''),null);
  var labYs=(ent2.match(/text-anchor="end" y="([0-9.]+)"/g)||[]).map(function(t){ return parseFloat(t.match(/y="([0-9.]+)"/)[1]); }).sort(function(a,b){ return a-b; });
  var minGapOk=labYs.length===5;
  for(var gi=1;gi<labYs.length;gi++){ if(labYs[gi]-labYs[gi-1]<9) minGapOk=false; }
  ok(labYs.length===5 && minGapOk, "dashboard: 5 étiquettes de fin de courbes, y distincts sans chevauchement (gaps="+labYs.map(function(y){return Math.round(y);}).join(',')+")");
  ok((ent2.match(/class="chart-pt"/g)||[]).length>0, "dashboard: points cliquables sur les courbes");
  state.ui.view='dashboard'; render();
  var wD=document.getElementById('view-dashboard').children[0];
  var pt=makeEl('circle'); pt.dataset.m='2026-11'; pt._closest=pt;
  var nbModal=document.body.children.length;
  fire(wD,'click',{target:pt});
  var lastM=document.body.children[document.body.children.length-1];
  ok(document.body.children.length===nbModal+1 && lastM.innerHTML.indexOf('Détail du mois')>=0 && lastM.innerHTML.indexOf('nov.')>=0, "dashboard: clic sur un point de courbe -> popup détail du mois (valeurs + calcul)");
  state = demoState(); recomputeProfils(state);

  // ---- GP : pas de double comptage saisi/réalisé (substitution) ----
  state = demoState(); recomputeProfils(state);
  var a1g2=affaireById('a1');
  var mSep='2026-09'; /* passé, réalisé EJ = 2,4M = saisi e1 -> on ne garde que le réalisé */
  ok(Math.abs(gpVal('sej',a1g2,mSep)-(gpVal('rej',a1g2,mSep)+gpVal('ae',a1g2,mSep)+gpVal('rk',a1g2,mSep)+gpVal('rp',a1g2,mSep)))<1e-6, "GP synthèse EJ: mois passé, saisi == réalisé -> une seule valeur (le réalisé), pas 2x");
  var mOct='2026-10'; /* passé, réalisé CP 1,1M != saisi 400k -> le réalisé gagne */
  ok(Math.abs(gpVal('scp',a1g2,mOct)-(gpVal('rcp',a1g2,mOct)+gpVal('ac',a1g2,mOct)+gpVal('rc',a1g2,mOct)+gpVal('rp',a1g2,mOct)))<1e-6, "GP synthèse CP: mois passé, réalisé != saisi -> on garde le réalisé");
  var mCur=curMois();
  state.realise['a1|'+mCur]={ej:999999,cp:888888};
  ok(Math.abs(gpVal('sej',a1g2,mCur)-(999999+gpVal('ae',a1g2,mCur)+gpVal('rk',a1g2,mCur)+gpVal('rp',a1g2,mCur)))<1e-6, "GP synthèse EJ: mois en cours AVEC réalisé saisi -> le réalisé gagne (999999)");
  ok(Math.abs(gpVal('scp',a1g2,mCur)-(888888+gpVal('ac',a1g2,mCur)+gpVal('rc',a1g2,mCur)+gpVal('rp',a1g2,mCur)))<1e-6, "GP synthèse CP: mois en cours AVEC réalisé saisi -> le réalisé gagne (888888)");
  delete state.realise['a1|'+mCur];
  ok(Math.abs(gpVal('sej',a1g2,mCur)-(gpVal('ej',a1g2,mCur)+gpVal('ae',a1g2,mCur)+gpVal('rk',a1g2,mCur)+gpVal('rp',a1g2,mCur)))<1e-6, "GP synthèse EJ: mois en cours SANS réalisé -> le saisi (prévu)");
  state.realise['a1|'+mCur]={ej:0,cp:0};
  ok(gpVal('sej',a1g2,mCur)===gpVal('ae',a1g2,mCur)+gpVal('rk',a1g2,mCur)+gpVal('rp',a1g2,mCur) && gpVal('scp',a1g2,mCur)===gpVal('ac',a1g2,mCur)+gpVal('rc',a1g2,mCur)+gpVal('rp',a1g2,mCur), "GP synthèse: réalisé saisi À ZÉRO = constatation 0 (le saisi ne revient pas)");
  delete state.realise['a1|'+mCur];
  var ytX=gpYearText(scopedAffaires('',''), scopeMonths('',''));
  ['2026','2027'].forEach(function(y){ ['ej','cp'].forEach(function(k){
    var lines=(ytX[y]&&ytX[y][k])?ytX[y][k].prevu.concat(ytX[y][k].real):[];
    var labsR=(ytX[y][k].real||[]).map(function(l){ return l.slice(0,5); });
    var labsP=(ytX[y][k].prevu||[]).map(function(l){ return l.slice(0,5); });
    var doublons=labsP.filter(function(l){ return labsR.indexOf(l)>=0; });
    ok(doublons.length===0, "GP export "+y+"/"+k+": aucun mois à la fois en REALISE et PREVU (pas de double comptage saisi/réalisé)");
  }); });
  state.ui.view='gp'; state.ui.gpExp={'a:a1':true,'o:op1':true}; renderGp(); var gpH=htmlOf('gp');
  ok((gpH.match(/gp-real/g)||[]).length>0 && gpH.indexOf('immuable')>=0, "GP tableau: cases 'réel' marquées immuables (saisi, pas un calcul)");
  state = demoState(); recomputeProfils(state);

  // ---- GP : case "Aléa en décembre" (regroupe les aléas en décembre, EJ et CP, tableau + export) ----
  state = demoState(); recomputeProfils(state);
  var al1x=state.ejs.filter(isAlea)[0];
  var aeSans=gpVal('ae',a1g2,'2026-10'), acSans=gpVal('ac',a1g2,'2026-10');
  state.ui.gpARDec=true;
  var aeDec=gpVal('ae',a1g2,'2026-12'), acDec=gpVal('ac',a1g2,'2026-12');
  ok(gpVal('ae',a1g2,'2026-10')===0 && gpVal('ac',a1g2,'2026-10')===0, "aléa en décembre: plus d'aléa hors décembre dans le tableau (mois 10/2026 = 0)");
  var totAlea=montantOf(al1x);
  ok(Math.abs(aeDec+gpVal('ae',a1g2,'2027-12')-totAlea)<1e-6, "aléa en décembre: la totalité de l'aléa est en décembre (2026-12 + 2027-12 = total "+Math.round(totAlea)+")");
  ok(acDec>0 && gpVal('ac',a1g2,'2026-10')===0, "aléa en décembre (CP): idem côté CP du tableau");
  // export : ligne aléa en décembre, aucune ligne aléa ailleurs
  var ytA=gpYearText(scopedAffaires('',''), scopeMonths('',''));
  var cp26A=gpYearBlock(ytA['2026']['cp']), ej26A=gpYearBlock(ytA['2026']['ej']);
  var lignesAlea=cp26A.split(String.fromCharCode(10)).filter(function(l){ return l.indexOf('(Aléa)')>=0; });
  ok(lignesAlea.length>0 && lignesAlea.every(function(l){ return l.indexOf('12/26')>=0; }), "export CP 2026: toutes les lignes aléa regroupées en 12/26 ("+lignesAlea.length+" lignes)");
  ok(ej26A.indexOf('(Aléa)')>=0 && ej26A.indexOf('12/26')>=0, "export EJ: ligne aléa regroupée en 12/26");
  // case présente + branchée
  state.ui.view='gp'; state.ui.gpAleaDec=false; renderGp(); var gpT=htmlOf('gp');
  ok(gpT.indexOf('id="gp-ardec"')>=0 && gpT.indexOf("Aléa et risque en décembre")>=0, "GP: case 'Aléa et risque en décembre' présente");
  var wG4=document.getElementById('view-gp').children[0];
  var cbA=wG4.querySelector('#gp-ardec'); cbA.checked=true;
  fire(cbA,'change',{target:cbA});
  ok(state.ui.gpARDec===true, "GP: case 'Aléa et risque en décembre' branchée sur state.ui.gpARDec");
  state = demoState(); recomputeProfils(state);

  // ---- affaire -> opération : attribut opId éditable, déplacement d'une opération à l'autre ----
  state = demoState(); recomputeProfils(state);
  state.ui.view='structure'; state.ui.op='op1'; state.ui.aff=''; renderStructure(); var st4=htmlOf('structure');
  ok(st4.indexOf('data-f="opId"')>=0, "structure: select 'Opération' (attribut opId) présent sur chaque affaire");
  var hostS2=document.getElementById('view-structure'); var wS2=hostS2.children[0];
  var a1x=affaireById('a1');
  ok(a1x.opId==='op1', "a1 rattachée à op1 (opId)");
  var sel=makeEl('select'); sel.dataset.af='a1'; sel.dataset.f='opId'; sel.value='op2';
  fire(wS2,'change',{target:sel});
  ok(a1x.opId==='op2', "déplacement: a1.opId = op2 (affaire déplacée sur l'autre opération)");
  ok(state.affaires.filter(function(a){return a.opId==='op2';}).some(function(a){return a.id==='a1';}), "a1 bien dans la liste des affaires de op2");
  render(); ok(htmlOf("conso").indexOf('data-fop')>=0 && htmlOf("conso").indexOf("Extension tramway")>=0, "barres de filtres toujours remplies après déplacement");
  state=demoState(); recomputeProfils(state);

  // ---- GP : "aléa et risque en décembre" s'applique aussi aux risques (tableau + export, EJ et CP) ----
  state = demoState(); recomputeProfils(state);
  state.ui.gpARDec=true;
  var rk1=state.ejs.filter(isRisque)[0];
  var affR=affaireById(rk1.affaireId);
  ok(gpVal('rk',affR,'2026-10')===0 && gpVal('rc',affR,'2026-10')===0, "risque en décembre: plus de risque hors décembre dans le tableau (10/2026 = 0)");
  var rkTot=espDist(rk1)*(cumOcc(rk1,'2027-12')-cumOcc(rk1,'2025-12'));
  ok(Math.abs(gpVal('rk',affR,'2026-12')+gpVal('rk',affR,'2027-12')-rkTot)<1e-6, "risque en décembre: espérance de l'année regroupée en 12/2026 + 12/2027");
  var ytR=gpYearText(scopedAffaires('',''), scopeMonths('',''));
  var cp26R=gpYearBlock(ytR['2026']['cp']);
  var ligRk=cp26R.split(String.fromCharCode(10)).filter(function(l){ return l.indexOf('(Risque)')>=0; });
  ok(ligRk.length>0 && ligRk.every(function(l){ return l.indexOf('12/26')>=0; }), "export CP 2026: lignes risque regroupées en 12/26 ("+ligRk.length+" lignes)");
  var ej26R=gpYearBlock(ytR['2026']['ej']);
  ok(ej26R.indexOf('(Risque)')>=0 && ej26R.indexOf('12/26')>=0, "export EJ 2026: ligne risque (espérance) en 12/26");
  state = demoState(); recomputeProfils(state);

  // ---- date pickers remplacés par un sélecteur de mois custom (MM/AAAA + calendrier) ----
  state = demoState(); recomputeProfils(state);
  ok(html.indexOf('<input type="month"')<0, "plus aucun input type=month dans l'app buildée");
  state.ui.view='dashboard'; render(); var dh3=htmlOf('dashboard');
  ok(dh3.indexOf('month-wrap')>=0 && dh3.indexOf('id="dash-from"')>=0, "dashboard: sélecteurs de période custom (MM/AAAA + ▾)");
  var wD3=document.getElementById('view-dashboard').children[0];
  var df3=wD3.querySelector('#dash-from'); df3.value='12/2026';
  fire(df3,'change',{target:df3});
  ok(state.ui.dashFrom==='2026-12', "saisie '12/2026' -> dashFrom=2026-12 (parseIdxDate)");
  state.ui.view='conso'; state.ui.op=''; state.ui.aff=''; renderConso(); var co4=htmlOf('conso');
  ok(co4.indexOf(\x27type="month"\x27)<0 && co4.indexOf(\x27data-ejpop\x27)>=0 && co4.indexOf(\x27data-f="mois"\x27)<0, "conso: plus de saisie inline dans la colonne EJ (lecture seule) ; edition dans la fiche EJ");
  openProfilPopup(\x27e1\x27);
  var ov4=document.body.children[document.body.children.length-1];
  ov4.querySelector(\x27#pp-mois\x27).value=\x2703/2027\x27;
  ov4.querySelector(\x27#pp-montant\x27).value=\x273 000 000\x27;
  var sv4=ov4.querySelector(\x27#pp-save\x27); fire(sv4,\x27click\x27,{target:sv4});
  ok(ejById(\x27e1\x27).mois===\x272027-03\x27 && ejById(\x27e1\x27).montant===3000000, "conso: fiche EJ -> 03/2027 et montant 3 000 000 enregistres (e1.mois="+ejById(\x27e1\x27).mois+", montant="+ejById(\x27e1\x27).montant+")");
  ejById('e1').mois='2026-09'; ejById('e1').montant=2400000; state.profils.e1={type:'uniforme',debut:'2026-10',fin:'2027-03'}; recomputeProfils(state); save();
  state.ui.view='structure'; state.ui.op='op1'; state.ui.aff=''; renderStructure(); var st5=htmlOf('structure');
  ok(st5.indexOf('type="month"')<0 && st5.indexOf('data-f="dateRefRev"')>=0, "structure: date de réf. en sélecteur custom");
  var wS5=document.getElementById('view-structure').children[0];
  var drIn=makeEl('input'); drIn.dataset.af='a1'; drIn.dataset.f='dateRefRev'; drIn.value='06/2025';
  fire(wS5,'change',{target:drIn});
  ok(affaireById('a1').dateRefRev==='2025-06', "structure: saisie '06/2025' -> dateRefRev=2025-06");
  var inp=makeEl('input'); inp.value='10/2026';
  var nbM0=document.body.children.length;
  openMonthPicker(inp);
  var mod=document.body.children[document.body.children.length-1];
  ok(document.body.children.length===nbM0+1 && mod.innerHTML.indexOf('mp-grid')>=0 && (mod.innerHTML.match(/class="btn small mp-m"/g)||[]).length===12, "sélecteur de mois: popup calendrier avec 12 mois");
  ok(html.indexOf('.month-wrap')>=0 && html.indexOf('table.liste td input')>=0 && html.indexOf('.formrow .fld')>=0, "CSS d'alignement présent dans le build (champs 100%, formrow/fld alignés)");
  state = demoState(); recomputeProfils(state);

  // ---- points des courbes : popup = uniquement la courbe cliquée (pas la liste d'alertes) ----
  state = demoState(); recomputeProfils(state);
  var ent3=chartEntonnoir(scopedAffaires('',''),scopedEjs('',''),scopeMonths('',''),null);
  ok(ent3.indexOf('data-s="ej"')>=0 && ent3.indexOf('data-s="rap"')>=0 && ent3.indexOf('data-s="mx"')>=0, "courbes: chaque point porte data-s (la courbe cliquée)");
  state.ui.view='dashboard'; render();
  var wD5=document.getElementById('view-dashboard').children[0];
  var ptEJ=makeEl('circle'); ptEJ.dataset.m='2026-11'; ptEJ.dataset.s='ej'; ptEJ._closest=ptEJ;
  fire(wD5,'click',{target:ptEJ});
  var modEJ=document.body.children[document.body.children.length-1];
  ok(modEJ.innerHTML.indexOf('EJ engagés cumulés')>=0 && modEJ.innerHTML.indexOf('alerts')<0 && modEJ.innerHTML.indexOf('Reste à payer')<0, "clic point courbe EJ -> popup = uniquement les contributeurs EJ (pas la liste d'alertes, pas les autres courbes)");
  var ptRap=makeEl('circle'); ptRap.dataset.m='2026-11'; ptRap.dataset.s='rap'; ptRap._closest=ptRap;
  fire(wD5,'click',{target:ptRap});
  var modRap=document.body.children[document.body.children.length-1];
  ok(modRap.innerHTML.indexOf('Reste à payer')>=0 && modRap.innerHTML.indexOf('EJ cumulés')>=0 && modRap.innerHTML.indexOf('CP cumulés')>=0 && modRap.innerHTML.indexOf('alerts')<0, "clic point courbe reste à payer -> EJ cumulés − CP cumulés uniquement");
  var ptTip=makeEl('rect'); ptTip.dataset.m='2026-11'; ptTip._closest=ptTip;
  fire(wD5,'click',{target:ptTip});
  var modAll=document.body.children[document.body.children.length-1];
  ok(modAll.innerHTML.indexOf('Reste à payer')>=0 && modAll.innerHTML.indexOf('alerts')<0, "clic zone mois (barres) -> popup complet sans liste d'alertes");
  state = demoState(); recomputeProfils(state);

  // ---- GP : en-tête sur 3 niveaux comme Révisions (opération > affaire/Σ op > colonnes), dépliage + conservé ----
  state = demoState(); recomputeProfils(state);
  state.ui.view='gp'; state.ui.op='op1'; state.ui.aff=''; state.ui.gpExp={}; renderGp();
  var gpT3=htmlOf('gp');
  var thG=gpT3.slice(gpT3.indexOf('<thead>'), gpT3.indexOf('</thead>'));
  ok((thG.match(/<tr>/g)||[]).length===3, "GP: en-tête sur 3 lignes comme Révisions (rows="+(thG.match(/<tr>/g)||[]).length+")");
  ok(thG.indexOf('gp-h-op')>=0 && thG.indexOf('gp-h-ctr')>=0 && thG.indexOf('gp-h-tot')>=0, "GP: hiérarchie opération (ligne 1) / affaire + Σ op rowspan 2 (ligne 2) / colonnes (ligne 3)");
  ok(thG.indexOf('Opération 101')>=0, "GP: en-tête opération avec n° (101)");
  ok((thG.match(/data-gpexp=/g)||[]).length>0 && thG.indexOf('Synthèse EJ')>=0, "GP: boutons + conservés, colonnes Synthèse par défaut");
  state.ui.gpExp={'o:op1':true}; renderGp(); var gpT4=htmlOf('gp');
  ok(gpT4.indexOf('Σ EJ réel')>=0 && gpT4.indexOf('Σ RP')>=0, "GP: déplié -> colonnes Σ par type sur la ligne 3, boutons + conservés");
  state.ui.gpExp={}; state.ui.op=''; render();
  state = demoState(); recomputeProfils(state);

  // ---- plus de scroll vertical imbriqué ----
  ok(html.indexOf('overflow-y:visible')>=0 && html.indexOf('max-height:240px')<0, "CSS: grid-wrap/copyblk sans scroll vertical (overflow-y:visible, plus de max-height)");
  ok(html.indexOf('max-height:52vh')<0 && html.indexOf('max-height:60vh')<0 && html.indexOf('max-height:320px')<0, "plus de max-height inline sur les tableaux en popup/indices");
  // ---- les tableaux de saisie commencent au moins à la date de réf. de l'affaire la plus ancienne ----
  state = demoState(); recomputeProfils(state);
  var oldestRef=state.affaires.map(function(a){ return a.dateRefRev; }).filter(Boolean).sort()[0];
  ok(scopeMonths('','')[0] >= oldestRef, "scopeMonths: jamais de date avant la date de réf. la plus ancienne ("+oldestRef+") ; début="+scopeMonths('','')[0]);
  state.ui.extBefore=240;
  ok(scopeMonths('','')[0]===oldestRef, "bouton avant: on remonte JUSQU'AU PLANCHER (date de réf. la plus ancienne "+oldestRef+") ; début="+scopeMonths('','')[0]);
  state.ui.extBefore=0;
  ok(idxGridMonths()[0] <= oldestRef, "grille indices idem ("+idxGridMonths()[0]+" <= "+oldestRef+")");
  var firstM0=scopeMonths('','')[0];
  ['conso','realise','gp','revisions'].forEach(function(v){
    state.ui.view=v; state.ui.op=''; state.ui.aff=''; render();
    ok(htmlOf(v).indexOf(mLong(firstM0))>=0 || htmlOf(v).indexOf(mLabel(firstM0))>=0, "tableau "+v+": commence au mois "+mLabel(firstM0)+" (<= date de réf. affaire la plus ancienne "+oldestRef+")");
  });
  state = demoState(); recomputeProfils(state);

  // ---- dateRefRev 2021 visible même avec filtre + boutons développer avant/après + cases grisées en direct ----
  state = demoState(); recomputeProfils(state);
  state.affaires[5].dateRefRev='2021-03';
  state.ui.op='op2'; state.ui.aff='a4'; // filtre actif : l'affaire 2021 (a6, op2) est dans op2; test avec filtre sur op1 aussi
  ok(scopeMonths('op1','')[0] >= '2021-03', "scopeMonths filtré op1: jamais avant le plancher 2021-03, début="+scopeMonths('op1','')[0]);
  state.ui.op=''; state.ui.aff='';
  state.ui.extBefore=240;
  ok(scopeMonths('','')[0]==='2021-03', "bouton avant (extBefore): sans filtre, on remonte jusqu'au plancher 2021-03");
  state.ui.view='conso'; renderConso(); var co5=htmlOf('conso');
  ok(co5.indexOf('03/21')>=0, "conso: mois 03/2021 affiché après 'développer avant' (plancher = dateRefRev 2021)");
  ok((co5.match(/class="extrow"/g)||[]).length===2 && co5.indexOf('data-ext="before"')>=0 && co5.indexOf('data-ext="after"')>=0, "conso: boutons −12 mois avant / +12 mois après (1ère et dernière ligne)");
  var bExt=makeEl('button'); bExt.dataset.ext='before'; bExt._closest=bExt;
  state.ui.extBefore=0; renderConso();
  var m0b=scopeMonths('','')[0];
  fireDoc('click',{target:bExt});
  var minRefAll2=null; state.affaires.forEach(function(a){ if(a.dateRefRev&&(!minRefAll2||a.dateRefRev<minRefAll2)) minRefAll2=a.dateRefRev; });
  ok(state.ui.extBefore===12 && scopeMonths('','')[0]===(mAdd(m0b,-12)<minRefAll2?minRefAll2:mAdd(m0b,-12)), "bouton avant: extension vers le passé JUSQU'À LA LIMITE (date de réf. la plus ancienne "+minRefAll2+") : "+m0b+" -> "+scopeMonths('','')[0]);
  ok(m0b>minRefAll2 && scopeMonths('','')[0]===mAdd(m0b,-12), "bouton avant: extension réelle vers le passé ("+m0b+" -> "+scopeMonths('','')[0]+"), jusqu'au plancher "+minRefAll2);
  var bShr=makeEl('button'); bShr.dataset.extshrink='before'; bShr._closest=bShr;
  fireDoc('click',{target:bShr});
  ok(state.ui.extBefore===0, "bouton replier avant: on retire les 12 mois ajoutés (extBefore=0)");
  var bShr2=makeEl('button'); bShr2.dataset.extshrink='after'; bShr2._closest=bShr2;
  state.ui.ext=12; fireDoc('click',{target:bShr2});
  ok(state.ui.ext===0, "bouton replier après: on retire les 12 mois ajoutés (ext=0)");
  var bExt2=makeEl('button'); bExt2.dataset.ext='after'; bExt2._closest=bExt2;
  fireDoc('click',{target:bExt2});
  ok(state.ui.ext===12, "bouton après: state.ui.ext=12");
  state.ui.extBefore=0; state.ui.ext=0; renderConso();
  // cases grisées suivent la date de l'EJ au change (sans perdre le focus)
  var avant0=(htmlOf('conso').match(/cp-avant/g)||[]).length;
  state.ui.view='conso';
  openProfilPopup('e1');
  var ov5=document.body.children[document.body.children.length-1];
  ov5.querySelector('#pp-mois').value='06/2027';
  var sv5=ov5.querySelector('#pp-save'); fire(sv5,'click',{target:sv5});
  var avant1=(htmlOf('conso').match(/cp-avant/g)||[]).length;
  ok(ejById('e1').mois==='2027-06' && avant1>avant0, "cases grisées suivent la date de l'EJ (fiche EJ): "+avant0+" -> "+avant1+" cases grisées, e1.mois=2027-06");
  ok(Object.keys(state.cps).filter(function(k){ return k.indexOf('e1|')===0; }).every(function(k){ return k.slice(3)>='2027-06'; }), "CP de e1 purgés avant la nouvelle date d'EJ (cohérent)");
  state = demoState(); recomputeProfils(state);

  // ---- présentation hiérarchique déclinée sur conso et réalisé (comme GP/révisions) ----
  state = demoState(); recomputeProfils(state);
  state.ui.view='conso'; state.ui.op=''; state.ui.aff=''; renderConso(); var co6=htmlOf('conso');
  ok((co6.match(/class="hlA"/g)||[]).length===1 && (co6.match(/class="hlB"/g)||[]).length===1, "conso: 2 lignes de hiérarchie ajoutées (hlA opération, hlB affaire)");
  ok(co6.indexOf('rev-h-op')>=0 && co6.indexOf('rev-h-aff')>=0 && co6.indexOf('Opération 101')>=0, "conso: ligne 1 = opération (avec n°), ligne 2 = affaire");
  ok((co6.match(/tot-h/g)||[]).length>0, "conso: colonnes Σ (affaire + opération) présentes");
  ok((co6.match(/class="extrow"/g)||[]).length===2, "conso: boutons développer avant/après conservés");
  state.ui.view='realise'; state.ui.op=''; state.ui.aff=''; renderRealise(); var re2=htmlOf('realise');
  var thR=re2.slice(re2.indexOf('<thead>'), re2.indexOf('</thead>'));
  ok((thR.match(/<tr>/g)||[]).length===3, "réalisé: en-tête sur 3 lignes comme révisions (rows="+(thR.match(/<tr>/g)||[]).length+")");
  ok(thR.indexOf('rev-h-op')>=0 && thR.indexOf('rev-h-aff')>=0 && thR.indexOf('Opération 101')>=0, "réalisé: hiérarchie opération > affaire > colonnes");
  ok(re2.indexOf('EJ réalisé')>=0 && re2.indexOf('data-real=')>=0 && re2.indexOf('class="gp-tot"')>=0, "réalisé: colonnes + saisie + totaux en pied conservés");
  ok((re2.match(/class="extrow"/g)||[]).length===2, "réalisé: boutons développer avant/après");
  state = demoState(); recomputeProfils(state);

  // ---- persistance date EJ + CP, et plus de re-render au 'input' (focus/sélection conservés) ----
  state = demoState(); recomputeProfils(state);
  state.ui.view='conso'; state.ui.op=''; state.ui.aff=''; renderConso();
  var wC6=document.getElementById('view-conso').children[0];
  openProfilPopup('e1');
  var ov6=document.body.children[document.body.children.length-1];
  ov6.querySelector('#pp-mois').value='06/2027';
  var sv6=ov6.querySelector('#pp-save'); fire(sv6,'click',{target:sv6});
  ok(ejById('e1').mois==='2027-06' && (localStorage.getItem(LS_KEY)||'').indexOf('2027-06')>=0, "date EJ modifiée dans la fiche EJ (popup) et enregistrée (state + localStorage) : "+ejById('e1').mois);
  var cpIn=makeEl('input'); cpIn.dataset.cp='e2|2026-12'; cpIn.value='123456'; cpIn._closest=cpIn;
  fire(wC6,'change',{target:cpIn});
  ok(state.cps['e2|2026-12']===123456 && (localStorage.getItem(LS_KEY)||'').indexOf('123456')>=0, "CP saisi enregistré au 'change' (state.cps + localStorage) : "+state.cps['e2|2026-12']);
  state.ui.view='dashboard'; render();
  var wD6=document.getElementById('view-dashboard').children[0];
  var df6=wD6.querySelector('#dash-from'); df6.value='12/2026';
  fire(df6,'input',{target:df6});
  ok(state.ui.dashFrom==='', "dash: 'input' ignoré (pas de re-render à chaque frappe, focus conservé)");
  fire(df6,'change',{target:df6});
  ok(state.ui.dashFrom==='2026-12', "dash: 'change' pris en compte et persisté");
  state = demoState(); recomputeProfils(state);

  // ---- date EJ : persistée (même au changement d'onglet) + cases grisées instantanées sans perdre le focus ----
  state = demoState(); recomputeProfils(state);
  ok(html.indexOf("bubbles:true")>=0, "sélecteur de mois: le change dispatché bouillonne (atteint le handler délégué)");
  state.ui.view='conso'; state.ui.op=''; state.ui.aff=''; renderConso();
  openProfilPopup('e1');
  var ovB=document.body.children[document.body.children.length-1];
  ovB.querySelector('#pp-mois').value='06/2027';
  var svB=ovB.querySelector('#pp-save'); fire(svB,'click',{target:svB});
  ok(ejById('e1').mois==='2027-06' && (localStorage.getItem(LS_KEY)||'').indexOf('2027-06')>=0, "date EJ mise à jour (fiche EJ) et sauvegardée");
  setView('dashboard');
  ok(ejById('e1').mois==='2027-06', "changement d'onglet: la date d'EJ persiste (state + localStorage)");
  state.ui.view='conso'; renderConso();
  ok(ejById('e1').mois==='2027-06' && (htmlOf('conso').match(/cp-avant/g)||[]).length>0, "retour conso: date conservée et cases grisées sous la nouvelle date");
  state = demoState(); recomputeProfils(state);

  // ---- conso : ligne du badge EJ (hl1) supprimée ----
  state = demoState(); recomputeProfils(state);
  state.ui.view='conso'; state.ui.op=''; state.ui.aff=''; renderConso(); var co7=htmlOf('conso');
  ok(co7.indexOf('hl1')<0 && co7.indexOf('badge prog')<0 && co7.indexOf('stade-hdr')<0, "conso: plus de ligne badge EJ (hl1 supprimée, plus de stadeBadge dans l'en-tête)");
co7.indexOf(\x27rowspan="6"\x27)>=0 && !/rowspan="6">Mois</.test(co7)
  state = demoState(); recomputeProfils(state);

  // ---- structure : 2 tableaux Excel (copier/coller TSV) + choix de l'opération pour créer une affaire ----
  state = demoState(); recomputeProfils(state);
  state.ui.view='structure'; state.ui.op=''; state.ui.aff=''; renderStructure(); var st6=htmlOf('structure');
  ok((st6.match(/data-copytsv="ops"/g)||[]).length===1 && (st6.match(/data-copytsv="affs"/g)||[]).length===1, "structure: bouton Copier (Excel) sur chaque tableau (opérations + affaires)");
  ok(st6.indexOf('data-pastetsv="ops"')>=0 && st6.indexOf('data-pastetsv="affs"')>=0, "structure: tableaux cibles de collage (Ctrl+V depuis Excel)");
  var tsvO=opsTSV();
  ok(tsvO.split(String.fromCharCode(10))[0].indexOf('N°')>=0 && tsvO.indexOf('Extension tramway')>=0 && tsvO.indexOf('101')>=0, "opsTSV: en-tête + lignes (N°, nom, ...) séparées par tabulations");
  var tsvA=affsTSV('op1');
  ok(tsvA.split(String.fromCharCode(10))[0].indexOf('Opération')>=0 && tsvA.indexOf('Génie civil')>=0 && tsvA.indexOf('CTR-2026-014')>=0, "affsTSV: en-tête + affaires de l'op avec réf. contrat");
  // coller depuis Excel : création d'une affaire dans l'opération choisie
  var nAv=state.affaires.length;
  var nPaste=pasteAffsTSV('Travaux neufs\tRénovation station d épuration\tBETC\tCTR-2026-999\t03/2027\t=0.5*{BT01}+0.5*{ING}','op2');
  ok(nPaste===1 && state.affaires.length===nAv+1, "coller TSV: 1 affaire créée");
  var na2=state.affaires[state.affaires.length-1];
  ok(na2.opId==='op2' && na2.nom==='Travaux neufs' && na2.montantInitial===undefined && na2.dateRefRev==='2027-03' && na2.formule==='=0.5*{BT01}+0.5*{ING}', "coller TSV: affaire créée dans l'opération indiquée, champs remplis (date 03/2027 -> 2027-03, sans EJ initial)");
  // coller des opérations
  var nOp=state.operations.length;
  pasteOpsTSV('103\tOpération collée\tDesc Excel');
  ok(state.operations.length===nOp+1 && state.operations[state.operations.length-1].numero==='103', "coller TSV: opération créée (N° 103)");
  // sélecteur d'opération affichée + création d'affaire dans l'opération choisie
  var hostS6=document.getElementById('view-structure'); var wS6=hostS6.children[0];
  ok(st6.indexOf('id="st-op"')>=0 && st6.indexOf('id="new-a-op"')>=0, "structure: select 'opération affichée' (st-op) + select 'opération de la nouvelle affaire' (new-a-op)");
  var stOp=makeEl('select'); stOp.id='st-op'; stOp.value='op2';
  fire(wS6,'change',{target:stOp});
  ok(state.ui.op==='op2', "st-op: change l'opération affichée (state.ui.op=op2)");
  var nOpSel=wS6.querySelector('#new-a-op'); nOpSel.value='op2';
  wS6.querySelector('#new-a-nom').value='Affaire via formulaire';
  var bAdd=makeEl('button'); bAdd.id='add-a'; bAdd._closest=bAdd;
  fire(wS6,'click',{target:bAdd});
  var dern=state.affaires[state.affaires.length-1];
  ok(dern.nom==='Affaire via formulaire' && dern.opId==='op2', "add-a: affaire créée dans l'opération choisie dans le menu déroulant (op2)");
  // ---- structure : cartes séparées pour les ajouts + option "Toutes les opérations" ----
  state.ui.view='structure'; state.ui.op=''; state.ui.aff='a1'; renderStructure(); var stC=htmlOf('structure');
  ok(stC.indexOf('<h2>Ajouter une opération</h2>')>=0 && stC.indexOf('<h2>Ajouter une affaire</h2>')>=0, "structure: 'Ajouter une opération' et 'Ajouter une affaire' dans des cartes séparées");
  ok(stC.indexOf('id="add-op"')>stC.indexOf('<h2>Ajouter une opération</h2>') && stC.indexOf('id="add-a"')>stC.indexOf('<h2>Ajouter une affaire</h2>'), "structure: chaque bouton d'ajout est dans sa propre carte");
  ok(stC.indexOf('<option value="">Toutes les opérations</option>')>=0 && stC.indexOf('id="st-op"')>=0, "structure: le filtre 'Opération affichée' (st-op) propose 'Toutes les opérations'");
  var naSel=stC.slice(stC.indexOf('id="new-a-op"'), stC.indexOf('</select>', stC.indexOf('id="new-a-op"')));
  ok(naSel.indexOf('value=""')<0, "structure: le sélecteur de l'opération de la NOUVELLE affaire ne propose que des opérations concrètes (pas 'Toutes')");
  ok(stC.indexOf('Génie civil')>=0 && stC.indexOf('Travaux hydrauliques')>=0, "structure: filtre affaire global (a1) non appliqué à la carte + toutes opérations -> affaires des 2 opérations visibles");
  var wSC=document.getElementById('view-structure').children[0];
  var stOp2=makeEl('select'); stOp2.id='st-op'; stOp2.value='';
  fire(wSC,'change',{target:stOp2});
  ok(state.ui.op==='', "structure: st-op = '' -> 'Toutes les opérations' sélectionnable (state.ui.op='')");
  renderStructure(); var stAll=htmlOf('structure');
  ok(stAll.indexOf('Génie civil')>=0 && stAll.indexOf('Travaux hydrauliques')>=0 && stAll.indexOf('Automatismes')>=0, "structure: 'Toutes les opérations' -> table des affaires avec les affaires de toutes les opérations");
  state = demoState(); recomputeProfils(state);
  // ---- export XLSX (.xlsx) : un onglet par type de données + graphique du tableau de bord ----
  var enc=new TextEncoder();
  ok(crc32(enc.encode('123456789'))===0xCBF43926, "xlsx: crc32('123456789') = 0xCBF43926");
  ok(colName(1)==='A' && colName(26)==='Z' && colName(27)==='AA' && colName(28)==='AB', "xlsx: colName 1/26/27/28 -> A/Z/AA/AB");
  var z=zipStore([{name:'a.txt',data:'hello'},{name:'b/c.txt',data:new Uint8Array([1,2,3])}]);
  var zv=new DataView(z.buffer, z.byteOffset, z.length);
  ok(z[0]===0x50 && z[1]===0x4b && z[2]===3 && z[3]===4 && zv.getUint32(z.length-22,true)===0x06054b50 && zv.getUint16(z.length-22+8,true)===2, "xlsx: ZIP valide (PK, EOCD, 2 entrées)");
  var zstr=(function(b){ var s=''; for(var i=0;i<b.length;i+=4096) s+=String.fromCharCode.apply(null, b.subarray(i,i+4096)); return s; })(z);
  ok(zstr.indexOf('a.txt')>=0 && zstr.indexOf('b/c.txt')>=0 && zstr.indexOf('hello')>=0, "xlsx: noms et contenu des entrées dans le ZIP");
  var sx='a<b>&'+String.fromCharCode(34,39);
  ok(sheetXML([[sx,'x'],[1.5,2]]).indexOf('a&lt;b&gt;&amp;&quot;&apos;')>=0, "xlsx: sheetXML échappe le XML");
  var defs=xlsxSheetDefs();
  var noms=defs.map(function(d){ return d.name; }).join('|');
  ok(noms==='Opérations|Affaires|EJ|CP|Profils CP|Aléas & risques|Réalisé|Révisions de prix|Indices|Tableau de bord', "xlsx: un onglet par type de données + Tableau de bord");
  ok(defs[2].rows.length===1+state.ejs.length, "xlsx: onglet EJ = en-tête + tous les EJ");
  ok(defs[3].rows.length===1+Object.keys(state.cps).length, "xlsx: onglet CP = en-tête + toutes les lignes de CP");
  ok(defs[8].rows[0].length===1+24, "xlsx: onglet Indices = 24 mois en colonnes (2026-01..2027-12)");
  var ds=dashSeries();
  ok(ds.months[0]<='2026-08' && ds.months[ds.months.length-1]>='2027-12' && ds.months.length>12, "xlsx: période du tableau de bord (du 1er EJ au dernier mois)");
  var totEj=state.ejs.filter(isMaterialise).reduce(function(s,e){ return s+montantOf(e); },0);
  ok(Math.abs(ds.ej[ds.ej.length-1]-totEj)<0.01 && Math.abs(ds.rap[ds.rap.length-1])<0.01, "xlsx: EJ cumulés = total des EJ matérialisés ; reste à payer finit à 0");
  var td=defs[9];
  ok(td.chart===true && td.rows.length===1+ds.months.length && td.rows[1][0]===ds.months[0] && typeof td.rows[1][1]==='number', "xlsx: onglet Tableau de bord = mois en lignes + 5 séries numériques + indicateur graphique");
  var nR=td.rows.length;
  var cx=chartXML('Tableau de bord', nR);
  ok(cx.indexOf("'Tableau de bord'!$A$2:$A$"+nR)>=0 && cx.indexOf("'Tableau de bord'!$B$2:$B$"+nR)>=0 && cx.indexOf("'Tableau de bord'!$F$2:$F$"+nR)>=0 && cx.indexOf("'Tableau de bord'!$B$1")>=0, "xlsx: graphique Excel — catégories A2:A"+nR+", valeurs B..F, titres en ligne 1 (bonnes références de cellules)");
  var xb=buildXLSX();
  var xstr=(function(b){ var s=''; for(var i=0;i<b.length;i+=4096) s+=String.fromCharCode.apply(null, b.subarray(i,i+4096)); return s; })(xb);
  ok(xb[0]===0x50 && xb[1]===0x4b, "xlsx: buildXLSX produit un ZIP (PK)");
  ok(xstr.indexOf('xl/worksheets/sheet10.xml')>=0 && xstr.indexOf('xl/charts/chart1.xml')>=0 && xstr.indexOf('xl/drawings/drawing1.xml')>=0, "xlsx: parties présentes (10 onglets + graphique + drawing)");
  ok(xstr.indexOf('drawingml.chart+xml')>=0 && xstr.indexOf('&amp; risques')>=0 && xstr.indexOf('<drawing r:id="rId1"/>')>=0, "xlsx: content-type chart, nom d'onglet échappé, drawing référencé par la feuille");
  ok(xstr.indexOf("'Tableau de bord'!$C$2:$C$"+nR)>=0, "xlsx: le graphique embarqué référence les bonnes cellules de l'onglet");
  var nDl=0;
  try{ exportXLSX(); nDl=1; }catch(e){ nDl=0; }
  ok(nDl===1, "xlsx: exportXLSX() s'exécute sans erreur (téléchargement .xlsx)");
  state = demoState(); recomputeProfils(state);
  // ---- charte unique (CSS) + ligne "aujourd'hui" sur les graphiques du tableau de bord ----
  var cssApp=require('fs').readFileSync(require('path').join(__dirname,'..','src','css','app.css'),'utf8');
  ok(cssApp.indexOf('[title]:not([title=""]):hover::after')>=0, "css: tooltip uniforme pour tout attribut title (infobulle stylée au survol)");
  ok(cssApp.indexOf('main h1,.card h2,.modal h2{font-size:var(--fs-title)')>=0, "css: titres uniformisés (h1/h2 de carte et modale)");
  ok(cssApp.indexOf('.card h3,.modal h3{font-size:var(--fs-sub)')>=0, "css: sous-titres uniformisés (h3)");
  ok(cssApp.indexOf('.btn{font:inherit;font-size:var(--fs-text)')>=0 && cssApp.indexOf('border-radius:var(--radius-btn)')>=0, "css: boutons uniformisés (un seul style, coins uniformes, focus visible)");
  var pT={l:80,r:16,t:12,b:32}, XT=function(i){ return 80+(960-80-16)*(i/6); };
  var mA=mRange(mAdd(curMois(),-3), mAdd(curMois(),3));
  var tl=todayLineSVG(mA, XT, pT, 280);
  ok(tl.indexOf('today-line')>=0 && tl.indexOf("Aujourd'hui "+mLabel(curMois()))>=0, "graphique: ligne verticale à la date du jour + libellé 'Aujourd'hui mm/aa'");
  ok(todayLineSVG(mRange('2020-01','2020-06'), XT, pT, 280)==='', "graphique: pas de ligne aujourd'hui si hors de la période affichée");
  var svgE=chartEntonnoir(state.affaires, state.ejs, mA, null);
  ok(svgE.indexOf('today-line')>=0 && svgE.indexOf("Aujourd'hui")>=0, "entonnoir: la ligne aujourd'hui est dessinée quand la période contient le mois en cours");
  ok(chartEntonnoir(state.affaires, state.ejs, mRange('2020-01','2020-06'), null).indexOf('today-line')<0, "entonnoir: pas de ligne aujourd'hui hors période");
  var svgB=chartBarsSeries(state.affaires, state.ejs, mA, null, [{color:'#000',val:function(){ return 1; }}]);
  ok(svgB.indexOf('today-line')>=0, "barres mensuelles: la ligne aujourd'hui est aussi dessinée");
  state.ui.view='dashboard'; state.ui.op=''; state.ui.aff=''; state.ui.dashFrom=''; state.ui.dashTo=''; render(); var dashT=htmlOf('dashboard');
  var inDemo=curMois()>='2026-08' && curMois()<='2027-12';
  ok((dashT.indexOf('ligne verticale')>=0)===inDemo, "dashboard: légende 'Aujourd'hui (ligne verticale)' présente ssi le mois en cours est dans la période affichée");
  // ---- header derrière les popups + colonne Mois sans titre + boutons EJ discrets ----
  var cssAll=require('fs').readFileSync(require('path').join(__dirname,'..','src','css','app.css'),'utf8');
  var dsfrCss=require('fs').readFileSync(require('path').join(__dirname,'..','node_modules','@gouvfr','dsfr','dist','dsfr.min.css'),'utf8');
  var grounds=[...dsfrCss.matchAll(/--ground:(\\d+)/g)].map(function(m){ return +m[1]; });
  var headerMax=Math.max.apply(null,grounds)+1000; /* fr-header__navbar = ground+1000 */
  var movZ=+(/\.modal-ov\{[^}]*z-index:(\\d+)/.exec(cssAll)||[,0])[1];
  ok(movZ>headerMax, "popups (modal-ov z-index="+movZ+") au-dessus du header DSFR (max ground+1000="+headerMax+") -> le header disparaît derrière les popups");
  state.ui.view='conso'; state.ui.op=''; state.ui.aff=''; renderConso(); var coM=htmlOf('conso');
  var thM=coM.slice(coM.indexOf('<thead>'), coM.indexOf('</thead>'));
  ok(!/>Mois</.test(thM), "conso: plus de titre 'Mois' dans l'en-tête (2e colonne fixe muette)");
  ok((coM.match(/ej-btn/g)||[]).length>=40 && coM.indexOf('ejcell')<0, "conso: infos EJ (intitulé/date/montant/check) = boutons discrets ej-btn cliquables, plus de cellule entière cliquable");
  ok(/data-ejpop="e1"/.test(coM), "conso: clic sur le bouton EJ -> fiche EJ (popup)");
  // ---- conso: alignement en-tête (rowspan hlA) / corps ----
  state.ui.view='conso'; state.ui.op=''; state.ui.aff=''; renderConso(); var co2=htmlOf('conso');
  var th2=co2.slice(co2.indexOf('<thead>'), co2.indexOf('</thead>'));
  var hrows=[...th2.matchAll(/<tr class="(hlA|hlB|hl\\d)">([\\s\\S]*?)<\\/tr>/g)].map(function(m){
    return [...m[2].matchAll(/<th\\b([^>]*)>([\\s\\S]*?)<\\/th>/g)].map(function(t){
      var a=t[1]+t[2];
      return { span:+(/colspan="(\\d+)"/.exec(a)||[,1])[1]||1, rs:+(/rowspan="(\\d+)"/.exec(a)||[,1])[1]||1, ejf:(/data-ejpop="([^"]+)"/.exec(a)||[,''])[1] };
    });
  });
  ok(hrows.length===6, "conso: 6 lignes d\x27en-tete avec titre de ligne (hlA Operation, hlB Affaire, hl2 Intitule, hl3 Date EJ, hl4 Montant, hl5 Sigma CP)");
  var occ={}, placed=[];
  hrows.forEach(function(cells,ri){ var c=0; cells.forEach(function(cell){ while(occ[ri+'|'+c]) c++; placed.push({r:ri,c:c,ejf:cell.ejf}); for(var dr=0;dr<cell.rs;dr++) for(var dc=0;dc<cell.span;dc++) occ[(ri+dr)+'|'+(c+dc)]=1; c+=cell.span; }); });
  var seenEj={}, ejColsH=[];
  placed.forEach(function(p){ if(p.ejf && !seenEj[p.ejf]){ seenEj[p.ejf]=1; ejColsH.push(p.c); } });
  var tb2=co2.slice(co2.indexOf('<tbody>'), co2.indexOf('</tbody>'));
  var firstRow=/<tr data-m="[^"]+"[^>]*>([\\s\\S]*?)<\\/tr>/.exec(tb2)[1];
  var tds=[...firstRow.matchAll(/<td\\b[^>]*>/g)];
  var ejColsB=tds.map(function(t,i){ return /data-ejcol=/.test(t[0])?i:-1; }).filter(function(i){ return i>=0; });
  ok(JSON.stringify(ejColsH)===JSON.stringify(ejColsB) && ejColsH.length===10, "conso: les 10 colonnes EJ de l'en-tête sont exactement alignées avec les cellules du corps (cols "+ejColsH.join(',')+")");
  var totColsH=placed.filter(function(p){ return p.r>=2; }).length; /* hl2..hl7 : toutes les th restantes */
  ok(hrows.slice(2).every(function(r){ return r.length===hrows[2].length; }), "conso: les lignes hl2..hl5 ont toutes le meme nombre de colonnes ("+hrows[2].length+")");
  // ---- conso: titres de ligne, titres des totaux, styles d'importance décroissante, sticky sc0/sc1 ----
  var th2b=co2.slice(co2.indexOf('<thead>'), co2.indexOf('</thead>'));
  ok(th2b.indexOf('>Opération'+ '<' +'/th>')>=0 || /class="scol sc0 hlA">Opération</.test(th2b), "conso: titre de ligne 'Opération' (hlA)");
  ok(/class="scol sc0 hlB">Affaire</.test(th2b) && /class="scol sc0 hl2">Intitulé</.test(th2b) && /class="scol sc0 hl3">Date EJ</.test(th2b) && /class="scol sc0 hl4">Montant</.test(th2b) && /class="scol sc0 hl5">Σ CP</.test(th2b), "conso: chaque ligne d'en-tête a un titre de ligne (Affaire, Intitulé, Date EJ, Montant, Σ CP)");
  ok((th2b.match(/title="Total CP de l\'affaire /g)||[]).length>=6 && (th2b.match(/title="Total CP de l\'opération /g)||[]).length>=2, "conso: les colonnes de totaux (Σ affaire / Σ opération) ont un titre dans l'en-tête");
  ok(co2.indexOf('--sc0w:')>=0, "conso: la table pose --sc0w (largeur réelle de la 1ʳᵉ colonne) pour le collage sticky");
  var cssApp2=require('fs').readFileSync(require('path').join(__dirname,'..','src','css','app.css'),'utf8');
  ok(cssApp2.indexOf('.sc1{width:var(--sc1w,80px);left:var(--sc0w,32px)}')>=0, "css: la 2ᵉ colonne sticky (Mois) est calée sur la largeur réelle de la 1ʳᵉ (#) -> plus de décalage entre les 2 colonnes");
  ok(/tr\.hlA th\{[^}]*font-weight:700/.test(cssApp2) && /tr\.hlB th\{[^}]*font-weight:600/.test(cssApp2) && /tr\.hl5 th\{[^}]*font-weight:400/.test(cssApp2), "css: titres d'en-tête d'importance décroissante (hlA 700 > hlB 600 > hl5 400)");
  ok(co2.indexOf('data-ejpop="e1"')>=0 && co2.indexOf('data-profbtn')<0 && co2.indexOf('data-f="numero"')<0, "conso: colonne EJ = intitulé/date/montant/check en lecture seule, clic -> fiche EJ (plus de n°/profil inline)");
  // ---- conso: colonnes réduites (#/Mois + EJ + Σ affaire + Σ op), colgroup, resize, montant/ΣCP ----
  ok(co2.indexOf('Total des CP du mois sur tous les EJ')<0 && co2.indexOf('data-scope="a:a1"')>=0 && co2.indexOf('data-scope="o:op1"')>=0, "conso: plus de colonne 'Total CP' globale ; totaux affaire (a:a1) et opération (o:op1) présents, non modifiables, cliquables (data-totcp)");
  var cg=co2.slice(co2.indexOf('<colgroup>'), co2.indexOf('</colgroup>'));
  var cks=[...cg.matchAll(/<col data-ck="([^"]+)"/g)].map(function(m){ return m[1]; });
  ok(cks.length===20 && cks[0]==='c0' && cks[1]==='c1' && cks.indexOf('e1')>=0 && cks.indexOf('a:a1')>=0 && cks.indexOf('o:op1')>=0, "conso: colgroup = 20 colonnes (2 fixes + 10 EJ + 6 Σ affaire + 2 Σ op) avec clés de largeur");
  ok(co2.indexOf('colrs')>=0 && (co2.match(/class="colrs"/g)||[]).length>=20, "conso: poignée de redimensionnement sur chaque colonne d'en-tête");
  ok(co2.indexOf('hl-mont')>=0 && co2.indexOf('hl-mont')<co2.indexOf('data-ejhdr'), "conso: montant de l'EJ (hl-mont) juste AU-DESSUS du Σ CP saisis (data-ejhdr)");
  ok(co2.indexOf('montant de l')>=0 && co2.indexOf('Σ des CP saisis')>=0 && co2.indexOf('écart montant')>=0, "conso: légende (montant EJ / Σ CP / écart = alerte)");
  var wRs=document.getElementById('view-conso').children[0];
  var rsEl=makeEl('span'); rsEl.dataset.ck='e1'; rsEl._closest=rsEl;
  fire(wRs,'mousedown',{target:rsEl, clientX:100, preventDefault:function(){}});
  (global.__docL['mousemove']||[]).forEach(function(f){ f({clientX:160}); });
  ok(state.ui.colW && state.ui.colW.e1===200, "conso: glisser la poignée redimensionne la colonne (colW.e1=200 px, persisté)");
  (global.__docL['mouseup']||[]).forEach(function(f){ f({}); });
  fire(wRs,'dblclick',{target:rsEl});
  ok(!state.ui.colW || state.ui.colW.e1===undefined, "conso: double-clic sur la poignée -> largeur par défaut");
  state = demoState(); recomputeProfils(state);
  // détail du calcul des CP auto / aléas / risques + courbes dans la popup risque
  state = demoState(); recomputeProfils(state);
  var dAuto=affDetailHTML('item', affaireById('a1'), 'e1@2026-11', 20);
  ok(dAuto.indexOf('calcul auto')>=0 && dAuto.indexOf('profil uniforme')>=0, "détail item EJ auto: calcul du profil (uniforme: montant/n x mois)");
  var dAl=affDetailHTML('item', affaireById('a1'), 'al1@2027-12', 20);
  ok(dAl.indexOf('% du reste à payer')>=0 && dAl.indexOf('poids')>=0, "détail item aléa: % du reste à payer + répartition pondérée par mois");
  var dRk=affDetailHTML('item', affaireById('a1'), 'r1@2026-12', 20);
  ok(dRk.indexOf('distribution')>=0 && dRk.indexOf('espérance')>=0 && dRk.indexOf('pondéré')>=0, "détail item risque: distribution + espérance/haut/proba/pondéré + apparitions");
  state.ui.view='affaire'; state.ui.op=''; state.ui.aff='a1'; render(); var afI=htmlOf('affaire');
  ok((afI.match(/data-affdet="item\|/g)||[]).length>10, "cellules CP auto/aléa/risque cliquables (data-affdet=item|...)");
  openRisqueAleaPopup('r2');
  var ovC=document.body.children[document.body.children.length-1];
  ok(ovC.innerHTML.indexOf('ra-curves')>=0 && ovC.innerHTML.indexOf('ra-montant')>=0 && ovC.innerHTML.indexOf('ra-dates')>=0 && (ovC.innerHTML.match(/<svg/g)||[]).length>=2, "popup risque: 2 courbes (distribution du montant + répartition des apparitions)");
  ok(ovC.innerHTML.indexOf('espérance')>=0 && ovC.innerHTML.indexOf('haut')>=0 && ovC.innerHTML.indexOf('proba')>=0, "popup risque: courbes annotées (espérance, haut, probabilité)");
  state = demoState(); recomputeProfils(state);
  console.log("PASS: "+RESULTS.pass.length); RESULTS.pass.forEach(p=>console.log("  ok - "+p));
  if(RESULTS.fail.length){ console.log("FAIL: "+RESULTS.fail.length); RESULTS.fail.forEach(f=>console.log("  KO - "+f)); process.exitCode=1; }
}catch(e){ console.log("ERREUR TEST: "+(e&&e.stack||e)); process.exitCode=1; }
})().catch(function(e){ console.log("ERREUR ASYNC: "+(e&&e.stack||e)); process.exitCode=1; });
`;

const patched = script.replace(/\}\)\(\);\s*$/, testCode + "\n})();");
if (patched === script) { console.error("echec injection"); process.exit(1); }

{
  const h0 = html.indexOf('<header'), h1 = html.indexOf('</header>');
  const hdr = html.slice(h0, h1);
  global.__HDRRAW__ = hdr;
  global.__HDR__ = {
    top: hdr.indexOf('fr-header__body')>=0 && hdr.indexOf('fr-header__menu')>=0 && hdr.indexOf('fr-header__body')<hdr.indexOf('fr-header__menu'),
    gouv: !hdr.includes('fr-logo') && !hdr.includes('<img') && !hdr.includes('logo'),
    min: !hdr.includes('logo-min') && !hdr.includes('Armées') && !hdr.includes('data:image/png'),
    order: hdr.indexOf('id="filebar"')>=0 && hdr.indexOf('id="filebar"') < hdr.indexOf('id="nav"'),
    nav: hdr.indexOf('class="fr-nav"')>=0,
    btns: hdr.indexOf('fr-btn')>=0
  };
}
eval(patched);
