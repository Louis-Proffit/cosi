/* ================= Popups affaire / opération ================= */

/* Popup : tous les EJ d'une affaire, avec leurs dates, montants, profil CP. */
function openAffairePopup(affId){
  var a=affaireById(affId); if(!a) return;
  var ejs=ejsOfAffaire(a.id).slice().sort(function(x,y){ return x.mois<y.mois?-1:(x.mois>y.mois?1:(x.numero<y.numero?-1:1)); });
  var em=ejs.filter(isMaterialise);
  var ov=document.createElement('div');
  ov.className='modal-ov';
  var rows=ejs.map(function(e){
    var p=profilOf(e);
    var montantTxt=isRisque(e)?('esp. '+fmt0(espDist(e))+' · haut '+fmt0(montantHaut(e))+' · pond. '+fmt0(risquePondere(e))):fmt(montantOf(e));
    return '<tr><td>'+stadeBadge(e)+'</td><td>'+esc(e.numero)+'</td><td>'+esc(e.libelle||'')+'</td>'+
      '<td title="Date de l\'EJ">'+mLong(e.mois)+'</td>'+
      '<td class="num mono">'+montantTxt+'</td>'+
      '<td title="Profil de consommation des CP">'+esc(profilSummary(p))+'</td>'+
      '<td class="num mono" title="CP consommés (total)">'+fmt0(cpSumOf(e.id))+'</td></tr>';
  }).join('');
  ov.innerHTML='<div class="modal"><h2>Affaire « '+esc(a.nom)+' » — '+ejs.length+' EJ</h2>'+
    '<p class="hint">Opération « '+esc(opName(a.opId))+' » · entreprise : '+esc(a.titulaire||'—')+' · réf. contrat : '+esc(a.refContrat||'—')+
    ' · reste à payer à date : '+fmt(resteAPayer(a))+
    ' · date réf. rév. : '+(a.dateRefRev?mLong(a.dateRefRev):'—')+' · formule (indice) : '+esc(a.formule||'(1ʳᵉ série)')+
    ' · EJ engagés : '+fmt(sommeMontant(em))+'</p>'+
    (ejs.length?'<div class="grid-wrap"><table class="liste"><thead><tr><th></th><th>N°</th><th>Libellé</th><th>Date</th><th class="num">Montant</th><th>Profil CP</th><th class="num">CP</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
               :'<p class="hint">Aucun EJ sur cette affaire.</p>')+
    '<div class="formrow" style="margin-top:12px"><button type="button" class="btn" id="ap-cancel" title="Fermer">Fermer</button></div></div>';
  document.body.appendChild(ov);
  function close(){ ov.remove(); document.removeEventListener('keydown',escH); }
  function escH(ev){ if(ev.key==='Escape') close(); }
  document.addEventListener('keydown',escH);
  ov.addEventListener('click',function(ev){ if(ev.target===ov) close(); });
  ov.querySelector('#ap-cancel').addEventListener('click',close);
}

/* Popup : toutes les affaires d'une opération (clic sur une affaire -> popup EJ). */
function openOpPopup(opId){
  var o=opById(opId); if(!o) return;
  var as=state.affaires.filter(function(a){ return a.opId===opId; });
  var ov=document.createElement('div');
  ov.className='modal-ov';
  var rows=as.map(function(a){
    var es=ejsOfAffaire(a.id), em=es.filter(isMaterialise);
    return '<tr><td><button type="button" class="btn small" data-affbtn="'+a.id+'" title="Voir tous les EJ de cette affaire (popup)">'+esc(a.nom)+'</button></td>'+
      '<td>'+esc(a.titulaire||'')+'</td><td>'+esc(a.refContrat||'')+'</td>'+
      '<td class="num mono" title="Reste à payer à date = EJ engagés cumulés − CP consommés cumulés">'+fmt(resteAPayer(a))+'</td>'+
      '<td class="num mono" title="EJ engagés (programmés + matérialisés)">'+fmt(sommeMontant(em))+'</td>'+
      '<td class="num" title="Aléas + risques">'+(es.filter(isAlea).length+es.filter(isRisque).length)+'</td></tr>';
  }).join('');
  ov.innerHTML='<div class="modal"><h2>Opération « '+esc(o.nom)+' » — '+as.length+' affaire(s)</h2>'+
    (o.description?'<p class="hint">'+esc(o.description)+'</p>':'')+
    (as.length?'<div class="grid-wrap"><table class="liste"><thead><tr><th>Affaire</th><th>Entreprise</th><th>Réf. contrat</th><th class="num">Reste à payer</th><th class="num">EJ engagés</th><th class="num">Aléas+Rk</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
             :'<p class="hint">Aucune affaire sur cette opération.</p>')+
    '<div class="formrow" style="margin-top:12px"><button type="button" class="btn" id="op-cancel" title="Fermer">Fermer</button></div></div>';
  document.body.appendChild(ov);
  function close(){ ov.remove(); document.removeEventListener('keydown',escH); }
  function escH(ev){ if(ev.key==='Escape') close(); }
  document.addEventListener('keydown',escH);
  ov.addEventListener('click',function(ev){ if(ev.target===ov) close(); });
  ov.querySelector('#op-cancel').addEventListener('click',close);
  ov.addEventListener('click',function(ev){
    var b=ev.target.closest('button[data-affbtn]');
    if(b){ close(); openAffairePopup(b.dataset.affbtn); }
  });
}

/* ---- tableaux Excel (TSV) : copier vers Excel / coller depuis Excel ---- */
function tsvCell(v){
  if(typeof v==='number') v=String(Math.round(v*100)/100).replace('.',',');
  var s=String(v==null?'':v);
  if(/[\t\n\r"]/.test(s)) s='"'+s.replace(/"/g,'""')+'"';
  return s;
}
function opsTSV(){
  var rows=[['N°','Nom','Description','Affaires','EJ engagés','Aléas','Risques','CP prévus','Atterrissage haut']];
  state.operations.forEach(function(o){
    var as=state.affaires.filter(function(a){ return a.opId===o.id; });
    var aids={}; as.forEach(function(a){ aids[a.id]=1; });
    var es=state.ejs.filter(function(e){ return aids[e.affaireId]; });
    var em=es.filter(isMaterialise), al=es.filter(isAlea), rk=es.filter(isRisque);
    var ej=sommeMontant(em), alT=sommeMontant(al), rkT=0; rk.forEach(function(e){ rkT+=montantHaut(e); });
    var cp=0; es.forEach(function(e){ cp+=cpSumOf(e.id); });
    rows.push([o.numero||'', o.nom, o.description||'', as.length, Math.round(ej), Math.round(alT), Math.round(rkT), Math.round(cp), Math.round(ej+alT+rkT)]);
  });
  return rows.map(function(r){ return r.map(tsvCell).join('\t'); }).join('\n');
}
function affsTSV(opId){
  var rows=[['Nom','Opération','Entreprise','Réf. contrat','Date réf. rév.','Formule','Reste à payer','EJ engagés']];
  scopedAffaires(opId||'', '').forEach(function(a){
    var em=ejsOfAffaire(a.id).filter(isMaterialise);
    rows.push([a.nom, opName(a.opId), a.titulaire||'', a.refContrat||'', a.dateRefRev||'', a.formule||'', Math.round(resteAPayer(a)), Math.round(sommeMontant(em))]);
  });
  return rows.map(function(r){ return r.map(tsvCell).join('\t'); }).join('\n');
}
function parseTSV(txt){
  return String(txt||'').replace(/\r/g,'').split('\n').filter(function(l){ return l.trim()!==''; }).map(function(l){
    var out=[], cur='', inQ=false;
    for(var i=0;i<l.length;i++){ var c=l[i];
      if(inQ){ if(c==='"'){ if(l[i+1]==='"'){ cur+='"'; i++; } else inQ=false; } else cur+=c; }
      else if(c==='"') inQ=true;
      else if(c==='\t'){ out.push(cur); cur=''; }
      else cur+=c;
    }
    out.push(cur);
    return out;
  });
}
function pasteOpsTSV(txt){
  var rows=parseTSV(txt), n=0;
  rows.forEach(function(r){
    var num=String(r[0]||'').replace(/[^0-9]/g,''), nom=String(r[1]||'').trim();
    if(/^n°$/i.test(num+nom)) return; /* en-tête */
    if(!nom&&!num) return;
    var ex=null;
    state.operations.forEach(function(o){ if(!ex&&((num&&o.numero===num)||(!num&&o.nom===nom))) ex=o; });
    if(ex){ if(nom) ex.nom=nom; if(r[2]!=null) ex.description=String(r[2]); }
    else{
      if(!num){ var mx=0; state.operations.forEach(function(o){ var nn=parseInt(o.numero,10); if(!isNaN(nn)&&nn>mx) mx=nn; }); num=String(mx+1); }
      state.operations.push({id:uid(), numero:num, nom:nom||('Opération '+num), description:String(r[2]||'')});
    }
    n++;
  });
  if(n){ save(); render(); }
  return n;
}
function pasteAffsTSV(txt, defaultOpId){
  var rows=parseTSV(txt), n=0;
  rows.forEach(function(r){
    var nom=String(r[0]||'').trim();
    if(!nom||/^nom$/i.test(nom)) return; /* vide ou en-tête */
    var opName=String(r[1]||'').trim(), opId=defaultOpId||'';
    if(opName){ state.operations.forEach(function(o){ if(o.nom===opName) opId=o.id; }); }
    if(!opId||!opById(opId)) return;
    var dr=parseIdxDate(String(r[4]||''))||curMois();
    var ex=null;
    state.affaires.forEach(function(a){ if(!ex&&a.opId===opId&&a.nom===nom) ex=a; });
    if(ex){ ex.titulaire=String(r[2]||''); ex.refContrat=String(r[3]||''); if(dr) ex.dateRefRev=dr; ex.formule=String(r[5]||''); }
    else state.affaires.push({id:uid(), opId:opId, nom:nom, titulaire:String(r[2]||''), refContrat:String(r[3]||''), dateRefRev:dr, formule:String(r[5]||'')});
    n++;
  });
  if(n){ recomputeProfils(state); save(); render(); }
  return n;
}

function renderStructure(){
  var h='';
  var cv=cmpVer();
  h+='<div class="card"><h2>Opérations <button type="button" class="btn small" data-copytsv="ops" title="Copier le tableau au format Excel (TSV, tabulations)">Copier (Excel)</button></h2>';
  if(state.operations.length===0){ h+='<p class="hint">Aucune opération. Créez-en une ci-dessous.</p>'; }
  else{
    h+='<table class="liste" data-pastetsv="ops" tabindex="0" title="Coller ici (Ctrl+V) un bloc copié depuis Excel"><tr><th class="num" style="width:56px" title="Numéro de l\'opération (nombres uniquement)">N°</th><th style="width:26%">Nom</th><th>Description</th><th class="num">Affaires</th><th class="num">EJ engagés</th><th class="num">Aléas</th><th class="num">Risques</th><th class="num">CP prévus</th><th class="num" title="Montant final haut : EJ engagés + aléas + risques (100 %)">Atterrissage haut</th><th></th></tr>';
    state.operations.forEach(function(o){
      var as=state.affaires.filter(function(a){return a.opId===o.id;});
      var aids={}; as.forEach(function(a){aids[a.id]=1;});
      var es=state.ejs.filter(function(e){return aids[e.affaireId];});
      var em=es.filter(isMaterialise), al=es.filter(isAlea), rk=es.filter(isRisque);
      var ej=sommeMontant(em), alT=sommeMontant(al), rkT=0; rk.forEach(function(e){ rkT+=montantHaut(e); });
      var cp=0; es.forEach(function(e){ cp+=cpSumOf(e.id); });
      var ost=null;
      if(cv){
        ost={ej:0,al:0,rk:0,cp:0};
        (cv.affaires||[]).forEach(function(a){
          if(!a||a.opId!==o.id) return;
          var s2=cmpAffStats(cv,a.id);
          ost.ej+=s2.ej; ost.al+=s2.alea; ost.rk+=s2.rk; ost.cp+=s2.cp;
        });
      }
      h+='<tr>'+
        '<td><input type="text" inputmode="numeric" pattern="[0-9]*" data-opf="'+o.id+'" data-f="numero" value="'+esc(o.numero||'')+'" title="Numéro de l\'opération (nombres uniquement)"></td>'+
        '<td><input type="text" data-opf="'+o.id+'" data-f="nom" value="'+esc(o.nom)+'" title="Nom de l\'opération"></td>'+
        '<td><input type="text" data-opf="'+o.id+'" data-f="description" value="'+esc(o.description||'')+'" title="Description de l\'opération"></td>'+
        '<td class="num">'+as.length+'</td>'+
        '<td class="num mono">'+fmt(ej)+(ost?cmpNoteHTML(ost.ej,ej,fmt):'')+'</td>'+
        '<td class="num mono">'+(alT?fmt(alT):'—')+(ost?cmpNoteHTML(ost.al,alT,fmt):'')+'</td>'+
        '<td class="num mono">'+(rkT?fmt(rkT):'—')+(ost?cmpNoteHTML(ost.rk,rkT,fmt):'')+'</td>'+
        '<td class="num mono">'+fmt(cp)+(ost?cmpNoteHTML(ost.cp,cp,fmt):'')+'</td>'+
        '<td class="num mono">'+fmt(ej+alT+rkT)+'</td>'+
        '<td><button class="btn small" data-opview="'+o.id+'" title="Voir toutes les affaires de cette opération (popup)">Voir</button> '+
        '<button class="btn small danger" data-delop="'+o.id+'" title="Supprimer cette opération, ses affaires, leurs EJ et CP">Supprimer</button></td></tr>';
    });
    h+='</table>';
  }
  h+='</div>';
  h+='<div class="card"><h2>Ajouter une opération</h2><div class="formrow"><label class="fld">N°<input type="text" inputmode="numeric" pattern="[0-9]*" id="new-op-num" placeholder="101" title="Numéro de la nouvelle opération (nombres uniquement)"></label>'+
     '<label class="fld">Nom<input type="text" id="new-op" placeholder="Nom de l\'opération" title="Nom de la nouvelle opération"></label>'+
     '<button class="btn primary" id="add-op" title="Créer l\'opération">Ajouter l\'opération</button></div></div>';

  h+='<div class="card"><h2>Affaires <button type="button" class="btn small" data-copytsv="affs" title="Copier le tableau des affaires au format Excel (TSV)">Copier (Excel)</button></h2>';
  var opId=state.ui.op||'';
  var opOpts='<option value="">Toutes les opérations</option>';
  state.operations.forEach(function(o){ opOpts+='<option value="'+o.id+'"'+(opId===o.id?' selected':'')+'>'+(o.numero?o.numero+' — ':'')+esc(o.nom)+'</option>'; });
  h+='<div class="formrow"><label class="fld">Opération affichée<select id="st-op" title="Opération dont on voit les affaires ci-dessous — « Toutes les opérations » pour tout voir (changeable)">'+opOpts+'</select></label></div>';
  if(!state.operations.length){ h+='<p class="hint">Créez d\'abord une opération (carte ci-dessus).</p>'; }
  else{
    var as=scopedAffaires(opId, ''); /* la table des affaires de cette carte n'est pas restreinte par le filtre affaire global */
    if(as.length===0) h+='<p class="hint">Aucune affaire. Créez-en une dans la carte ci-dessous.</p>';
    else{
      h+='<table class="liste" data-pastetsv="affs" tabindex="0" title="Coller ici (Ctrl+V) un bloc copié depuis Excel (crée/met à jour les affaires de l\'opération affichée)"><tr><th>Nom</th><th>Opération</th><th>Entreprise</th><th>Réf. contrat</th><th>Date réf. rév.</th><th>Formule d\'indice</th><th class="num">Reste à payer</th><th class="num">EJ engagés</th><th></th></tr>';
      as.forEach(function(a){
        var es=ejsOfAffaire(a.id), em=es.filter(isMaterialise);
        h+='<tr>'+
          '<td style="min-width:150px"><input type="text" data-af="'+a.id+'" data-f="nom" value="'+esc(a.nom)+'" title="Nom de l\'affaire"></td>'+
          '<td><select data-af="'+a.id+'" data-f="opId" title="Opération à laquelle est rattachée l\'affaire (attribut opId) — changez pour DÉPLACER l\'affaire d\'une opération à l\'autre">'+
            state.operations.map(function(o){ return '<option value="'+o.id+'"'+(a.opId===o.id?' selected':'')+'>'+(o.numero?o.numero+' — ':'')+esc(o.nom)+'</option>'; }).join('')+'</select></td>'+
          '<td><input type="text" data-af="'+a.id+'" data-f="titulaire" value="'+esc(a.titulaire||'')+'" title="Entreprise titulaire du contrat"></td>'+
          '<td><input type="text" data-af="'+a.id+'" data-f="refContrat" value="'+esc(a.refContrat||'')+'" title="Référence du contrat (champ texte libre)"></td>'+
          '<td>'+monthInputHTML('',a.dateRefRev,'','Date de référence de la révision de prix (MM/AAAA) : I₀ = indice à cette date','data-af="'+a.id+'" data-f="dateRefRev"')+'</td>'+
          '<td style="min-width:230px"><input type="text" data-af="'+a.id+'" data-f="formule" value="'+esc(a.formule||'')+'" placeholder="'+(state.indices[0]?'{'+esc(state.indices[0].nom)+'}':'{SÉRIE}')+'" title="Formule de l\'affaire = indice applicable au marché : {série} = valeur de la série au mois, {série_0} = valeur de la série au mois de référence (date de réf.), ex. {BT01}/{BT01_0} ; {i0} = indice à la date de réf. RP automatique : {c}*({i}/{i0}-1) avec {c} = somme des CP prévus du mois. Vide = première série. Séries saisies dans « Indices »."></td>'+
          '<td class="num mono" title="Reste à payer à date = EJ engagés cumulés − CP consommés cumulés des EJ engagés (aléas/risques exclus, non matérialisés ; finit à 0)">'+fmt(resteAPayer(a))+'</td>'+
          '<td class="num mono" title="Montant des EJ engagés (programmés ou matérialisés)">'+fmt(sommeMontant(em))+'</td>'+
          '<td><button class="btn small" data-addej="'+a.id+'" title="Ajouter un EJ programmé sur cette affaire (réglable ensuite dans « Consommation CP »)">+ EJ</button> '+
          '<button class="btn small" data-affview="'+a.id+'" title="Voir tous les EJ de cette affaire, avec leurs dates (popup)">Voir</button> '+
          '<button class="btn small danger" data-dela="'+a.id+'" title="Supprimer cette affaire, ses EJ et leurs CP">Supprimer</button></td></tr>';
      });
      h+='</table>';
    }
  }
  h+='</div>';
  h+='<div class="card"><h2>Ajouter une affaire</h2>';
  if(state.operations.length){
    var opOptsC='';
    state.operations.forEach(function(o){ opOptsC+='<option value="'+o.id+'"'+(opId===o.id?' selected':'')+'>'+(o.numero?o.numero+' — ':'')+esc(o.nom)+'</option>'; });
    h+='<div class="formrow">'+
       '<label class="fld">Opération<select id="new-a-op" title="Opération dans laquelle créer l\'affaire (obligatoire)">'+opOptsC+'</select></label>'+
       '<label class="fld">Nom<input type="text" id="new-a-nom" placeholder="Génie civil…" title="Nom de la nouvelle affaire"></label>'+
       '<label class="fld">Entreprise<input type="text" id="new-a-tit" placeholder="Entreprise titulaire" title="Entreprise titulaire du contrat"></label>'+
       '<label class="fld">Réf. contrat<input type="text" id="new-a-ref" placeholder="CTR-2026-…" title="Référence du contrat (champ texte libre)"></label>'+
       '<label class="fld">Date réf. rév.'+monthInputHTML('new-a-dateref','','','Date de référence de la révision de prix, MM/AAAA (I₀ = indice à cette date)')+'</label>'+
       '<label class="fld">Formule<input type="text" id="new-a-formule" placeholder="'+(state.indices[0]?'{'+esc(state.indices[0].nom)+'}':'{SÉRIE}')+'" title="Formule de l\'affaire = indice applicable (vide = première série) ; la révision de prix en découle automatiquement"></label>'+
       '<button class="btn primary" id="add-a" title="Créer l\'affaire sur l\'opération sélectionnée">Ajouter l\'affaire</button></div>';
  } else { h+='<p class="hint">Créez d\'abord une opération (carte ci-dessus).</p>'; }
  h+='</div>';

  mount('view-structure', h, function(w){
    w.addEventListener('change', function(ev){
      var t=ev.target;
      if(t.id==='st-op'){ state.ui.op=t.value; state.ui.aff=''; save(); render(); return; }
      if(t.dataset.opf){ var o=opById(t.dataset.opf); if(o){ if(t.dataset.f==='numero'){ o.numero=String(t.value).replace(/[^0-9]/g,''); } else o[t.dataset.f]=t.value; save(); renderFilters(); } return; }
      if(t.dataset.af){
        var a=affaireById(t.dataset.af); if(!a) return;
        var f=t.dataset.f;
        if(f==='nom'||f==='titulaire'||f==='refContrat'||f==='formule'){ a[f]=t.value; }
        else if(f==='dateRefRev'){ if(t.value.trim()===''){ a[f]=null; } else { var dv=parseIdxDate(t.value); if(dv) a[f]=dv; } }
        else if(f==='opId'){ var no=opById(t.value); if(no){ a.opId=no.id; save(); renderFilters(); render(); return; } }
        else { var n=parseFloat(t.value); a[f]=isNaN(n)?null:n; }
        save(); return;
      }
    });
    w.addEventListener('paste', function(ev){
      var zone=ev.target&&ev.target.closest?ev.target.closest('[data-pastetsv]'):null;
      if(!zone) return;
      var cd=ev.clipboardData; var txt=cd&&cd.getData?cd.getData('text/plain'):'';
      if(!txt) return;
      ev.preventDefault();
      var n=zone.dataset.pastetsv==='ops'?pasteOpsTSV(txt):pasteAffsTSV(txt, opId);
      if(n&&typeof alert==='function'){ /* n créations/mises à jour */ }
    });
    w.addEventListener('click', function(ev){
      var t=ev.target.closest('button'); if(!t) return;
      if(t.dataset&&t.dataset.copytsv){
        var txt=t.dataset.copytsv==='ops'?opsTSV():affsTSV(opId);
        copyTextToClipboard(txt).then(function(){ var old=t.textContent; t.textContent='Copié !'; setTimeout(function(){ t.textContent=old; },1200); },
          function(){ alert('Copie auto indisponible : sélectionnez le tableau et Ctrl+C.'); });
        return;
      }
      if(t.id==='add-op'){
        var nom=w.querySelector('#new-op').value.trim();
        if(!nom) return;
        var num=w.querySelector('#new-op-num').value.replace(/[^0-9]/g,'');
        if(!num){ var mx=0; state.operations.forEach(function(o){ var n=parseInt(o.numero,10); if(!isNaN(n)&&n>mx) mx=n; }); num=String(mx+1); }
        state.operations.push({id:uid(),numero:num,nom:nom,description:''});
        save(); render(); return;
      }
      if(t.id==='add-a'){
        var n1=w.querySelector('#new-a-nom').value.trim(); if(!n1) return;
        var ref=w.querySelector('#new-a-ref').value.trim();
        var dr=parseIdxDate(w.querySelector('#new-a-dateref').value)||curMois();
        var fr2=w.querySelector('#new-a-formule').value.trim();
        var opSel2=w.querySelector('#new-a-op'); var opId2=(opSel2&&opSel2.value)||opId;
        state.affaires.push({id:uid(),opId:opId2,nom:n1,titulaire:w.querySelector('#new-a-tit').value.trim(),
          refContrat:ref,dateRefRev:dr,formule:fr2});
        save(); render(); return;
      }
      if(t.dataset.opview){ openOpPopup(t.dataset.opview); return; }
      if(t.dataset.affview){ openAffairePopup(t.dataset.affview); return; }
      if(t.dataset.addej){
        var aid9=t.dataset.addej; var aff9=affaireById(aid9); if(!aff9) return;
        var n9=state.ejs.filter(function(e){ return e.affaireId===aid9; }).length+1;
        var ej9={id:uid(),affaireId:aid9,numero:'EJ-'+String(n9).padStart(2,'0'),libelle:'',stade:'prog',mois:curMois(),montant:0};
        state.ejs.push(ej9);
        recomputeProfils(state);
        /* on ramène sur l'onglet Consommation CP, affaire filtrée, colonne du nouvel EJ focalisée */
        state.ui.op=aff9.opId; state.ui.aff=aid9; state.ui.view='conso'; state.ui.focusCol=ej9.id;
        save(); render(); return;
      }
      if(t.dataset.delop){
        if(!confirm('Supprimer cette opération, ses affaires, leurs EJ et CP ?')) return;
        var oid=t.dataset.delop;
        var aids=state.affaires.filter(function(a){return a.opId===oid;}).map(function(a){return a.id;});
        var eids=state.ejs.filter(function(e){return aids.indexOf(e.affaireId)>=0;}).map(function(e){return e.id;});
        state.ejs=state.ejs.filter(function(e){return aids.indexOf(e.affaireId)<0;});
        for(var k in state.cps){ var p=k.split('|'); if(eids.indexOf(p[0])>=0) delete state.cps[k]; }
        for(var kp in state.profils){ if(eids.indexOf(kp)>=0) delete state.profils[kp]; }
        for(var kr in state.revisions){ var pr=kr.split('|'); if(aids.indexOf(pr[0])>=0) delete state.revisions[kr]; }
        for(var kr2 in state.realise){ var pr2=kr2.split('|'); if(aids.indexOf(pr2[0])>=0) delete state.realise[kr2]; }
        state.affaires=state.affaires.filter(function(a){return a.opId!==oid;});
        state.operations=state.operations.filter(function(o){return o.id!==oid;});
        if(state.ui.op===oid) state.ui.op='';
        save(); render(); return;
      }
      if(t.dataset.dela){
        if(!confirm('Supprimer cette affaire, ses EJ et leurs CP ?')) return;
        var aid=t.dataset.dela;
        var eids2=state.ejs.filter(function(e){return e.affaireId===aid;}).map(function(e){return e.id;});
        state.ejs=state.ejs.filter(function(e){return e.affaireId!==aid;});
        for(var k2 in state.cps){ var p2=k2.split('|'); if(eids2.indexOf(p2[0])>=0) delete state.cps[k2]; }
        for(var kp2 in state.profils){ if(eids2.indexOf(kp2)>=0) delete state.profils[kp2]; }
        for(var kr3 in state.revisions){ if(kr3.indexOf(aid+'|')===0) delete state.revisions[kr3]; }
        for(var kr4 in state.realise){ if(kr4.indexOf(aid+'|')===0) delete state.realise[kr4]; }
        state.affaires=state.affaires.filter(function(a){return a.id!==aid;});
        if(state.ui.aff===aid) state.ui.aff='';
        save(); render(); return;
      }
    });
  });
}

