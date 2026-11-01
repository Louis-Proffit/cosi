/* ================= Vue : Consommation CP (profils des EJ) ================= */

function renderConso(){
  var opId=state.ui.op||'', affId=state.ui.aff||'';
  var affs=scopedAffaires(opId,affId);
  var months=scopeMonths(opId,affId);
  var cur=curMois();

  /* seuls les EJ matérialisés (programmés ou engagés) ont une consommation de
     CP ici ; les aléas et risques ont leur onglet dédié « Risques & aléas » */
  var ejs=state.ejs.filter(function(e){ return affs.some(function(a){ return a.id===e.affaireId; }) && isMaterialise(e); });
  var affIdx={}; affs.forEach(function(a,i){ affIdx[a.id]=i; });
  var stadeOrder={prog:0,engage:1,alea:2,risque:3};
  ejs.sort(function(a,b){
    var oa=affIdx[a.affaireId]||0, ob=affIdx[b.affaireId]||0;
    if(oa!==ob) return oa-ob;
    var sa=stadeOrder[a.stade]||0, sb=stadeOrder[b.stade]||0;
    if(sa!==sb) return sa-sb;
    return a.mois<b.mois?-1:(a.mois>b.mois?1:0);
  });

  var h='<div class="toolbar">'+
    (affs.length?('<button class="btn" id="c-addej" title="Ajouter un EJ programmé sur l\'affaire du filtre en en-tête (Opération/Affaire)">+ EJ</button>'):'')+
    '<button class="btn" id="c-ext" title="Afficher 12 mois de plus à droite de la grille">+ 12 mois</button>'+
    (state.ui.ext>0?'<button class="btn" id="c-shrink" title="Retirer 12 mois à droite de la grille">− 12 mois</button>':'')+
    '<button class="btn" id="c-csv" title="Exporter la grille (mois × EJ) en CSV">Exporter CSV</button></div>';

  if(affs.length===0){
    h+='<div class="card"><div class="empty">Aucune affaire dans cette sélection. Créez-en une dans « Opérations &amp; affaires ».</div></div>';
    mount('view-conso',h,function(w){ wireConsoHeader(w,affs); });
    return;
  }

  /* En-tête sur plusieurs lignes (étendu vers le bas pour éviter le tassement) :
     hl1 stade · hl2 n° · hl3 affaire · hl4 libellé · hl5 montant · hl6 profil (bouton popup) · hl7 infos */
  var r1='<th class="scol sc0 hl1">#</th><th class="scol sc1 hl1">Mois</th><th class="dcol hl1">Total CP</th>';
  var r2='<th class="scol sc0 hl2"></th><th class="scol sc1 hl2"></th><th class="dcol hl2"></th>';
  var r3='<th class="scol sc0 hl3"></th><th class="scol sc1 hl3"></th><th class="dcol hl3"></th>';
  var r4='<th class="scol sc0 hl4"></th><th class="scol sc1 hl4"></th><th class="dcol hl4" title="Total des CP du mois sur tous les EJ"></th>';
  var r5='<th class="scol sc0 hl5"></th><th class="scol sc1 hl5"></th><th class="dcol hl5"></th>';
  var r6='<th class="scol sc0 hl6"></th><th class="scol sc1 hl6"></th><th class="dcol hl6"></th>';
  var r7='<th class="scol sc0 hl7"></th><th class="scol sc1 hl7"></th><th class="dcol hl7"></th>';
  ejs.forEach(function(e){
    var aff=affaireById(e.affaireId);
    var p=profilOf(e);
    r1+='<th class="dcol hl1">'+stadeBadge(e)+'</th>';
    r2+='<th class="dcol hl2'+(state.ui.focusCol===e.id?' col-focus':'')+'"><input type="text" class="hdr-in" data-ejf="'+e.id+'" data-f="numero" value="'+esc(e.numero)+'" title="Référence (n°) de l\'EJ — modifiable ici"></th>';
    r3+='<th class="dcol hl3"><button type="button" class="btn btn-prof" data-affbtn="'+e.affaireId+'" title="Voir tous les EJ de l\'affaire « '+esc(aff?aff.nom:'?')+' », avec leurs dates (popup)">'+esc(aff?aff.nom:'?')+'</button></th>';
    r4+='<th class="dcol hl4"><input type="text" class="hdr-in" data-ejf="'+e.id+'" data-f="libelle" value="'+esc(e.libelle||'')+'" placeholder="Libellé" title="Libellé de l\'EJ"></th>';
    r5+='<th class="dcol hl5"><input type="text" inputmode="decimal" class="hdr-in" data-ejf="'+e.id+'" data-f="montant" value="'+(montantOf(e)||'')+'" placeholder="Montant" title="Montant de l\'EJ engagé"></th>';
    r6+='<th class="dcol hl6"><button type="button" class="btn btn-prof" data-profbtn="'+e.id+'" title="Ouvrir le réglage du profil de consommation des CP (ponctuelle / uniforme / personnalisée)">'+esc(profilSummary(p))+'</button></th>';
    var somCp=cpSumOf(e.id), mtE=montantOf(e), cohOk=Math.abs(mtE-somCp)<=Math.max(1,mtE*0.001);
    r7+='<th class="dcol hl7'+(state.ui.focusCol===e.id?' col-focus':'')+'">'+monthInputHTML('',e.mois,'hdr-in','Date de l\'EJ, MM/AAAA — modifiable ici ; recalcule les CP si le profil est ponctuel/uniforme','data-ejf="'+e.id+'" data-f="mois"')+'<div class="hdr-sub'+(cohOk?'':' coh-bad')+'" title="Somme des CP = '+fmt0(somCp)+' ; montant de l\'EJ = '+fmt0(mtE)+(cohOk?' — cohérent':' — ÉCART de '+fmt0(mtE-somCp)+' : alerte reportée sur le tableau de bord (colonne de cet EJ)')+'">CP '+fmt0(somCp)+(cohOk?'':' <span class="badge over">écart '+fmt0(mtE-somCp)+'</span>')+'</div></th>';
  });

  var body='';
  for(var r=1;r<=months.length;r++){
    var m=months[r-1];
    var tot=0;
    body+='<tr'+(m===cur?' class="cur"':'')+'><td class="scol sc0 rnum">'+r+'</td><td class="scol sc1 mh'+(m===cur?' cur':'')+'">'+mLabel(m)+'</td>';
    ejs.forEach(function(e){ tot+=cpPrevu(e,m); });
    body+='<td class="dcol ccell tot'+(tot>0?' gp-cell':'')+'"'+(tot>0?' data-totcp="'+m+'" title="Détail du total CP de '+mLabel(m)+' (cliquer)"':'')+'>'+fmt0(tot)+'</td>';
    ejs.forEach(function(e){
      var p=profilOf(e);
      var v=cpPrevu(e,m);
      if(e.mois&&m<e.mois){
        /* pas de CP avant le mois de l'EJ (l'EJ est fait intégralement le 1er jour) : cellule grisée et verrouillée */
        body+='<td class="dcol cp-avant" title="Pas de CP avant '+mLabel(e.mois)+' (mois de l\'EJ '+esc(e.numero)+') : l\'EJ est engagé intégralement le 1er jour — cellule verrouillée">'+(v?fmt0(v):'')+'</td>';
      }else if(p.type==='perso'){
        body+='<td class="dcol'+(state.ui.focusCol===e.id?' col-focus':'')+'"><input type="text" inputmode="decimal" class="cell" data-cp="'+e.id+'|'+m+'" value="'+(v?v:'')+'" title="CP consommés ce mois-ci pour '+esc(e.numero)+' (profil personnalisé : saisie libre)"></td>';
      }else{
        body+='<td class="dcol cp-lock'+(state.ui.focusCol===e.id?' col-focus':'')+'" title="Calculé selon le profil '+p.type+'">'+(v?fmt0(v):'')+'</td>';
      }
    });
    body+='</tr>';
  }
  var foot='<tr><td class="scol sc0"></td><td class="scol sc1">Total</td>';
  var gt=0;
  ejs.forEach(function(e){ var s=cpSumOf(e.id); gt+=s; foot+='<td class="dcol ccell tot">'+fmt0(s)+'</td>'; });
  foot+='<td class="dcol ccell tot">'+fmt0(gt)+'</td></tr>';

     '<p class="hint">Une ligne par mois, une colonne par <strong>EJ matérialisé</strong> (aléas/risques : onglet dédié). Profil de CP via le bouton dans l\'en-tête de colonne. Cellules violettes = calculées, grisées = verrouillées (avant le mois de l\'EJ). <strong>Clic sur le total du mois : détail.</strong> <span class="hint-ic" title="Profils : ponctuelle (tout le CP à un mois), uniforme (réparti sur une période), personnalisée (saisie libre cellule par cellule). Le montant de l\'EJ et la somme de ses CP doivent être cohérents : sinon badge d\'écart ici et alerte sur le tableau de bord (avec lien vers la colonne). Tous les CP alimentent le tableau de bord et la GP à saisir.">i</span></p></div>';
     '<p class="hint">Une ligne par mois, une colonne par <strong>EJ matérialisé</strong> (programmé ou engagé) — les <strong>aléas et risques</strong> se gèrent dans l\'onglet dédié « Risques &amp; aléas ». Le <strong>profil de consommation</strong> se règle en cliquant sur le bouton de profil dans l\'en-tête de la colonne (fenêtre avec un onglet par mode : <strong>ponctuelle</strong>, <strong>uniforme sur une période</strong> — pour un EJ issu d\'un risque matérialisé, la date choisie peut servir de début — ou <strong>personnalisée</strong>). En profil ponctuel/uniforme les CP sont recalculés automatiquement (cellules violet) ; en profil personnalisé, saisissez les CP directement dans les cellules. Tous les CP alimentent le tableau de bord et la GP à saisir.</p></div>';
  h+='<div class="grid-wrap"><table class="grid conso"><thead><tr class="hl1">'+r1+'</tr><tr class="hl2">'+r2+'</tr><tr class="hl3">'+r3+'</tr><tr class="hl4">'+r4+'</tr><tr class="hl5">'+r5+'</tr><tr class="hl6">'+r6+'</tr><tr class="hl7">'+r7+'</tr></thead>'+
     '<tbody>'+body+'</tbody><tfoot>'+foot+'</tfoot></table></div>';

  mount('view-conso', h, function(w){
    wireConsoHeader(w,affs);
    w.addEventListener('click', function(ev){
      var tc=ev.target.closest('[data-totcp]');
      if(tc&&tc.dataset&&tc.dataset.totcp){
        var m=tc.dataset.totcp, row=tc.closest('tr');
        var next=row.nextSibling;
        var key='totcp|'+m;
        if(next&&next.classList&&next.classList.contains('gp-detail-row')){ if(next.dataset.for===key){ next.parentNode.removeChild(next); return; } next.dataset.for=key; next.innerHTML=consoTotDetail(m,ejs); return; }
        var items=[];
        ejs.forEach(function(e){ var v=cpPrevu(e,m); if(v>0) items.push('<div><span class="gp-k">'+esc(e.numero)+'</span> '+(e.libelle?'('+esc(e.libelle)+') ':'')+': <span class="mono">'+fmt0(v)+'</span></div>'); });
        var html='<td colspan="'+(ejs.length+2)+'" class="gp-detail"><strong>Total CP '+mLong(m)+' = '+fmt0(items.reduce(function(s){return s;},0)||0)+' :</strong>';
        var tot=0; ejs.forEach(function(e){ tot+=cpPrevu(e,m); });
        html='<td colspan="'+(ejs.length+2)+'" class="gp-detail"><strong>Détail du total CP de '+mLong(m)+' ('+fmt0(tot)+') :</strong>'+items.join('')+'</td>';
        var tr=document.createElement('tr'); tr.className='gp-detail-row'; tr.dataset.for=key; tr.innerHTML=html;
        row.parentNode.insertBefore(tr, row.nextSibling);
        return;
      }
      var pb=ev.target.closest('button[data-profbtn]');
      if(pb){ openProfilPopup(pb.dataset.profbtn); return; }
      var ab=ev.target.closest('button[data-affbtn]');
      if(ab){ openAffairePopup(ab.dataset.affbtn); return; }
    });
    w.addEventListener('change', function(ev){
      var t=ev.target;
      if(t.dataset&&t.dataset.ejf){
        var e2=ejById(t.dataset.ejf); if(!e2) return;
        var f=t.dataset.f;
        if(f==='montant'){ var v=parseMontant(t.value); e2.montant=(v==null?0:v); }
        else if(f==='mois'){ var dm=parseIdxDate(t.value); if(dm) e2.mois=dm; }
        else e2[f]=t.value;
        recomputeProfils(state); save(); render(); return;
      }
      if(t.dataset&&t.dataset.cp){
        var k=t.dataset.cp, pp=k.split('|'), ejId=pp[0], m=pp[1];
        var ejC=ejById(ejId);
        if(ejC&&ejC.mois&&m<ejC.mois){ alert('Pas de CP avant le mois de l\'EJ '+ejC.numero+' ('+mLabel(ejC.mois)+') : l\'EJ est engagé intégralement le 1er jour de son mois.'); delete state.cps[k]; save(); renderConso(); return; }
        var v2=parseMontant(t.value);
        if(v2==null||v2<=0) delete state.cps[k]; else state.cps[k]=v2;
        save(); renderConso(); return;
      }
    });
  });
}

function wireConsoHeader(w, affs){
  var ext=w.querySelector('#c-ext');
  if(ext) ext.addEventListener('click',function(){ state.ui.ext=(state.ui.ext||0)+12; save(); render(); });
  var shr=w.querySelector('#c-shrink');
  if(shr) shr.addEventListener('click',function(){ state.ui.ext=Math.max(0,(state.ui.ext||0)-12); save(); render(); });
  var csv=w.querySelector('#c-csv');
  if(csv) csv.addEventListener('click',exportConsoCsv);
  var addb=w.querySelector('#c-addej');
  if(addb) addb.addEventListener('click',function(){
    /* +EJ coordonné avec le filtre global en en-tête : affaire filtrée, sinon 1ʳᵉ affaire de l'opération filtrée */
    var cid=state.ui.aff||'';
    if(!cid){ var as=scopedAffaires(state.ui.op||'',''); cid=as.length?as[0].id:''; }
    if(!affaireById(cid)){ alert('Sélectionnez une affaire dans le filtre en en-tête (Opération / Affaire), ou créez-en une dans « Opérations & affaires ».'); return; }
    var n=state.ejs.filter(function(e){ return e.affaireId===cid; }).length+1;
    state.ejs.push({id:uid(),affaireId:cid,numero:'EJ-'+String(n).padStart(2,'0'),libelle:'',stade:'prog',mois:curMois(),montant:0});
    recomputeProfils(state); save(); render();
  });
}

function exportConsoCsv(){
  var opId=state.ui.op||'', affId=state.ui.aff||'';
  var affs=scopedAffaires(opId,affId);
  var months=scopeMonths(opId,affId);
  var ejs=state.ejs.filter(function(e){ return affs.some(function(a){ return a.id===e.affaireId; }) && isMaterialise(e); });
  function q(x){ return '"'+String(x==null?'':x).replace(/"/g,'""')+'"'; }
  function fr(v){ return String(Math.round((v||0)*100)/100).replace('.',','); }
  var rows=[];
  rows.push(['Mois','Total CP'].concat(ejs.map(function(e){ return e.numero+' ('+stadeLabel(e)+')'; })));
  months.forEach(function(m){
    var tot=0, row=[mLabel(m)];
    ejs.forEach(function(e){ tot+=cpPrevu(e,m); });
    row.push(fr(tot));
    ejs.forEach(function(e){ row.push(fr(cpPrevu(e,m))); });
    rows.push(row);
  });
  var foot=['Total'];
  var gt=0;
  ejs.forEach(function(e){ var s=cpSumOf(e.id); gt+=s; foot.push(fr(s)); });
  foot.unshift(fr(gt));
  rows.push(foot);
  download('consommation-cp-'+curMois()+'.csv', rows.map(function(r){ return r.map(q).join(';'); }).join('\n'), 'text/csv');
}
