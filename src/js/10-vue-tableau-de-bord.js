/* ================= Vue : Tableau de bord ================= */

/* Rects invisibles, un par mois, avec tooltip (balise <title> SVG) indiquant les
   évolutions du mois : EJ engagés, CP prévus (engagés/aléas/risques), reste à
   payer à date (EJ cumulés − CP cumulés des EJ engagés, hors aléas/risques), aléas et risques apparaissant
   ce mois-ci, révisions de prix, réalisé. */
/* Intitulés des EJ/CP qui contribuent à une valeur de tooltip (tronqués si trop nombreux) */
function tipNames(arr){
  var out=arr.slice(0,8).join(', ');
  if(arr.length>8) out+=' … (+'+(arr.length-8)+')';
  return out;
}
/* Lignes de détail d'un mois (tooltip au survol + popup au clic) : évolutions du
   mois — EJ engagés, CP prévus (engagés/aléas/risques), reste à payer à date,
   aléas/risques apparaissant, révisions de prix, réalisé. */
function monthLines(affs, ejs, months, m){
  var cur=curMois(), ids={}; affs.forEach(function(a){ ids[a.id]=1; });
  var ejC=0, cpC=0; /* cumuls des EJ engagés jusqu'au mois m (reste à payer à date) */
  for(var i=0;i<months.length&&months[i]<=m;i++){
    var mm=months[i];
    ejs.forEach(function(e){ if(isMaterialise(e)){ if(e.mois===mm) ejC+=montantOf(e); cpC+=cpPrevu(e,mm); } });
  }
  var ejM=0, cE=0, cAl=0, cRk=0, alApp=[], rkApp=[], rev=0, rE=0, rC=0;
  var ejNames=[], cENames=[], cAlNames=[], cRkNames=[], affNames=[];
  ejs.forEach(function(e){
    var v=cpPrevu(e,m), w=occW(e,m);
    var nm=e.numero+(e.libelle?' '+e.libelle:'');
    if(isMaterialise(e)){ if(e.mois===m){ ejM+=montantOf(e); ejNames.push(nm); } if(v>0) cENames.push(nm+' '+fmt0(v)); cE+=v; }
    else if(isAlea(e)){ cAl+=v; if(v>0) cAlNames.push(nm+' '+fmt0(v)); if(w) alApp.push(nm+' '+fmt(montantOf(e)*w)); }
    else if(isRisque(e)){ cRk+=v; if(v>0) cRkNames.push(nm+' '+fmt0(v)); if(w) rkApp.push(nm+' esp. '+fmt(espDist(e)*w)+' (haut '+fmt(montantHaut(e)*w)+')'); }
  });
  affs.forEach(function(a){ rev+=revisionMois(a,m); });
  for(var k in state.realise){ var pp=k.split('|'); if(ids[pp[0]]&&pp[1]===m){ var r=state.realise[k]; rE+=r.ej||0; rC+=r.cp||0; if((r.ej||r.cp)&&affNames.indexOf(affaireName(pp[0]))<0) affNames.push(affaireName(pp[0])); } }
  var lines=[mLong(m)+(m===cur?' (mois en cours)':'')];
  if(ejM) lines.push('EJ engagés ce mois : '+fmt(ejM)+' — '+tipNames(ejNames));
  lines.push('CP prévus : engagés '+fmt0(cE)+(cENames.length?' ('+tipNames(cENames)+')':'')+(cAl?' · aléas '+fmt0(cAl)+(cAlNames.length?' ('+tipNames(cAlNames)+')':''):'')+(cRk?' · risques '+fmt0(cRk)+(cRkNames.length?' ('+tipNames(cRkNames)+')':''):'')+' — total '+fmt0(cE+cAl+cRk));
  lines.push('Reste à payer à date : '+fmt(ejC-cpC)+' (EJ cumulés '+fmt0(ejC)+' − CP cumulés '+fmt0(cpC)+', hors aléas/risques)');
  if(alApp.length) lines.push('Aléas apparaissant : '+tipNames(alApp));
  if(rkApp.length) lines.push('Risques apparaissant : '+tipNames(rkApp));
  if(rev) lines.push('Révisions de prix : '+fmt(rev));
  if(rE||rC) lines.push('Réalisé : EJ '+fmt0(rE)+' · CP '+fmt0(rC)+(affNames.length?' — '+tipNames(affNames):''));
  return lines;
}
function svgMonthTips(affs, ejs, months, p, W, H){
  var n=months.length, slot=(W-p.l-p.r)/Math.max(1,n), out='';
  for(var i=0;i<n;i++){
    var m=months[i];
    var lines=monthLines(affs,ejs,months,m);
    out+='<rect class="chart-tip" data-m="'+m+'" x="'+(p.l+slot*i).toFixed(1)+'" y="'+p.t+'" width="'+slot.toFixed(1)+'" height="'+(H-p.t-p.b)+'" fill="rgba(0,0,0,0)" pointer-events="all"><title>'+esc(lines.join('\n'))+' — cliquer pour le détail</title></rect>';
  }
  return out;
}
/* Popup de détail d'un mois (clic sur un point des courbes ou sur un mois des barres) */
function openMonthPopup(m){
  var opId=state.ui.op||'', affId=state.ui.aff||'';
  var affs=scopedAffaires(opId,affId), ejs=scopedEjs(opId,affId), months=scopeMonths(opId,affId);
  var lines=monthLines(affs,ejs,months,m);
  var mat=ejs.filter(isMaterialise), ejC=0, cpC=0, a=0, rF=0, rP=0;
  months.forEach(function(mm){ if(mm>m) return; mat.forEach(function(e){ if(e.mois<=mm) ejC+=montantOf(e); cpC+=cpPrevu(e,mm); }); });
  ejs.filter(isAlea).forEach(function(e){ a+=montantOf(e)*cumOcc(e,m); });
  ejs.filter(isRisque).forEach(function(e){ rF+=montantHaut(e)*cumOcc(e,m); rP+=risquePondere(e)*cumOcc(e,m); });
  var vals=['EJ engagés cumulés : <strong>'+fmt(ejC)+'</strong>',
    'CP prévus cumulés (hors aléas/risques) : <strong>'+fmt(cpC)+'</strong>',
    'Reste à payer à cette date : <strong>'+fmt(ejC-cpC)+'</strong>',
    'Attendu (aléas + risques pondérés) : <strong>'+fmt(ejC+a+rP)+'</strong>',
    'Haut (tous aléas/risques à 100 %) : <strong>'+fmt(ejC+a+rF)+'</strong>'];
  var ov=document.createElement('div');
  ov.className='modal-ov';
  ov.innerHTML='<div class="modal"><h2>Détail du mois '+mLong(m)+(m===curMois()?' (mois en cours)':'')+'</h2>'+
    '<p class="hint">'+vals.join('<br>')+'</p>'+
    '<ul class="alerts">'+lines.map(function(l){ return '<li>'+esc(l)+'</li>'; }).join('')+'</ul>'+
    '<div class="formrow"><button type="button" class="btn primary" id="mp-close">Fermer</button></div></div>';
  document.body.appendChild(ov);
  function close(){ ov.remove(); document.removeEventListener('keydown',escH); }
  function escH(ev){ if(ev.key==='Escape') close(); }
  document.addEventListener('keydown',escH);
  ov.addEventListener('click',function(ev){ if(ev.target===ov) close(); });
  ov.querySelector('#mp-close').addEventListener('click',close);
}

function renderDashboard(){
  var cur=curMois();
  var opId=state.ui.op||'', affId=state.ui.aff||'';
  var affs=scopedAffaires(opId,affId), ejs=scopedEjs(opId,affId), months=scopeMonths(opId,affId);
  var ids={}; affs.forEach(function(a){ ids[a.id]=1; });

  var mat=ejs.filter(isMaterialise), aleas=ejs.filter(isAlea), risques=ejs.filter(isRisque);
  var opTot=0; affs.forEach(function(a){ opTot+=a.montantInitial||0; });
  var ejEng=sommeMontant(mat), aleaTot=sommeMontant(aleas);
  var rkTot=0, rkHaut=0, rkPond=0;
  risques.forEach(function(e){ rkTot+=espDist(e); rkHaut+=montantHaut(e); rkPond+=risquePondere(e); });
  var atter=ejEng+aleaTot+rkHaut;
  /* indicateurs à date (mois en cours) : EJ engagés, CP faits, reste à payer */
  var ejAd=0, cpAd=0;
  mat.forEach(function(e){ if(e.mois<=cur) ejAd+=montantOf(e); cpAd+=cpSumOf(e.id, cur); });
  var rapTot=0; affs.forEach(function(a){ rapTot+=resteAPayer(a, cur); });

  var per=dashPeriod(opId, affId);
  var h='';
  h+='<div class="toolbar">'+
     '<label class="fld"><input type="month" id="dash-from" value="'+per.from+'" title="Premier mois affiché dans les graphiques du tableau de bord"><span>Début</span></label>'+
     '<label class="fld"><input type="month" id="dash-to" value="'+per.to+'" title="Dernier mois affiché dans les graphiques du tableau de bord"><span>Fin</span></label>'+
     '<button class="btn" id="dash-per-auto" title="Réinitialise la période : de la première apparition au dernier CP">Période auto</button></div>';
  h+='<div class="kpis">';
  h+='<div class="kpi"><div class="l">Montant de l\'opération (hors risques/aléas)</div><div class="v mono">'+fmt(opTot)+'</div><div class="s">'+affs.length+' affaire(s)</div></div>';
  h+='<div class="kpi g"><div class="l">EJ engagés à date</div><div class="v mono">'+fmt(ejAd)+'</div><div class="s">'+mLong(cur)+' · '+mat.length+' EJ engagés au total : '+fmt(ejEng)+'</div></div>';
  h+='<div class="kpi g"><div class="l">CP faits à date</div><div class="v mono">'+fmt(cpAd)+'</div><div class="s">CP consommés cumulés des EJ engagés à '+mLong(cur)+'</div></div>';
  h+='<div class="kpi"><div class="l">Reste à payer à date</div><div class="v mono">'+fmt(rapTot)+'</div><div class="s">EJ engagés cumulés − CP cumulés (finit à 0)</div></div>';
  h+='<div class="kpi" style="border-left-color:var(--blue)"><div class="l">Aléas</div><div class="v mono">'+fmt(aleaTot)+'</div><div class="s">'+aleas.length+' aléa(s), forfaitaire</div></div>';
  h+='<div class="kpi a"><div class="l">Risques (hypothèse haute)</div><div class="v mono">'+fmt(rkHaut)+'</div><div class="s">'+risques.length+' risque(s) · espérance '+fmt(rkTot)+' · pondéré '+fmt(rkPond)+'</div></div>';
  h+='<div class="kpi p"><div class="l">Atterrissage haut</div><div class="v mono">'+fmt(atter)+'</div><div class="s">EJ engagés + aléas + risques (100 %)</div></div>';
  h+='</div>';

  h+='<div class="card"><h2>Courbes cumulées de l\'opération</h2>'+
     '<p class="hint"><strong>EJ engagés intégralement le 1<sup>er</sup> jour de leur mois</strong> : courbe des <strong>EJ engagés cumulés en escalier</strong> (saut vertical au début de chaque mois), et <strong>reste à payer</strong> = exactement EJ cumulés − CP cumulés à chaque instant : saut le 1<sup>er</sup> jour (EJ), puis descente linéaire jusqu\'au dernier jour du mois (CP écoulés progressivement) — <strong>jamais nul avant la fin</strong>, il finit à 0. La <strong>zone colorée</strong> est l\'écart entre l\'<strong>hypothèse basse</strong> (EJ cumulés seuls, en bas en escalier) et l\'<strong>hypothèse haute</strong> (tous aléas/risques matérialisés, en haut). <strong>CP consommés progressivement entre le 1<sup>er</sup> et le dernier jour du mois</strong> : courbe des <strong>CP prévus cumulés hors aléas/risques lisse</strong>. Avec aléas et risques : courbe <strong>moyenne</strong> (attendu : risques pondérés de leur probabilité, aléas en forfait) et courbe <strong>haute</strong> (tous les aléas/risques matérialisés à 100 %). Survolez un mois pour le détail (EJ engagés, CP, reste à payer, risques/aléas apparus, révisions, réalisé).</p>'+
     chartEntonnoir(affs,ejs,months,per)+
     '<div class="legend"><span><span class="sw" style="background:#2563eb"></span>EJ engagés cumulés (escalier : saut le 1er jour du mois)</span>'+
     '<span><span class="sw" style="background:#059669"></span>CP prévus cumulés hors aléas/risques (lisse : du 1er au dernier jour)</span>'+
     '<span><span class="sw" style="background:#334155"></span>Reste à payer = EJ − CP à chaque instant (saut le 1er jour, pente CP ; jamais nul avant la fin, finit à 0)</span>'+
     '<span><span class="sw" style="background:#b45309"></span>Attendu (aléas + risques pondérés)</span>'+
     '<span><span class="sw" style="background:#dc2626"></span>Tous aléas/risques matérialisés (haut)</span></div></div>';

  h+='<div class="card"><h2>Prévisionnel EJ par mois</h2><p class="hint">Par mois : <strong>EJ engagés</strong> (prévu, à leur mois), <strong>risques en hypothèse moyenne</strong> (espérance × probabilité, à leurs apparitions), <strong>aléas</strong> (répartis au hasard sur les mois restants de l\'opération) et <strong>révisions de prix (RP)</strong>. Survolez un mois pour le détail.</p>'+chartBarsEJ(affs,ejs,months,per)+
     '<div class="legend"><span><span class="sw" style="background:#059669"></span>EJ engagés (prévu)</span>'+
     '<span><span class="sw" style="background:#b45309"></span>Risques (hypothèse moyenne)</span>'+
     '<span><span class="sw" style="background:#2563eb"></span>Aléas</span>'+
     '<span><span class="sw" style="background:#7c3aed"></span>Révisions de prix (RP)</span></div></div>';

  h+='<div class="card"><h2>Prévisionnel CP par mois</h2><p class="hint">Même découpage pour les CP — <strong>pour les RP, EJ = CP</strong> — plus le CP réalisé. Survolez un mois pour le détail.</p>'+chartBarsCPM(affs,ejs,months,per)+
     '<div class="legend"><span><span class="sw" style="background:#059669"></span>CP engagés (prévu)</span>'+
     '<span><span class="sw" style="background:#b45309"></span>Risques (hypothèse moyenne)</span>'+
     '<span><span class="sw" style="background:#2563eb"></span>Aléas (CP)</span>'+
     '<span><span class="sw" style="background:#7c3aed"></span>Révisions de prix (RP = EJ = CP)</span>'+
     '<span><span class="sw" style="background:#64748b"></span>CP réalisé</span></div></div>';

  var alerts=computeAlerts(opId, affId);
  h+='<div class="card"><h2>Alertes</h2>';
  if(!alerts.length){ h+='<p class="hint">Aucune alerte.</p>'; }
  else{
    h+='<ul class="alerts">';
    alerts.forEach(function(al){
      h+='<li class="'+(al.level==='over'?'over':(al.level==='info'?'info':'warn'))+'">'+esc(al.txt);
      if(al.view) h+=' <button type="button" class="btn small" data-goto="'+al.view+'"'+(al.col?' data-col="'+al.col+'"':'')+(al.aff?' data-aff="'+al.aff+'"':'')+' title="Aller à l\'onglet / la colonne où traiter cela">Traiter</button>';
      h+='</li>';
    });
    h+='</ul>';
  }
  h+='</div>';

  /* Risques en cours + prochains EJ */
  var encours=ejs.filter(isRisque).slice().sort(function(a,b){
    var na=nextOcc(a)||'9999', nb=nextOcc(b)||'9999';
    return na<nb?-1:(na>nb?1:0);
  });
  var prochains=mat.filter(function(e){ return e.mois>cur; }).slice().sort(function(a,b){ return a.mois<b.mois?-1:(a.mois>b.mois?1:0); }).slice(0,12);
  h+='<div class="two-col"><div class="card"><h2>Risques en cours</h2>';
  if(!encours.length){ h+='<p class="hint">Aucun risque en attente.</p>'; }
  else{
    h+='<table class="liste"><tr><th></th><th>Affaire</th><th>N°</th><th>Libellé</th><th>Prochaine apparition</th><th class="num">Montant</th><th class="num">Pondéré</th><th>Statut</th></tr>';
    encours.forEach(function(e){
      var no=nextOcc(e), past=no&&no<cur;
      var aff=affaireById(e.affaireId);
      h+='<tr><td>'+stadeBadge(e)+'</td><td>'+esc(aff?aff.nom:'?')+'</td><td>'+esc(e.numero)+'</td><td>'+esc(e.libelle||'')+'</td>'+
         '<td>'+(no?mLong(no):'—')+'</td>'+
         '<td class="num mono">'+fmt(montantHaut(e))+'</td>'+
         '<td class="num mono">'+fmt(risquePondere(e))+'</td>'+
         '<td>'+(past?'<span class="badge over">passé, non matérialisé</span>':'<span class="badge warn">en attente</span>')+'</td></tr>';
    });
    h+='</table>';
  }
  h+='</div><div class="card"><h2>Prochains EJ (engagés à venir)</h2>';
  if(!prochains.length){ h+='<p class="hint">Aucun EJ à venir.</p>'; }
  else{
    h+='<table class="liste"><tr><th></th><th>Affaire</th><th>N°</th><th>Libellé</th><th>Mois</th><th class="num">Montant</th><th>Profil CP</th></tr>';
    prochains.forEach(function(e){
      var aff=affaireById(e.affaireId), p=profilOf(e);
      h+='<tr><td>'+stadeBadge(e)+'</td><td>'+esc(aff?aff.nom:'?')+'</td><td>'+esc(e.numero)+'</td><td>'+esc(e.libelle||'')+'</td>'+
         '<td>'+mLong(e.mois)+'</td><td class="num mono">'+fmt(montantOf(e))+'</td><td>'+esc(p.type)+'</td></tr>';
    });
    h+='</table>';
  }
  h+='</div></div>';

  mount('view-dashboard', h, function(w){
    w.addEventListener('click', function(ev){
      var pt=ev.target&&ev.target.closest?ev.target.closest('.chart-pt,.chart-tip'):null;
      if(pt&&pt.dataset&&pt.dataset.m){ openMonthPopup(pt.dataset.m); }
    });
    var df=w.querySelector('#dash-from'), dt=w.querySelector('#dash-to');
    if(df){ var hf=function(){ state.ui.dashFrom=df.value; save(); render(); }; df.addEventListener('change',hf); df.addEventListener('input',hf); }
    if(dt){ var ht=function(){ state.ui.dashTo=dt.value; save(); render(); }; dt.addEventListener('change',ht); dt.addEventListener('input',ht); }
    var au=w.querySelector('#dash-per-auto');
    if(au) au.addEventListener('click',function(){ state.ui.dashFrom=''; state.ui.dashTo=''; save(); render(); });
  });
}

/* Courbes cumulées de l'opération, à la journée près : les EJ sont faits
   intégralement le 1er jour de leur mois (saut vertical en début de mois) et les
   CP s'écoulent progressivement entre le 1er et le dernier jour du mois (pente).
   Reste à payer = EJ cumulés − CP cumulés à chaque instant : jamais nul avant la
   fin, il finit à 0. CP cumulés hors aléas/risques : LISSE. Avec aléas/risques :
   courbe moyenne (attendu, pondéré) et haute (100 %). Un tooltip par mois. */
/* Applique la période choisie (début/fin) à la liste des mois : conserve les mois
   dans [per.from, per.to] et étend l'axe si la période dépasse les données. */
function applyPeriod(months, per){
  if(!per) return months;
  var a=0, b=months.length-1;
  if(per.from){ while(a<b && months[a]<per.from) a++; }
  if(per.to){ while(b>a && months[b]>per.to) b--; }
  months=months.slice(a,b+1);
  if(per.to && months.length && months[months.length-1]<per.to){
    var mm=months[months.length-1];
    while(mm<per.to && months.length<600){ mm=mAdd(mm,1); months.push(mm); }
  }
  if(per.from && months.length && months[0]>per.from){
    var mm2=months[0];
    while(mm2>per.from && months.length<600){ mm2=mAdd(mm2,-1); months.unshift(mm2); }
  }
  return months;
}
function chartEntonnoir(affs, ejs, months, per){
  months=applyPeriod(months,per);
  var W=960,H=280,p={l:80,r:16,t:12,b:32}, n=months.length;
  var mat=ejs.filter(isMaterialise), aleas=ejs.filter(isAlea), risques=ejs.filter(isRisque);
  var mn=[], cpP=[], att=[], mx=[], rapArr=[];
  var cpC=0;
  for(var i=0;i<n;i++){
    var m=months[i], b=0, a=0, rF=0, rP=0, cpM=0;
    mat.forEach(function(e){ if(e.mois<=m) b+=montantOf(e); cpM+=cpPrevu(e,m); });
    aleas.forEach(function(e){ a+=montantOf(e)*cumOcc(e,m); });
    risques.forEach(function(e){ rF+=montantHaut(e)*cumOcc(e,m); rP+=risquePondere(e)*cumOcc(e,m); });
    cpC+=cpM; /* CP cumulés des EJ engagés seuls, hors aléas/risques */
    mn.push(b); cpP.push(cpC); att.push(b+a+rP); mx.push(b+a+rF); rapArr.push(b-cpC); /* reste à payer = EJ cumulés − CP cumulés : finit à 0 */
  }
  /* Axe en bornes de mois : x_i = 1er jour du mois i, x_n = dernier jour du dernier
     mois. Les EJ sont faits intégralement le 1er jour de leur mois (saut vertical
     en x_i) ; les CP s'écoulent progressivement entre le 1er et le dernier jour du
     mois (pente entre x_i et x_{i+1}). Reste à payer = EJ cumulés − CP cumulés à
     chaque instant : jamais nul avant la fin, il finit à 0. */
  var X=function(i){ return p.l+(W-p.l-p.r)*(n<=1?0:i/n); };
  var cpPrev=function(i){ return i<=0?0:cpP[i-1]; }; /* CP cumulés au 1er jour du mois i */
  var maxV=Math.max.apply(null,mx.concat(cpP,[1]));
  var Y=function(v){ return H-p.b-(H-p.t-p.b)*(v/maxV); };
  var s='<svg viewBox="0 0 '+W+' '+H+'" font-family="Segoe UI,sans-serif" font-size="10">';
  for(i=0;i<=4;i++){
    var v=maxV*i/4, y=Y(v);
    s+='<line x1="'+p.l+'" y1="'+y.toFixed(1)+'" x2="'+(W-p.r)+'" y2="'+y.toFixed(1)+'" stroke="#e7ebf0"/>';
    s+='<text x="'+(p.l-6)+'" y="'+(y+3).toFixed(1)+'" text-anchor="end" fill="#67788c">'+fmtM(v)+'</text>';
  }
  var slot=(W-p.l-p.r)/Math.max(1,n);
  var step=Math.max(1,Math.ceil(n/14));
  for(i=0;i<n;i+=step){
    s+='<text x="'+(X(i)+slot/2).toFixed(1)+'" y="'+(H-p.b+14)+'" text-anchor="middle" fill="#67788c">'+mLabel(months[i])+'</text>';
  }
  /* zone colorée = écart entre l'hypothèse basse (EJ cumulés seuls, escalier en bas)
     et l'hypothèse haute (tous aléas/risques matérialisés, mx en haut) */
  var dTop='';
  for(i=0;i<n;i++){ dTop+=(i?'L':'M')+X(i).toFixed(1)+' '+Y(mx[i]).toFixed(1)+' '; }
  dTop+='L'+X(n).toFixed(1)+' '+Y(mx[n-1]).toFixed(1)+' ';
  var dBot='L'+X(n).toFixed(1)+' '+Y(mn[n-1]).toFixed(1)+' ';
  for(i=n-1;i>=1;i--){ dBot+='L'+X(i).toFixed(1)+' '+Y(mn[i]).toFixed(1)+' L'+X(i).toFixed(1)+' '+Y(mn[i-1]).toFixed(1)+' '; }
  dBot+='L'+X(0).toFixed(1)+' '+Y(mn[0]).toFixed(1)+' ';
  s+='<path d="'+dTop+dBot+'Z" fill="#fdf3e3" stroke="none"/>';
  function draw(p,color,w,dash){
    var d='';
    for(var j=0;j<p.length;j++) d+=(j?'L':'M')+p[j][0].toFixed(1)+' '+p[j][1].toFixed(1)+' ';
    s+='<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="'+(w||2)+'"'+(dash?' stroke-dasharray="5 4"':'')+'/>';
  }
  /* EJ engagés cumulés : escalier — saut vertical le 1er jour de chaque mois (en x_i) */
  var pEJ=[[X(0),Y(mn[0])]];
  for(var j=1;j<n;j++){ pEJ.push([X(j),Y(mn[j-1])]); pEJ.push([X(j),Y(mn[j])]); }
  pEJ.push([X(n),Y(mn[n-1])]);
  draw(pEJ,'#2563eb',2.5);
  /* CP prévus cumulés hors aléas/risques : lisses — CP écoulés progressivement du 1er au dernier jour du mois */
  var pCP=[[X(0),Y(0)]];
  for(j=1;j<=n;j++){ pCP.push([X(j),Y(cpP[j-1])]); }
  draw(pCP,'#059669',2);
  /* reste à payer = exactement EJ cumulés − CP cumulés à chaque instant : saut vertical
     le 1er jour du mois (EJ fait intégralement), puis pente jusqu'au dernier jour
     (CP écoulés) — jamais nul avant la fin, finit à 0 */
  var pRap=[[X(0),Y(mn[0])]];
  for(j=1;j<=n;j++){
    pRap.push([X(j),Y(mn[j-1]-cpP[j-1])]);      /* dernier jour du mois j-1 : CP du mois écoulés */
    if(j<n) pRap.push([X(j),Y(mn[j]-cpP[j-1])]);  /* 1er jour du mois j : saut de l'EJ */
  }
  draw(pRap,'#334155',2,true);
  /* attendu (aléas + risques pondérés) et haut (100 %) : valeurs de fin de mois */
  function lineEnd(arr,color,dash,w){
    var p2=[[X(0),Y(arr[0])]];
    for(var j2=1;j2<n;j2++){ p2.push([X(j2),Y(arr[j2])]); }
    p2.push([X(n),Y(arr[n-1])]);
    draw(p2,color,w,dash);
  }
  lineEnd(att,'#b45309',true,2);
  lineEnd(mx,'#dc2626',false,2);
  /* points cliquables par mois sur chaque courbe (clic -> popup détail du mois) */
  function pts(arr,color){
    var o='';
    for(var i2=0;i2<n;i2++){
      o+='<circle class="chart-pt" data-m="'+months[i2]+'" cx="'+X(i2+1).toFixed(1)+'" cy="'+Y(arr[i2]).toFixed(1)+'" r="3.5" fill="'+color+'"><title>'+mLabel(months[i2])+' : '+fmtM(arr[i2])+' — cliquer pour le détail du mois</title></circle>';
    }
    return o;
  }
  s+=pts(mn,'#2563eb')+pts(cpP,'#059669')+pts(rapArr,'#334155')+pts(att,'#b45309')+pts(mx,'#dc2626');
  /* tooltips par mois (rects transparents en dernier pour être au-dessus) */
  s+=svgMonthTips(affs,ejs,months,p,W,H);
  /* étiquettes de fin de courbes, empilées sans se chevaucher */
  var labs=[
    ['#dc2626','Tous matérialisés '+fmtM(mx[n-1]),Y(mx[n-1])],
    ['#b45309','Attendu '+fmtM(att[n-1]),Y(att[n-1])],
    ['#2563eb','EJ engagés '+fmtM(mn[n-1]),Y(mn[n-1])],
    ['#059669','CP prévus (hors aléas/risques) '+fmtM(cpP[n-1]),Y(cpP[n-1])],
    ['#334155','Reste à payer '+fmtM(mn[n-1]-cpP[n-1]),Y(mn[n-1]-cpP[n-1])]
  ];
  labs.sort(function(a,b){ return a[2]-b[2]; });
  var minGap=11;
  for(var li=1;li<labs.length;li++){ if(labs[li][2]<labs[li-1][2]+minGap) labs[li][2]=labs[li-1][2]+minGap; }
  var yMax=H-p.b-6, yMin=p.t+8;
  if(labs.length&&labs[labs.length-1][2]>yMax){ var sh=yMax-labs[labs.length-1][2]; for(var lj=0;lj<labs.length;lj++) labs[lj][2]+=sh; }
  if(labs.length&&labs[0][2]<yMin){ var sh2=yMin-labs[0][2]; for(var lk=0;lk<labs.length;lk++) labs[lk][2]+=sh2; }
  var xEnd=(X(n)+14).toFixed(1);
  labs.forEach(function(L){
    s+='<line x1="'+X(n).toFixed(1)+'" y1="'+(L[2]+3).toFixed(1)+'" x2="'+(X(n)+12).toFixed(1)+'" y2="'+(L[2]+3).toFixed(1)+'" stroke="'+L[0]+'" stroke-width="1" stroke-dasharray="2 2"/>';
    s+='<text x="'+xEnd+'" text-anchor="end" y="'+(L[2]+3).toFixed(1)+'" fill="'+L[0]+'" font-weight="600">'+L[1]+'</text>';
  });
  s+='</svg>';
  return s;
}

/* Barres mensuelles groupées : series = [{color, val(m)}] (une barre par série
   et par mois). Tooltips par mois si ejs fourni. */
function chartBarsSeries(affs, ejs, months, per, series){
  months=applyPeriod(months,per);
  var W=960,H=250,p={l:80,r:12,t:12,b:32}, n=months.length;
  var K=series.length;
  var vals=series.map(function(){ return []; });
  for(var i=0;i<n;i++){
    var m=months[i];
    series.forEach(function(se,si){ vals[si].push(se.val(m)); });
  }
  var mx=1;
  vals.forEach(function(arr){ arr.forEach(function(v){ if(v>mx) mx=v; }); });
  var slot=(W-p.l-p.r)/n;
  var Y=function(v){ return H-p.b-(H-p.t-p.b)*(v/mx); };
  var s='<svg viewBox="0 0 '+W+' '+H+'" font-family="Segoe UI,sans-serif" font-size="10">';
  for(i=0;i<=5;i++){
    var v=mx*i/5, y=Y(v);
    s+='<line x1="'+p.l+'" y1="'+y.toFixed(1)+'" x2="'+(W-p.r)+'" y2="'+y.toFixed(1)+'" stroke="#e7ebf0"/>';
    s+='<text x="'+(p.l-6)+'" y="'+(y+3).toFixed(1)+'" text-anchor="end" fill="#67788c">'+fmtM(v)+'</text>';
  }
  var step=Math.max(1,Math.ceil(n/14));
  for(i=0;i<n;i+=step){
    s+='<text x="'+(p.l+slot*(i+0.5)).toFixed(1)+'" y="'+(H-p.b+14)+'" text-anchor="middle" fill="#67788c">'+mLabel(months[i])+'</text>';
  }
  var bw=Math.max(2,slot/K-3);
  for(i=0;i<n;i++){
    var x=p.l+slot*i+2;
    for(var si=0;si<K;si++){
      var v2=vals[si][i];
      if(v2>0) s+='<rect x="'+(x+si*(bw+1)).toFixed(1)+'" y="'+Y(v2).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+(H-p.b-Y(v2)).toFixed(1)+'" fill="'+series[si].color+'" rx="1"/>';
    }
  }
  /* tooltips par mois (rects transparents en dernier pour être au-dessus) */
  if(ejs) s+=svgMonthTips(affs,ejs,months,p,W,H);
  s+='</svg>';
  return s;
}

/* Prévisionnel EJ par mois : EJ engagés (prévu), risques (hypothèse moyenne =
   espérance × probabilité), aléas, révisions de prix (RP). */
function chartBarsEJ(affs, ejs, months, per){
  return chartBarsSeries(affs, ejs, months, per, [
    {color:'#059669', val:function(m){ var s=0; ejs.forEach(function(e){ if(isMaterialise(e)&&e.mois===m) s+=montantOf(e); }); return s; }},
    {color:'#b45309', val:function(m){ var s=0; ejs.forEach(function(e){ if(isRisque(e)) s+=risquePondere(e)*occW(e,m); }); return s; }},
    {color:'#2563eb', val:function(m){ var s=0; ejs.forEach(function(e){ if(isAlea(e)) s+=montantOf(e)*occW(e,m); }); return s; }},
    {color:'#7c3aed', val:function(m){ var s=0; affs.forEach(function(a){ s+=revisionMois(a,m); }); return s; }}
  ]);
}

/* Prévisionnel CP par mois : idem pour les CP (pour les RP, EJ = CP), plus le
   CP réalisé. */
function chartBarsCPM(affs, ejs, months, per){
  var ids={}; affs.forEach(function(a2){ ids[a2.id]=1; });
  return chartBarsSeries(affs, ejs, months, per, [
    {color:'#059669', val:function(m){ var s=0; ejs.forEach(function(e){ if(isMaterialise(e)) s+=cpPrevu(e,m); }); return s; }},
    {color:'#b45309', val:function(m){ var s=0; ejs.forEach(function(e){ if(isRisque(e)) s+=risquePondere(e)*occW(e,m); }); return s; }},
    {color:'#2563eb', val:function(m){ var s=0; ejs.forEach(function(e){ if(isAlea(e)) s+=cpPrevu(e,m); }); return s; }},
    {color:'#7c3aed', val:function(m){ var s=0; affs.forEach(function(a){ s+=revisionMois(a,m); }); return s; }},
    {color:'#64748b', val:function(m){ var r=0; for(var k in state.realise){ var pp=k.split('|'); if(ids[pp[0]]&&pp[1]===m) r+=state.realise[k].cp||0; } return r; }}
  ]);
}
