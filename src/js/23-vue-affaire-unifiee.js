/* ================= Vue unifiée « Affaire » (branche onglet-affaire-unique) ================= */
/* Remplace les 5 onglets risques&aléas / consommation CP / révisions de prix /
   réalisé / GP à saisir : UN SEUL onglet, UNE SEULE affaire à la fois (sélecteur
   dédié). Pour l'affaire affichée :
   - tableau 1 : tous les EJ (programmés/engagés, aléas, risques) avec check Σ CP,
     popup risque/aléa pour modifier la distribution et lire la conséquence EJ/CP ;
   - tableau 2 : par mois, plusieurs colonnes (EJ engagé, aléa, risque, CP prévu,
     RP, GP EJ/CP avec les 4 options, EJ/CP réels saisis, écarts, statut, actions) ;
   - tableau 3 : consommation des CP par EJ (mois × EJ). */

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
    var occ=occOf(e), s=0; occ.forEach(function(o){ s+=o.w; });
    if(risque) return 'espérance '+fmt0(espDist(e))+' · haut '+fmt0(montantHaut(e))+' · pondéré (proba '+((e.probabilite==null?100:e.probabilite))+' %) '+fmt0(risquePondere(e))+
      ' · Σ CP (profil) '+fmt0(cpSumOf(e.id))+' · apparitions '+occ.length+(occ.length?' ('+mLong(occ[0].m)+' … '+mLong(occ[occ.length-1].m)+')':'');
    return 'montant aléa '+fmt0(montantOf(e))+' ('+(e.montantExplicite?'montant explicite':' '+(e.aleaPct==null?5:e.aleaPct)+' % du reste à payer')+')'+
      ' · Σ CP répartis '+fmt0(cpSumOf(e.id))+' · apparitions '+occ.length+(occ.length?' ('+mLong(occ[0].m)+' … '+mLong(occ[occ.length-1].m)+')':'');
  }
  ov.innerHTML='<div class="modal"><h2>'+(risque?'Risque ':'Aléa ')+esc(e.numero)+' — '+esc(e.libelle||'')+'</h2>'+
    '<p class="hint">'+stadeBadge(e)+' · affaire « '+esc(affaireName(e.affaireId))+' » · conséquence EJ/CP : <strong id="ra-cons">'+cons()+'</strong></p>'+
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
  saveBtn.addEventListener('click',function(){
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
    (aff?'<button class="btn" id="af-addej" title="Ajouter un EJ programmé sur cette affaire (fiche EJ ensuite)">+ EJ</button>':'')+
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

  var ejs=ejsOfAffaire(aff.id);
  var months=scopeMonths(aff.opId, aff.id);
  var foc=state.ui.focusCol||'';

  /* ---- tableau 1 : les EJ de l'affaire (tous stades : risques & aléas compris) ---- */
  var ejRows=ejs.slice().sort(function(x,y){ return x.mois<y.mois?-1:(x.mois>y.mois?1:0); }).map(function(e){
    var somCp=cpSumOf(e.id), mtE=montantOf(e), cohOk=!isMaterialise(e)||Math.abs(mtE-somCp)<=Math.max(1,mtE*0.001);
    var mtTxt=isRisque(e)?('esp. '+fmt0(espDist(e))+' · haut '+fmt0(montantHaut(e))+' · pond. '+fmt0(risquePondere(e))):fmt0(mtE);
    var popAttr=(isRisque(e)||isAlea(e))?('data-rkpop="'+e.id+'" title="Popup '+ (isRisque(e)?'risque':'aléa') +' : modifier la distribution / le % et lire la conséquence EJ/CP"'):('data-ejpop="'+e.id+'" title="Fiche de l\'EJ '+esc(e.numero)+' (n°, libellé, montant, date, profil CP modifiables)"');
    return '<tr'+(foc===e.id?' class="col-focus"':'')+'><td>'+stadeBadge(e)+'</td>'+
      '<td><button type="button" class="ej-btn" '+popAttr+'>'+esc(e.numero)+'</button></td>'+
      '<td>'+esc(e.libelle||'')+'</td>'+
      '<td class="mono">'+(e.mois?mLabel(e.mois):'—')+'</td>'+
      '<td class="num mono">'+mtTxt+'</td>'+
      '<td>'+esc(profilSummary(profilOf(e)))+'</td>'+
      '<td class="num mono">'+fmt0(somCp)+'</td>'+
      '<td>'+(isMaterialise(e)?(cohOk?'<span class="badge ok">ok</span>':'<span class="badge over">écart '+fmt0(mtE-somCp)+'</span>'):'—')+'</td></tr>';
  }).join('');
  h+='<div class="card"><h2>EJ de l\'affaire « '+esc(aff.nom)+' » ('+ejs.length+')</h2>'+
     '<p class="hint">Tous les montants de l\'affaire : EJ programmés/engagés, aléas et risques. Clic sur le n° = fiche EJ (programmés/engagés) ou popup risque/aléa (distribution, % , conséquence EJ/CP). Check = Σ CP saisis vs montant.</p>'+
     '<div class="grid-wrap"><table class="liste"><thead><tr><th>Stade</th><th>N°</th><th>Libellé</th><th>Date</th><th class="num">Montant</th><th>Profil CP</th><th class="num">Σ CP</th><th>Check</th></tr></thead><tbody>'+ejRows+'</tbody></table></div></div>';

  /* ---- tableau 2 : par mois, plusieurs colonnes pour l'affaire ---- */
  function fmtS(n){ return (n>0?'+':'')+fmt0(n); }
  function badgeEcart(val,tol,kind){
    if(Math.abs(val)<=tol) return '<span class="badge ok">'+kind+' ok</span>';
    if(val<0) return '<span class="badge over">'+kind+' retard '+fmtM(-val)+'</span>';
    return '<span class="badge warn">'+kind+' avance '+fmtM(val)+'</span>';
  }
  var head='<tr><th>Mois</th>'+
    '<th class="num" title="EJ engagés à ce mois (somme)">EJ engagé</th>'+
    '<th class="num" title="Aléas répartis ce mois (EJ)">Aléa</th>'+
    '<th class="num" title="Risques à ce mois (espérance × probabilité ; EJ = CP pour les RP)">Risque</th>'+
    '<th class="num" title="CP prévus ce mois (profils des EJ)">CP prévu</th>'+
    '<th class="num" title="Révision de prix du mois = base CP (réalisée si saisie, sinon prévue) × (I/I₀−1)">RP</th>'+
    '<th class="num" title="GP à saisir, synthèse EJ (avec les 4 options cochées et le réalisé si saisi)">GP EJ</th>'+
    '<th class="num" title="GP à saisir, synthèse CP (avec les 4 options cochées et le réalisé si saisi)">GP CP</th>'+
    '<th class="num" title="EJ réalisé saisi (vérité quand saisi, même à 0)">EJ réel</th>'+
    '<th class="num" title="CP réalisé saisi (vérité quand saisi, même à 0)">CP réel</th>'+
    '<th class="num" title="Écart EJ = réalisé − engagé (mois écoulés)">Écart EJ</th>'+
    '<th class="num" title="Écart CP = réalisé − prévu (mois écoulés)">Écart CP</th>'+
    '<th>Statut</th><th>Actions</th></tr>';
  var body=extRow('avant', 14);
  months.forEach(function(m){
    var ejM=0, cpM=0, aeM=0, rkM=0;
    ejs.forEach(function(e){
      if(isMaterialise(e)){ if(e.mois===m) ejM+=montantOf(e); cpM+=cpPrevu(e,m); }
      else if(isAlea(e)) aeM+=montantOf(e)*occW(e,m);
      else if(isRisque(e)) rkM+=risquePondere(e)*occW(e,m);
    });
    var rp=revisionMois(aff,m);
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
    body+='<tr'+(m===cur?' class="gp-cur"':'')+'><td class="mh'+(m===cur?' cur':'')+'">'+mLong(m)+(past?'':' (à venir)')+'</td>'+
      '<td class="num mono">'+fmt0(ejM)+'</td>'+
      '<td class="num mono">'+fmt0(aeM)+'</td>'+
      '<td class="num mono">'+fmt0(rkM)+'</td>'+
      '<td class="num mono">'+fmt0(cpM)+'</td>'+
      '<td class="num mono'+(r?' gp-real':'')+'" title="'+(r?'RP basée sur le CP RÉALISÉ saisi':'RP = CP prévu × (I/I₀−1)')+'">'+fmt0(rp)+'</td>'+
      '<td class="num mono'+(r?' gp-real':'')+'" title="GP synthèse EJ (options cochées + réalisé si saisi)">'+fmt0(gEj)+'</td>'+
      '<td class="num mono'+(r?' gp-real':'')+'" title="GP synthèse CP (options cochées + réalisé si saisi)">'+fmt0(gCp)+'</td>'+
      '<td class="num"><input type="text" inputmode="decimal" class="real-in" data-real="'+aff.id+'|'+m+'" data-f="ej" value="'+rEjV+'"'+(m<=cur?'':' disabled')+' title="EJ réalisé en '+mLong(m)+' (« 0 » = constaté à zéro, distinct de non saisi)"></td>'+
      '<td class="num"><input type="text" inputmode="decimal" class="real-in" data-real="'+aff.id+'|'+m+'" data-f="cp" value="'+rCpV+'"'+(m<=cur?'':' disabled')+' title="CP réalisé en '+mLong(m)+' (« 0 » = constaté à zéro)"></td>'+
      '<td class="num mono">'+(past?fmtS(eEj):'')+'</td>'+
      '<td class="num mono">'+(past?fmtS(eCp):'')+'</td>'+
      '<td>'+statut+'</td><td style="white-space:nowrap">'+actions+'</td></tr>';
  });
  body+=extRow('après', 14);
  h+='<div class="card"><h2>Par mois — affaire « '+esc(aff.nom)+' »</h2>'+
     '<p class="hint">Plusieurs colonnes pour l\'affaire : EJ engagé, aléa, risque (EJ=CP), CP prévu, RP, <strong>GP EJ / GP CP</strong> (les 4 options cochées ci-dessus s\'y appliquent, et le réalisé saisi a priorité), EJ/CP réels (saisie), écarts, statut. Cellules grisées = appuyées sur le réalisé.</p>'+
     '<div class="grid-wrap"><table class="liste rev-table"><thead>'+head+'</thead><tbody>'+body+'</tbody></table></div></div>';

  /* ---- tableau 3 : consommation des CP par EJ (mois × EJ) ---- */
  var matEjs=ejs.filter(isMaterialise).sort(function(x,y){ return x.mois<y.mois?-1:(x.mois>y.mois?1:0); });
  var gHead='<tr><th>Mois</th>'+
    matEjs.map(function(e){
      var somCp=cpSumOf(e.id), mtE=montantOf(e), cohOk=Math.abs(mtE-somCp)<=Math.max(1,mtE*0.001);
      return '<th class="dcol" style="min-width:120px"><button type="button" class="ej-btn" data-ejpop="'+e.id+'" title="Fiche de l\'EJ '+esc(e.numero)+'">'+esc(e.numero)+'</button>'+
        '<div class="hdr-sub">'+(e.mois?mLabel(e.mois):'—')+' · '+fmt0(mtE)+'</div>'+
        '<div class="hdr-sub'+(cohOk?'':' coh-bad')+'" title="Σ CP = '+fmt0(somCp)+' vs montant '+fmt0(mtE)+'">Σ CP '+fmt0(somCp)+(cohOk?'':' <span class="badge over">écart</span>')+'</div></th>';
    }).join('')+'</tr>';
  var gBody=extRow('avant', 1+matEjs.length);
  months.forEach(function(m){
    gBody+='<tr data-m="'+m+'"'+(m===cur?' class="gp-cur"':'')+'><td class="mh'+(m===cur?' cur':'')+'">'+mLabel(m)+'</td>';
    matEjs.forEach(function(e){
      var p=profilOf(e), v=cpPrevu(e,m);
      if(e.mois&&m<e.mois){
        gBody+='<td class="dcol cp-avant" data-ejcol="'+e.id+'" title="Pas de CP avant '+mLabel(e.mois)+' (mois de l\'EJ '+esc(e.numero)+') — cellule verrouillée">'+(v?fmt0(v):'')+'</td>';
      }else if(p.type==='perso'){
        gBody+='<td class="dcol" data-ejcol="'+e.id+'"><input type="text" inputmode="decimal" class="cell" data-cp="'+e.id+'|'+m+'" value="'+(v?v:'')+'" title="CP consommés en '+mLabel(m)+' pour '+esc(e.numero)+' (profil personnalisé : saisie libre)"></td>';
      }else{
        gBody+='<td class="dcol cp-lock" data-ejcol="'+e.id+'" title="Calculé selon le profil '+p.type+'">'+(v?fmt0(v):'')+'</td>';
      }
    });
    gBody+='</tr>';
  });
  gBody+=extRow('après', 1+matEjs.length);
  var gFoot='<tr><td>Total</td>'+
    matEjs.map(function(e){ return '<td class="dcol ccell tot">'+fmt0(cpSumOf(e.id))+'</td>'; }).join('')+'</tr>';
  h+='<div class="card"><h2>Consommation des CP par EJ — « '+esc(aff.nom)+' »</h2>'+
     '<p class="hint">Une colonne par EJ de l\'affaire. Cellule grisée avant le mois de l\'EJ (verrouillée) ; saisie libre si profil « personnalisée » (fiche EJ), calculée sinon. En-tête : n° (fiche EJ), date · montant, check Σ CP.</p>'+
     '<div class="grid-wrap"><table class="grid conso"><thead>'+gHead+'</thead><tbody>'+gBody+'</tbody><tfoot>'+gFoot+'</tfoot></table></div></div>';

  mount('view-affaire', h, function(w){
    var sel=w.querySelector('#aff-solo');
    if(sel) sel.addEventListener('change',function(){ state.ui.aff=sel.value; save(); render(); });
    /* les 4 options GP (comme l'ancien onglet « GP à saisir ») */
    [['gp-rpdec','gpRpDec'],['gp-nocpdec','gpNoCpDec'],['gp-nocpjan','gpNoCpJan'],['gp-ardec','gpARDec']].forEach(function(p){
      var cb=w.querySelector('#'+p[0]);
      if(cb) cb.addEventListener('change',function(){ state.ui[p[1]]=cb.checked; save(); render(); });
    });
    var addb=w.querySelector('#af-addej');
    if(addb) addb.addEventListener('click',function(){
      var n=state.ejs.filter(function(e){ return e.affaireId===aff.id; }).length+1;
      var ej9={id:uid(),affaireId:aff.id,numero:'EJ-'+String(n).padStart(2,'0'),libelle:'',stade:'prog',mois:curMois(),montant:0};
      state.ejs.push(ej9); recomputeProfils(state);
      state.ui.focusCol=ej9.id; save(); render();
    });
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
        if(ejC&&ejC.mois&&m<ejC.mois){ alert('Pas de CP avant le mois de l\'EJ '+ejC.numero+' ('+mLabel(ejC.mois)+') : l\'EJ est engagé intégralement le 1er jour de son mois.'); delete state.cps[k]; save(); renderAffaire(); return; }
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
