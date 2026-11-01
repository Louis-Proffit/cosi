/* ================= Révisions de prix (propres à une affaire) ================= */

function idxById(id){ for(var i=0;i<state.indices.length;i++){ if(state.indices[i].id===id) return state.indices[i]; } return null; }
function serieValueAt(serie, mois){
  var v=null, keys=Object.keys(serie.valeurs).sort();
  for(var i=0;i<keys.length;i++){
    if(keys[i]<=mois){ var x=serie.valeurs[keys[i]]; if(typeof x==='number'&&isFinite(x)) v=x; }
    else break;
  }
  return v;
}
/* Union triée des mois définis dans toutes les séries (lignes du tableau de saisie) */
function idxMonths(){
  var set={};
  state.indices.forEach(function(s){ for(var k in s.valeurs){ if(/^\d{4}-\d{2}$/.test(k)) set[k]=1; } });
  return Object.keys(set).sort();
}
/* Lignes du tableau de saisie : tous les mois depuis le premier mois de
   l'affaire la plus récente (date de réf. de révision, sinon 1er mois de ses
   EJ) jusqu'au dernier mois du dernier CP — plus les mois déjà saisis. */
function idxGridMonths(){
  var set={}, months=idxMonths();
  months.forEach(function(m){ set[m]=1; });
  /* premier mois = affaire la plus ancienne (date de réf., sinon 1er EJ), sur TOUTES les opérations */
  var first=null;
  state.affaires.forEach(function(a){
    var f=null;
    if(a.dateRefRev&&/^\d{4}-\d{2}$/.test(a.dateRefRev)) f=a.dateRefRev;
    else ejsOfAffaire(a.id).forEach(function(e){ if(!f||e.mois<f) f=e.mois; });
    if(f&&(!first||f<first)) first=f;
  });
  var last=null;
  for(var k in state.cps){ var mm=k.split('|')[1]; if(/^\d{4}-\d{2}$/.test(mm)&&(!last||mm>last)) last=mm; }
  if(!last) state.ejs.forEach(function(e){ if(!last||e.mois>last) last=e.mois; });
  if(first&&last&&first<=last) mRange(first,last).forEach(function(m){ set[m]=1; });
  return Object.keys(set).sort();
}
/* Parse une date collée depuis Excel : AAAA-MM, AAAA-MM-JJ, MM/AAAA, MM/AA, n° de série Excel */
function parseIdxDate(s){
  if(s==null) return null;
  var t=String(s).trim();
  var m=t.match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/);
  if(m){ var mm=+m[2]; if(mm>=1&&mm<=12) return m[1]+'-'+String(mm).padStart(2,'0'); }
  m=t.match(/^(\d{1,2})[\/\-.](\d{4})$/);
  if(m){ var mm2=+m[1]; if(mm2>=1&&mm2<=12) return m[2]+'-'+String(mm2).padStart(2,'0'); }
  m=t.match(/^(\d{1,2})[\/\-.](\d{2})$/);
  if(m){ var mm3=+m[1]; if(mm3>=1&&mm3<=12) return '20'+m[2]+'-'+String(mm3).padStart(2,'0'); }
  if(/^\d{5}(\.\d+)?$/.test(t)){ /* numéro de série Excel (jours depuis 1899-12-30) */
    var d=new Date(Math.round((+t-25569)*86400000));
    return d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0');
  }
  return null;
}
function serieByRef(ref){
  var r=String(ref==null?'':ref).trim();
  for(var i=0;i<state.indices.length;i++){ if(state.indices[i].id===r) return state.indices[i]; }
  var rl=r.toLowerCase();
  for(var i=0;i<state.indices.length;i++){ if(String(state.indices[i].nom||'').trim().toLowerCase()===rl) return state.indices[i]; }
  return null;
}
var idxFormErr={};
function refMoisOf(aff){ return (aff.dateRefRev&&/^\d{4}-\d{2}$/.test(aff.dateRefRev))?aff.dateRefRev:curMois(); }
function indiceApplicable(aff, mois){
  var f=aff.formule?String(aff.formule).trim():'';
  if(!f){
    var s0=state.indices[0]||null;
    var v0=s0?serieValueAt(s0,mois):null;
    return v0!=null?v0:indiceRef(aff);
  }
  var missing=false;
  var s=f.replace(/\{([^{}]+)\}/g, function(m,name){
    var ser=serieByRef(name);
    if(ser){ var v=serieValueAt(ser,mois); if(v==null){ missing=true; return '(0)'; } return '('+v+')'; }
    var n=String(name).trim();
    var m0=n.match(/^(.+)_0$/i);
    if(m0){ var s0m=serieByRef(m0[1]); if(s0m){ var v0m=serieValueAt(s0m, refMoisOf(aff)); return '('+(v0m==null?0:v0m)+')'; } }
    if(n.toLowerCase()==='i0') return '('+(indiceRef(aff)||0)+')';
    return m;
  });
  if(missing){ delete idxFormErr[aff.id]; return null; }
  var unk=s.match(/\{([^{}]+)\}/);
  if(unk){ idxFormErr[aff.id]='Paramètre inconnu : {'+unk[1]+'}'; return null; }
  try{
    var v=evalMath(s);
    if(typeof v!=='number'||!isFinite(v)){ idxFormErr[aff.id]='Formule d\'indice invalide'; return null; }
    delete idxFormErr[aff.id];
    return v;
  }catch(e){ idxFormErr[aff.id]=e.message; return null; }
}
/* Indice de référence I₀ = indice applicable à la DATE DE RÉFÉRENCE de la
   révision de prix de l'affaire (champ dateRefRev). Sans formule d'indice :
   valeur de la première série à cette date. */
function indiceRef(aff){
  var m=refMoisOf(aff);
  var s0=state.indices[0]||null;
  var v0=s0?serieValueAt(s0,m):null;
  var f=aff.formule?String(aff.formule).trim():'';
  if(!f) return v0;
  var s=f.replace(/\{([^{}]+)\}/g,function(mm,name){
    var n=String(name).trim();
    var m0=n.match(/^(.+)_0$/i);
    if(m0){ var s0m=serieByRef(m0[1]); if(s0m){ var v0m=serieValueAt(s0m,m); return '('+(v0m==null?0:v0m)+')'; } }
    if(n.toLowerCase()==='i0') return '('+(v0==null?0:v0)+')';
    var ser=serieByRef(name);
    if(ser){ var v=serieValueAt(ser,m); return '('+(v==null?0:v)+')'; }
    return mm;
  });
  try{ var v=evalMath(s); if(typeof v==='number'&&isFinite(v)) return v; }catch(e){}
  return v0;
}
/* Somme des CP prévus d'une affaire sur un mois (EJ matérialisés uniquement) */
function cpMoisAff(aff, m){ var s=0; ejsOfAffaire(aff.id).forEach(function(e){ if(isMaterialise(e)) s+=cpPrevu(e,m); }); return s; }
var DEFAULT_REV_FORMULA='={c}*({i}/{i0}-1)';
var revFormErr={};
/* Formule de révision d'une affaire pour un mois, avec placeholders :
   {c} = somme des CP prévus de l'affaire sur le mois ; {e} = EJ engagés cumulés ;
   {i} = indice applicable au mois ;
   {i0} = indice de référence (indice à la date de réf. dateRefRev) ;
   {série} = valeur d'une série pour le mois ; {série_0} = valeur de la même série au mois de référence de l'affaire. */
function revEval(aff, f, mois){
  var eng=0;
  state.ejs.forEach(function(e){ if(isMaterialise(e)&&e.affaireId===aff.id&&e.mois<=mois) eng+=montantOf(e); });
  var cp=cpMoisAff(aff,mois);
  var ind=indiceApplicable(aff,mois);
  var i0=indiceRef(aff)||0;
  f=String(f==null?'':f).trim();
  if(f.charAt(0)==='=') f=f.slice(1);
  if(!f) f=DEFAULT_REV_FORMULA.slice(1);
  if(/\{e\}/i.test(f)&&eng<=0) return 0;
  if(/\{c\}/i.test(f)&&cp<=0) return 0;
  if(/\{i\}/i.test(f)&&ind==null) return 0;
  if((/\{i\}/i.test(f)||/\{i0\}/i.test(f))&&!i0) return 0;
  var s=f.replace(/\{([^{}]+)\}/g, function(m,name){
    var n=String(name).trim().toLowerCase();
    if(n==='e') return '('+eng+')';
    if(n==='c') return '('+cp+')';
    if(n==='i') return '('+(ind==null?0:ind)+')';
    if(n==='i0') return '('+i0+')';
    var ser=serieByRef(name);
    if(ser){ var v=serieValueAt(ser,mois); return '('+(v==null?0:v)+')'; }
    return m;
  });
  var unk=s.match(/\{([^{}]+)\}/);
  if(unk){ revFormErr[aff.id]='Paramètre inconnu : {'+unk[1]+'}'; return 0; }
  try{
    var v=evalMath(s);
    if(typeof v!=='number'||!isFinite(v)){ revFormErr[aff.id]='Formule de révision invalide'; return 0; }
    delete revFormErr[aff.id];
    return v;
  }catch(e){ revFormErr[aff.id]=e.message; return 0; }
}
/* Révision de prix d'un mois pour une affaire = base CP du mois × (I/I₀ − 1),
   I = indice applicable (formule de l'affaire), I₀ = indice à la date de réf.
   Base CP = CP RÉALISÉ saisi dans « Réalisé » s'il est entré pour ce mois (même à
   0 — c'est la vérité), sinon CP prévus (saisis) de l'affaire sur ce mois.
   → des RP exactement sur les mois où il y a une base CP (et inversement). */
function revAuto(aff,mois){
  var r=realOf(aff.id,mois);
  var cp=(r!=null)?(r.cp||0):cpMoisAff(aff,mois);
  var ind=indiceApplicable(aff,mois), i0=indiceRef(aff);
  if(cp<=0||ind==null||!i0) return 0;
  return cp*(ind/i0-1);
}
/* Révision de prix cumulée à un mois = somme des RP mensuelles jusqu'au mois */
function revisionCumul(aff, mois){
  var s=0;
  scopeMonths(aff.opId||'', aff.id||'').forEach(function(m){ if(m<=mois) s+=revAuto(aff,m); });
  return s;
}
function revisionMois(aff, mois){
  if(HIST.on && HIST.revCalc){
    var hk=aff.id+'|'+mois;
    return Object.prototype.hasOwnProperty.call(HIST.revCalc,hk)?HIST.revCalc[hk]:0;
  }
  var key=aff.id+'|'+mois;
  if(Object.prototype.hasOwnProperty.call(state.revisions,key)){
    var v=state.revisions[key];
    if(typeof v==='string') return revEval(aff, v, mois);
    return +v||0;
  }
  return revAuto(aff,mois);
}
function revisionTotale(aff, months){
  var s=0;
  for(var i=0;i<months.length;i++) s+=revisionMois(aff,months[i]);
  return s;
}

