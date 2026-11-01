/* ================= Vue : Révisions de prix (propres à une affaire) ================= */

function renderRevisions(){
  var opId=state.ui.op||'', affId=state.ui.aff||'';
  var affs=scopedAffaires(opId,affId);
  var months=scopeMonths(opId,affId);
  var cur=curMois();

  var h='<div class="toolbar">'+
    '<button class="btn" id="r-csv" title="Exporter le tableau (mois × affaire : indice, CP, RP) en CSV">Exporter CSV</button></div>';

  h+='<div class="card"><h2>Révisions de prix (lecture seule)</h2>'+
    '<p class="hint">Tout se calcule depuis les autres onglets — <strong>rien n\'est modifiable ici</strong>. Par affaire, <strong>3 colonnes</strong> : <strong>indice applicable</strong> au marché (formule de l\'affaire, rappelée en en-tête — {série_0} = série au mois de réf. — avec le <strong>recalage I/I₀ à 1 à la date de référence</strong> de l\'affaire), <strong>CP prévisionnels du mois</strong> (profils de « Consommation CP »), <strong>RP du mois</strong> = somme des <strong>CP du mois</strong> × (I/I₀ − 1) — par défaut {c}*({i}/{i0}-1) : {c} = CP prévus de l\'affaire sur le mois, {i} = indice du mois, {i0} = indice à la date de réf. (des RP exactement là où il y a des CP). Les <strong>opérations</strong> ont en plus une <strong>colonne de total</strong> (Σ CP, Σ RP). Boutons de lien vers la saisie : <strong>fx</strong> = formules &amp; date de réf. (« Opérations &amp; affaires »), <strong>CP</strong> = profils (« Consommation CP »), <strong>idx</strong> = séries (« Indices »).</p>';

  /* groupes : opération -> affaires */
  var opCols=[];
  state.operations.forEach(function(o){
    var cs=affs.filter(function(a){ return a.opId===o.id; });
    if(cs.length) opCols.push({o:o,cs:cs});
  });
  if(!opCols.length){
    h+='<div class="card"><div class="empty">Aucune affaire dans cette sélection. Créez-en une dans « Opérations &amp; affaires ».</div></div>';
    mount('view-revisions',h,function(w){ wireRevHeader(w); });
    return;
  }

  /* en-tête sur 3 lignes pour bien voir la hiérarchie : opération > affaire (+ Σ op) > colonnes Indice/CP/RP.
     Les totaux de l'opération ne s'affichent que s'il y a plusieurs affaires.
     Les boutons de lien sont dans la colonne correspondante : fx -> Indice, CP -> CP, idx -> RP. */
  var h1='<th rowspan="3" class="scol sc0 rev-h-fix">#</th><th rowspan="3" class="scol sc1 rev-h-fix">Mois</th>';
  var h2='', h3='';
  opCols.forEach(function(og){
    var tot=(og.cs.length>1)?2:0; /* colonnes de total opération seulement si plusieurs affaires */
    h1+='<th class="rev-h-op" colspan="'+(og.cs.length*3+tot)+'">Opération : '+esc(og.o.nom)+'</th>';
    og.cs.forEach(function(a){
      h2+='<th class="rev-h-aff" colspan="3">'+esc(a.nom)+'</th>';
      h3+='<th class="rev-h-col" title="Indice applicable = formule de l\'affaire'+(a.formule?(' : '+a.formule):' (1ʳᵉ série)')+', recalé I/I₀ à 1 à la date de réf. '+(a.dateRefRev||'—')+'">Indice'+
           ' <button class="btn small" data-go="structure" data-op="'+og.o.id+'" data-aff="'+a.id+'" title="Modifier la formule et la date de réf. de cette affaire dans « Opérations & affaires »">fx</button></th>'+
           '<th class="rev-h-col" title="CP prévisionnels du mois (EJ engagés, selon leurs profils) — à régler dans « Consommation CP »">CP'+
           ' <button class="btn small" data-go="conso" data-op="'+og.o.id+'" data-aff="'+a.id+'" title="Régler les CP (profils des EJ) de cette affaire dans « Consommation CP »">CP</button></th>'+
           '<th class="rev-h-col" title="Révision de prix du mois, automatique : '+DEFAULT_REV_FORMULA+' — séries d\'indices à saisir dans « Indices »">RP'+
           ' <button class="btn small" data-go="indices" title="Saisir les séries d\'indices (tableau, collage Excel) dans « Indices »">idx</button></th>';
    });
    if(tot) h2+='<th class="rev-h-tot" rowspan="2" colspan="2" title="Total de l\'opération (plusieurs affaires)">Σ '+esc(og.o.nom)+'<br>CP · RP</th>';
  });

  var body='';
  months.forEach(function(m,ri){
    body+='<tr'+(m===cur?' class="gp-cur"':'')+'><td class="scol sc0 rnum">'+(ri+1)+'</td><td class="scol sc1 mh'+(m===cur?' cur':'')+'">'+mLabel(m)+'</td>';
    opCols.forEach(function(og){
      var tCp=0, tRp=0;
      og.cs.forEach(function(a){
        var ind=indiceApplicable(a,m), i0=indiceRef(a);
        var cp=0;
        ejsOfAffaire(a.id).forEach(function(e){ if(isMaterialise(e)) cp+=cpPrevu(e,m); });
        var rp=revisionMois(a,m);
        tCp+=cp; tRp+=rp;
        var indTxt=(ind==null?'—':fmtIdx(ind))+(ind!=null&&i0?(' <span class="muted">I/I₀='+(ind/i0).toLocaleString('fr-FR',{maximumFractionDigits:3})+'</span>'):'&nbsp;');
        var forced=Object.prototype.hasOwnProperty.call(state.revisions,a.id+'|'+m);
        body+='<td class="num mono" title="Formule de l\'affaire : '+(a.formule||'(1ʳᵉ série)')+' — date de réf. '+(a.dateRefRev||'—')+' : I₀='+(i0==null?'?':fmtIdx(i0))+' (I/I₀ recalé à 1 à cette date)">'+indTxt+'</td>';
        body+='<td class="num mono" title="CP prévisionnels ce mois (EJ engagés) — régler dans « Consommation CP »">'+fmt0(cp)+'</td>';
        body+='<td class="num mono rev-rp'+(forced?' forced':'')+'" title="RP du mois (formule de révision'+(forced?', valeur forcée':'')+') — modifier la formule dans « Opérations & affaires »">'+fmt0(rp)+'</td>';
      });
      if(og.cs.length>1) body+='<td class="num mono rev-tot" title="Total opération — CP du mois">'+fmt0(tCp)+'</td>'+
            '<td class="num mono rev-tot" title="Total opération — RP du mois">'+fmt0(tRp)+'</td>';
    });
    body+='</tr>';
  });

  h+='<div class="grid-wrap"><table class="liste gp-table rev-table"><thead><tr>'+h1+'</tr><tr>'+h2+'</tr><tr>'+h3+'</tr></thead><tbody>'+body+'</tbody></table></div></div>';

  /* ---- synthèse : RP cumulées par année, par opération / affaire ---- */
  var years={}; months.forEach(function(m){ years[m.slice(0,4)]=1; });
  var yrs=Object.keys(years).sort();
  h+='<div class="card"><h2>RP cumulées par année</h2>'+
     '<p class="hint">Révisions de prix cumulées par année, par affaire, avec le total par opération et le total général (lecture seule).</p>';
  if(!yrs.length){
    h+='<p class="hint">Aucune révision sur la période.</p></div>';
  }else{
    h+='<table class="liste"><thead><tr><th>Opération</th><th>Affaire</th>'+
       yrs.map(function(y){ return '<th class="num">'+y+'</th>'; }).join('')+
       '<th class="num">Total</th></tr></thead><tbody>';
    var gt={}; yrs.forEach(function(y){ gt[y]=0; });
    opCols.forEach(function(og){
      var opT={}; yrs.forEach(function(y){ opT[y]=0; });
      og.cs.forEach(function(a){
        var row={}; yrs.forEach(function(y){ row[y]=0; });
        months.forEach(function(m){
          var v=revisionMois(a,m);
          if(v){ var y=m.slice(0,4); row[y]+=v; opT[y]+=v; gt[y]+=v; }
        });
        var tot=0; yrs.forEach(function(y){ tot+=row[y]; });
        h+='<tr><td>'+esc(og.o.nom)+'</td><td>'+esc(a.nom)+'</td>'+
           yrs.map(function(y){ return '<td class="num mono">'+(row[y]?fmt0(row[y]):'—')+'</td>'; }).join('')+
           '<td class="num mono"><strong>'+fmt0(tot)+'</strong></td></tr>';
      });
      var ot=0; yrs.forEach(function(y){ ot+=opT[y]; });
      h+='<tr class="gp-tot"><td colspan="2">Σ '+esc(og.o.nom)+'</td>'+
         yrs.map(function(y){ return '<td class="num mono">'+(opT[y]?fmt0(opT[y]):'—')+'</td>'; }).join('')+
         '<td class="num mono"><strong>'+fmt0(ot)+'</strong></td></tr>';
    });
    var gtt=0; yrs.forEach(function(y){ gtt+=gt[y]; });
    h+='<tr class="gp-gt"><td colspan="2">Total général</td>'+
       yrs.map(function(y){ return '<td class="num mono">'+(gt[y]?fmt0(gt[y]):'—')+'</td>'; }).join('')+
       '<td class="num mono"><strong>'+fmt0(gtt)+'</strong></td></tr>';
    h+='</tbody></table></div>';
  }

  mount('view-revisions', h, function(w){
    wireRevHeader(w);
    /* boutons de lien vers les onglets de saisie */
    w.addEventListener('click', function(ev){
      var b=ev.target.closest('button[data-go]'); if(!b) return;
      var kind=b.dataset.go;
      if(kind==='structure'){ state.ui.op=b.dataset.op||''; state.ui.aff=b.dataset.aff||''; state.ui.view='structure'; save(); render(); return; }
      if(kind==='conso'){ state.ui.op=b.dataset.op||''; state.ui.aff=b.dataset.aff||''; state.ui.view='conso'; save(); render(); return; }
      if(kind==='indices'){ state.ui.view='indices'; save(); render(); return; }
    });
  });
}

function wireRevHeader(w){
  var csv=w.querySelector('#r-csv');
  if(csv) csv.addEventListener('click',function(){
    var opId=state.ui.op||'', affId=state.ui.aff||'';
    var affs=scopedAffaires(opId,affId), months=scopeMonths(opId,affId);
    function q(x){ return '"'+String(x==null?'':x).replace(/"/g,'""')+'"'; }
    function fr(v){ return String(Math.round((v||0)*100)/100).replace('.',','); }
    var head=['Mois'];
    affs.forEach(function(a){ head.push(a.nom+' — indice', a.nom+' — CP', a.nom+' — RP'); });
    var rows=[head];
    months.forEach(function(m){
      var row=[mLabel(m)];
      affs.forEach(function(a){
        var ind=indiceApplicable(a,m), cp=0;
        ejsOfAffaire(a.id).forEach(function(e){ if(isMaterialise(e)) cp+=cpPrevu(e,m); });
        row.push(ind==null?'':fr(ind), fr(cp), fr(revisionMois(a,m)));
      });
      rows.push(row);
    });
    download('revisions-'+curMois()+'.csv', rows.map(function(r){ return r.map(q).join(';'); }).join('\n'), 'text/csv');
  });
}
