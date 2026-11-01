/* ================= Popup de réglage du profil de consommation CP ================= */

function profilSummary(p){
  if(!p) return '—';
  if(p.type==='ponctuelle') return 'ponctuelle · '+(p.debut?mLong(p.debut):'—');
  if(p.type==='uniforme') return 'uniforme · '+(p.debut?mLong(p.debut):'—')+' → '+(p.fin?mLong(p.fin):'—');
  return 'personnalisée';
}
/* Ouvre la fenêtre modale de réglage du profil de CP d'un EJ : un onglet par
   mode (ponctuelle / uniforme / personnalisée), avec seulement les champs
   pertinents pour le mode choisi. */
function openProfilPopup(ejId){
  var e=ejById(ejId); if(!e) return;
  var p=deepCopy(profilOf(e));
  var aff=affaireById(e.affaireId);
  var cur=curMois();
  var months=scopeMonths(aff?aff.opId:'', aff?aff.id:'');
  var affEjs=ejsOfAffaire(e.affaireId).filter(isMaterialise);
  /* par mois : CP prévus de l'affaire, CP réalisés (onglet Réalisé), écart et cohérence */
  function rowVals(m){
    var cpM=0;
    affEjs.forEach(function(e2){ cpM+=cpPrevu(e2,m); });
    var past=m<=cur, r=realOf(e.affaireId,m);
    var rcp=past?(r?r.cp||0:0):null;
    var ec=past?(rcp-cpM):null;
    var tol=Math.max(1,cpM*0.02), coh='';
    if(past){
      if(Math.abs(ec)<=tol) coh='<span class="badge ok">cohérent</span>';
      else if(ec<0) coh='<span class="badge over">retard '+fmt(-ec)+'</span>';
      else coh='<span class="badge warn">avance '+fmt(ec)+'</span>';
    }
    return {cpM:cpM, rcp:rcp, ec:ec, coh:coh};
  }
  /* onglet « personnalisée » : saisie mensuelle des CP de l'EJ, avec le réalisé
     de l'affaire rappelé à côté et l'indicateur de cohérence */
  var persoRows='';
  months.forEach(function(m){
    var v=rowVals(m);
    var cv=state.cps[e.id+'|'+m]||0;
    var past=m<=cur;
    persoRows+='<tr'+(m===cur?' class="gp-cur"':'')+'><td'+(m===cur?' style="background:var(--amber-bg);font-weight:600"':'')+'>'+mLong(m)+(past?'':' (à venir)')+'</td>'+
      '<td class="num"><input type="text" inputmode="decimal" class="real-in" data-ppcp="'+e.id+'|'+m+'" value="'+(cv?fmt0(cv):'')+'" title="CP consommés pour « '+esc(e.numero)+' » en '+mLong(m)+' (profil personnalisé — saisie libre)"></td>'+
      '<td class="num mono" data-cell="prevu" title="CP prévus ce mois pour toute l\'affaire (tous EJ engagés, selon leurs profils)">'+fmt0(v.cpM)+'</td>'+
      '<td class="num mono" data-cell="real" title="CP réalisés ce mois, saisis dans l\'onglet « Réalisé »">'+(v.rcp==null?'—':fmt0(v.rcp))+'</td>'+
      '<td class="num mono" data-cell="ecart" title="Écart CP = réalisé − prévu (affaire, ce mois)">'+(v.ec==null?'':((v.ec>0?'+':'')+fmt0(v.ec)))+'</td>'+
      '<td data-cell="coh" title="Un écart en retard comme en avance est une incohérence">'+v.coh+'</td></tr>';
  });
  var persoPane='<p class="hint">Saisissez les CP de cet EJ <strong>mois par mois</strong> (ils s\'ajoutent à ceux saisis dans la grille « Consommation CP »). Le <strong>CP réalisé de l\'affaire</strong> est rappelé à côté pour les mois passés, avec l\'indicateur de cohérence.</p>'+
    '<div class="grid-wrap" style="max-height:320px"><table class="liste"><thead><tr>'+
    '<th>Mois</th><th class="num" title="CP consommés ce mois pour cet EJ (saisie)">CP cet EJ (saisi)</th>'+
    '<th class="num" title="CP prévus ce mois pour toute l\'affaire">CP prévus affaire</th>'+
    '<th class="num" title="CP réalisés ce mois (onglet « Réalisé »)">CP réalisés affaire</th>'+
    '<th class="num" title="Écart CP = réalisé − prévu (affaire, ce mois)">Écart CP</th><th title="Cohérence avec le réalisé">Cohérence</th></tr></thead>'+
    '<tbody>'+persoRows+'</tbody>'+
    '<tfoot><tr><td>Total</td><td class="num mono" id="pp-total" title="Total des CP saisis pour cet EJ">'+fmt0(cpSumOf(e.id))+'</td><td colspan="4"></td></tr></tfoot></table></div>';
  var ov=document.createElement('div');
  ov.className='modal-ov';
  ov.innerHTML='<div class="modal"><h2>Profil de consommation des CP — '+esc(e.numero)+'</h2>'+
    '<p class="hint">'+stadeBadge(e)+' '+esc(e.libelle||'')+' · affaire « '+esc(affaireName(e.affaireId))+' » · mois de l\'EJ : '+mLong(e.mois)+
    ' · montant : '+fmt(montantOf(e))+' · CP consommés à ce jour : <span id="pp-cpnow">'+fmt(cpSumOf(e.id))+'</span></p>'+
    '<div class="modal-tabs">'+
      '<button type="button" data-tab="ponctuelle" class="'+(p.type==='ponctuelle'?'active':'')+'" title="Tout le montant consommé en un seul mois">Ponctuelle</button>'+
      '<button type="button" data-tab="uniforme" class="'+(p.type==='uniforme'?'active':'')+'" title="Montant réparti uniformément sur une période">Uniforme sur une période</button>'+
      '<button type="button" data-tab="perso" class="'+(p.type==='perso'?'active':'')+'" title="CP saisis mois par mois à la main dans la grille">Personnalisée</button></div>'+
    '<div class="tabpane'+(p.type==='ponctuelle'?' active':'')+'" data-pane="ponctuelle">'+
      '<label class="fld">Mois de consommation'+monthInputHTML('pp-debut',p.debut||e.mois,'','Mois où la totalité des CP de cet EJ est consommée (MM/AAAA)')+'</label>'+
      '<p class="hint">La totalité du montant est consommée en ce mois.</p></div>'+
    '<div class="tabpane'+(p.type==='uniforme'?' active':'')+'" data-pane="uniforme">'+
      '<label class="fld">Début'+monthInputHTML('pu-debut',p.debut||e.mois,'','Premier mois de consommation, MM/AAAA — pour un EJ issu d\'un risque, la date choisie à la matérialisation peut servir de début')+'</label>'+
      '<label class="fld">Fin'+monthInputHTML('pu-fin',p.fin||p.debut||e.mois,'','Dernier mois de consommation, MM/AAAA (inclus)')+'</label>'+
      '<p class="hint">Le montant est réparti uniformément entre le début et la fin (inclus).</p></div>'+
    '<div class="tabpane'+(p.type==='perso'?' active':'')+'" data-pane="perso">'+persoPane+'</div>'+
    '<div class="formrow" style="margin-top:14px"><button type="button" class="btn primary" id="pp-save" title="Enregistrer ce profil et recalculer les CP">Enregistrer</button>'+
    '<button type="button" class="btn" id="pp-cancel" title="Fermer sans enregistrer">Annuler</button></div></div>';
  document.body.appendChild(ov);
  var curTab=p.type;
  function setTab(t){
    curTab=t;
    Array.prototype.forEach.call(ov.querySelectorAll('.modal-tabs button'),function(b){ b.classList.toggle('active', b.dataset.tab===t); });
    Array.prototype.forEach.call(ov.querySelectorAll('.tabpane'),function(pn){ pn.classList.toggle('active', pn.dataset.pane===t); });
  }
  Array.prototype.forEach.call(ov.querySelectorAll('.modal-tabs button'),function(b){
    b.addEventListener('click',function(){ setTab(b.dataset.tab); });
  });
  function close(){ ov.remove(); document.removeEventListener('keydown',escH); }
  function escH(ev){ if(ev.key==='Escape') close(); }
  document.addEventListener('keydown',escH);
  ov.addEventListener('click',function(ev){ if(ev.target===ov) close(); });
  ov.querySelector('#pp-cancel').addEventListener('click',close);
  /* saisie mensuelle des CP personnalisés (onglet « personnalisée ») : mise à
     jour immédiate de state.cps, du total et de l'indicateur de cohérence */
  ov.addEventListener('input', function(ev){
    var t=ev.target;
    if(!t.dataset||!t.dataset.ppcp) return;
    var k=t.dataset.ppcp, pp=k.split('|'), m=pp[1];
    var v=parseMontant(t.value);
    if(v==null||v<=0) delete state.cps[k]; else state.cps[k]=v;
    var tot=ov.querySelector('#pp-total');
    if(tot) tot.textContent=fmt0(cpSumOf(e.id));
    var now=ov.querySelector('#pp-cpnow');
    if(now) now.textContent=fmt(cpSumOf(e.id));
    var tr=t.closest('tr');
    if(tr){
      var vals=rowVals(m);
      var cPrevu=tr.querySelector('[data-cell="prevu"]');
      var cReal=tr.querySelector('[data-cell="real"]');
      var cEcart=tr.querySelector('[data-cell="ecart"]');
      var cCoh=tr.querySelector('[data-cell="coh"]');
      if(cPrevu) cPrevu.textContent=fmt0(vals.cpM);
      if(cReal) cReal.textContent=(vals.rcp==null?'—':fmt0(vals.rcp));
      if(cEcart) cEcart.textContent=(vals.ec==null?'':((vals.ec>0?'+':'')+fmt0(vals.ec)));
      if(cCoh) cCoh.innerHTML=vals.coh;
    }
  });
  var saveBtn=ov.querySelector('#pp-save');
  if(HIST.on){ /* mode historique : consultation seule */
    saveBtn.disabled=true; saveBtn.title='Saisie désactivée en mode historique';
    Array.prototype.forEach.call(ov.querySelectorAll('input'),function(i){ i.disabled=true; });
  }
  saveBtn.addEventListener('click',function(){
    var np={type:curTab, debut:'', fin:''};
    if(curTab==='ponctuelle'){ np.debut=parseIdxDate(ov.querySelector('#pp-debut').value)||e.mois; np.fin=np.debut; }
    else if(curTab==='uniforme'){
      np.debut=parseIdxDate(ov.querySelector('#pu-debut').value)||e.mois;
      np.fin=parseIdxDate(ov.querySelector('#pu-fin').value)||np.debut;
      if(np.fin<np.debut) np.fin=np.debut;
    } else { var old=profilOf(e); np.debut=old.debut||e.mois; np.fin=old.fin||e.mois; }
    /* pas de CP avant le mois de l'EJ : on cale le profil sur le mois de l'EJ */
    if(e.mois){
      if(np.debut&&np.debut<e.mois) np.debut=e.mois;
      if(np.fin&&np.fin<e.mois) np.fin=e.mois;
      if(np.fin<np.debut) np.fin=np.debut;
    }
    state.profils[e.id]=np;
    recomputeProfils(state);
    save(); close(); render();
  });
}

