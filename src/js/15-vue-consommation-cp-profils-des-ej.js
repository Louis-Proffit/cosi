/* ================= Vue : Consommation CP (profils des EJ) ================= */

/* Colonnes de la grille conso : # / Mois, puis par opération [par affaire [1 col
   par EJ + Σ affaire] + Σ opération]. Largeurs réglables par l'utilisateur
   (colgroup + poignées de redimensionnement, persistées dans state.ui.colW). */
function consoColKeys(opCols){
  var keys=['c0','c1'];
  opCols.forEach(function(og){
    og.cs.forEach(function(c){
      c.le.forEach(function(e){ keys.push(e.id); });
      keys.push('a:'+c.a.id);
    });
    keys.push('o:'+og.o.id);
  });
  return keys;
}
function consoColgroup(opCols){
  var defW={c0:32,c1:80};
  var keys=consoColKeys(opCols);
  return '<colgroup>'+keys.map(function(k){
    var w=(state.ui.colW&&state.ui.colW[k])||defW[k]||140;
    return '<col data-ck="'+k+'" style="width:'+w+'px">';
  }).join('')+'</colgroup>';
}
function colRsH(ck){ return '<span class="colrs" data-ck="'+ck+'" title="Glisser pour redimensionner la colonne — double-clic : largeur par défaut"></span>'; }
/* Détail (clic sur un total) : EJ contribuant au mois m, restreint à la portée (a: / o:) */
function consoTotItems(m, ejs, scope){
  var items=[];
  ejs.forEach(function(e){
    if(scope&&scope.indexOf('a:')===0&&e.affaireId!==scope.slice(2)) return;
    if(scope&&scope.indexOf('o:')===0){ var a=affaireById(e.affaireId); if(!a||a.opId!==scope.slice(2)) return; }
    var v=cpPrevu(e,m); if(v>0) items.push('<div><span class="gp-k">'+esc(e.numero)+'</span> '+(e.libelle?'('+esc(e.libelle)+') ':'')+': <span class="mono">'+fmt0(v)+'</span></div>');
  });
  return items;
}

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

  var h='<div class="toolbar">'+filtersBarHTML()+
    (affs.length?('<button class="btn" id="c-addej" title="Ajouter un EJ programmé sur l\'affaire du filtre en en-tête (Opération/Affaire)">+ EJ</button>'):'')+
    '<button class="btn" id="c-ext" title="Afficher 12 mois de plus à droite de la grille">+ 12 mois</button>'+
    (state.ui.ext>0?'<button class="btn" id="c-shrink" title="Retirer 12 mois à droite de la grille">− 12 mois</button>':'')+
    '<button class="btn" id="c-csv" title="Exporter la grille (mois × EJ) en CSV">Exporter CSV</button></div>'+
    '<div class="legend"><span><span class="sw" style="background:#2563eb"></span>montant de l\'EJ (en-tête de colonne, modifiable)</span>'+
    '<span><span class="sw" style="background:#059669"></span>Σ des CP saisis (juste dessous, calculé)</span>'+
    '<span><span class="sw" style="background:#dc2626"></span>écart montant − Σ CP = alerte (reportée au tableau de bord)</span>'+
    '<span><span class="sw" style="background:#929292"></span>glisser le bord droit d\'une colonne d\'en-tête pour la redimensionner</span></div>';

  if(affs.length===0){
    h+='<div class="card"><div class="empty">Aucune affaire dans cette sélection. Créez-en une dans « Opérations &amp; affaires ».</div></div>';
    mount('view-conso',h,function(w){ wireConsoHeader(w,affs); });
    return;
  }

  /* hiérarchie opération > affaire > EJ, avec un TITRE DE LIGNE dans la 1ʳᵉ
     colonne fixe : hlA = « Opération », hlB = « Affaire », puis par colonne EJ
     uniquement (lecture seule) : intitulé (hl2), date (hl3), montant (hl4),
     check Σ CP (hl5). Clic sur l'EJ -> fiche EJ (popup : tout est modifiable). */
  var opCols=[];
  state.operations.forEach(function(o){
    var cs=[];
    affs.forEach(function(a){
      if(a.opId!==o.id) return;
      var le=ejs.filter(function(e){ return e.affaireId===a.id; });
      if(le.length) cs.push({a:a, le:le});
    });
    if(cs.length) opCols.push({o:o, cs:cs});
  });
  /* colonnes fixes : sc0 = titre de ligne / n° de ligne, sc1 = « Mois » (rowspan=6).
     PAS de cellules vides dans les lignes suivantes (sinon l'en-tête serait décalé). */
  /* pas de titre « Mois » dans la 2ᵉ colonne fixe de cette grille (inutile) */
  var rA='<th class="scol sc0 hlA">Opération'+colRsH('c0')+'</th><th class="scol sc1 hlA" rowspan="6">'+colRsH('c1')+'</th>';
  var rB='<th class="scol sc0 hlB">Affaire</th>';
  var r2='<th class="scol sc0 hl2">Intitulé</th>';
  var r3='<th class="scol sc0 hl3">Date EJ</th>';
  var r4='<th class="scol sc0 hl4">Montant</th>';
  var r5='<th class="scol sc0 hl5">Σ CP</th>';
  opCols.forEach(function(og){
    var nEj=og.cs.reduce(function(s,c){ return s+c.le.length; },0);
    rA+='<th class="dcol hlA rev-h-op" colspan="'+(nEj+og.cs.length)+'">Opération '+(og.o.numero?og.o.numero+' — ':'')+': '+esc(og.o.nom)+'</th>';
    rA+='<th class="dcol hlA tot-h" rowspan="2" title="Total CP de l\'opération '+esc(og.o.nom)+' (non modifiable)">Σ</th>';
    og.cs.forEach(function(c){
      rB+='<th class="dcol hlB rev-h-aff" colspan="'+(c.le.length+1)+'"><button type="button" class="btn btn-prof" data-affbtn="'+c.a.id+'" title="Voir tous les EJ de l\'affaire « '+esc(c.a.nom)+' », avec leurs dates (popup)">'+esc(c.a.nom)+'</button></th>';
      c.le.forEach(function(e){
        var foc=(state.ui.focusCol===e.id?' col-focus':'');
        var somCp=cpSumOf(e.id), mtE=montantOf(e), cohOk=Math.abs(mtE-somCp)<=Math.max(1,mtE*0.001);
        var ejTip='Fiche de l\'EJ '+esc(e.numero)+' : n°, libellé, montant, date et profil CP modifiables — Σ CP = '+fmt0(somCp)+' vs montant '+fmt0(mtE)+(cohOk?' (cohérent)':' — ÉCART '+fmt0(mtE-somCp)+' = alerte tableau de bord');
        r2+='<th class="dcol hl2'+foc+'"><button type="button" class="ej-btn" data-ejpop="'+e.id+'" title="'+ejTip+'">'+esc(e.numero)+(e.libelle?' — '+esc(e.libelle):'')+'</button>'+colRsH(e.id)+'</th>';
        r3+='<th class="dcol hl3'+foc+'"><button type="button" class="ej-btn" data-ejpop="'+e.id+'" title="Date de l\'EJ : '+(e.mois?mLong(e.mois):'—')+' — modifier dans la fiche EJ">'+(e.mois?mLabel(e.mois):'—')+'</button>'+colRsH(e.id)+'</th>';
        r4+='<th class="dcol hl4 hl-mont'+foc+'"><button type="button" class="ej-btn ej-btn-mont" data-ejpop="'+e.id+'" title="Montant de l\'EJ : '+fmt0(mtE)+' — modifier dans la fiche EJ">'+fmt0(mtE)+'</button>'+colRsH(e.id)+'</th>';
        r5+='<th class="dcol hl5 hl-cp'+foc+'" data-ejhdr="'+e.id+'"><button type="button" class="ej-btn ej-btn-cp" data-ejpop="'+e.id+'" title="Check Σ CP saisis (calculé) : '+fmt0(somCp)+(cohOk?' — cohérent':' — ÉCART '+fmt0(mtE-somCp)+' = alerte')+' — clic = fiche EJ">'+ '<span class="hdr-sub'+(cohOk?'':' coh-bad')+'">Σ CP '+fmt0(somCp)+(cohOk?'':' <span class="badge over">écart '+fmt0(mtE-somCp)+'</span>')+'</span></button>'+colRsH(e.id)+'</th>';
      });
      var tA='Total CP de l\'affaire '+esc(c.a.nom)+' (non modifiable)';
      r2+='<th class="dcol hl2 tot-h" title="'+tA+'">Σ'+colRsH('a:'+c.a.id)+'</th>';
      r3+='<th class="dcol hl3 tot-h" title="'+tA+'"></th>';
      r4+='<th class="dcol hl4 tot-h" title="'+tA+'"></th>';
      r5+='<th class="dcol hl5 tot-h" title="'+tA+'">'+colRsH('a:'+c.a.id)+'</th>';
    });
    var tO='Total CP de l\'opération '+esc(og.o.nom)+' (non modifiable)';
    r2+='<th class="dcol hl2 tot-h" title="'+tO+'">Σ'+colRsH('o:'+og.o.id)+'</th>';
    r3+='<th class="dcol hl3 tot-h" title="'+tO+'"></th>';
    r4+='<th class="dcol hl4 tot-h" title="'+tO+'"></th>';
    r5+='<th class="dcol hl5 tot-h" title="'+tO+'">'+colRsH('o:'+og.o.id)+'</th>';
  });

  var nbTot=2+opCols.reduce(function(s,og){ return s+og.cs.reduce(function(s2,c){ return s2+c.le.length+1; },0)+1; },0);
  var body='';
  body+=extRow('avant', nbTot);
  for(var r=1;r<=months.length;r++){
    var m=months[r-1];
    body+='<tr data-m="'+m+'"'+(m===cur?' class="cur"':'')+'><td class="scol sc0 rnum">'+r+'</td><td class="scol sc1 mh'+(m===cur?' cur':'')+'">'+mLabel(m)+'</td>';
    opCols.forEach(function(og){
      og.cs.forEach(function(c){
        var sa=0;
        c.le.forEach(function(e){
          var p=profilOf(e);
          var v=cpPrevu(e,m);
          sa+=v;
          if(e.mois&&m<e.mois){
            /* pas de CP avant le mois de l'EJ (l'EJ est fait intégralement le 1er jour) : cellule grisée et verrouillée */
            body+='<td class="dcol cp-avant" data-ejcol="'+e.id+'" title="Pas de CP avant '+mLabel(e.mois)+' (mois de l\'EJ '+esc(e.numero)+') : l\'EJ est engagé intégralement le 1er jour — cellule verrouillée">'+(v?fmt0(v):'')+'</td>';
          }else if(p.type==='perso'){
            body+='<td class="dcol'+(state.ui.focusCol===e.id?' col-focus':'')+'" data-ejcol="'+e.id+'"><input type="text" inputmode="decimal" class="cell" data-cp="'+e.id+'|'+m+'" value="'+(v?v:'')+'" title="CP consommés ce mois-ci pour '+esc(e.numero)+' (profil personnalisé : saisie libre)"></td>';
          }else{
            body+='<td class="dcol cp-lock'+(state.ui.focusCol===e.id?' col-focus':'')+'" data-ejcol="'+e.id+'" title="Calculé selon le profil '+p.type+'">'+(v?fmt0(v):'')+'</td>';
          }
        });
        body+='<td class="dcol ccell tot"'+(sa>0?' data-totcp="'+m+'" data-scope="a:'+c.a.id+'" title="Détail du total CP de l\'affaire '+esc(c.a.nom)+' en '+mLabel(m)+' (cliquer)"':' title="Total CP de l\'affaire '+esc(c.a.nom)+' ce mois-ci (non modifiable)"')+'>'+fmt0(sa)+'</td>';
      });
      var so=0;
      og.cs.forEach(function(c){ c.le.forEach(function(e){ so+=cpPrevu(e,m); }); });
      body+='<td class="dcol ccell tot"'+(so>0?' data-totcp="'+m+'" data-scope="o:'+og.o.id+'" title="Détail du total CP de l\'opération '+esc(og.o.nom)+' en '+mLabel(m)+' (cliquer)"':' title="Total CP de l\'opération '+esc(og.o.nom)+' ce mois-ci (non modifiable)"')+'>'+fmt0(so)+'</td>';
    });
    body+='</tr>';
  }
  body+=extRow('après', nbTot);
  var foot='<tr><td class="scol sc0"></td><td class="scol sc1">Total</td>';
  opCols.forEach(function(og){
    og.cs.forEach(function(c){
      c.le.forEach(function(e){ foot+='<td class="dcol ccell tot">'+fmt0(cpSumOf(e.id))+'</td>'; });
      var sa=0; c.le.forEach(function(e){ sa+=cpSumOf(e.id); });
      foot+='<td class="dcol ccell tot" title="Total CP de l\'affaire '+esc(c.a.nom)+' (non modifiable)">'+fmt0(sa)+'</td>';
    });
    var so=0; og.cs.forEach(function(c){ c.le.forEach(function(e){ so+=cpSumOf(e.id); }); });
    foot+='<td class="dcol ccell tot" title="Total CP de l\'opération '+esc(og.o.nom)+' (non modifiable)">'+fmt0(so)+'</td>';
  });
  foot+='</tr>';

  var w0=(state.ui.colW&&state.ui.colW.c0)||32, w1=(state.ui.colW&&state.ui.colW.c1)||80;
  h+='<div class="grid-wrap"><table class="grid conso rev-table fixed" style="--sc0w:'+w0+'px;--sc1w:'+w1+'px">'+consoColgroup(opCols)+
     '<thead><tr class="hlA">'+rA+'</tr><tr class="hlB">'+rB+'</tr>'+
     '<tr class="hl2">'+r2+'</tr><tr class="hl3">'+r3+'</tr><tr class="hl4">'+r4+'</tr><tr class="hl5">'+r5+'</tr></thead>'+
     '<tbody>'+body+'</tbody><tfoot>'+foot+'</tfoot></table></div>';

  mount('view-conso', h, function(w){
    wireConsoHeader(w,affs);
    /* redimensionnement des colonnes par l'utilisateur (poignée en bord droit d'en-tête) */
    w.addEventListener('mousedown', function(ev){
      var rs=ev.target&&ev.target.closest?ev.target.closest('.colrs'):null;
      if(!rs||!rs.dataset) return;
      ev.preventDefault();
      var ck=rs.dataset.ck;
      var tbl=w.querySelector('table.grid');
      var col=tbl&&tbl.querySelector?tbl.querySelector('col[data-ck="'+ck+'"]'):null;
      if(!col) return;
      var startX=(ev.clientX||0);
      var startW=(col.getBoundingClientRect?col.getBoundingClientRect().width:0)||parseFloat(col.style.width)||140;
      function mv(e2){
        var nw=Math.max(56,startW+((e2.clientX||0)-startX));
        col.style.width=Math.round(nw)+'px';
        state.ui.colW=state.ui.colW||{}; state.ui.colW[ck]=Math.round(nw);
        /* colonnes sticky : la 2ᵉ colonne reste collée juste après la 1ʳᵉ */
        if(tbl.style&&tbl.style.setProperty){
          if(ck==='c0') tbl.style.setProperty('--sc0w',Math.round(nw)+'px');
          if(ck==='c1') tbl.style.setProperty('--sc1w',Math.round(nw)+'px');
        }
      }
      function up(){ document.removeEventListener('mousemove',mv); document.removeEventListener('mouseup',up); save(); }
      document.addEventListener('mousemove',mv); document.addEventListener('mouseup',up);
    });
    w.addEventListener('dblclick', function(ev){
      var rs=ev.target&&ev.target.closest?ev.target.closest('.colrs'):null;
      if(!rs||!rs.dataset) return;
      var ck=rs.dataset.ck;
      if(state.ui.colW) delete state.ui.colW[ck];
      var tbl=w.querySelector('table.grid');
      var col=tbl&&tbl.querySelector?tbl.querySelector('col[data-ck="'+ck+'"]'):null;
      if(col) col.style.width='';
      save(); render();
    });
    w.addEventListener('click', function(ev){
      var tc=ev.target.closest('[data-totcp]');
      if(tc&&tc.dataset&&tc.dataset.totcp){
        var m=tc.dataset.totcp, scope=tc.dataset.scope||'', row=tc.closest('tr');
        var next=row.nextSibling;
        var key='totcp|'+scope+'|'+m;
        if(next&&next.classList&&next.classList.contains('gp-detail-row')){ if(next.dataset.for===key){ next.parentNode.removeChild(next); return; } next.dataset.for=key; next.innerHTML='<td colspan="'+nbTot+'" class="gp-detail">'+consoTotDetailHTML(m,ejs,scope)+'</td>'; return; }
        var tr=document.createElement('tr'); tr.className='gp-detail-row'; tr.dataset.for=key;
        tr.innerHTML='<td colspan="'+nbTot+'" class="gp-detail">'+consoTotDetailHTML(m,ejs,scope)+'</td>';
        row.parentNode.insertBefore(tr, row.nextSibling);
        return;
      }
      var ep=ev.target.closest('[data-ejpop]');
      if(ep){ openProfilPopup(ep.dataset.ejpop); return; }
      var ab=ev.target.closest('button[data-affbtn]');
      if(ab){ openAffairePopup(ab.dataset.affbtn); return; }
    });
    var consoChange=function(ev){
      var t=ev.target;
      if(t.dataset&&t.dataset.cp){
        var k=t.dataset.cp, pp=k.split('|'), ejId=pp[0], m=pp[1];
        var ejC=ejById(ejId);
        if(ejC&&ejC.mois&&m<ejC.mois){ alert('Pas de CP avant le mois de l\'EJ '+ejC.numero+' ('+mLabel(ejC.mois)+') : l\'EJ est engagé intégralement le 1er jour de son mois.'); delete state.cps[k]; save(); renderConso(); return; }
        var v2=parseMontant(t.value);
        if(v2==null||v2<=0) delete state.cps[k]; else state.cps[k]=v2;
        save(); renderConso();
        /* on rend le focus à la cellule pour enchaîner la saisie */
        var nw2=document.getElementById('view-conso').children[0];
        var el2=nw2.querySelector('[data-cp="'+k+'"]');
        if(el2){ el2.focus(); }
        return;
      }
    };
    w.addEventListener('change', consoChange); /* 'change' : save + re-render */
  });
}

function consoTotDetailHTML(m, ejs, scope){
  var items=consoTotItems(m,ejs,scope), tot=0;
  ejs.forEach(function(e){
    if(scope&&scope.indexOf('a:')===0&&e.affaireId!==scope.slice(2)) return;
    if(scope&&scope.indexOf('o:')===0){ var a=affaireById(e.affaireId); if(!a||a.opId!==scope.slice(2)) return; }
    tot+=cpPrevu(e,m);
  });
  var label=scope.indexOf('a:')===0?('affaire '+affaireName(scope.slice(2))):(scope.indexOf('o:')===0?('opération '+opName(scope.slice(2))):'toutes les EJ');
  return '<strong>Détail du total CP — '+label+' — '+mLong(m)+' ('+fmt0(tot)+') :</strong>'+(items.join('')||'<div>Aucun CP ce mois-ci.</div>');
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
