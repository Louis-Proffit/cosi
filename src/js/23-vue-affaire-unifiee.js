/* ================= Vue unifiée « Affaire » (branche onglet-affaire-unique) ================= */
/* Onglets risques&aléas / conso CP / révisions / réalisé / GP fusionnés en UN SEUL
   onglet avec UN SEUL tableau, pour UNE SEULE affaire à la fois (sélecteur dédié).
   Le tableau est mensuel : une colonne par EJ / risque / aléa de l'affaire (saisie
   de la consommation CP directement dans la cellule du mois), + colonnes de
   synthèse (EJ engagé, aléa, risque, CP prévu, RP, GP EJ/CP avec les 4 options,
   EJ/CP réels saisis, écarts, statut, actions). Tout est faisable depuis cet onglet :
   créer EJ/risque/aléa, fiches EJ, popup risque/aléa, liens vers structure/indices. */

/* Popup risque / aléa (comme la fiche EJ) : modifier la distribution / le % et
   lire la conséquence en termes d'EJ et de CP (espérance, haut, pondéré, Σ CP,
   apparitions). */
function openRisqueAleaPopup(ejId){
  var e=ejById(ejId); if(!e||(!isRisque(e)&&!isAlea(e))) return;
  var ov=document.createElement('div');
  ov.className='modal-ov';
  var risque=isRisque(e);
  var distOpts=(typeof DIST_TYPES!=='undefined'?DIST_TYPES:['fixe','uniforme','triangulaire','gauss']).map(function(t){ return '<option value="'+t+'"'+((e.distType||'fixe')===t?' selected':'')+'>'+t+'</option>'; }).join('');
  var dtOpts=(typeof DATE_TYPES!=='undefined'?DATE_TYPES:['ponctuelle','recurrente','uniforme']).map(function(t){ return '<option value="'+t+'"'+(e.dateType===t?' selected':'')+'>'+t+'</option>'; }).join('');
  function cons(){
    var occ=occOf(e);
    if(risque) return 'espérance '+fmt0(espDist(e))+' · haut '+fmt0(montantHaut(e))+' · pondéré (proba '+((e.probabilite==null?100:e.probabilite))+' %) '+fmt0(risquePondere(e))+
      ' · Σ CP (profil) '+fmt0(cpSumOf(e.id))+' · apparitions '+occ.length+(occ.length?' ('+mLong(occ[0].m)+' … '+mLong(occ[occ.length-1].m)+')':'');
    return 'montant aléa '+fmt0(montantOf(e))+' ('+(e.montantExplicite?'montant explicite':' '+(e.aleaPct==null?5:e.aleaPct)+' % du reste à payer')+')'+
      ' · Σ CP répartis '+fmt0(cpSumOf(e.id))+' · apparitions '+occ.length+(occ.length?' ('+mLong(occ[0].m)+' … '+mLong(occ[occ.length-1].m)+')':'');
  }
  ov.innerHTML='<div class="modal"><h2>'+(risque?'Risque ':'Aléa ')+esc(e.numero)+'</h2>'+
    '<p class="hint">'+stadeBadge(e)+' · affaire « '+esc(affaireName(e.affaireId))+' » · conséquence EJ/CP : <strong id="ra-cons">'+cons()+'</strong></p>'+
    '<div class="formrow">'+
      '<label class="fld">N°<input type="text" id="ra-num" value="'+esc(e.numero)+'" title="Référence (n°)"></label>'+
      '<label class="fld">Libellé<input type="text" id="ra-lib" value="'+esc(e.libelle||'')+'" title="Libellé"></label>'+
      '<label class="fld">Date (mois)'+monthInputHTML('ra-mois',e.mois,'','Date de l\'EJ / d\'apparition ponctuelle, MM/AAAA')+'</label>'+
    '</div>'+
    (risque?
      '<h3>Distribution du montant</h3>'+
      '<label class="fld" style="max-width:280px">Type de distribution<select id="rk-disttype">'+distOpts+'</select></label>'+
      '<div class="formrow" id="rk-distparams"></div>'+
      '<label class="fld" style="max-width:200px">Probabilité (%)<input type="text" inputmode="decimal" id="ra-proba" value="'+(e.probabilite==null?100:e.probabilite)+'" title="Probabilité d\'apparition du risque (0–100)"></label>'+
      '<h3>Date d\'apparition</h3>'+
      '<label class="fld" style="max-width:280px">Mode d\'apparition<select id="rk-datetype">'+dtOpts+'</select></label>'+
      '<div class="formrow" id="rk-dateparams"></div>'
    :
      '<h3>Montant de l\'aléa</h3>'+
      '<div class="formrow">'+
      '<label class="fld">Mode<input type="checkbox" id="ra-expl"'+(e.montantExplicite?' checked':'')+' title="Cocher = montant explicite en € (sinon % du reste à payer)"> montant explicite</label>'+
      '<label class="fld">Montant (€)<input type="text" inputmode="decimal" id="ra-montant" value="'+(e.montantExplicite?(+e.montant||0):'')+'" title="Montant explicite de l\'aléa (si coché)"></label>'+
      '<label class="fld">% du reste à payer<input type="text" inputmode="decimal" id="ra-pct" value="'+(e.montantExplicite?'':(e.aleaPct==null?5:e.aleaPct))+'" title="Pourcentage du reste à payer de l\'affaire (si montant non explicite)"></label>'+
      '</div>'+
      '<p class="hint">Un aléa ne se matérialise pas : il reste forfaitaire, réparti sur les mois restants de l\'opération.</p>'
    )+
    '<div class="formrow" style="margin-top:14px"><button type="button" class="btn primary" id="ra-save" title="Enregistrer et recalculer">Enregistrer</button>'+
    (risque?'<button type="button" class="btn" id="ra-mat" title="Matérialiser ce risque : il devient un EJ engagé à sa date (profil de CP réglable ensuite)">Matérialiser (→ EJ engagé)</button>':'')+
    '<button type="button" class="btn" id="ra-cancel">Annuler</button></div></div>';
  document.body.appendChild(ov);
  function fldHtml(f, val){
    if(f[2]==='month') return '<label class="fld">'+f[0]+monthInputHTML('',val,'',''+f[3],'data-pf="'+f[1]+'"')+'</label>';
    return '<label class="fld">'+f[0]+'<input type="text" inputmode="decimal" data-pf="'+f[1]+'" value="'+esc(val==null?'':val)+'" title="'+esc(f[3])+'"></label>';
  }
  if(risque){
    function renderParams(){
      var dt=ov.querySelector('#rk-disttype').value;
      ov.querySelector('#rk-distparams').innerHTML=((typeof RK_DIST_FIELDS!=='undefined'?RK_DIST_FIELDS:{})[dt]||[]).map(function(f){
        var val=e[f[1]];
        if(f[1]==='distA'&&dt==='fixe'&&val==null) val=e.montant;
        return fldHtml(f,val);
      }).join('');
      var dtt=ov.querySelector('#rk-datetype').value;
      ov.querySelector('#rk-dateparams').innerHTML=((typeof RK_DATE_FIELDS!=='undefined'?RK_DATE_FIELDS:{})[dtt]||[]).map(function(f){ return fldHtml(f,e[f[1]]); }).join('');
    }
    ov.querySelector('#rk-disttype').addEventListener('change',renderParams);
    ov.querySelector('#rk-datetype').addEventListener('change',renderParams);
    renderParams();
  }
  function close(){ ov.remove(); document.removeEventListener('keydown',escH); }
  function escH(ev){ if(ev.key==='Escape') close(); }
  document.addEventListener('keydown',escH);
  ov.addEventListener('click',function(ev){ if(ev.target===ov) close(); });
  ov.querySelector('#ra-cancel').addEventListener('click',close);
  var saveBtn=ov.querySelector('#ra-save');
  if(HIST.on){ saveBtn.disabled=true; Array.prototype.forEach.call(ov.querySelectorAll('input,select'),function(i){ i.disabled=true; }); }
  var matBtn=ov.querySelector('#ra-mat');
  if(matBtn) matBtn.addEventListener('click',function(){
    materialiserAt(e, parseIdxDate(ov.querySelector('#ra-mois').value)||e.mois||curMois());
    save(); close(); render();
  });
  saveBtn.addEventListener('click',function(){
    var numV=ov.querySelector('#ra-num').value.trim(); if(numV) e.numero=numV;
    e.libelle=ov.querySelector('#ra-lib').value;
    var dm3=parseIdxDate(ov.querySelector('#ra-mois').value); if(dm3) e.mois=dm3;
    if(risque){
      e.distType=ov.querySelector('#rk-disttype').value;
      e.dateType=ov.querySelector('#rk-datetype').value;
      var pr=parseMontant(ov.querySelector('#ra-proba').value); e.probabilite=(pr==null?100:pr);
      Array.prototype.forEach.call(ov.querySelectorAll('[data-pf]'),function(inp){
        var f=inp.dataset.pf, raw=String(inp.value).trim();
        if(f==='mois'||f==='dateA'||f==='dateB'){ var dm2=parseIdxDate(raw); if(raw==='') e[f]=null; else if(dm2) e[f]=dm2; }
        else if(f==='freq'){ var n3=parseFloat(raw); e[f]=isNaN(n3)?null:n3; }
        else { var n=parseMontant(raw); e[f]=(n==null?null:n); }
      });
      if(e.distType==='fixe') e.montant=(e.distA==null?e.montant:e.distA);
    } else {
      e.montantExplicite=!!ov.querySelector('#ra-expl').checked;
      var mv=parseMontant(ov.querySelector('#ra-montant').value); if(mv!=null) e.montant=mv;
      var pc=parseMontant(ov.querySelector('#ra-pct').value); if(pc!=null) e.aleaPct=pc;
    }
    recomputeProfils(state);
    save(); close(); render();
  });
}

/* Détail du calcul d'une cellule calculée du tableau Affaire (clic) :
   liste les contributeurs « X EJ de … + Y aléa de … » etc. */
function affDetailHTML(kind, aff, m, span){
  var ejs=ejsOfAffaire(aff.id), cur=curMois(), items=[], tot=0, h='';
  function line(lbl, v){ if(v) { items.push('<div>'+lbl+' : <span class="mono">'+fmt0(v)+'</span></div>'); tot+=v; } }
  if(kind==='ej'&&m){ ejs.forEach(function(e){ if(isMaterialise(e)&&e.mois===m) line(esc(e.numero)+' ('+stadeLabel(e)+')', montantOf(e)); }); h='Σ EJ '+mLong(m); }
  else if(kind==='cp'&&m){ ejs.forEach(function(e){ line(esc(e.numero)+' CP', cpPrevu(e,m)); }); h='Σ CP '+mLong(m); }
  else if(kind==='cpej'&&m){ ejs.forEach(function(e){ if(isMaterialise(e)) line('EJ '+esc(e.numero)+' CP', cpPrevu(e,m)); }); h='Σ CP des EJ '+mLong(m); }
  else if(kind==='rap'&&m){
    var ejC2=0, cpC2=0;
    ejs.forEach(function(e){ if(isMaterialise(e)){ if(e.mois<=m) ejC2+=montantOf(e); cpC2+=cpSumOf(e.id,m); } });
    h='Reste à payer à '+mLong(m)+' = EJ engagés cumulés − CP consommés cumulés';
    items.push('<div>EJ engagés cumulés (≤ '+mLabel(m)+') : <span class="mono">'+fmt0(ejC2)+'</span></div>');
    items.push('<div>CP consommés cumulés : <span class="mono">'+fmt0(cpC2)+'</span></div>');
    tot=ejC2-cpC2;
    items.push('<div><strong>Reste à payer = '+fmt0(tot)+'</strong></div>');
  }
  else if(kind==='autre'&&m){
    h='Somme autre '+mLong(m)+' = aléas + risques + RP';
    ejs.forEach(function(e){ if(isAlea(e)) line('aléa '+esc(e.numero), montantOf(e)*occW(e,m)); else if(isRisque(e)) line('risque '+esc(e.numero)+' (pondéré)', risquePondere(e)*occW(e,m)); });
    items.push('<div>RP : <span class="mono">'+fmt0(revisionMois(aff,m))+'</span></div>');
    tot=0; ejs.forEach(function(e){ if(isAlea(e)) tot+=montantOf(e)*occW(e,m); else if(isRisque(e)) tot+=risquePondere(e)*occW(e,m); }); tot+=revisionMois(aff,m);
  }
  else if(kind==='footcpej'){ h='Σ CP des EJ (toute la période)'; var t0=0; ejs.forEach(function(e){ if(isMaterialise(e)){ t0+=cpSumOf(e.id); line('EJ '+esc(e.numero)+' Σ CP', cpSumOf(e.id)); } }); tot=t0; }
  else if(kind==='footautre'){ h='Σ autre = aléas + risques + RP (période)'; ejs.forEach(function(e){ if(isAlea(e)) line('aléa '+esc(e.numero), montantOf(e)); else if(isRisque(e)) line('risque '+esc(e.numero)+' (espérance)', espDist(e)); }); var rpT4=revisionTotale(aff, scopeMonths(aff.opId,aff.id)); items.push('<div>RP : <span class="mono">'+fmt0(rpT4)+'</span></div>'); tot=sommeMontant(ejs.filter(isAlea))+ejs.filter(isRisque).reduce(function(s,e){ return s+espDist(e); },0)+rpT4; }
  else if(kind==='synthej'&&m){ ejs.forEach(function(e){ if(isMaterialise(e)&&e.mois===m) line('EJ '+esc(e.numero), montantOf(e)); else if(isAlea(e)) line('aléa '+esc(e.numero), montantOf(e)*occW(e,m)); else if(isRisque(e)) line('risque '+esc(e.numero)+' (pondéré)', risquePondere(e)*occW(e,m)); }); h='Synthèse EJ '+mLong(m); }
  else if(kind==='synthcp'&&m){ ejs.forEach(function(e){ line(esc(e.numero)+' CP', cpPrevu(e,m)); }); h='Synthèse CP '+mLong(m); }
  else if(kind==='rp'&&m){
    var r=realOf(aff.id,m), base=(r!=null)?(r.cp||0):cpMoisAffAll(aff,m);
    var ind=indiceApplicable(aff,m), i0=indiceRef(aff);
    h='RP '+mLong(m)+' = base CP × (I/I₀−1)';
    items.push('<div>base CP ('+(r!=null?'réalisé saisi':'prévu: EJ+risques+aléas')+') : <span class="mono">'+fmt0(base)+'</span></div>');
    ejs.forEach(function(e){ var v=cpPrevu(e,m); if(v>0) items.push('<div>· CP '+esc(e.numero)+' : <span class="mono">'+fmt0(v)+'</span></div>'); });
    items.push('<div>I = '+fmtIdx(ind)+' · I₀ = '+fmtIdx(i0)+' · I/I₀−1 = '+(ind!=null&&i0?(ind/i0-1).toLocaleString('fr-FR',{maximumFractionDigits:4}):'—')+'</div>');
    tot=revisionMois(aff,m);
    items.push('<div><strong>RP = '+fmt0(tot)+'</strong></div>');
  }
  else if((kind==='gpej'||kind==='gpcp')&&m){ return gpDetail(kind==='gpej'?'sej':'scp','a:'+aff.id,m,span); }
  else if((kind==='ecej'||kind==='eccp')&&m){
    var r2=realOf(aff.id,m), hasR=r2&&(Object.prototype.hasOwnProperty.call(r2,'ej')||Object.prototype.hasOwnProperty.call(r2,'cp'));
    var ejM=0, cpM=0; ejs.forEach(function(e){ if(isMaterialise(e)){ if(e.mois===m) ejM+=montantOf(e); cpM+=cpPrevu(e,m); } });
    var val=(kind==='ecej')?((hasR?r2.ej||0:0)-ejM):((hasR?r2.cp||0:0)-cpM);
    h='Écart '+(kind==='ecej'?'EJ':'CP')+' '+mLong(m);
    items.push('<div>réalisé saisi : <span class="mono">'+fmt0(hasR?(kind==='ecej'?r2.ej||0:r2.cp||0):0)+'</span> − prévu : <span class="mono">'+fmt0(kind==='ecej'?ejM:cpM)+'</span> = <strong>'+fmtS(val)+'</strong></div>');
    tot=val;
  }
  else if(kind==='footcp'){ /* total CP d'un item sur toute la période */ var e0=ejById(m); h='Σ CP '+esc(e0?e0.numero:'?')+' (toute la période)'; if(e0){ var months0=scopeMonths(aff.opId,aff.id); months0.forEach(function(mm){ var v=cpPrevu(e0,mm); if(v>0) line(mLabel(mm), v); }); tot=cpSumOf(e0.id); } }
  else if(kind==='footej'){ h='Σ EJ (EJ seuls, toute la période)'; ejs.forEach(function(e){ if(isMaterialise(e)) line(esc(e.numero), montantOf(e)); }); tot=sommeMontant(ejs.filter(isMaterialise)); }
  else if(kind==='footrp'){ h='Σ RP (toute la période)'; scopeMonths(aff.opId,aff.id).forEach(function(mm){ var v=revisionMois(aff,mm); if(v) line(mLabel(mm), v); }); tot=revisionTotale(aff, scopeMonths(aff.opId,aff.id)); }
  else if(kind==='footcpall'){ h='Somme des CP (tous EJ/risques/aléas)'; ejs.forEach(function(e){ line(esc(e.numero)+' Σ CP', cpSumOf(e.id)); }); tot=0; ejs.forEach(function(e){ tot+=cpSumOf(e.id); }); }
  else if(kind==='footejar'){ h='Somme EJ + aléas + risques + RP'; ejs.forEach(function(e){ if(isMaterialise(e)) line('EJ '+esc(e.numero), montantOf(e)); else if(isAlea(e)) line('aléa '+esc(e.numero), montantOf(e)); else if(isRisque(e)) line('risque '+esc(e.numero)+' (espérance)', espDist(e)); }); tot=sommeMontant(ejs.filter(isMaterialise))+sommeMontant(ejs.filter(isAlea))+ejs.filter(isRisque).reduce(function(s,e){ return s+espDist(e); },0)+revisionTotale(aff, scopeMonths(aff.opId,aff.id)); items.push('<div>RP (période) : <span class="mono">'+fmt0(revisionTotale(aff, scopeMonths(aff.opId,aff.id)))+'</span></div>'); }
  else if(kind==='footcpar'){ h='Somme CP (EJ+risques+aléas) + RP'; tot=0; ejs.forEach(function(e){ tot+=cpSumOf(e.id); }); var rpT=revisionTotale(aff, scopeMonths(aff.opId,aff.id)); items.push('<div>Σ CP tous montants : <span class="mono">'+fmt0(tot)+'</span></div>'); items.push('<div>RP (période) : <span class="mono">'+fmt0(rpT)+'</span></div>'); tot+=rpT; }
  else if(kind==='foottotalej'){ h='TOTAL EJ (tout compris : EJ + aléas + risques + RP)'; ejs.forEach(function(e){ if(isMaterialise(e)) line('EJ '+esc(e.numero), montantOf(e)); else if(isAlea(e)) line('aléa '+esc(e.numero), montantOf(e)); else if(isRisque(e)) line('risque '+esc(e.numero)+' (haut)', montantHaut(e)); }); var rpT2=revisionTotale(aff, scopeMonths(aff.opId,aff.id)); items.push('<div>RP : <span class="mono">'+fmt0(rpT2)+'</span></div>'); tot=sommeMontant(ejs)+rpT2; }
  else if(kind==='foottotalcp'){ h='TOTAL CP (tout compris : CP + RP)'; ejs.forEach(function(e){ line(esc(e.numero)+' Σ CP', cpSumOf(e.id)); }); var rpT3=revisionTotale(aff, scopeMonths(aff.opId,aff.id)); items.push('<div>RP : <span class="mono">'+fmt0(rpT3)+'</span></div>'); tot=0; ejs.forEach(function(e){ tot+=cpSumOf(e.id); }); tot+=rpT3; }
  else return '';
  return '<td colspan="'+(span||4)+'" class="gp-detail"><strong>'+h+' = '+fmt0(tot)+' :</strong>'+(items.join('')||'<div>—</div>')+'</td>';
}

/* renderAffaire avec conservation du scroll horizontal (jamais de retour à gauche
   après une saisie) : on mémorise scrollLeft du .grid-wrap et on le restaure après
   le re-render, et on rend le focus à la cellule saisie pour enchaîner. */
function renderAffaireKS(){
  var host=document.getElementById('view-affaire');
  var gw=host&&host.querySelector?host.querySelector('.grid-wrap'):null;
  var sl=gw&&gw.scrollLeft?gw.scrollLeft:0;
  var active=document.activeElement, activeKey=active&&active.dataset?(active.dataset.cp||active.dataset.real||''):'';
  renderAffaire();
  var host2=document.getElementById('view-affaire');
  var gw2=host2&&host2.querySelector?host2.querySelector('.grid-wrap'):null;
  if(gw2){ try{ gw2.scrollLeft=sl; }catch(e){} }
  if(activeKey){
    var w2=host2&&host2.children?host2.children[0]:null;
    var el2=w2&&w2.querySelector? w2.querySelector('[data-cp="'+activeKey+'"]')||w2.querySelector('[data-real="'+activeKey+'"]') : null;
    if(el2&&el2.focus){ el2.focus(); if(el2.select) el2.select(); }
  }
}

function renderAffaire(){
  var opId=state.ui.op||'';
  var affsAll=scopedAffaires(opId,'');
  /* une seule affaire à la fois : affaire filtrée, sinon 1ʳᵉ affaire de l'opération */
  var affId=state.ui.aff||'';
  if(!affId||!affsAll.some(function(a){ return a.id===affId; })) affId=affsAll.length?affsAll[0].id:'';
  var aff=affaireById(affId);
  var cur=curMois();

  var h='<div class="toolbar">'+filtersBarHTML()+
    '<label class="fld">Affaire affichée<select id="aff-solo" title="Une seule affaire à la fois dans ce tableau">'+
      affsAll.map(function(a){ return '<option value="'+a.id+'"'+(a.id===affId?' selected':'')+'>'+esc(a.nom)+'</option>'; }).join('')+
    '</select></label>'+
    (aff?'<button class="btn" id="af-addej" title="Créer un EJ programmé sur cette affaire (fiche EJ ensuite)">+ EJ</button>'+
          '<button class="btn" id="af-addrk" title="Créer un risque sur cette affaire (popup risque ensuite)">+ Risque</button>'+
          '<button class="btn" id="af-addal" title="Créer un aléa forfaitaire sur cette affaire (popup aléa ensuite)">+ Aléa</button>':'')+
    (aff?'<button class="btn" data-goto="structure" data-aff="'+aff.id+'" title="Modifier cette affaire dans « Opérations & affaires »">Éditer l\'affaire</button>':'')+
    '<button class="btn" data-goto="indices" title="Saisir les séries d\'indices dans « Indices »">Séries d\'indices</button>'+
    /* les 4 options s'appliquent UNIQUEMENT aux 2 dernières colonnes (GP EJ / GP CP) */
    '<label class="gp-chk" title="GP EJ/CP uniquement : la ligne de décembre ne contient que la somme des RP de l\'année ; l\'EJ de décembre est mis en novembre et le CP de décembre en janvier"><input type="checkbox" id="gp-rpdec"'+(state.ui.gpRpDec?' checked':'')+'> RP en décembre seulement</label>'+
    '<label class="gp-chk" title="GP EJ/CP uniquement : décale les CP de décembre vers janvier de l\'année suivante (pas les RP)"><input type="checkbox" id="gp-nocpdec"'+(state.ui.gpNoCpDec?' checked':'')+'> Pas de CP en décembre</label>'+
    '<label class="gp-chk" title="GP EJ/CP uniquement : décale les CP de janvier vers février (cumulatif)"><input type="checkbox" id="gp-nocpjan"'+(state.ui.gpNoCpJan?' checked':'')+'> Pas de CP en janvier</label>'+
    '<label class="gp-chk" title="GP EJ/CP uniquement : aléas ET risques de l\'année regroupés en décembre, EJ et CP"><input type="checkbox" id="gp-ardec"'+(state.ui.gpARDec?' checked':'')+'> Aléa et risque en décembre</label>'+
    '</div>';

  if(!aff){
    h+='<div class="card"><div class="empty">Aucune affaire dans cette sélection. Créez-en une dans « Opérations &amp; affaires ».</div></div>';
    mount('view-affaire', h, function(w){
      var sel=w.querySelector('#aff-solo');
      if(sel) sel.addEventListener('change',function(){ state.ui.aff=sel.value; save(); render(); });
    });
    return;
  }

  /* colonnes groupées par type : EJ, puis Σ EJ / Σ CP / reste à payer, puis aléas, puis risques */
  var stadeOrder={prog:0,engage:1,alea:2,risque:3};
  var ejs=ejsOfAffaire(aff.id).slice().sort(function(x,y){
    var sx=stadeOrder[x.stade]||0, sy=stadeOrder[y.stade]||0;
    if(sx!==sy) return sx-sy;
    return x.mois<y.mois?-1:(x.mois>y.mois?1:0);
  });
  var ejList=ejs.filter(isMaterialise), alList=ejs.filter(isAlea), rkList=ejs.filter(isRisque);
  var months=scopeMonths(aff.opId, aff.id);
  var foc=state.ui.focusCol||'';

  function fmtS(n){ return (n>0?'+':'')+fmt0(n); }
  function badgeEcart(val,tol,kind,show){
    if(!show) return '<span class="badge">—</span>';
    if(Math.abs(val)<=tol) return '<span class="badge ok">'+kind+' ok</span>';
    if(val<0) return '<span class="badge over">'+kind+' retard '+fmtM(-val)+'</span>';
    return '<span class="badge warn">'+kind+' avance '+fmtM(val)+'</span>';
  }

  /* en-tête compact mais complet, cliquable EN ENTIER -> popup : 1 info par ligne
     (n° + badge, intitulé, montant — espérance pour un risque, montant pour un aléa).
     Le reste du détail (date, profil, check Σ CP, distribution…) est dans la popup. */
  var head='<tr><th class="scol sc1">Mois</th>';
  function itemTh(e, sep){
    var popAttr=(isRisque(e)||isAlea(e))?('data-rkpop="'+e.id+'"'):('data-ejpop="'+e.id+'"');
    var popTip=(isRisque(e)||isAlea(e))?('Popup '+(isRisque(e)?'risque':'aléa')+' '+esc(e.numero)+' : tout modifier (distribution/%, date, proba) + conséquence EJ/CP — CLIC N\'IMPORTE OÙ dans l\'en-tête'):('Fiche de l\'EJ '+esc(e.numero)+' : n°, libellé, montant, date, profil CP, Σ CP — CLIC N\'IMPORTE OÙ dans l\'en-tête');
    var mtTxt=isRisque(e)?('esp. '+fmt0(espDist(e))):fmt0(montantOf(e));
    return '<th class="dcol'+(foc===e.id?' col-focus':'')+(sep?' sep':'')+'" '+popAttr+' title="'+popTip+'">'+
      '<div>'+stadeBadge(e)+' <button type="button" class="ej-btn" tabindex="-1">'+esc(e.numero)+'</button></div>'+
      '<div class="hdr-sub">'+esc(e.libelle||'—')+'</div>'+
      '<div class="hdr-sub"><strong>'+mtTxt+'</strong></div></th>';
  }
  ejList.forEach(function(e){ head+=itemTh(e); });
  head+='<th class="num tot-h sep" title="Σ EJ ce mois (EJ seuls) — détail au clic">Σ EJ</th>'+
    '<th class="num tot-h" title="Σ CP des EJ ce mois — détail au clic">Σ CP</th>'+
    '<th class="num tot-h" title="Reste à payer à cette date = EJ engagés cumulés − CP consommés cumulés (finit à 0) — détail au clic">Reste à payer</th>';
  alList.forEach(function(e,i){ head+=itemTh(e, i===0); });
  rkList.forEach(function(e,i){ head+=itemTh(e, i===0); });
  head+=
    '<th class="num tot-h sep" title="Indice du marché ce mois (formule de l\'affaire) ; I/I₀ recalé à 1 à la date de réf. — pas de pied">Indice I/I₀</th>'+
    '<th class="num tot-h" title="RP du mois = base CP (réalisée si saisie, sinon CP EJ+risques+aléas) × (I/I₀−1) — détail au clic">RP</th>'+
    '<th class="num tot-h" title="Somme autre = aléas + risques + RP du mois — détail au clic">Somme autre</th>'+
    '<th class="num tot-h" title="Synthèse EJ du mois (EJ + aléas + risques) — détail au clic">Synthèse EJ</th>'+
    '<th class="num tot-h" title="Synthèse CP du mois (toutes les colonnes) — détail au clic">Synthèse CP</th>'+
    '<th class="num tot-h" title="EJ réalisé saisi (vérité quand saisi, même à 0)">EJ réalisé</th>'+
    '<th class="num tot-h" title="CP réalisé saisi (vérité quand saisi, même à 0)">CP réalisé</th>'+
    '<th class="num tot-h" title="Écart EJ = réalisé − engagé (mois écoulés) + statut + actions si nécessaire">Écart EJ</th>'+
    '<th class="num tot-h" title="Écart CP = réalisé − prévu (mois écoulés)">Écart CP</th>'+
    '<th class="num tot-h" title="GP à saisir, synthèse EJ — les 4 options cochées s\'appliquent ICI">GP EJ</th>'+
    '<th class="num tot-h" title="GP à saisir, synthèse CP — les 4 options cochées s\'appliquent ICI">GP CP</th></tr>';
  var NB=1+ejs.length+3+11; /* Mois + items + ΣEJ/ΣCP/RAP + 11 colonnes de synthèse */

  var body=extRow('avant', NB);
  months.forEach(function(m){
    var ejM=0, cpEjM=0, cpM=0, aeM=0, rkM=0;
    ejs.forEach(function(e){
      if(isMaterialise(e)){ if(e.mois===m) ejM+=montantOf(e); cpEjM+=cpPrevu(e,m); cpM+=cpPrevu(e,m); }
      else { cpM+=cpPrevu(e,m); if(isAlea(e)) aeM+=montantOf(e)*occW(e,m); else if(isRisque(e)) rkM+=risquePondere(e)*occW(e,m); }
    });
    var rp=revisionMois(aff,m);
    var ind=indiceApplicable(aff,m), i0=indiceRef(aff);
    var gEj=gpVal('sej',aff,m), gCp=gpVal('scp',aff,m);
    var past=m<cur;
    var r=realOf(aff.id,m);
    var hasR=r&&(Object.prototype.hasOwnProperty.call(r,'ej')||Object.prototype.hasOwnProperty.call(r,'cp'));
    var eEj=(hasR?r.ej||0:0)-ejM, eCp=(hasR?r.cp||0:0)-cpM;
    var tolEj=Math.max(1,ejM*0.01), tolCp=Math.max(1,cpM*0.02);
    var inco=past&&hasR&&(Math.abs(eEj)>tolEj||Math.abs(eCp)>tolCp);
    var showEj=ejM>0||(hasR&&Object.prototype.hasOwnProperty.call(r,'ej'));
    var showCp=cpM>0||(hasR&&Object.prototype.hasOwnProperty.call(r,'cp'));
    var statut;
    if(past&&!hasR) statut='<span class="badge warn" title="Mois écoulé sans réalisé saisi (saisi à 0 = constatation)">non saisi</span>';
    else if(past||m===cur) statut=hasR?(badgeEcart(eEj,tolEj,'EJ',showEj)+' '+badgeEcart(eCp,tolCp,'CP',showCp)):(m===cur?'<span class="badge info">à saisir</span>':'');
    else statut='';
    var actions='';
    if(inco){
      if(Math.abs(eEj)>tolEj){
        actions+='<button class="btn small" data-act="const-ej" data-k="'+aff.id+'|'+m+'" title="Constater le prévu comme réalisé (EJ)">EJ = prévu</button> ';
        actions+='<button class="btn small" data-act="ajej" data-k="'+aff.id+'|'+m+'" data-v="'+Math.round(eEj)+'" title="Ajuster le montant de l\'EJ de l\'écart">Ajuster EJ</button> ';
      }
      if(Math.abs(eCp)>tolCp) actions+='<button class="btn small" data-act="const-cp" data-k="'+aff.id+'|'+m+'" title="Constater le prévu comme réalisé (CP)">CP = prévu</button>';
    }
    var rEjV=(hasR&&Object.prototype.hasOwnProperty.call(r,'ej'))?fmt0(r.ej||0):'';
    var rCpV=(hasR&&Object.prototype.hasOwnProperty.call(r,'cp'))?fmt0(r.cp||0):'';
    body+='<tr data-m="'+m+'"'+(m===cur?' class="gp-cur"':'')+'><td class="scol sc1 mh'+(m===cur?' cur':'')+'">'+mLong(m)+(past?'':' (à venir)')+'</td>';
    function itemTd(e, sep){
      var p=profilOf(e), v=cpPrevu(e,m), td;
      var cls='dcol'+(sep?' sep':'')+(isMaterialise(e)&&e.mois&&m<e.mois?' cp-avant':(isMaterialise(e)&&p.type==='perso'?'':' cp-lock'));
      if(isMaterialise(e)&&e.mois&&m<e.mois){
        td='<td class="'+cls+'" data-ejcol="'+e.id+'" title="Pas de CP avant '+mLabel(e.mois)+' (mois de l\'EJ '+esc(e.numero)+') — cellule verrouillée">'+(v?fmt0(v):'')+'</td>';
      }else if(isMaterialise(e)&&p.type==='perso'){
        td='<td class="'+cls+'" data-ejcol="'+e.id+'"><input type="text" inputmode="decimal" class="cell" data-cp="'+e.id+'|'+m+'" value="'+(v?v:'')+'" title="CP consommés en '+mLabel(m)+' pour '+esc(e.numero)+' (profil personnalisé : saisie libre)"></td>';
      }else{
        td='<td class="'+cls+'" data-ejcol="'+e.id+'" title="'+(isMaterialise(e)?'Calculé selon le profil '+p.type:'CP du '+stadeLabel(e).toLowerCase()+' selon son profil')+'">'+(v?fmt0(v):'')+'</td>';
      }
      return td;
    }
    ejList.forEach(function(e){ body+=itemTd(e); });
    body+='<td class="num mono ccell tot gp-cell sep" data-affdet="ej|'+m+'" title="Σ EJ ce mois (EJ seuls) — détail au clic">'+fmt0(ejM)+'</td>'+
      '<td class="num mono ccell tot gp-cell" data-affdet="cpej|'+m+'" title="Σ CP des EJ ce mois — détail au clic">'+fmt0(cpEjM)+'</td>'+
      '<td class="num mono ccell tot gp-cell" data-affdet="rap|'+m+'" title="Reste à payer à '+mLong(m)+' = EJ cumulés − CP cumulés — détail au clic">'+fmt0(resteAPayer(aff,m))+'</td>';
    alList.forEach(function(e,i){ body+=itemTd(e, i===0); });
    rkList.forEach(function(e,i){ body+=itemTd(e, i===0); });
    body+='<td class="num mono ccell tot sep" title="Indice du marché ce mois (formule de l\'affaire) ; I/I₀ recalé à 1 à la date de réf. '+(aff.dateRefRev||'—')+' — pas de pied pour l\'indice">'+(ind==null?'—':fmtIdx(ind)+' <span class="muted">I/I₀='+(i0?(ind/i0).toLocaleString('fr-FR',{maximumFractionDigits:3}):'?')+'</span>')+'</td>'+
      '<td class="num mono ccell tot gp-cell'+(r?' gp-real':'')+'" data-affdet="rp|'+m+'" title="RP = base CP × (I/I₀−1) — détail au clic">'+fmt0(rp)+'</td>'+
      '<td class="num mono ccell tot gp-cell" data-affdet="autre|'+m+'" title="Somme autre = aléas + risques + RP du mois — détail au clic">'+fmt0(aeM+rkM+rp)+'</td>'+
      '<td class="num mono ccell tot gp-cell" data-affdet="synthej|'+m+'" title="Synthèse EJ (EJ+aléas+risques) — détail au clic">'+fmt0(ejM+aeM+rkM)+'</td>'+
      '<td class="num mono ccell tot gp-cell" data-affdet="synthcp|'+m+'" title="Synthèse CP (toutes les colonnes) — détail au clic">'+fmt0(cpM)+'</td>'+
      '<td class="num"><input type="text" inputmode="decimal" class="real-in" data-real="'+aff.id+'|'+m+'" data-f="ej" value="'+rEjV+'"'+(m<=cur?'':' disabled')+' title="EJ réalisé en '+mLong(m)+' (« 0 » = constaté à zéro, distinct de non saisi)"></td>'+
      '<td class="num"><input type="text" inputmode="decimal" class="real-in" data-real="'+aff.id+'|'+m+'" data-f="cp" value="'+rCpV+'"'+(m<=cur?'':' disabled')+' title="CP réalisé en '+mLong(m)+' (« 0 » = constaté à zéro)"></td>'+
      '<td class="num mono gp-cell" data-affdet="ecej|'+m+'" title="Écart EJ = réalisé − engagé — détail au clic ; statut et actions dans la case">'+(past?fmtS(eEj):'')+' '+statut+' '+actions+'</td>'+
      '<td class="num mono gp-cell" data-affdet="eccp|'+m+'" title="Écart CP = réalisé − prévu — détail au clic">'+(past?fmtS(eCp):'')+'</td>'+
      '<td class="num mono ccell tot gp-cell'+(r?' gp-real':'')+'" data-affdet="gpej|'+m+'" title="GP EJ (les 4 options s\'appliquent ici) — détail au clic">'+fmt0(gEj)+'</td>'+
      '<td class="num mono ccell tot gp-cell'+(r?' gp-real':'')+'" data-affdet="gpcp|'+m+'" title="GP CP (les 4 options s\'appliquent ici) — détail au clic">'+fmt0(gCp)+'</td></tr>';
  });
  body+=extRow('après', NB);

  /* pied de colonne pour tout SAUF l'indice : totaux par item (cliquables), Σ EJ, Σ CP,
     puis Σ RP, somme EJ+AR+RP, somme CP+AR+RP, Total EJ, Total CP */
  var foot='<tr class="gp-tot"><td class="scol sc1">Total</td>';
  function footTotCell(e, sep){ return '<td class="dcol ccell tot gp-cell'+(sep?' sep':'')+'" data-affdet="footcp|'+e.id+'" title="Σ CP de '+esc(e.numero)+' (toute la période) — détail au clic">'+fmt0(cpSumOf(e.id))+'</td>'; }
  ejList.forEach(function(e){ foot+=footTotCell(e); });
  var sumEj=sommeMontant(ejList), cpEjTot=0; ejList.forEach(function(e){ cpEjTot+=cpSumOf(e.id); });
  foot+='<td class="num mono ccell tot gp-cell sep" data-affdet="footej|" title="Σ EJ (EJ seuls) — détail au clic">'+fmt0(sumEj)+'</td>'+
    '<td class="num mono ccell tot gp-cell" data-affdet="footcpej|" title="Σ CP des EJ (toute la période) — détail au clic">'+fmt0(cpEjTot)+'</td>'+
    '<td class="num mono ccell tot" title="Reste à payer en fin de période (0)">'+fmt0(resteAPayer(aff, months[months.length-1]||cur))+'</td>';
  alList.forEach(function(e,i){ foot+=footTotCell(e, i===0); });
  rkList.forEach(function(e,i){ foot+=footTotCell(e, i===0); });
  var cpAll=0; ejs.forEach(function(e){ cpAll+=cpSumOf(e.id); });
  var rpTot=revisionTotale(aff, months);
  var earTot=sommeMontant(ejs.filter(isAlea))+ejs.filter(isRisque).reduce(function(s,e){ return s+espDist(e); },0);
  foot+='<td class="sep"></td>'+ /* indice : pas de pied */
    '<td class="num mono ccell tot gp-cell" data-affdet="footrp|" title="Σ RP (toute la période) — détail au clic">'+fmt0(rpTot)+'</td>'+
    '<td class="num mono ccell tot gp-cell" data-affdet="footautre|" title="Σ autre (aléas+risques+RP) — détail au clic">'+fmt0(earTot+rpTot)+'</td>'+
    '<td class="num mono ccell tot gp-cell" data-affdet="footejar|" title="Somme EJ comprenant aléas, risques et RP — détail au clic">'+fmt0(sumEj+earTot+rpTot)+'</td>'+
    '<td class="num mono ccell tot gp-cell" data-affdet="footcpall|" title="Somme CP (toute la période) — détail au clic">'+fmt0(cpAll)+'</td>'+
    '<td class="num mono ccell tot gp-cell" data-affdet="foottotalej|" title="TOTAL EJ (tout compris) — détail au clic">'+fmt0(sommeMontant(ejs)+rpTot)+'</td>'+
    '<td class="num mono ccell tot gp-cell" data-affdet="foottotalcp|" title="TOTAL CP (tout compris) — détail au clic">'+fmt0(cpAll+rpTot)+'</td>'+
    '<td colspan="4"></td></tr>';

  h+='<div class="card"><h2>Affaire « '+esc(aff.nom)+' » — détail par mois</h2>'+
     '<p class="hint">UN seul tableau : 1 colonne par EJ (Σ EJ, Σ CP, reste à payer juste après), puis aléas, puis risques (en-tête compact : n° → fiche/popup avec tout le détail), puis Indice, RP, Somme autre (aléa+risque+RP), Synthèses EJ/CP, EJ/CP réalisés, écarts (statut + actions dans la case), et enfin <strong>GP EJ / GP CP</strong> — seules ces 2 dernières colonnes subissent les 4 options cochées. Cellules calculées cliquables (détail juste sous la ligne). Flèches du clavier = saisie des cases voisines.</p>'+
     '<div class="grid-wrap"><table class="grid conso affgrid"><thead>'+head+'</thead><tbody>'+body+'</tbody><tfoot>'+foot+'</tfoot></table></div></div>';

  mount('view-affaire', h, function(w){
    var sel=w.querySelector('#aff-solo');
    if(sel) sel.addEventListener('change',function(){ state.ui.aff=sel.value; save(); render(); });
    /* les 4 options GP (appliquées aux colonnes GP EJ / GP CP via gpVal) */
    [['gp-rpdec','gpRpDec'],['gp-nocpdec','gpNoCpDec'],['gp-nocpjan','gpNoCpJan'],['gp-ardec','gpARDec']].forEach(function(p){
      var cb=w.querySelector('#'+p[0]);
      if(cb) cb.addEventListener('change',function(){ state.ui[p[1]]=cb.checked; save(); render(); });
    });
    /* flèches : saisir les cases à proximité (haut/bas/gauche/droite) de la sélectionnée */
    w.addEventListener('keydown', function(ev){
      if(!ev.key||ev.key.indexOf('Arrow')!==0) return;
      var t=ev.target; if(!t||!t.closest) return;
      var cell=t.closest('td'); if(!cell) return;
      var ins=[];
      try{ ins=Array.prototype.slice.call(w.querySelectorAll('table input')); }catch(e){ ins=[]; }
      if(!ins.length) return;
      var i=ins.indexOf(t); if(i<0) return;
      var row=cell.closest('tr');
      var cols=row&&row.querySelectorAll? row.querySelectorAll('td').length : 1;
      var ni=i+(ev.key==='ArrowRight'?1:ev.key==='ArrowLeft'?-1:ev.key==='ArrowDown'?cols:-cols);
      if(ni<0) ni=0; if(ni>=ins.length) ni=ins.length-1;
      ev.preventDefault();
      ins[ni].focus(); if(ins[ni].select) ins[ni].select();
    });
    function addItem(stade, extra){
      var n=state.ejs.filter(function(e){ return e.affaireId===aff.id; }).length+1;
      var ej9={id:uid(),affaireId:aff.id,numero:(stade==='risque'?'RK-':stade==='alea'?'AL-':'EJ-')+String(n).padStart(2,'0'),libelle:'',stade:stade,mois:curMois(),montant:0};
      for(var k in extra) ej9[k]=extra[k];
      state.ejs.push(ej9); recomputeProfils(state);
      state.ui.focusCol=ej9.id; save(); renderAffaireKS();
      return ej9;
    }
    var addb=w.querySelector('#af-addej');
    if(addb) addb.addEventListener('click',function(){ addItem('prog',{}); });
    var addrk=w.querySelector('#af-addrk');
    if(addrk) addrk.addEventListener('click',function(){ addItem('risque',{distType:'fixe',distA:0,probabilite:100,dateType:'ponctuelle'}); });
    var addal=w.querySelector('#af-addal');
    if(addal) addal.addEventListener('click',function(){ addItem('alea',{aleaPct:5,montantExplicite:false,dateType:'ponctuelle'}); });
    w.addEventListener('click', function(ev){
      var ad=ev.target.closest('[data-affdet]');
      if(ad&&ad.dataset&&ad.dataset.affdet){
        var p=ad.dataset.affdet.split('|'), kind=p[0], m=p[1]||'';
        var row=ad.closest('tr'), next=row.nextSibling, key='affdet|'+kind+'|'+m;
        var html=affDetailHTML(kind, aff, m, NB);
        if(next&&next.classList&&next.classList.contains('gp-detail-row')){ if(next.dataset.for===key){ next.parentNode.removeChild(next); return; } next.dataset.for=key; next.innerHTML=html; return; }
        var tr=document.createElement('tr'); tr.className='gp-detail-row'; tr.dataset.for=key; tr.innerHTML=html;
        row.parentNode.insertBefore(tr, row.nextSibling);
        return;
      }
      var rp2=ev.target.closest('[data-rkpop]');
      if(rp2){ openRisqueAleaPopup(rp2.dataset.rkpop); return; }
      var ep=ev.target.closest('[data-ejpop]');
      if(ep){ openProfilPopup(ep.dataset.ejpop); return; }
      var b=ev.target.closest('button[data-act]'); if(!b) return;
      var k=b.dataset.k, pp=k.split('|'), m=pp[1], act=b.dataset.act;
      var cur3=state.realise[k]?deepCopy(state.realise[k]):{};
      if(act==='const-ej'){ var ejM=0; ejs.forEach(function(e){ if(isMaterialise(e)&&e.mois===m) ejM+=montantOf(e); }); cur3.ej=ejM; }
      else if(act==='const-cp'){ var cpM=0; ejs.forEach(function(e){ if(isMaterialise(e)) cpM+=cpPrevu(e,m); }); cur3.cp=cpM; }
      else if(act==='ajej'){
        var vA=parseFloat(b.dataset.v)||0; if(!vA) return;
        var cand=ejs.filter(function(e){ return isMaterialise(e)&&e.mois===m; });
        if(!cand.length) return;
        cand[0].montant=Math.max(0,(cand[0].montant||0)+vA); recomputeProfils(state); save(); renderAffaireKS(); return;
      }
      state.realise[k]=cur3; save(); renderAffaireKS();
    });
    w.addEventListener('change', function(ev){
      var t=ev.target;
      if(t.dataset&&t.dataset.cp){
        var k=t.dataset.cp, pp=k.split('|'), ejId=pp[0], m=pp[1];
        var ejC=ejById(ejId);
        if(ejC&&isMaterialise(ejC)&&ejC.mois&&m<ejC.mois){ alert('Pas de CP avant le mois de l\'EJ '+ejC.numero+' ('+mLabel(ejC.mois)+') : l\'EJ est engagé intégralement le 1er jour de son mois.'); delete state.cps[k]; save(); renderAffaireKS(); return; }
        var v2=parseMontant(t.value);
        if(v2==null||v2<=0) delete state.cps[k]; else state.cps[k]=v2;
        save(); renderAffaireKS();
        return;
      }
      if(t.dataset&&t.dataset.real){
        var k=t.dataset.real, pp=k.split('|'), m=pp[1];
        var cur2=state.realise[k]?deepCopy(state.realise[k]):{};
        var v=parseMontant(t.value);
        if(v==null) delete cur2[t.dataset.f]; else cur2[t.dataset.f]=v;
        if(Object.prototype.hasOwnProperty.call(cur2,'ej')||Object.prototype.hasOwnProperty.call(cur2,'cp')) state.realise[k]=cur2;
        else delete state.realise[k];
        save(); renderAffaireKS(); return;
      }
    });
  });
}

})();
