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
    (aff?'<button class="btn" id="af-addej" title="Créer un EJ programmé sur cette affaire (colonne ajoutée, fiche EJ ensuite)">+ EJ</button>'+
          '<button class="btn" id="af-addrk" title="Créer un risque sur cette affaire (colonne ajoutée, popup risque ensuite)">+ Risque</button>'+
          '<button class="btn" id="af-addal" title="Créer un aléa forfaitaire sur cette affaire (colonne ajoutée, popup aléa ensuite)">+ Aléa</button>':'')+
    (aff?'<button class="btn" data-goto="structure" data-aff="'+aff.id+'" title="Modifier cette affaire (opération, entreprise, réf. contrat, date de réf., formule) dans « Opérations & affaires »">Éditer l\'affaire</button>':'')+
    '<button class="btn" data-goto="indices" title="Saisir les séries d\'indices dans « Indices »">Séries d\'indices</button>'+
    /* les 4 mêmes options que l'ancien onglet « GP à saisir » */
    '<label class="gp-chk" title="GP : la ligne de décembre ne contient que la somme des RP de l\'année ; l\'EJ de décembre est mis en novembre et le CP de décembre en janvier"><input type="checkbox" id="gp-rpdec"'+(state.ui.gpRpDec?' checked':'')+'> RP en décembre seulement</label>'+
    '<label class="gp-chk" title="GP : décale les CP de décembre vers janvier de l\'année suivante (pas les RP)"><input type="checkbox" id="gp-nocpdec"'+(state.ui.gpNoCpDec?' checked':'')+'> Pas de CP en décembre</label>'+
    '<label class="gp-chk" title="GP : décale les CP de janvier vers février (cumulatif)"><input type="checkbox" id="gp-nocpjan"'+(state.ui.gpNoCpJan?' checked':'')+'> Pas de CP en janvier</label>'+
    '<label class="gp-chk" title="GP : aléas ET risques de l\'année regroupés en décembre, EJ et CP"><input type="checkbox" id="gp-ardec"'+(state.ui.gpARDec?' checked':'')+'> Aléa et risque en décembre</label>'+
    '</div>';

  if(!aff){
    h+='<div class="card"><div class="empty">Aucune affaire dans cette sélection. Créez-en une dans « Opérations &amp; affaires ».</div></div>';
    mount('view-affaire', h, function(w){
      var sel=w.querySelector('#aff-solo');
      if(sel) sel.addEventListener('change',function(){ state.ui.aff=sel.value; save(); render(); });
    });
    return;
  }

  var ejs=ejsOfAffaire(aff.id).slice().sort(function(x,y){ return x.mois<y.mois?-1:(x.mois>y.mois?1:0); });
  var months=scopeMonths(aff.opId, aff.id);
  var foc=state.ui.focusCol||'';

  /* ---- UN SEUL tableau mensuel : 1 colonne par EJ/risque/aléa + colonnes de synthèse ---- */
  function fmtS(n){ return (n>0?'+':'')+fmt0(n); }
  function badgeEcart(val,tol,kind){
    if(Math.abs(val)<=tol) return '<span class="badge ok">'+kind+' ok</span>';
    if(val<0) return '<span class="badge over">'+kind+' retard '+fmtM(-val)+'</span>';
    return '<span class="badge warn">'+kind+' avance '+fmtM(val)+'</span>';
  }
  /* en-tête : colonne Mois, puis par EJ/risque/aléa : n° (fiche/popup), date · montant, check Σ CP */
  var head='<tr><th class="scol sc1">Mois</th>';
  ejs.forEach(function(e){
    var somCp=cpSumOf(e.id), mtE=montantOf(e), cohOk=!isMaterialise(e)||Math.abs(mtE-somCp)<=Math.max(1,mtE*0.001);
    var mtTxt=isRisque(e)?('esp. '+fmt0(espDist(e))+' · haut '+fmt0(montantHaut(e))+' · pond. '+fmt0(risquePondere(e))):fmt0(mtE);
    var popAttr=(isRisque(e)||isAlea(e))?('data-rkpop="'+e.id+'" title="Popup '+(isRisque(e)?'risque':'aléa')+' : modifier la distribution / le % et lire la conséquence EJ/CP"'):('data-ejpop="'+e.id+'" title="Fiche de l\'EJ '+esc(e.numero)+' (n°, libellé, montant, date, profil CP modifiables)"');
    head+='<th class="dcol'+(foc===e.id?' col-focus':'')+'" style="min-width:170px">'+stadeBadge(e)+
      '<button type="button" class="ej-btn" '+popAttr+'>'+esc(e.numero)+'</button>'+
      '<div class="hdr-sub">'+(e.mois?mLabel(e.mois):'—')+' · '+mtTxt+'</div>'+
      '<div class="hdr-sub'+(cohOk?'':' coh-bad')+'" title="Σ CP = '+fmt0(somCp)+' vs montant '+fmt0(mtE)+'">Σ CP '+fmt0(somCp)+(cohOk?'':' <span class="badge over">écart</span>')+'</div></th>';
  });
  /* colonnes de synthèse de l'affaire */
  head+='<th class="num tot-h" title="EJ engagés à ce mois (somme des colonnes EJ)">EJ engagé</th>'+
    '<th class="num tot-h" title="Aléas répartis ce mois (colonnes aléa)">Aléa</th>'+
    '<th class="num tot-h" title="Risques à ce mois, espérance × probabilité (colonnes risque ; EJ=CP)">Risque</th>'+
    '<th class="num tot-h" title="CP prévus ce mois (somme des colonnes)">CP prévu</th>'+
    '<th class="num tot-h" title="Révision de prix du mois = base CP (réalisée si saisie, sinon prévue) × (I/I₀−1)">RP</th>'+
    '<th class="num tot-h" title="Indice applicable à ce mois (formule de l\'affaire, séries de l\'onglet Indices)">Indice I</th>'+
    '<th class="num tot-h" title="I/I₀ recalé à 1 à la date de référence de l\'affaire">I/I₀</th>'+
    '<th class="num tot-h" title="GP à saisir, synthèse EJ (4 options cochées + réalisé si saisi)">GP EJ</th>'+
    '<th class="num tot-h" title="GP à saisir, synthèse CP (4 options cochées + réalisé si saisi)">GP CP</th>'+
    '<th class="num tot-h" title="EJ réalisé saisi (vérité quand saisi, même à 0)">EJ réel</th>'+
    '<th class="num tot-h" title="CP réalisé saisi (vérité quand saisi, même à 0)">CP réel</th>'+
    '<th class="num tot-h" title="Écart EJ = réalisé − engagé (mois écoulés)">Éc EJ</th>'+
    '<th class="num tot-h" title="Écart CP = réalisé − prévu (mois écoulés)">Éc CP</th>'+
    '<th class="tot-h">Statut</th><th class="tot-h">Actions</th></tr>';
  var NB=1+ejs.length+15;

  var body=extRow('avant', NB);
  months.forEach(function(m){
    var ejM=0, cpM=0, aeM=0, rkM=0;
    ejs.forEach(function(e){
      if(isMaterialise(e)){ if(e.mois===m) ejM+=montantOf(e); cpM+=cpPrevu(e,m); }
      else if(isAlea(e)) aeM+=montantOf(e)*occW(e,m);
      else if(isRisque(e)) rkM+=risquePondere(e)*occW(e,m);
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
    var statut;
    if(past&&!hasR) statut='<span class="badge warn" title="Mois écoulé sans réalisé saisi (saisi à 0 = constatation)">non saisi</span>';
    else if(past) statut=badgeEcart(eEj,tolEj,'EJ')+' '+badgeEcart(eCp,tolCp,'CP');
    else if(m===cur) statut=hasR?(badgeEcart(eEj,tolEj,'EJ')+' '+badgeEcart(eCp,tolCp,'CP')):'<span class="badge info">à saisir</span>';
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
    ejs.forEach(function(e){
      var p=profilOf(e), v=cpPrevu(e,m);
      if(isMaterialise(e)&&e.mois&&m<e.mois){
        body+='<td class="dcol cp-avant" data-ejcol="'+e.id+'" title="Pas de CP avant '+mLabel(e.mois)+' (mois de l\'EJ '+esc(e.numero)+') — cellule verrouillée">'+(v?fmt0(v):'')+'</td>';
      }else if(isMaterialise(e)&&p.type==='perso'){
        body+='<td class="dcol" data-ejcol="'+e.id+'"><input type="text" inputmode="decimal" class="cell" data-cp="'+e.id+'|'+m+'" value="'+(v?v:'')+'" title="CP consommés en '+mLabel(m)+' pour '+esc(e.numero)+' (profil personnalisé : saisie libre)"></td>';
      }else{
        body+='<td class="dcol cp-lock" data-ejcol="'+e.id+'" title="'+(isMaterialise(e)?'Calculé selon le profil '+p.type:'CP du '+stadeLabel(e).toLowerCase()+' selon son profil')+'">'+(v?fmt0(v):'')+'</td>';
      }
    });
    body+='<td class="num mono ccell tot">'+fmt0(ejM)+'</td>'+
      '<td class="num mono ccell tot">'+fmt0(aeM)+'</td>'+
      '<td class="num mono ccell tot">'+fmt0(rkM)+'</td>'+
      '<td class="num mono ccell tot">'+fmt0(cpM)+'</td>'+
      '<td class="num mono ccell tot'+(r?' gp-real':'')+'" title="'+(r?'RP basée sur le CP RÉALISÉ saisi':'RP = CP prévu × (I/I₀−1)')+'">'+fmt0(rp)+'</td>'+
      '<td class="num mono ccell tot" title="Indice applicable ce mois (formule de l\'affaire)">'+(ind==null?'—':fmtIdx(ind))+'</td>'+
      '<td class="num mono ccell tot" title="I/I₀ (recalé à 1 à la date de réf. '+(aff.dateRefRev||'—')+')">'+(ind!=null&&i0?(ind/i0).toLocaleString('fr-FR',{maximumFractionDigits:3}):'—')+'</td>'+
      '<td class="num mono ccell tot'+(r?' gp-real':'')+'" title="GP synthèse EJ (options + réalisé si saisi)">'+fmt0(gEj)+'</td>'+
      '<td class="num mono ccell tot'+(r?' gp-real':'')+'" title="GP synthèse CP (options + réalisé si saisi)">'+fmt0(gCp)+'</td>'+
      '<td class="num"><input type="text" inputmode="decimal" class="real-in" data-real="'+aff.id+'|'+m+'" data-f="ej" value="'+rEjV+'"'+(m<=cur?'':' disabled')+' title="EJ réalisé en '+mLong(m)+' (« 0 » = constaté à zéro, distinct de non saisi)"></td>'+
      '<td class="num"><input type="text" inputmode="decimal" class="real-in" data-real="'+aff.id+'|'+m+'" data-f="cp" value="'+rCpV+'"'+(m<=cur?'':' disabled')+' title="CP réalisé en '+mLong(m)+' (« 0 » = constaté à zéro)"></td>'+
      '<td class="num mono">'+(past?fmtS(eEj):'')+'</td>'+
      '<td class="num mono">'+(past?fmtS(eCp):'')+'</td>'+
      '<td>'+statut+'</td><td style="white-space:nowrap">'+actions+'</td></tr>';
  });
  body+=extRow('après', NB);
  var foot='<tr class="gp-tot"><td class="scol sc1">Total</td>'+
    ejs.map(function(e){ return '<td class="dcol ccell tot">'+fmt0(cpSumOf(e.id))+'</td>'; }).join('')+
    '<td colspan="15"></td></tr>';

  h+='<div class="card"><h2>Affaire « '+esc(aff.nom)+' » — détail par mois</h2>'+
     '<p class="hint">UN seul tableau : <strong>une colonne par EJ / risque / aléa</strong> de l\'affaire (saisie de la consommation CP dans la cellule du mois ; grisée avant le mois de l\'EJ ; clic sur le n° = fiche EJ ou popup risque/aléa), puis les colonnes de synthèse (EJ engagé, aléa, risque, CP prévu, RP, <strong>GP EJ/CP</strong> avec les 4 options, EJ/CP réels saisis, écarts, statut, actions). Boutons + EJ / + Risque / + Aléa pour en créer. Cellules grisées = appuyées sur le réalisé saisi.</p>'+
     '<div class="grid-wrap"><table class="grid conso affgrid"><thead>'+head+'</thead><tbody>'+body+'</tbody><tfoot>'+foot+'</tfoot></table></div></div>';

  mount('view-affaire', h, function(w){
    var sel=w.querySelector('#aff-solo');
    if(sel) sel.addEventListener('change',function(){ state.ui.aff=sel.value; save(); render(); });
    /* les 4 options GP (comme l'ancien onglet « GP à saisir ») */
    [['gp-rpdec','gpRpDec'],['gp-nocpdec','gpNoCpDec'],['gp-nocpjan','gpNoCpJan'],['gp-ardec','gpARDec']].forEach(function(p){
      var cb=w.querySelector('#'+p[0]);
      if(cb) cb.addEventListener('change',function(){ state.ui[p[1]]=cb.checked; save(); render(); });
    });
    function addItem(stade, extra){
      var n=state.ejs.filter(function(e){ return e.affaireId===aff.id; }).length+1;
      var ej9={id:uid(),affaireId:aff.id,numero:(stade==='risque'?'RK-':stade==='alea'?'AL-':'EJ-')+String(n).padStart(2,'0'),libelle:'',stade:stade,mois:curMois(),montant:0};
      for(var k in extra) ej9[k]=extra[k];
      state.ejs.push(ej9); recomputeProfils(state);
      state.ui.focusCol=ej9.id; save(); render();
      return ej9;
    }
    var addb=w.querySelector('#af-addej');
    if(addb) addb.addEventListener('click',function(){ addItem('prog',{}); });
    var addrk=w.querySelector('#af-addrk');
    if(addrk) addrk.addEventListener('click',function(){ addItem('risque',{distType:'fixe',distA:0,probabilite:100,dateType:'ponctuelle'}); });
    var addal=w.querySelector('#af-addal');
    if(addal) addal.addEventListener('click',function(){ addItem('alea',{aleaPct:5,montantExplicite:false,dateType:'ponctuelle'}); });
    w.addEventListener('click', function(ev){
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
        cand[0].montant=Math.max(0,(cand[0].montant||0)+vA); recomputeProfils(state); save(); render(); return;
      }
      state.realise[k]=cur3; save(); renderAffaire();
    });
    w.addEventListener('change', function(ev){
      var t=ev.target;
      if(t.dataset&&t.dataset.cp){
        var k=t.dataset.cp, pp=k.split('|'), ejId=pp[0], m=pp[1];
        var ejC=ejById(ejId);
        if(ejC&&isMaterialise(ejC)&&ejC.mois&&m<ejC.mois){ alert('Pas de CP avant le mois de l\'EJ '+ejC.numero+' ('+mLabel(ejC.mois)+') : l\'EJ est engagé intégralement le 1er jour de son mois.'); delete state.cps[k]; save(); renderAffaire(); return; }
        var v2=parseMontant(t.value);
        if(v2==null||v2<=0) delete state.cps[k]; else state.cps[k]=v2;
        save(); renderAffaire();
        var nw2=document.getElementById('view-affaire').children[0];
        var el2=nw2.querySelector('[data-cp="'+k+'"]');
        if(el2){ el2.focus(); }
        return;
      }
      if(t.dataset&&t.dataset.real){
        var k=t.dataset.real, pp=k.split('|'), m=pp[1];
        var cur2=state.realise[k]?deepCopy(state.realise[k]):{};
        var v=parseMontant(t.value);
        if(v==null) delete cur2[t.dataset.f]; else cur2[t.dataset.f]=v;
        if(Object.prototype.hasOwnProperty.call(cur2,'ej')||Object.prototype.hasOwnProperty.call(cur2,'cp')) state.realise[k]=cur2;
        else delete state.realise[k];
        save(); renderAffaire(); return;
      }
    });
  });
}

})();
