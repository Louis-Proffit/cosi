/* ================= Vue : Risques & aléas (saisie + matérialisation) ================= */

/* Petit graphique de synthèse d'un risque, affiché dans le tableau :
   en haut la forme de la distribution du montant (tiret bleu = espérance,
   pointillé rouge = haut), en bas les apparitions dans le temps.
   Cliquer dessus ouvre la popup de modification. */
function riskSpark(e){
  var W=180, H=58, top=36, t0=top+3, t1=H-3, pad=8;
  var p=distParams(e), dt=e.distType||'fixe';
  var esp=espDist(e), haut=montantHaut(e);
  var vals=[esp,haut];
  if(dt==='uniforme'){ vals.push(p.a, p.b==null?p.a:p.b); }
  else if(dt==='triangulaire'){ vals.push(p.a, p.b==null?p.a:p.b, p.c==null?(p.b==null?p.a:p.b):p.c); }
  else if(dt==='gauss'){ vals.push(p.a-2.5*(p.b||0), p.a+2.5*(p.b||0)); }
  else { vals.push(p.a, +e.montant||0); }
  var lo=Math.min.apply(null,vals.concat([0])), hi=Math.max.apply(null,vals.concat([1]));
  if(hi-lo<1e-9) hi=lo+1;
  var X=function(v){ return pad+(W-2*pad)*(v-lo)/(hi-lo); };
  var yB=top-4;
  var s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" font-family="Segoe UI,sans-serif" font-size="9">';
  if(dt==='uniforme'){
    var a=p.a, b=p.b==null?p.a:p.b;
    s+='<rect x="'+X(Math.min(a,b)).toFixed(1)+'" y="'+(yB-16)+'" width="'+Math.max(1.5,Math.abs(X(b)-X(a))).toFixed(1)+'" height="16" fill="#f6c48a" stroke="#b45309"/>';
  } else if(dt==='triangulaire'){
    var a2=p.a, b2=p.b==null?p.a:p.b, c2=p.c==null?(p.b==null?p.a:p.b):p.c;
    s+='<polygon points="'+X(Math.min(a2,b2,c2)).toFixed(1)+','+yB+' '+X(b2).toFixed(1)+','+(yB-20)+' '+X(Math.max(a2,b2,c2)).toFixed(1)+','+yB+'" fill="#f6c48a" stroke="#b45309"/>';
  } else if(dt==='gauss'){
    var mu=p.a, sg=Math.max(1e-9,+(p.b||0)), d='';
    for(var i=0;i<=24;i++){
      var v=mu-2.5*sg+5*sg*i/24, y=yB-20*Math.exp(-Math.pow(v-mu,2)/(2*sg*sg));
      d+=(i?'L':'M')+X(v).toFixed(1)+' '+y.toFixed(1)+' ';
    }
    d+='L'+X(mu+2.5*sg).toFixed(1)+' '+yB+' L'+X(mu-2.5*sg).toFixed(1)+' '+yB+' Z';
    s+='<path d="'+d+'" fill="#f6c48a" stroke="#b45309"/>';
  } else {
    var v0=p.a||(+e.montant||0);
    s+='<rect x="'+(X(v0)-3).toFixed(1)+'" y="'+(yB-20)+'" width="6" height="20" fill="#f6c48a" stroke="#b45309"/>';
  }
  s+='<line x1="'+X(esp).toFixed(1)+'" y1="2" x2="'+X(esp).toFixed(1)+'" y2="'+yB+'" stroke="#2563eb" stroke-width="1.5" stroke-dasharray="3 2"/>';
  s+='<line x1="'+X(haut).toFixed(1)+'" y1="2" x2="'+X(haut).toFixed(1)+'" y2="'+yB+'" stroke="#dc2626" stroke-width="1.2" stroke-dasharray="2 2"/>';
  /* bande des apparitions */
  var occ=occOf(e), mid=(t0+t1)/2;
  s+='<line x1="'+pad+'" y1="'+mid+'" x2="'+(W-pad)+'" y2="'+mid+'" stroke="#d8dde4"/>';
  if(occ.length){
    var m0=occ[0].m, m1=occ[occ.length-1].m;
    var Tm=function(m){ return mDiff(m0,m1)===0?(W/2):pad+(W-2*pad)*mDiff(m0,m)/mDiff(m0,m1); };
    if((e.dateType||'ponctuelle')==='uniforme'){
      var ua=e.dateA||m0, ub=e.dateB||m1, x0=Tm(ua<m0?ua:m0), x1=Tm(ub>m1?ub:m1);
      s+='<rect x="'+x0.toFixed(1)+'" y="'+t0+'" width="'+Math.max(1.5,x1-x0).toFixed(1)+'" height="'+(t1-t0)+'" fill="#fdf3e3" stroke="#b45309" stroke-dasharray="2 2"/>';
    }
    occ.forEach(function(o){
      var hgt=(t1-t0)*(o.w>=1?1:0.45);
      s+='<line x1="'+Tm(o.m).toFixed(1)+'" y1="'+t1+'" x2="'+Tm(o.m).toFixed(1)+'" y2="'+(t1-hgt).toFixed(1)+'" stroke="#b45309" stroke-width="2"/>';
    });
  }
  /* résumé textuel en tooltip */
  var dt2=e.dateType||'ponctuelle', occTxt, distTxt;
  if(dt==='fixe') distTxt='fixe '+fmt0(p.a||(+e.montant||0));
  else if(dt==='uniforme') distTxt='uniforme ['+fmt0(p.a)+' ; '+fmt0(p.b==null?p.a:p.b)+']';
  else if(dt==='triangulaire') distTxt='triangulaire '+fmt0(p.a)+' / '+fmt0(p.b==null?p.a:p.b)+' / '+fmt0(p.c==null?(p.b==null?p.a:p.b):p.c);
  else distTxt='gauss μ='+fmt0(p.a)+' σ='+fmt0(p.b||0);
  if(dt2==='ponctuelle') occTxt='apparition ponctuelle '+mLong(e.mois);
  else if(dt2==='recurrente') occTxt='récurrente tous les '+Math.max(1,Math.round(+e.freq||1))+' mois, '+(e.dateA?mLong(e.dateA):'—')+' → '+(e.dateB?mLong(e.dateB):'—')+' ('+occ.length+' fois)';
  else occTxt='uniforme sur '+(e.dateA?mLong(e.dateA):'—')+' → '+(e.dateB?mLong(e.dateB):'—');
  s+='<title>'+esc(e.numero+' — '+distTxt+' · espérance '+fmt0(esp)+' · haut '+fmt0(haut)+' · '+occTxt+'\n(Cliquer pour modifier la distribution et la date d\'apparition)')+'</title>';
  s+='</svg>';
  return s;
}

/* Popup de saisie d'un risque : distribution du montant + date d'apparition.
   Seuls les champs nécessaires au mode choisi sont affichés, chacun décrit par
   un tooltip (title). */
var RK_DIST_FIELDS={
  fixe:[['Montant','distA','number','Montant fixe du risque (scénario certain) : utilisé tel quel comme espérance et comme haut']],
  uniforme:[['Min','distA','number','Borne basse de la distribution uniforme'],['Max','distB','number','Borne haute de la distribution uniforme']],
  triangulaire:[['Min','distA','number','Borne basse de la distribution triangulaire'],['Mode','distB','number','Valeur la plus probable (mode) de la distribution triangulaire'],['Max','distC','number','Borne haute de la distribution triangulaire']],
  gauss:[['Moyenne','distA','number','Moyenne (centre) de la distribution gaussienne du montant'],['Écart-type','distB','number','Écart-type de la distribution gaussienne : plus il est grand, plus le montant est dispersé autour de la moyenne']]
};
var RK_DATE_FIELDS={
  ponctuelle:[['Mois','mois','month','Mois unique d\'apparition du risque']],
  recurrente:[['Début','dateA','month','Première apparition du risque (mois)'],['Fin','dateB','month','Dernière apparition du risque (mois, inclus)'],['Fréquence (mois)','freq','number','Intervalle en mois entre deux apparitions (ex. 3 = tous les 3 mois)']],
  uniforme:[['Début de la période','dateA','month','Début de la période sur laquelle l\'apparition est répartie uniformément'],['Fin de la période','dateB','month','Fin de la période (incluse) sur laquelle l\'apparition est répartie uniformément']]
};
function openRisquePopup(ejId){
  var e=ejById(ejId); if(!e||!isRisque(e)) return;
  var ov=document.createElement('div');
  ov.className='modal-ov';
  var distOpts=DIST_TYPES.map(function(t){ return '<option value="'+t+'"'+((e.distType||'fixe')===t?' selected':'')+'>'+t+'</option>'; }).join('');
  var dtOpts=DATE_TYPES.map(function(t){ return '<option value="'+t+'"'+(e.dateType===t?' selected':'')+'>'+t+'</option>'; }).join('');
  ov.innerHTML='<div class="modal"><h2>Risque '+esc(e.numero)+' — distribution du montant &amp; date d\'apparition</h2>'+
    '<p class="hint">'+stadeBadge(e)+' '+esc(e.libelle||'')+' · affaire « '+esc(affaireName(e.affaireId))+' » · proba. '+(e.probabilite==null?100:e.probabilite)+' % (réglable dans le tableau) · espérance '+fmt0(espDist(e))+' · haut '+fmt0(montantHaut(e))+' · pondéré '+fmt0(risquePondere(e))+'</p>'+
    '<h3>Distribution du montant</h3>'+
    '<label class="fld" style="max-width:280px">Type de distribution<select id="rk-disttype" title="Forme de la distribution du montant du risque : fixe = montant certain ; uniforme = équiprobable entre min et max ; triangulaire = min / mode / max ; gaussienne = moyenne et écart-type">'+distOpts+'</select></label>'+
    '<div class="formrow" id="rk-distparams"></div>'+
    '<h3>Date d\'apparition</h3>'+
    '<label class="fld" style="max-width:280px">Mode d\'apparition<select id="rk-datetype" title="ponctuelle = un seul mois ; récurrente = toutes les N mois entre début et fin ; uniforme = répartie uniformément sur toute la période début–fin">'+dtOpts+'</select></label>'+
    '<div class="formrow" id="rk-dateparams"></div>'+
    '<div class="formrow" style="margin-top:14px"><button type="button" class="btn primary" id="rk-save" title="Enregistrer la distribution et la date d\'apparition, puis recalculer les CP du risque">Enregistrer</button>'+
    '<button type="button" class="btn" id="rk-cancel" title="Fermer sans enregistrer">Annuler</button></div></div>';
  document.body.appendChild(ov);
  function fldHtml(f, val){
    if(f[2]==='month') return '<label class="fld">'+f[0]+monthInputHTML('',val,'',''+f[3],'data-pf="'+f[1]+'"')+'</label>';
    return '<label class="fld">'+f[0]+'<input type="text" inputmode="decimal" data-pf="'+f[1]+'" value="'+esc(val==null?'':val)+'" title="'+esc(f[3])+'"></label>';
  }
  function renderParams(){
    var dt=ov.querySelector('#rk-disttype').value;
    ov.querySelector('#rk-distparams').innerHTML=(RK_DIST_FIELDS[dt]||[]).map(function(f){
      var val=e[f[1]];
      if(f[1]==='distA'&&dt==='fixe'&&val==null) val=e.montant; /* montant fixe */
      return fldHtml(f,val);
    }).join('');
    var dtt=ov.querySelector('#rk-datetype').value;
    ov.querySelector('#rk-dateparams').innerHTML=(RK_DATE_FIELDS[dtt]||[]).map(function(f){ return fldHtml(f,e[f[1]]); }).join('');
  }
  ov.querySelector('#rk-disttype').addEventListener('change',renderParams);
  ov.querySelector('#rk-datetype').addEventListener('change',renderParams);
  renderParams();
  function close(){ ov.remove(); document.removeEventListener('keydown',escH); }
  function escH(ev){ if(ev.key==='Escape') close(); }
  document.addEventListener('keydown',escH);
  ov.addEventListener('click',function(ev){ if(ev.target===ov) close(); });
  ov.querySelector('#rk-cancel').addEventListener('click',close);
  var saveBtn=ov.querySelector('#rk-save');
  if(HIST.on){ /* mode historique : consultation seule */
    saveBtn.disabled=true; saveBtn.title='Saisie désactivée en mode historique';
    Array.prototype.forEach.call(ov.querySelectorAll('input,select'),function(i){ i.disabled=true; });
  }
  saveBtn.addEventListener('click',function(){
    e.distType=ov.querySelector('#rk-disttype').value;
    e.dateType=ov.querySelector('#rk-datetype').value;
    Array.prototype.forEach.call(ov.querySelectorAll('[data-pf]'),function(inp){
      var f=inp.dataset.pf, raw=String(inp.value).trim();
      if(f==='mois'||f==='dateA'||f==='dateB'){
        var dm2=parseIdxDate(raw); if(raw==='') e[f]=null; else if(dm2) e[f]=dm2;
      } else if(f==='freq'){
        var n3=parseFloat(raw); e[f]=isNaN(n3)?null:n3;
      } else {
        var n=parseMontant(raw); e[f]=(n==null?null:n);
      }
    });
    if(e.distType==='fixe') e.montant=(e.distA==null?e.montant:e.distA); /* montant fixe = distA */
    recomputeProfils(state);
    save(); close(); renderRisques();
  });
}

/* Matérialise un risque en vrai EJ engagé à la date d donnée.
   Un aléa ne se matérialise PAS : il reste forfaitaire (on crée au besoin un
   EJ engagé à la main dans « Consommation CP »). */
function materialiserAt(e, d){
  if(!e||isAlea(e)) return;
  e.stade='engage';
  e.mois=d;
  var p=profilOf(e);
  p.debut=d;
  if(p.type==='uniforme'&&(!p.fin||p.fin<d)) p.fin=d;
  state.profils[e.id]=p;
  recomputeProfils(state);
}
function materialiser(e){
  if(!e) return;
  if(isAlea(e)){ alert('Un aléa ne peut pas être matérialisé : il reste forfaitaire (% du reste à payer). Créez au besoin un EJ engagé à la main dans « Consommation CP ».'); return; }
  var d=prompt('Date de matérialisation (AAAA-MM) — l\'EJ engagé prend cette date et peut servir de début au profil de CP :', nextOcc(e)||e.mois||curMois());
  if(!d) return;
  d=String(d).trim();
  if(!/^\d{4}-\d{2}$/.test(d)){ alert('Format AAAA-MM attendu (ex. '+curMois()+').'); return; }
  materialiserAt(e, d);
  save(); render();
}

function renderRisques(){
  var opId=state.ui.op||'', affId=state.ui.aff||'';
  var affs=scopedAffaires(opId,affId);
  var aids={}; affs.forEach(function(a){ aids[a.id]=1; });
  var ejs=state.ejs.filter(function(e){ return aids[e.affaireId]; });
  var aleas=ejs.filter(isAlea), risques=ejs.filter(isRisque);
  var aleaTot=sommeMontant(aleas);
  var rkEsp=0, rkPond=0;
  risques.forEach(function(e){ rkEsp+=espDist(e); rkPond+=risquePondere(e); });

  var h='<div class="toolbar">'+filtersBarHTML()+'</div>';
  h+='<p class="hint">Stades d\'un montant : <strong>aléa</strong> (forfait, non matérialisable) → <strong>risque</strong> (distribution + probabilité + date d\'apparition — modifiable en cliquant sur le petit graphique) → <strong>engagé</strong> (matérialisé). <span class="hint-ic" title="Aléa = part forfaitaire (défaut 5 % du reste à payer à date de l\'affaire, hors aléas pour éviter toute boucle), modifiable en % ou en montant ; un aléa ne se matérialise pas. Risque = montant selon une distribution (fixe/uniforme/triangulaire/gaussienne), probabilité, date d\'apparition (ponctuelle/récurrente/uniforme) ; matérialiser = vrai EJ à date fixée, profil de CP réglable ensuite dans Consommation CP.">i</span></p>';

  h+='<div class="kpis">';
  h+='<div class="kpi" style="border-left-color:var(--blue)"><div class="l">Aléas</div><div class="v mono">'+fmt(aleaTot)+'</div><div class="s">'+aleas.length+' aléa(s)</div></div>';
  h+='<div class="kpi a"><div class="l">Risques recensés</div><div class="v mono">'+risques.length+'</div><div class="s">'+affs.length+' affaire(s) dans la sélection</div></div>';
  h+='<div class="kpi a"><div class="l">Espérance des risques</div><div class="v mono">'+fmt(rkEsp)+'</div><div class="s">selon la distribution choisie</div></div>';
  h+='<div class="kpi"><div class="l">Montant pondéré</div><div class="v mono">'+fmt(rkPond)+'</div><div class="s">espérance × probabilité</div></div>';
  h+='</div>';

  if(!affs.length){ h+='<div class="card"><div class="empty">Aucune affaire dans cette sélection. Créez-en une dans « Opérations &amp; affaires ».</div></div>'; mount('view-risques',h,function(){}); return; }

  /* ---- Aléas ---- */
  h+='<div class="card"><h2>Aléas</h2>'+
     '<p class="hint">Part forfaitaire de l\'affaire : par défaut <strong>5 % du reste à payer à date</strong> (EJ engagés cumulés − CP consommés cumulés, <strong>hors aléas</strong> — sinon le calcul bouclerait sur lui-même) ; modifiez le % ou saisissez directement un montant (champ vide = calcul auto). <strong>Un aléa ne se matérialise pas en EJ engagé</strong> : pour le concrétiser, créez un EJ engagé dans « Consommation CP ». <strong>L\'aléa est réparti aléatoirement sur les mois restants de l\'opération</strong> (du mois en cours au dernier mois ; répartition stable, identique à chaque rendu).</p>';
  h+='<div class="formrow"><label class="fld">'+affaireSelect('risk-adda','')+'<span>Nouvel aléa sur</span></label>'+
     '<button class="btn primary" id="risk-adda-btn">+ Aléa</button></div>';
  if(!aleas.length){ h+='<p class="hint">Aucun aléa : ajoutez-en un ci-dessus.</p>'; }
  else{
    h+='<table class="liste"><tr><th></th><th>Affaire</th><th style="width:70px">N°</th><th>Libellé</th><th style="width:140px">Apparition</th>'+
       '<th class="num" style="width:70px">% reste</th><th class="num">Base (reste à payer)</th><th class="num" style="width:120px">Montant (vide = auto)</th><th></th></tr>';
    aleas.forEach(function(e){
      var aff=affaireById(e.affaireId);
      var occ=aleaOcc(e);
      h+='<tr><td>'+stadeBadge(e)+'</td>'+
         '<td style="min-width:150px"><select data-rf="'+e.id+'" data-f="affaireId" title="Affaire portant cet aléa">'+affaireOpts(e.affaireId)+'</select></td>'+
         '<td><input type="text" data-rf="'+e.id+'" data-f="numero" value="'+esc(e.numero)+'" title="Numéro de l\'aléa"></td>'+
         '<td><input type="text" data-rf="'+e.id+'" data-f="libelle" value="'+esc(e.libelle||'')+'" title="Libellé de l\'aléa"></td>'+
         '<td title="L\'aléa est réparti aléatoirement (de façon stable) sur les mois restants de l\'opération, du mois en cours au dernier mois de l\'opération">aléatoire'+(occ.length?('<br><small>'+mLabel(occ[0].m)+' → '+mLabel(occ[occ.length-1].m)+' ('+occ.length+' mois)</small>'):'')+'</td>'+
         '<td><input type="number" min="0" step="0.1" data-rf="'+e.id+'" data-f="aleaPct" value="'+(e.aleaPct==null?5:e.aleaPct)+'" title="Part forfaitaire du reste à payer à date de l\'affaire, hors aléas (défaut 5 %)"></td>'+
         '<td class="num mono" title="Base de l\'aléa = reste à payer à date de l\'affaire (EJ engagés cumulés − CP consommés cumulés des EJ engagés) — les aléas, non matérialisés, en sont exclus : pas de boucle infinie">'+fmt(aff?resteAPayer(aff):0)+'</td>'+
         '<td><input type="text" inputmode="decimal" data-rf="'+e.id+'" data-f="montantAlea" value="'+(e.montantExplicite?(e.montant==null?'':e.montant):'')+'" placeholder="auto : '+fmt(montantAlea(e))+'" title="Montant forfaitaire de l\'aléa — laisser vide pour le calcul auto (% du reste à payer hors aléas)"></td>'+
         '<td><button class="btn small danger" data-del="'+e.id+'" title="Supprimer cet aléa et ses CP">×</button></td></tr>';
    });
    h+='</table>';
  }
  h+='</div>';

  /* ---- Risques ---- */
  h+='<div class="card"><h2>Risques</h2>'+
     '<p class="hint">Chaque risque a un <strong>montant</strong> décrit par une <strong>distribution</strong> (fixe, uniforme, triangulaire, gaussienne) et une <strong>probabilité d\'apparition</strong>, ainsi qu\'une <strong>date d\'apparition</strong> (ponctuelle, récurrente, ou uniforme dans une période). Le tableau n\'affiche que le <strong>résultat</strong> : petit graphique de synthèse (forme de la distribution en haut, apparitions en bas ; tiret bleu = espérance, pointillé rouge = haut) — <strong>cliquez dessus pour ouvrir la popup de modification</strong> de la distribution et de la date. « Matérialiser » transforme le risque en EJ engagé à date fixée, réglable ensuite dans « Consommation CP ».</p>';
  h+='<div class="formrow"><label class="fld">'+affaireSelect('risk-addr','')+'<span>Nouveau risque sur</span></label>'+
     '<button class="btn primary" id="risk-addr-btn">+ Risque</button></div>';
  if(!risques.length){ h+='<p class="hint">Aucun risque : ajoutez-en un ci-dessus.</p>'; }
  else{
    h+='<table class="liste"><tr><th></th><th>Affaire</th><th style="width:70px">N°</th><th>Libellé</th>'+
       '<th style="width:200px">Synthèse (distribution · apparitions)</th><th class="num">Espérance</th>'+
       '<th class="num" style="width:80px">Proba. (%)</th><th class="num">Pondéré</th>'+
       '<th>Prochaine</th><th></th><th></th></tr>';
    risques.forEach(function(e){
      h+='<tr><td>'+stadeBadge(e)+'</td>'+
         '<td style="min-width:150px"><select data-rf="'+e.id+'" data-f="affaireId" title="Affaire portant ce risque">'+affaireOpts(e.affaireId)+'</select></td>'+
         '<td><input type="text" data-rf="'+e.id+'" data-f="numero" value="'+esc(e.numero)+'" title="Numéro du risque"></td>'+
         '<td><input type="text" data-rf="'+e.id+'" data-f="libelle" value="'+esc(e.libelle||'')+'" title="Libellé du risque"></td>'+
         '<td><button type="button" class="spark-btn" data-rkedit="'+e.id+'" title="Distribution '+(e.distType||'fixe')+' · espérance '+fmt0(espDist(e))+' · haut '+fmt0(montantHaut(e))+' — CLIQUEZ pour modifier la distribution et la date d\'apparition (popup)">'+riskSpark(e)+'</button></td>'+
         '<td class="num mono" title="Espérance du montant selon la distribution choisie">'+fmt0(espDist(e))+'</td>'+
         '<td><input type="number" min="0" max="100" step="1" data-rf="'+e.id+'" data-f="probabilite" value="'+(e.probabilite==null?'':e.probabilite)+'" title="Probabilité d\'apparition du risque (en %) — vide = 100 % ; le pondéré = espérance × probabilité"></td>'+
         '<td class="num mono" title="Montant pondéré = espérance × probabilité">'+fmt0(risquePondere(e))+'</td>'+
         '<td title="Prochaine apparition selon la date d\'apparition choisie">'+(nextOcc(e)?mLong(nextOcc(e)):'—')+'</td>'+
         '<td><button class="btn small primary" data-mat="'+e.id+'" title="Matérialiser le risque : devient un EJ engagé à date fixée, puis réglable dans « Consommation CP »">Matérialiser</button></td>'+
         '<td><button class="btn small danger" data-del="'+e.id+'" title="Supprimer ce risque et ses CP">×</button></td></tr>';
    });
    h+='</table>';
  }
  h+='</div>';

  mount('view-risques', h, function(w){
    function affaireOpts(cur){
      var out='';
      state.operations.forEach(function(o){
        var as=state.affaires.filter(function(a){ return a.opId===o.id; });
        if(!as.length) return;
        out+='<optgroup label="'+esc(o.nom)+'">';
        as.forEach(function(a){ out+='<option value="'+a.id+'"'+(cur===a.id?' selected':'')+'>'+esc(a.nom)+'</option>'; });
        out+='</optgroup>';
      });
      return out;
    }
    w.addEventListener('change', function(ev){
      var t=ev.target;
      if(!t.dataset||!t.dataset.rf) return;
      var e=ejById(t.dataset.rf); if(!e) return;
      var f=t.dataset.f;
      if(f==='affaireId'){ if(affaireById(t.value)) e.affaireId=t.value; }
      else if(f==='montantAlea'){ var n=parseMontant(t.value); if(n==null){ e.montantExplicite=false; e.montant=null; } else { e.montantExplicite=true; e.montant=n; } }
      else if(f==='probabilite'||f==='aleaPct'){ var n2=parseFloat(t.value); e[f]=isNaN(n2)?null:n2; }
      else if(f==='mois'){ if(t.value.trim()==='') e.mois=null; else { var dm3=parseIdxDate(t.value); if(dm3) e.mois=dm3; } }
      else e[f]=t.value;
      recomputeProfils(state);
      save(); renderRisques();
    });
    w.addEventListener('click', function(ev){
      var t=ev.target.closest('button'); if(!t) return;
      if(t.id==='risk-adda-btn'){
        var cid=w.querySelector('#risk-adda').value;
        if(!affaireById(cid)) return;
        state.ejs.push({id:uid(),affaireId:cid,numero:'AL-'+String(aleas.length+1).padStart(2,'0'),libelle:'Aléa forfaitaire',stade:'alea',mois:curMois(),montant:0,montantExplicite:false,aleaPct:5,dateType:'ponctuelle'});
        recomputeProfils(state); save(); renderRisques(); return;
      }
      if(t.id==='risk-addr-btn'){
        var cid2=w.querySelector('#risk-addr').value;
        if(!affaireById(cid2)) return;
        state.ejs.push({id:uid(),affaireId:cid2,numero:'R-'+String(risques.length+1).padStart(2,'0'),libelle:'',stade:'risque',mois:curMois(),montant:0,
          distType:'fixe',distA:0,probabilite:50,dateType:'ponctuelle'});
        recomputeProfils(state); save(); renderRisques(); return;
      }
      if(t.dataset.rkedit){ openRisquePopup(t.dataset.rkedit); return; }
      if(t.dataset.mat){ var e2=ejById(t.dataset.mat); if(e2){ materialiser(e2); } return; }
      if(t.dataset.del){
        var e3=ejById(t.dataset.del); if(!e3) return;
        if(!confirm('Supprimer « '+e3.numero+' » et ses CP ?')) return;
        state.ejs=state.ejs.filter(function(x){ return x.id!==e3.id; });
        for(var k in state.cps){ if(k.indexOf(e3.id+'|')===0) delete state.cps[k]; }
        delete state.profils[e3.id];
        recomputeProfils(state); save(); renderRisques(); return;
      }
    });
  });
}
function affaireOpts(cur){
  var out='';
  state.operations.forEach(function(o){
    var as=state.affaires.filter(function(a){ return a.opId===o.id; });
    if(!as.length) return;
    out+='<optgroup label="'+esc(o.nom)+'">';
    as.forEach(function(a){ out+='<option value="'+a.id+'"'+(cur===a.id?' selected':'')+'>'+esc(a.nom)+'</option>'; });
    out+='</optgroup>';
  });
  return out;
}

