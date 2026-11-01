/* ================= Vue : GP à saisir ================= */

var GP_KINDS=[['ej','EJ'],['cp','CP'],['ae','Aléa EJ'],['ac','Aléa CP'],['rk','Rk EJ'],['rc','Rk CP'],['rp','RP'],['rej','EJ réel'],['rcp','CP réel']];
/* Hiérarchie des colonnes : par défaut 2 colonnes « Synthèse » par groupe
   (opération / affaire) = somme de tous les types côté EJ et côté CP ;
   le bouton « + » de l'en-tête déplie le détail par type (EJ pur, aléa, risque,
   RP, réalisé). RP compté dans les deux synthèses (pour les RP, EJ = CP). */
var GP_SYNTH={sej:['ej','ae','rk','rp','rej'], scp:['cp','ac','rc','rcp','rp']};
var GP_SYNTH_LABEL={sej:'Synthèse EJ', scp:'Synthèse CP'};

function gpAffaires(scope){
  if(scope.indexOf('a:')===0){ var a=affaireById(scope.slice(2)); return a?[a]:[]; }
  if(scope.indexOf('o:')===0) return state.affaires.filter(function(a){ return a.opId===scope.slice(2); });
  return scopedAffaires(state.ui.op||'', state.ui.aff||'');
}

/* Valeur d'une cellule GP pour une affaire et un mois */
/* CP d'un EJ affichés au mois m, après les décalages d'options cochées
   (décembre -> janvier -> février selon « Pas de CP en décembre/janvier » et
   « RP en décembre seulement »). */
function cpAt(e, m){
  var s=0;
  for(var k in state.cps){ var p=k.split('|'); if(p[0]===e.id&&gpShiftCpMonth(p[1])===m) s+=state.cps[k]; }
  return s;
}
/* Valeur d'une cellule GP pour une affaire et un mois d'AFFICHAGE. Les options
   de décalage sont appliquées : EJ de décembre -> novembre et CP de décembre ->
   janvier (« RP en décembre seulement » / « Pas de CP en décembre »), CP de
   janvier -> février (« Pas de CP en janvier »), et en « RP en décembre
   seulement » la colonne RP de décembre vaut la somme des RP de l'année. */
function gpVal(kind, aff, m){
  var cur=curMois();
  if(kind==='sej'||kind==='scp'){
    /* Pas de double comptage saisi/réalisé : sur un mois PASSÉ avec réalisé saisi,
       on garde le réalisé (immuable) ; sur le mois en cours (ou sans réalisé), on
       garde le saisi (prévu). */
    var r=(m<cur)?realOf(aff.id,m):null;
    if(kind==='sej'){ var b=(r&&(r.ej||0)>0)?(r.ej||0):gpVal('ej',aff,m); return b+gpVal('ae',aff,m)+gpVal('rk',aff,m)+gpVal('rp',aff,m); }
    var b2=(r&&(r.cp||0)>0)?(r.cp||0):gpVal('cp',aff,m); return b2+gpVal('ac',aff,m)+gpVal('rc',aff,m)+gpVal('rp',aff,m);
  }
  var s=0, ejs=ejsOfAffaire(aff.id), i;
  if(kind==='ej'){ ejs.forEach(function(e){ if(isMaterialise(e)&&gpShiftEjMonth(e.mois)===m) s+=montantOf(e); }); }
  else if(kind==='cp'){ ejs.forEach(function(e){ if(isMaterialise(e)) s+=cpAt(e,m); }); }
  else if(kind==='ae'){ ejs.forEach(function(e){ if(isAlea(e)){
    if(state.ui.gpARDec){ /* aléas de l'année regroupés en décembre */
      if(m.slice(5)==='12'){ var y=m.slice(0,4), y0=(+y-1)+'-12'; s+=montantOf(e)*(cumOcc(e,y+'-12')-cumOcc(e,y0)); }
    } else occOf(e).forEach(function(o){ if(gpShiftEjMonth(o.m)===m) s+=montantOf(e)*o.w; });
  } }); }
  else if(kind==='ac'){ ejs.forEach(function(e){ if(isAlea(e)){
    if(state.ui.gpARDec){ if(m.slice(5)==='12'){ var y2=m.slice(0,4), y02=(+y2-1)+'-12'; s+=cpSumOf(e.id,y2+'-12')-cpSumOf(e.id,y02); } }
    else s+=cpAt(e,m);
  } }); }
  else if(kind==='rk'){ ejs.forEach(function(e){ if(isRisque(e)){
    if(state.ui.gpARDec){ /* aléas ET risques de l'année regroupés en décembre */
      if(m.slice(5)==='12'){ var y3=m.slice(0,4), y03=(+y3-1)+'-12'; s+=espDist(e)*(cumOcc(e,y3+'-12')-cumOcc(e,y03)); }
    } else occOf(e).forEach(function(o){ if(gpShiftEjMonth(o.m)===m) s+=espDist(e)*o.w; });
  } }); }
  else if(kind==='rc'){ ejs.forEach(function(e){ if(isRisque(e)){
    if(state.ui.gpARDec){ if(m.slice(5)==='12'){ var y4=m.slice(0,4), y04=(+y4-1)+'-12'; s+=cpSumOf(e.id,y4+'-12')-cpSumOf(e.id,y04); } }
    else s+=cpAt(e,m);
  } }); }
  else if(kind==='rp'){
    if(state.ui.gpRpDec){ if(m.slice(5)==='12'){ scopeMonths(state.ui.op||'',state.ui.aff||'').forEach(function(mm){ if(mm.slice(0,4)===m.slice(0,4)) s+=revisionMois(aff,mm); }); } }
    else s=revisionMois(aff,m);
  }
  else if(kind==='rej'){ for(var k in state.realise){ var p=k.split('|'); if(p[0]===aff.id&&gpShiftEjMonth(p[1])===m) s+=(state.realise[k].ej||0); } }
  else if(kind==='rcp'){ for(var k2 in state.realise){ var p2=k2.split('|'); if(p2[0]===aff.id&&gpShiftCpMonth(p2[1])===m) s+=(state.realise[k2].cp||0); } }
  return s;
}

function gpDetail(kind, scope, m, span){
  var kinds=GP_SYNTH[kind]||[kind];
  var affs=gpAffaires(scope), items=[];
  var rmonths=scopeMonths(state.ui.op||'', state.ui.aff||'');
  affs.forEach(function(a){
    var ejs=ejsOfAffaire(a.id);
    kinds.forEach(function(kd){
      ejs.forEach(function(e){
        if(kd==='ej'&&isMaterialise(e)){ var dm=gpShiftEjMonth(e.mois); if(!m||dm===m) items.push({a:a,e:e,m:dm,v:montantOf(e)}); }
        else if(kd==='cp'&&isMaterialise(e)){
          for(var k in state.cps){ var pp=k.split('|'); if(pp[0]===e.id){ var dcm=gpShiftCpMonth(pp[1]); if(!m||dcm===m) items.push({a:a,e:e,m:dcm,v:state.cps[k]}); } }
        }
        else if(kd==='ae'&&isAlea(e)){ occOf(e).forEach(function(o){ var dm2=gpShiftEjMonth(o.m); if(!m||dm2===m) items.push({a:a,e:e,m:dm2,v:montantOf(e)*o.w}); }); }
        else if(kd==='ac'&&isAlea(e)){
          for(var k2 in state.cps){ var pp2=k2.split('|'); if(pp2[0]===e.id){ var dcm2=gpShiftCpMonth(pp2[1]); if(!m||dcm2===m) items.push({a:a,e:e,m:dcm2,v:state.cps[k2]}); } }
        }
        else if(kd==='rk'&&isRisque(e)){ occOf(e).forEach(function(o){ var dm3=gpShiftEjMonth(o.m); if(!m||dm3===m) items.push({a:a,e:e,m:dm3,v:espDist(e)*o.w}); }); }
        else if(kd==='rc'&&isRisque(e)){
          for(var k3 in state.cps){ var pp3=k3.split('|'); if(pp3[0]===e.id){ var dcm3=gpShiftCpMonth(pp3[1]); if(!m||dcm3===m) items.push({a:a,e:e,m:dcm3,v:state.cps[k3]}); } }
        }
      });
      if(kd==='rp'){
        if(state.ui.gpRpDec){
          /* une ligne par année : somme des RP de l'année, affichée en décembre */
          var byY={};
          rmonths.forEach(function(mm){ var v=revisionMois(a,mm); if(v) byY[mm.slice(0,4)]=(byY[mm.slice(0,4)]||0)+v; });
          Object.keys(byY).forEach(function(y){ var dm4=y+'-12'; if(!m||m===dm4) items.push({a:a,e:{numero:'RP '+y,libelle:'somme des révisions de prix de l\'année'},m:dm4,v:byY[y]}); });
        } else {
          rmonths.forEach(function(mm){ if(m&&mm!==m) return; var v4=revisionMois(a,mm); if(v4) items.push({a:a,e:{numero:'Révision de prix',libelle:''},m:mm,v:v4}); });
        }
      }
      if(kd==='rej'||kd==='rcp'){
        for(var k4 in state.realise){
          var pp4=k4.split('|');
          if(pp4[0]!==a.id) continue;
          var dm5=(kd==='rej')?gpShiftEjMonth(pp4[1]):gpShiftCpMonth(pp4[1]);
          if(m&&dm5!==m) continue;
          var rv=state.realise[k4];
          var vv=(kd==='rej'?rv.ej:rv.cp)||0;
          if(vv) items.push({a:a,e:{numero:kd==='rej'?'EJ réalisé':'CP réalisé',libelle:''},m:dm5,v:vv});
        }
      }
    });
  });
  if(!items.length) return '';
  items.sort(function(x,y){ return x.m<y.m?-1:(x.m>y.m?1:0); });
  var kl=kinds.length>1?'Synthèse — tous types':({ej:'EJ engagés',cp:'CP engagés',ae:'Aléas (EJ)',ac:'Aléas (CP)',rk:'Risques (EJ, espérance)',rc:'Risques (CP)',rp:'Révisions de prix',rej:'EJ réalisé',rcp:'CP réalisé'}[kind]||kind);
  var h='<td colspan="'+(span||4)+'" class="gp-detail"><strong>'+kl+(m?' — '+mLong(m):'')+' :</strong>';
  items.forEach(function(it){
    h+='<div><span class="gp-k">'+mLong(it.m)+'</span> '+
       (affs.length>1?esc(it.a.nom)+' · ':'')+esc(it.e.numero)+(it.e.libelle?' ('+esc(it.e.libelle)+')':'')+
       ' : <span class="mono">'+fmt(it.v)+'</span></div>';
  });
  return h+'</td>';
}

/* Lignes texte par année pour l'export GP : { "2026": {prevu:[...], real:[...]} }.
   Chaque ligne : "mm/AA : X k€ intitulé". Une année n'est conservée que si elle
   a À LA FOIS du prévu (CP prévus par EJ) et du réalisé (CP payés par affaire). */
/* Décale le mois d'une ligne CP pour l'export, selon les options cochées
   (cumulatives) : "RP en décembre seulement" ou "Pas de CP en décembre" ->
   décembre vers janvier de l'année suivante ; "Pas de CP en janvier" ->
   janvier vers février. Ne s'applique PAS aux RP. */
function gpShiftCpMonth(m){
  var mm=m;
  if((state.ui.gpRpDec||state.ui.gpNoCpDec) && mm.slice(5)==='12') mm=mAdd(mm,1);
  if(state.ui.gpNoCpJan && mm.slice(5)==='01') mm=mAdd(mm,1);
  return mm;
}
/* Mois d'affichage d'une ligne EJ selon l'option « RP en décembre seulement » :
   décembre -> novembre (ne s'applique pas aux CP). */
function gpShiftEjMonth(m){ return (state.ui.gpRpDec && m.slice(5)==='12') ? mAdd(m,-1) : m; }
/* Tri des lignes "mm/aa : ..." par mois croissant */
function gpSortLines(arr){
  return arr.slice().sort(function(a,b){
    var ma=a.match(/^(\d{2})\/(\d{2})/), mb=b.match(/^(\d{2})\/(\d{2})/);
    var ka=ma?('20'+ma[2]+'-'+ma[1]):'9999', kb=mb?('20'+mb[2]+'-'+mb[1]):'9999';
    return ka<kb?-1:(ka>kb?1:0);
  });
}
/* Données d'export par année, en deux versions : EJ et CP.
   { "2026": { ej:{prevu:[],real:[]}, cp:{prevu:[],real:[]} } }
   Une année n'apparaît que s'il y a au moins un EJ ou un CP (prévu ou réalisé).
   Option "RP en décembre seulement" : la ligne de décembre des versions EJ et CP
   ne contient que la somme des RP de l'année ; l'EJ de décembre est mis en
   novembre et le CP de décembre en janvier. */
function gpYearText(affs, months){
  var ids={}; affs.forEach(function(a){ ids[a.id]=1; });
  var years={};
  function bucket(y,k){ if(!years[y]) years[y]={ej:{prevu:[],real:[]},cp:{prevu:[],real:[]}}; return years[y][k]; }
  /* somme des RP par année (option "RP en décembre seulement") */
  var rpByYear={};
  if(state.ui.gpRpDec){
    affs.forEach(function(a){
      months.forEach(function(m){
        var v=revisionMois(a,m);
        if(v) rpByYear[m.slice(0,4)]=(rpByYear[m.slice(0,4)]||0)+v;
      });
    });
  }
  var cur=curMois();
  months.forEach(function(m){
    var y=m.slice(0,4), isDec=(m.slice(5)==='12');
    var mCp=gpShiftCpMonth(m); /* mois d'affichage des lignes CP */
    var mEj=gpShiftEjMonth(m);
    var past=m<cur;
    /* réalisé saisi de l'affaire à ce mois — seulement les mois PASSÉS (le mois en
       cours reste au saisi) ; un mois n'apparaît qu'une fois : réalisé OU saisi */
    var realEj={}, realCp={};
    affs.forEach(function(a){ var r=realOf(a.id,m); if(past&&r){ if((r.ej||0)>0) realEj[a.id]=r.ej; if((r.cp||0)>0) realCp[a.id]=r.cp; } });
    state.ejs.forEach(function(e){
      if(!ids[e.affaireId]) return;
      var lbl=e.numero+(e.stade&&e.stade!=='prog'?' ('+stadeLabel(e)+')':'')+(e.libelle?' '+e.libelle:'');
      /* version EJ : l'EJ engagé à son mois — ligne saisie supprimée si le réalisé existe (pas de double comptage) */
      if(isMaterialise(e)&&e.mois===m&&montantOf(e)>0&&!realEj[e.affaireId]){
        bucket(mEj.slice(0,4),'ej').prevu.push(mLabel(mEj)+' : '+kEur(montantOf(e))+' '+lbl);
      }
      /* version CP : CP prévus ce mois (mois décalé selon les options) */
      var v=cpPrevu(e,m);
      if(v>0&&!realCp[e.affaireId]&&!(state.ui.gpARDec&&(isAlea(e)||isRisque(e)))){
        bucket(mCp.slice(0,4),'cp').prevu.push(mLabel(mCp)+' : '+kEur(v)+' '+lbl);
      }
    });
    /* option "aléa et risque en décembre" : aléas ET risques de l'année regroupés en décembre (versions EJ et CP) */
    if(state.ui.gpARDec){
      state.ejs.forEach(function(e){
        if(!ids[e.affaireId]||!(isAlea(e)||isRisque(e))) return;
        var lblA=e.numero+' ('+stadeLabel(e)+')'+(e.libelle?' '+e.libelle:'');
        var mot=isAlea(e)?'aléas':'risques';
        months.forEach(function(mm){
          if(mm.slice(5)!=='12') return;
          var y=mm.slice(0,4), y0=(+y-1)+'-12';
          var occPart=cumOcc(e,y+'-12')-cumOcc(e,y0);
          var vEj=(isAlea(e)?montantOf(e):espDist(e))*occPart;
          var vCp=cpSumOf(e.id,y+'-12')-cpSumOf(e.id,y0);
          if(vEj>0) bucket(y,'ej').prevu.push(mLabel(mm)+' : '+kEur(vEj)+' '+lblA+' — '+mot+' '+y+' regroupés en décembre');
          if(vCp>0) bucket(y,'cp').prevu.push(mLabel(gpShiftCpMonth(mm))+' : '+kEur(vCp)+' '+lblA+' — '+mot+' '+y+' regroupés en décembre');
        });
      });
    }
    affs.forEach(function(a){
      var r=realOf(a.id,m);
      if(!past||!r) return;
      if((r.ej||0)>0) bucket(mEj.slice(0,4),'ej').real.push(mLabel(mEj)+' : '+kEur(r.ej)+' EJ réalisé — '+a.nom);
      if((r.cp||0)>0) bucket(mCp.slice(0,4),'cp').real.push(mLabel(mCp)+' : '+kEur(r.cp)+' CP réalisé — '+a.nom);
    });
  });
  /* option "RP en décembre seulement" : ligne de décembre = somme des RP de l'année, dans les deux versions */
  if(state.ui.gpRpDec){
    Object.keys(rpByYear).forEach(function(y){
      var line=mLabel(y+'-12')+' : '+kEur(rpByYear[y])+' RP '+y;
      bucket(y,'ej').prevu.push(line);
      bucket(y,'cp').prevu.push(line);
    });
  }
  var out=Object.keys(years).filter(function(y){
    var b=years[y];
    return b.ej.prevu.length||b.ej.real.length||b.cp.prevu.length||b.cp.real.length;
  }).reduce(function(acc,y){ acc[y]=years[y]; return acc; }, {});
  Object.keys(out).forEach(function(y){
    out[y].ej.prevu=gpSortLines(out[y].ej.prevu); out[y].ej.real=gpSortLines(out[y].ej.real);
    out[y].cp.prevu=gpSortLines(out[y].cp.prevu); out[y].cp.real=gpSortLines(out[y].cp.real);
  });
  return out;
}
/* Texte d'un bloc (une version d'une année) : si réalisé ET prévu ->
   "REALISE:\n...\n\nPREVU:\n..." ; sinon le bloc seul, sans diviser. */
function gpYearBlock(b){
  if(b.real.length&&b.prevu.length) return 'REALISE:\n'+b.real.join('\n')+'\n\nPREVU:\n'+b.prevu.join('\n');
  if(b.real.length) return b.real.join('\n');
  return b.prevu.join('\n');
}

function renderGp(){
  var opId=state.ui.op||'', affId=state.ui.aff||'';
  var affs=scopedAffaires(opId,affId);
  var months=scopeMonths(opId,affId);
  var cur=curMois();
  var K=GP_KINDS.length;

  var h='<div class="toolbar">'+
    '<label class="gp-chk" title="Export : la ligne de décembre ne contient que la somme des RP de l\'année ; l\'EJ de décembre est mis en novembre et le CP de décembre en janvier (cumulatif avec « Pas de CP en janvier » : janvier -> février)"><input type="checkbox" id="gp-rpdec"'+(state.ui.gpRpDec?' checked':'')+'> RP en décembre seulement</label>'+
    '<label class="gp-chk" title="Export : décale les CP de décembre vers janvier de l\'année suivante (ne s\'applique pas aux RP)"><input type="checkbox" id="gp-nocpdec"'+(state.ui.gpNoCpDec?' checked':'')+'> Pas de CP en décembre</label>'+
    '<label class="gp-chk" title="Export : décale les CP de janvier vers février (cumulatif avec « Pas de CP en décembre »)"><input type="checkbox" id="gp-nocpjan"'+(state.ui.gpNoCpJan?' checked':'')+'> Pas de CP en janvier</label>'+
    '<label class="gp-chk" title="Tableau + export : les aléas ET risques de chaque année sont regroupés en décembre de l\'année, en EJ et en CP"><input type="checkbox" id="gp-ardec"'+(state.ui.gpARDec?' checked':'')+'> Aléa et risque en décembre</label>'+
    '<button class="btn" id="gp-ext">+ 12 mois</button>'+
    (state.ui.ext>0?'<button class="btn" id="gp-shrink">− 12 mois</button>':'')+
    '</div>';
  h+='<p class="hint">Montants par mois agrégés par affaire puis par opération. <strong>Clic sur une cellule = détail de la somme ; bouton + dans un en-tête = déplier par type</strong> (EJ pur, aléa, risque, RP, réalisé). Les cases à cocher s\'appliquent au tableau et à l\'export texte. <span class="hint-ic" title="Colonnes par défaut : Synthèse EJ / Synthèse CP (somme de tous les types). Le bouton + déplie le détail par type. Types : EJ/CP engagés (programmés ou matérialisés), aléas, risques (espérance pondérée, CP selon le profil), révisions de prix propres à chaque affaire, réalisé saisi dans l\'onglet Réalisé.">i</span></p>';

  /* groupes : opération -> affaires */
  var opCols=[];
  state.operations.forEach(function(o){
    var cs=affs.filter(function(a){ return a.opId===o.id; });
    if(cs.length) opCols.push({o:o,cs:cs});
  });
  if(!opCols.length){ h+='<div class="card"><div class="empty">Aucune affaire dans cette sélection.</div></div>'; mount('view-gp',h,function(w){ wireGpHeader(w); }); return; }

  function gExp(key){ return !!(state.ui.gpExp&&state.ui.gpExp[key]); }
  function gCols(key){ return gExp(key)?K:2; }
  function plusBtn(key){ return ' <button type="button" class="gp-plus" data-gpexp="'+key+'" title="'+(gExp(key)?'Replier':'Déplier')+' le détail des colonnes par type (EJ pur, aléa, risque, RP, réalisé)">'+(gExp(key)?'−':'+')+'</button>'; }
  /* en-tête sur 3 lignes comme le tableau Révisions de prix :
     ligne 1 = opération (colspan groupe + totaux), ligne 2 = affaire + Σ opération (rowspan 2),
     ligne 3 = colonnes (détail par type si déplié, sinon Synthèse EJ/CP) */
  var h1='<th rowspan="3">Mois</th>';
  var h2='', h3='';
  opCols.forEach(function(og){
    var opKey='o:'+og.o.id;
    var opSpan=og.cs.reduce(function(s,a){ return s+gCols('a:'+a.id); },0)+gCols(opKey);
    h1+='<th class="gp-h-op" colspan="'+opSpan+'">Opération '+(og.o.numero?og.o.numero+' — ':'')+': '+esc(og.o.nom)+plusBtn(opKey)+'</th>';
    og.cs.forEach(function(a){
      var ak='a:'+a.id;
      h2+='<th class="gp-h-ctr" colspan="'+gCols(ak)+'">'+esc(a.nom)+plusBtn(ak)+'</th>';
      if(gExp(ak)){ GP_KINDS.forEach(function(kk){ h3+='<th class="gp-kinds">'+kk[1]+'</th>'; }); }
      else{ h3+='<th class="gp-kinds gp-synth">'+GP_SYNTH_LABEL.sej+'</th><th class="gp-kinds gp-synth">'+GP_SYNTH_LABEL.scp+'</th>'; }
    });
    h2+='<th class="gp-h-tot" rowspan="2" colspan="'+gCols(opKey)+'">Σ '+esc(og.o.nom)+'</th>';
    if(gExp(opKey)){ GP_KINDS.forEach(function(kk){ h3+='<th class="gp-kinds gp-h-tot">Σ '+kk[1]+'</th>'; }); }
    else{ h3+='<th class="gp-kinds gp-h-tot gp-synth">Σ '+GP_SYNTH_LABEL.sej+'</th><th class="gp-kinds gp-h-tot gp-synth">Σ '+GP_SYNTH_LABEL.scp+'</th>'; }
  });

  function cell(kind, scope, m, val, span){
    if(!val) return '<td class="num"></td>';
    var isReal=(kind==='rej'||kind==='rcp');
    return '<td class="num"><span class="gp-cell'+(isReal?' gp-real':'')+'" data-gp="'+kind+'" data-scope="'+scope+'" data-m="'+m+'" data-span="'+span+'" title="'+(isReal?'Réalisé SAISI dans « Réalisé » — valeur immuable (pas un calcul) — cliquer pour le détail':'Voir le détail')+'">'+fmt0(val)+'</span></td>';
  }

  /* synthèse avec substitution : mois passé + réalisé -> réalisé ; sinon saisi */
  function synthVals(v, m){ var past=m&&m<cur; return {sej:(past&&v.rej>0?v.rej:v.ej)+v.ae+v.rk+v.rp, scp:(past&&v.rcp>0?v.rcp:v.cp)+v.ac+v.rc+v.rp}; }
  var body='';
  months.forEach(function(m){
    body+='<tr'+(m===cur?' class="gp-cur"':'')+'><td'+(m===cur?' style="background:var(--amber-bg);font-weight:600"':'')+'>'+mLong(m)+'</td>';
    opCols.forEach(function(og){
      var opKey='o:'+og.o.id;
      var sVals={}; GP_KINDS.forEach(function(kk){ sVals[kk[0]]=0; });
      og.cs.forEach(function(a){
        var ak='a:'+a.id, vA={};
        GP_KINDS.forEach(function(kk){ var v=gpVal(kk[0],a,m); vA[kk[0]]=v; sVals[kk[0]]+=v; });
        if(gExp(ak)){ GP_KINDS.forEach(function(kk){ body+=cell(kk[0],ak,m,vA[kk[0]]); }); }
        else{ var sv=synthVals(vA,m); body+=cell('sej',ak,m,sv.sej); body+=cell('scp',ak,m,sv.scp); }
      });
      if(gExp(opKey)){ GP_KINDS.forEach(function(kk){ body+=cell(kk[0],opKey,m,sVals[kk[0]]); }); }
      else{ var sv2=synthVals(sVals,m); body+=cell('sej',opKey,m,sv2.sej); body+=cell('scp',opKey,m,sv2.scp); }
    });
    body+='</tr>';
  });

  var foot='<tr class="gp-tot"><td>Total</td>';
  opCols.forEach(function(og){
    var opKey='o:'+og.o.id;
    var oVals={}; GP_KINDS.forEach(function(kk){ oVals[kk[0]]=0; });
    og.cs.forEach(function(a){
      var ak='a:'+a.id, vA={};
      GP_KINDS.forEach(function(kk){
        var v=0;
        months.forEach(function(m){ v+=gpVal(kk[0],a,m); });
        vA[kk[0]]=v; oVals[kk[0]]+=v;
      });
      vA.sej=0; vA.scp=0;
      months.forEach(function(m){ vA.sej+=gpVal('sej',a,m); vA.scp+=gpVal('scp',a,m); });
      oVals.sej+=vA.sej; oVals.scp+=vA.scp;
      if(gExp(ak)){ GP_KINDS.forEach(function(kk){ foot+=cell(kk[0],ak,'',vA[kk[0]]); }); }
      else{ foot+=cell('sej',ak,'',vA.sej); foot+=cell('scp',ak,'',vA.scp); }
    });
    if(gExp(opKey)){ GP_KINDS.forEach(function(kk){ foot+=cell(kk[0],opKey,'',oVals[kk[0]]); }); }
    else{ foot+=cell('sej',opKey,'',oVals.sej); foot+=cell('scp',opKey,'',oVals.scp); }
  });
  foot+='</tr>';
  var totalCols=opCols.reduce(function(s,og){ return s+og.cs.reduce(function(s2,a){ return s2+gCols('a:'+a.id); },0)+gCols('o:'+og.o.id); },0);

  h+='<div class="grid-wrap"><table class="liste gp-table rev-table">'+
     '<thead><tr>'+h1+'</tr><tr>'+h2+'</tr><tr>'+h3+'</tr></thead>'+
     '<tbody>'+body+'</tbody><tfoot>'+foot+'</tfoot></table></div>';

  /* ---- Export texte par année : "mm/AA : X k€ intitulé", versions EJ et CP ----
     Une année n'apparaît que s'il y a au moins un EJ ou un CP (prévu ou réalisé).
     Dans chaque version : prévu ET réalisé -> "REALISE:\n...\n\nPREVU:\n..." ;
     un seul des deux -> le bloc seul, sans diviser. */
  var yt=gpYearText(affs, months);
  var years=Object.keys(yt).sort();
  h+='<div class="card"><h2>Export texte par année — versions EJ et CP</h2>'+
     '<p class="hint">Par année, <strong>2 versions (EJ / CP)</strong>, lignes « mm/AA : X k€ intitulé », blocs <strong>REALISE:</strong> / <strong>PREVU:</strong> ; bouton <strong>Copier</strong>. <span class="hint-ic" title="Une ligne par montant « mm/AA : X k€ intitulé », UNE SEULE FOIS par mois : sur un mois passé avec réalisé saisi, on garde le réalisé (REALISE:, immuable) ; sinon le saisi (PREVU:, mois en cours et à venir). Copier place le bloc dans le presse-papiers, à coller dans un autre logiciel. Options de décalage (RP en décembre seulement, pas de CP en décembre/janvier) appliquées ici.">i</span></p>';
  if(!years.length){ h+='<p class="hint">Aucune année avec au moins un EJ ou un CP dans cette sélection.</p>'; }
  else{
    h+='<table class="liste gp-year"><thead><tr><th style="width:70px">Année</th><th>Version EJ</th><th>Version CP</th><th></th></tr></thead><tbody>';
    years.forEach(function(y){
      h+='<tr><td><strong>'+y+'</strong></td>'+
         '<td><pre class="copyblk" id="gp-copy-ej-'+y+'">'+esc(gpYearBlock(yt[y].ej))+'</pre>'+
         '<button type="button" class="btn small" data-copyblk="gp-copy-ej-'+y+'" title="Copier le bloc EJ '+y+' dans le presse-papiers">Copier</button></td>'+
         '<td><pre class="copyblk" id="gp-copy-cp-'+y+'">'+esc(gpYearBlock(yt[y].cp))+'</pre>'+
         '<button type="button" class="btn small" data-copyblk="gp-copy-cp-'+y+'" title="Copier le bloc CP '+y+' dans le presse-papiers">Copier</button></td></tr>';
    });
    h+='</tbody></table>';
  }
  h+='</div>';

  var span=1+totalCols;
  mount('view-gp', h, function(w){
    wireGpHeader(w);
    w.addEventListener('click', function(ev){
      var px=ev.target.closest('button[data-gpexp]');
      if(px&&px.dataset&&px.dataset.gpexp){ var key=px.dataset.gpexp; state.ui.gpExp=state.ui.gpExp||{}; state.ui.gpExp[key]=!state.ui.gpExp[key]; save(); render(); return; }
      var cb=ev.target.closest('button[data-copyblk]');
      if(cb){
        var pre=w.querySelector('#'+cb.dataset.copyblk);
        var txt=pre?pre.textContent:'';
        copyTextToClipboard(txt).then(function(){
          var old=cb.textContent; cb.textContent='Copié !';
          setTimeout(function(){ cb.textContent=old; },1200);
        }, function(){ alert('Copie automatique indisponible : sélectionnez le bloc et copiez-le (Ctrl+C).'); });
        return;
      }
      var el=ev.target.closest('.gp-cell'); if(!el) return;
      var row=el.closest('tr');
      var next=row.nextSibling;
      var key=el.dataset.gp+'|'+el.dataset.scope+'|'+(el.dataset.m||'');
      var cspan=+(el.dataset.span)||span;
      var html=gpDetail(el.dataset.gp, el.dataset.scope, el.dataset.m||'', cspan) ||
               '<td colspan="'+cspan+'" class="gp-detail">Aucun détail.</td>';
      if(next && next.classList && next.classList.contains('gp-detail-row')){
        if(next.dataset.for===key){ next.parentNode.removeChild(next); return; }
        next.dataset.for=key; next.innerHTML=html; return;
      }
      var tr=document.createElement('tr');
      tr.className='gp-detail-row'; tr.dataset.for=key; tr.innerHTML=html;
      row.parentNode.insertBefore(tr, row.nextSibling);
    });
  });
}

function wireGpHeader(w){
  var rpd=w.querySelector('#gp-rpdec');
  if(rpd) rpd.addEventListener('change',function(){ state.ui.gpRpDec=rpd.checked; save(); render(); });
  var ncd=w.querySelector('#gp-nocpdec');
  if(ncd) ncd.addEventListener('change',function(){ state.ui.gpNoCpDec=ncd.checked; save(); render(); });
  var ncj=w.querySelector('#gp-nocpjan');
  if(ncj) ncj.addEventListener('change',function(){ state.ui.gpNoCpJan=ncj.checked; save(); render(); });
  var ald=w.querySelector('#gp-ardec');
  if(ald) ald.addEventListener('change',function(){ state.ui.gpARDec=ald.checked; save(); render(); });
  var ext=w.querySelector('#gp-ext');
  if(ext) ext.addEventListener('click',function(){ state.ui.ext=(state.ui.ext||0)+12; save(); render(); });
  var shr=w.querySelector('#gp-shrink');
  if(shr) shr.addEventListener('click',function(){ state.ui.ext=Math.max(0,(state.ui.ext||0)-12); save(); render(); });
}

