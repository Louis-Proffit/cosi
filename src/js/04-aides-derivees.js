/* ================= Aides dérivées ================= */

function opById(id){ return state.operations.find(function(o){return o.id===id;}) || null; }
function affaireById(id){ return state.affaires.find(function(a){return a.id===id;}) || null; }
function ejById(id){ return state.ejs.find(function(e){return e.id===id;}) || null; }
function opName(id){ var o=opById(id); return o?o.nom:'—'; }
function affaireName(id){ var a=affaireById(id); return a?a.nom:'—'; }

function isProg(e){ return !e.stade||e.stade==='prog'; }
function isAlea(e){ return e.stade==='alea'; }
function isRisque(e){ return e.stade==='risque'; }
function isEngage(e){ return e.stade==='engage'; }
/* vrai EJ (matérialisé) : programmé ou engagé */
function isMaterialise(e){ return isProg(e)||isEngage(e); }
var STADE_INFO={
  prog:{label:'EJ', cls:'prog'},
  engage:{label:'Engagé', cls:'engage'},
  alea:{label:'Aléa', cls:'alea'},
  risque:{label:'Risque', cls:'risk'}
};
function stadeBadge(e){ var s=STADE_INFO[e.stade]||STADE_INFO.prog; return '<span class="badge '+s.cls+'">'+s.label+'</span>'; }
function stadeLabel(e){ var s=STADE_INFO[e.stade]||STADE_INFO.prog; return s.label; }

function scopedAffaires(opId, affId){
  var as=state.affaires;
  if(opId) as=as.filter(function(a){return a.opId===opId;});
  if(affId) as=as.filter(function(a){return a.id===affId;});
  return as;
}
function scopedEjs(opId, affId){
  var ids={};
  scopedAffaires(opId,affId).forEach(function(a){ ids[a.id]=1; });
  return state.ejs.filter(function(e){ return ids[e.affaireId]; });
}
function sommeMontant(list){ var s=0; (list||[]).forEach(function(e){ s+=montantOf(e); }); return s; }
/* CP consommés cumulés d'un EJ jusqu'à un mois donné (tous les mois si m omis) */
function cpSumOf(ejId, m){
  var s=0;
  for(var k in state.cps){
    if(k.indexOf(ejId+'|')===0){
      if(!m || k.slice(ejId.length+1)<=m) s+=state.cps[k];
    }
  }
  return s;
}
function ejsOfAffaire(affId){ return state.ejs.filter(function(e){ return e.affaireId===affId; }); }
function cpAffaire(affId){
  var s=0;
  ejsOfAffaire(affId).forEach(function(e){ s+=cpSumOf(e.id); });
  return s;
}
/* Reste à payer d'une affaire à une date = EJ engagés (matérialisés) cumulés
   − CP consommés cumulés des mêmes EJ engagés. Ne dépend pas du montant
   initial et finit à 0 quand tous les CP des EJ engagés sont consommés.
   Aléas et risques exclus des deux côtés (non matérialisés) : la base de
   calcul de l'aléa ne boucle donc pas sur elle-même. */
function resteAPayer(aff, m){
  var until=m||curMois(), s=0;
  ejsOfAffaire(aff.id).forEach(function(e){
    if(!isMaterialise(e)) return;
    if(e.mois<=until) s+=montantOf(e);
    s-=cpSumOf(e.id, until);
  });
  return s;
}

/* ---- Profils de consommation des CP ---- */

function profilOf(e){
  var p=state.profils[e.id];
  if(!p||PROF_TYPES.indexOf(p.type)<0){
    if(isRisque(e)) p={type:'uniforme', debut:nextOcc(e)||e.mois, fin:lastOcc(e)||e.mois};
    else p={type:'ponctuelle', debut:e.mois, fin:e.mois};
  }
  return p;
}
/* Recalcule les CP des EJ dont le profil est ponctuel/uniforme (les profils
   'perso' conservent leur saisie manuelle). */
function recomputeProfils(st){
  st=st||state;
  st.ejs.forEach(function(e){
    var p=st.profils[e.id];
    if(!p||PROF_TYPES.indexOf(p.type)<0) p=null;
    if(isMaterialise(e)&&e.mois){
      /* pas de CP avant le mois de l'EJ : on purge les CP antérieurs */
      for(var kp in st.cps){ var pp0=kp.split('|'); if(pp0[0]===e.id&&pp0[1]<e.mois) delete st.cps[kp]; }
    }
    if(p&&p.type==='perso') return;
    if(isAlea(e)){
      /* aléa : CP répartis aléatoirement (de façon stable) sur les mois restants de l'opération */
      for(var ka in st.cps){ if(ka.indexOf(e.id+'|')===0) delete st.cps[ka]; }
      var Ma=montantOf(e), occ=aleaOcc(e);
      if(Ma&&occ.length){
        occ.forEach(function(o){ st.cps[e.id+'|'+o.m]=Math.round(Ma*o.w*100)/100; });
        var sa=0; occ.forEach(function(o){ sa+=st.cps[e.id+'|'+o.m]||0; });
        var la=occ[occ.length-1].m, da=Math.round((Ma-sa)*100)/100;
        if(da) st.cps[e.id+'|'+la]=Math.round(((st.cps[e.id+'|'+la]||0)+da)*100)/100;
      }
      return;
    }
    if(!p){
      if(isRisque(e)) p={type:'uniforme', debut:nextOcc(e)||e.mois, fin:lastOcc(e)||e.mois};
      else p={type:'ponctuelle', debut:e.mois, fin:e.mois};
    }
    for(var k in st.cps){ if(k.indexOf(e.id+'|')===0) delete st.cps[k]; }
    var M=montantOf(e), i;
    if(!M) return;
    if(p.type==='uniforme'){
      var a=p.debut||e.mois, b=p.fin||a;
      if(isMaterialise(e)&&e.mois&&a<e.mois) a=e.mois; /* pas de CP avant le mois de l'EJ */
      if(!a) return;
      if(!b||b<a) b=a;
      var ms=mRange(a,b), n=ms.length;
      var base=Math.floor(M/n*100)/100, reste=M-base*n;
      ms.forEach(function(m,idx){
        var v=base+(idx===n-1?reste:0);
        st.cps[e.id+'|'+m]=Math.round(v*100)/100;
      });
    } else {
      var d=p.debut||e.mois;
      if(isMaterialise(e)&&e.mois&&d<e.mois) d=e.mois; /* pas de CP avant le mois de l'EJ */
      if(d) st.cps[e.id+'|'+d]=Math.round(M*100)/100;
    }
  });
}
function cpPrevu(e,m){ var v=state.cps[e.id+'|'+m]; return v||0; }

/* ---- Risques / aléas : distribution du montant et date d'apparition ---- */

function distParams(e){ return {a:+e.distA||0, b:e.distB==null?null:+e.distB, c:e.distC==null?null:+e.distC}; }
/* Espérance du montant selon la distribution choisie */
function espDist(e){
  if(!isRisque(e)) return montantOf(e);
  var p=distParams(e), dt=e.distType||'fixe';
  if(dt==='uniforme') return (p.a+(p.b==null?p.a:p.b))/2;
  if(dt==='triangulaire') return (p.a+(p.b==null?p.a:p.b)+(p.c==null?(p.b==null?p.a:p.b):p.c))/3;
  if(dt==='gauss') return p.a;
  return p.a||(+e.montant||0);
}
/* Montant haut (scénario 100 %) : max de la distribution */
function montantHaut(e){
  if(!isRisque(e)) return montantOf(e);
  var p=distParams(e), dt=e.distType||'fixe';
  if(dt==='uniforme') return p.b==null?p.a:p.b;
  if(dt==='triangulaire') return p.c==null?(p.b==null?p.a:p.b):p.c;
  if(dt==='gauss') return p.a+2*(p.b||0);
  return p.a||(+e.montant||0);
}
/* Montant d'un aléa forfaitaire : % du reste à payer à date de l'affaire
   (EJ engagés cumulés − CP consommés cumulés des EJ engagés). Les aléas étant
   non matérialisés, ils sont exclus du reste à payer : pas de boucle infinie.
   Un aléa ne se matérialise pas. */
function montantAlea(e){
  if(e.montantExplicite) return +e.montant||0;
  var aff=affaireById(e.affaireId);
  var pct=(e.aleaPct==null?5:e.aleaPct);
  return Math.round(((aff?resteAPayer(aff):0)*pct/100)*100)/100;
}
function montantOf(e){
  if(isAlea(e)) return montantAlea(e);
  if(isRisque(e)){
    /* distribution fixe : le montant est certain (= distA) ; sinon espérance de la distribution */
    if((e.distType||'fixe')==='fixe') return (e.distA!=null?+e.distA:(+e.montant||0));
    return espDist(e);
  }
  return +e.montant||0;
}
function risquePondere(e){
  var p=(e.probabilite==null?100:e.probabilite);
  return espDist(e)*p/100;
}
/* Dernier mois de l'opération : dernier mois d'apparition (EJ / occurrence / CP)
   des EJ des affaires de l'opération. */
function opLastMonth(opId){
  var ejs=scopedEjs(opId||'', ''), to=null;
  function add(m){ if(m&&(!to||m>to)) to=m; }
  ejs.forEach(function(e){ add(e.mois); if(!isAlea(e)) occOf(e).forEach(function(o){ add(o.m); }); });
  for(var k in state.cps){ var p=k.split('|'); if(ejs.some(function(e){ return e.id===p[0]; })) add(p[1]); }
  return to||curMois();
}
/* Graine déterministe (FNV-1a) : la répartition aléatoire d'un aléa est stable
   d'un rendu à l'autre (et d'une sauvegarde à l'autre). */
function seedOf(s){ var h=2166136261,i; for(i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }
/* Apparitions d'un ALÉA : son montant est réparti ALÉATOIREMENT sur les mois
   RESTANTS de l'opération (du mois en cours au dernier mois de l'opération),
   avec des poids aléatoires stables (graine = id de l'aléa), normalisés à 1. */
function aleaOcc(e){
  var aff=affaireById(e.affaireId);
  var b=opLastMonth(aff?aff.opId:'');
  var a=curMois();
  if(!b||b<a) return e.mois?[{m:e.mois,w:1}]:[];
  var ms=mRange(a,b), n=ms.length, seed=seedOf('alea:'+e.id), tot=0, ws=[];
  for(var i=0;i<n;i++){ seed=(Math.imul(seed,1664525)+1013904223)>>>0; var r=0.25+0.75*(seed/4294967296); ws.push(r); tot+=r; }
  return ms.map(function(m,i){ return {m:m, w:ws[i]/tot}; });
}
/* Occurrences (date d'apparition) : [{m, w}] — w = poids (1 ponctuelle/ré currente,
   1/n par mois pour une apparition uniforme dans la période) */
function occOf(e){
  if(isAlea(e)) return aleaOcc(e);
  if(!isRisque(e)) return e.mois?[{m:e.mois,w:1}]:[];
  var dt=e.dateType||'ponctuelle', out=[];
  if(dt==='ponctuelle') return e.mois?[{m:e.mois,w:1}]:[];
  if(dt==='recurrente'){
    var a=e.dateA||e.mois, b=e.dateB||a, f=Math.max(1,Math.round(+e.freq||1));
    if(!a) return [];
    if(!b||b<a) b=a;
    var m=a, guard=0;
    while(m<=b&&guard++<600){ out.push({m:m,w:1}); m=mAdd(m,f); }
    return out;
  }
  var a2=e.dateA||e.mois, b2=e.dateB||a2;
  if(!a2) return [];
  if(!b2||b2<a2) b2=a2;
  var ms=mRange(a2,b2), n=ms.length;
  ms.forEach(function(m){ out.push({m:m,w:1/n}); });
  return out;
}
function cumOcc(e,m){ var s=0; occOf(e).forEach(function(o){ if(o.m<=m) s+=o.w; }); return s; }
function occW(e,m){ var s=0; occOf(e).forEach(function(o){ if(o.m===m) s+=o.w; }); return s; }
function nextOcc(e){ var o=occOf(e); return o.length?o[0].m:null; }
function lastOcc(e){ var o=occOf(e); return o.length?o[o.length-1].m:null; }

/* ---- Réalisé ---- */

function realOf(affId,m){ return state.realise[affId+'|'+m]||null; }
function realCumul(affId,m){ var ej=0,cp=0; for(var k in state.realise){ var p=k.split('|'); if(p[0]===affId&&p[1]<=m){ ej+=state.realise[k].ej||0; cp+=state.realise[k].cp||0; } } return {ej:ej,cp:cp}; }

/* ---- Périodes ---- */

function scopeMonths(opId, affId){
  var cur=curMois(), min=null, max=null, ids={}, aids={};
  function add(m){ if(!m) return; if(!min||m<min) min=m; if(!max||m>max) max=m; }
  add(cur);
  var ejs=scopedEjs(opId,affId);
  ejs.forEach(function(e){ ids[e.id]=1; add(e.mois); occOf(e).forEach(function(o){ add(o.m); }); });
  for(var k in state.cps){ var p=k.split('|'); if(ids[p[0]]) add(p[1]); }
  scopedAffaires(opId,affId).forEach(function(a){ aids[a.id]=1; });
  state.affaires.forEach(function(a){ add(a.dateRefRev); }); /* début au moins à la date de réf. de l'affaire la plus ancienne (TOUTES les affaires, même filtrées) */
  for(var k2 in state.revisions){ var p2=k2.split('|'); if(aids[p2[0]]) add(p2[1]); }
  for(var k3 in state.realise){ var p3=k3.split('|'); if(aids[p3[0]]) add(p3[1]); }
  if(!min) min=mAdd(cur,-6);
  if(!max) max=cur;
  if(min>mAdd(cur,-6)) min=mAdd(cur,-6);
  if(max<mAdd(cur,12)) max=mAdd(cur,12);
  /* date de réf. la plus ancienne (TOUTES les affaires) = LIMITE infranchissable */
  var minRefAll=null;
  state.affaires.forEach(function(a){ if(a.dateRefRev&&(!minRefAll||a.dateRefRev<minRefAll)) minRefAll=a.dateRefRev; });
  min=mAdd(min, -(state.ui.extBefore||0)); /* bouton "développer avant" (jusqu'à la limite) */
  max=mAdd(max, state.ui.ext||0);          /* bouton "développer après" */
  if(minRefAll && min<minRefAll) min=minRefAll; /* jamais de dates avant la date de l'affaire la plus ancienne */
  return mRange(min,max);
}

/* Lignes de boutons "développer / replier" : avant la première ligne de mois /
   après la dernière (on peut aussi retirer les mois ajoutés) */
function extRow(side, colspan){
  var avant=side==='avant';
  var h='<tr class="extrow"><td colspan="'+colspan+'">';
  if(avant&&state.ui.extBefore>0) h+='<button type="button" class="btn small" data-extshrink="before" title="Retirer 12 mois au début de la période affichée">− replier 12 mois avant</button> ';
  h+='<button type="button" class="btn small" data-ext="'+(avant?'before':'after')+'" title="'+(avant?'Afficher 12 mois de plus AVANT la première période affichée (jusqu\'à la date de réf. de l\'affaire la plus ancienne)':'Afficher 12 mois de plus APRÈS la dernière période affichée')+'">'+(avant?'− 12 mois avant':'＋ 12 mois après')+'</button>';
  if(!avant&&state.ui.ext>0) h+=' <button type="button" class="btn small" data-extshrink="after" title="Retirer 12 mois à la fin de la période affichée">− replier 12 mois après</button>';
  return h+'</td></tr>';
}

function dashPeriod(opId, affId){
  var ejs=scopedEjs(opId||'', affId||''), from=null, to=null;
  ejs.forEach(function(e){ if(!from||e.mois<from) from=e.mois; occOf(e).forEach(function(o){ if(!from||o.m<from) from=o.m; if(!to||o.m>to) to=o.m; }); if(!to||e.mois>to) to=e.mois; });
  for(var k in state.cps){ var p=k.split('|'); if(ejs.some(function(e){return e.id===p[0];}) && (!to||p[1]>to)) to=p[1]; }
  if(!from) from=to||curMois();
  if(!to||to<from) to=from;
  var uf=state.ui.dashFrom, ut=state.ui.dashTo;
  if(/^\d{4}-\d{2}$/.test(uf||'')) from=uf;
  if(/^\d{4}-\d{2}$/.test(ut||'')) to=ut;
  if(from>to){ var tp=from; from=to; to=tp; } /* début > fin : on échange, la date de fin choisie est honorée */
  return {from:from,to:to};
}

