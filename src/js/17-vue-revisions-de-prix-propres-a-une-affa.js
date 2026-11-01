/* ================= Vue : Révisions de prix (propres à une affaire) ================= */

/* Détail d'une cellule somme de l'onglet Révisions : CP du mois (par EJ) ou RP du
   mois (détail du calcul : CP du mois × (I/I₀ − 1), avec I et I₀). */
function revDetail(kind, scope, m, span){
  var sel=scopedAffaires(state.ui.op||'', state.ui.aff||'');
  var affs;
  if(scope.indexOf('o:')===0){ var opId=scope.slice(2); affs=sel.filter(function(a){ return a.opId===opId; }); }
  else { var a0=affaireById(scope.slice(2)); affs=a0&&sel.indexOf(a0)>=0?[a0]:[]; }
  var items=[], tot=0;
  affs.forEach(function(a){
    if(kind==='cp'){
      ejsOfAffaire(a.id).forEach(function(e){
        if(!isMaterialise(e)) return;
        var v=cpPrevu(e,m);
        if(v>0){ items.push({a:a,lbl:e.numero+(e.libelle?' ('+e.libelle+')':''),v:v}); tot+=v; }
      });
    }else{
      var v=revisionMois(a,m);
      if(v>0){
        var i=indiceApplicable(a,m), i0=indiceRef(a);
        items.push({a:a,lbl:'RP = CP '+fmt0(cpMoisAff(a,m))+' × (I/I₀−1), I='+fmtIdx(i)+', I₀='+fmtIdx(i0),v:v});
        tot+=v;
      }
    }
  });
  if(!items.length) return '<td colspan="'+span+'" class="gp-detail">Aucun détail.</td>';
  var h='<td colspan="'+span+'" class="gp-detail"><strong>'+(kind==='cp'?'CP':'RP')+' '+mLong(m)+' — total '+fmt0(tot)+' :</strong>';
  items.forEach(function(it){ h+='<div>'+(affs.length>1?esc(it.a.nom)+' · ':'')+esc(it.lbl)+' : <span class="mono">'+fmt0(it.v)+'</span></div>'; });
  return h+'</td>';
}

function renderRevisions(){
  var opId=state.ui.op||'', affId=state.ui.aff||'';
  var affs=scopedAffaires(opId,affId);
  var months=scopeMonths(opId,affId);
  var cur=curMois();

  var h='<div class="toolbar">'+
    '<button class="btn" id="r-csv" title="Exporter le tableau (mois × affaire : indice, CP, RP) en CSV">Exporter CSV</button></div>';

    '<p class="hint">Lecture seule : par affaire, <strong>indice I/I₀ recalé</strong>, <strong>CP du mois</strong>, <strong>RP = CP × (I/I₀−1)</strong> — des RP exactement là où il y a des CP. <strong>Clic sur une cellule CP/RP = détail de la somme/du calcul.</strong> Boutons <strong>fx / CP / idx</strong> dans les colonnes. <span class="hint-ic" title="{série_0} = valeur de la série au mois de référence de l\'affaire ; {i0} = indice à la date de réf. RP par défaut {c}*({i}/{i0}-1) avec {c} = CP du mois. 2e tableau : RP cumulées, années en lignes, opérations/affaires en colonnes.">i</span></p>';
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
        body+='<td class="num mono'+(cp>0?' gp-cell':'')+'"'+(cp>0?' data-rev="cp|a:'+a.id+'|'+m+'" title="CP prévisionnels ce mois (somme) — cliquer pour le détail des EJ"':' title="CP prévisionnels ce mois (EJ engagés) — régler dans « Consommation CP »"')+'>'+fmt0(cp)+'</td>';
        body+='<td class="num mono rev-rp'+(forced?' forced':'')+(rp>0?' gp-cell':'')+'"'+(rp>0?' data-rev="rp|a:'+a.id+'|'+m+'" title="RP du mois = CP du mois × (I/I₀−1) — cliquer pour le détail du calcul"':' title="RP du mois (formule de révision'+(forced?', valeur forcée':'')+') — modifier la formule dans « Opérations & affaires »"')+'>'+fmt0(rp)+'</td>';
      });
      if(og.cs.length>1) body+='<td class="num mono rev-tot'+(tCp>0?' gp-cell':'')+'"'+(tCp>0?' data-rev="cp|o:'+og.o.id+'|'+m+'" title="Total opération — CP du mois (somme des affaires) — cliquer pour le détail"':' title="Total opération — CP du mois"')+'>'+fmt0(tCp)+'</td>'+
            '<td class="num mono rev-tot'+(tRp>0?' gp-cell':'')+'"'+(tRp>0?' data-rev="rp|o:'+og.o.id+'|'+m+'" title="Total opération — RP du mois (somme des affaires) — cliquer pour le détail"':' title="Total opération — RP du mois"')+'>'+fmt0(tRp)+'</td>';
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
    /* tableau transposé : ANNÉES en lignes, opérations/affaires en colonnes */
    h+='<table class="liste rev-year"><thead><tr><th rowspan="2">Année</th>';
    opCols.forEach(function(og){ h+='<th class="rev-h-op" colspan="'+og.cs.length+'">Opération : '+esc(og.o.nom)+'</th>'; });
    h+='<th rowspan="2" class="num" title="Total de l\'année sur toutes les affaires">Total</th></tr><tr>';
    opCols.forEach(function(og){ og.cs.forEach(function(a){ h+='<th class="rev-h-aff" title="Affaire « '+esc(a.nom)+' »">N° '+esc(og.o.numero||'')+' — '+esc(a.nom)+'</th>'; }); });
    h+='</tr></thead><tbody>';
    yrs.forEach(function(y){
      h+='<tr><td><strong>'+y+'</strong></td>';
      var yTot=0;
      opCols.forEach(function(og){
        og.cs.forEach(function(a){
          var v=0;
          months.forEach(function(m){ if(m.slice(0,4)===y) v+=revisionMois(a,m); });
          yTot+=v;
          h+='<td class="num mono">'+(v?fmt0(v):'—')+'</td>';
        });
      });
      h+='<td class="num mono"><strong>'+(yTot?fmt0(yTot):'—')+'</strong></td></tr>';
    });
    h+='<tr class="gp-tot"><td>Total</td>';
    var gtt=0;
    opCols.forEach(function(og){
      og.cs.forEach(function(a){
        var v=0;
        months.forEach(function(m){ v+=revisionMois(a,m); });
        gtt+=v;
        h+='<td class="num mono"><strong>'+(v?fmt0(v):'—')+'</strong></td>';
      });
    });
    h+='<td class="num mono"><strong>'+(gtt?fmt0(gtt):'—')+'</strong></td></tr>';
    h+='</tbody></table></div>';
  }

  mount('view-revisions', h, function(w){
    wireRevHeader(w);
    w.addEventListener('click', function(ev){
      /* cellule somme cliquable -> ligne de détail */
      var rc=ev.target.closest('[data-rev]');
      if(rc&&rc.dataset&&rc.dataset.rev){
        var parts=rc.dataset.rev.split('|'), kind=parts[0], scope=parts[1], m=parts[2];
        var row=rc.closest('tr'), next=row.nextSibling, key=rc.dataset.rev;
        var span=2+opCols.reduce(function(s,og){ return s+og.cs.length*3+((og.cs.length>1)?2:0); },0);
        var html=revDetail(kind,scope,m,span);
        if(next&&next.classList&&next.classList.contains('gp-detail-row')){ if(next.dataset.for===key){ next.parentNode.removeChild(next); return; } next.dataset.for=key; next.innerHTML=html; return; }
        var tr=document.createElement('tr'); tr.className='gp-detail-row'; tr.dataset.for=key; tr.innerHTML=html;
        row.parentNode.insertBefore(tr, row.nextSibling);
        return;
      }
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
