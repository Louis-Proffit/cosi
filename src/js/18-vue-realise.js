/* ================= Vue : Réalisé ================= */

/* Détail d'une cellule somme de l'onglet Réalisé (EJ engagés du mois / CP prévus du mois) */
function realSumDetail(kind, affId, m){
  var a=affaireById(affId); if(!a) return '<td colspan="9" class="gp-detail">?</td>';
  var items=[], tot=0;
  ejsOfAffaire(a.id).filter(isMaterialise).forEach(function(e){
    var v=(kind==='ej')?(e.mois===m?montantOf(e):0):cpPrevu(e,m);
    if(v>0){ items.push(e.numero+(e.libelle?' ('+e.libelle+')':'')); tot+=v; }
  });
  if(!items.length) return '<td colspan="9" class="gp-detail">Aucun détail.</td>';
  return '<td colspan="9" class="gp-detail"><strong>'+(kind==='ej'?'EJ engagés':'CP prévus')+' '+mLong(m)+' — total '+fmt0(tot)+' :</strong> '+
    items.map(function(l){ return esc(l); }).join(' · ')+'</td>';
}

function renderRealise(){
  var opId=state.ui.op||'', affId=state.ui.aff||'';
  var affs=scopedAffaires(opId,affId);
  var months=scopeMonths(opId,affId);
  var cur=curMois();

  var h='<div class="toolbar">'+filtersBarHTML()+'</div>';
  h+='<p class="hint">Saisissez le <strong>réalisé</strong> (EJ constatés, CP payés) par affaire et par mois passé ou en cours. Écart sur un <strong>mois écoulé</strong> = alerte (+ lien « Traiter ») ; mois en cours non saisi = <strong>info orange</strong>. <span class="hint-ic" title="Le réalisé est enregistré dans les fichiers de données, repris dans la GP à saisir (EJ réel / CP réel) et comparé aux prévisions mois par mois : retard et avance sont des incohérences, signalés séparément (statut, alertes ici et tableau de bord). Colonne Actions : ajuster l\'EJ au réalisé, décaler au mois suivant, créer un EJ engagé pour l\'écart, constater le prévu, matérialiser un risque passé ; côté CP : constater le prévu, reporter au mois suivant, régler le profil de CP. Clic sur les cellules EJ/CP du mois = détail de la somme.">i</span></p>';

  var alerts=computeAlerts(opId, affId);
  h+='<div class="card"><h2>Alertes de cohérence avec le réalisé</h2>'+
     '<p class="hint" title="Les alertes ne portent que sur les mois ÉCOULÉS. Le mois en cours peut ne pas être encore saisi : simple information orange, pas une alerte. Chaque alerte a un lien « Traiter » vers l\'onglet concerné.">Alerte = problème sur un mois écoulé ; mois en cours non saisi = information orange.</p>';
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

  if(!affs.length){
    h+='<div class="card"><div class="empty">Aucune affaire dans cette sélection.</div></div>';
    mount('view-realise',h,function(w){ wireRealHeader(w); });
    return;
  }

  function fmtS(n){ return (n>0?'+':'')+fmt0(n); }
  /* badge d'écart séparé EJ / CP, en retard et en avance */
  function badgeEcart(val,tol,kind){
    if(Math.abs(val)<=tol) return '<span class="badge ok">'+kind+' ok</span>';
    if(val<0) return '<span class="badge over">'+kind+' retard '+fmtM(-val)+'</span>';
    return '<span class="badge warn">'+kind+' avance '+fmtM(val)+'</span>';
  }
  /* tableau hiérarchique comme GP/Révisions : ligne 1 = opération, ligne 2 = affaire, ligne 3 = colonnes ; totaux en pied */
  var opColsR=[];
  state.operations.forEach(function(o){
    var cs=affs.filter(function(a){ return a.opId===o.id; });
    if(cs.length) opColsR.push({o:o, cs:cs});
  });
  var COLS_R=[
    ['EJ engagés (mois)','Montant des EJ engagés (programmés ou matérialisés) à ce mois — cliquer pour le détail de la somme'],
    ['CP prévu (mois)','CP prévus ce mois-ci selon les profils de consommation des EJ engagés — cliquer pour le détail'],
    ['EJ réalisé','EJ effectivement constatés ce mois (saisie, mois passés ou en cours)'],
    ['CP réalisé','CP effectivement payés ce mois (saisie, mois passés ou en cours)'],
    ['Écart EJ','Écart EJ = réalisé − engagé (mois écoulés seulement)'],
    ['Écart CP','Écart CP = réalisé − prévu (mois écoulés seulement)'],
    ['Statut','Un écart en retard comme en avance est une incohérence (mois écoulé) ; mois en cours non saisi = info orange'],
    ['Actions','Corriger l\'écart constaté (ajuster/décaler l\'EJ, reporter le CP, matérialiser un risque…)']
  ];
  if(!opColsR.length){ h+='<div class="card"><div class="empty">Aucune affaire dans cette sélection.</div></div>'; }
  else{
    var h1='<th rowspan="3" class="scol sc0 rev-h-fix">#</th><th rowspan="3" class="scol sc1 rev-h-fix">Mois</th>';
    var h2='', h3='';
    opColsR.forEach(function(og){
      h1+='<th class="rev-h-op" colspan="'+(og.cs.length*8)+'">Opération '+(og.o.numero?og.o.numero+' — ':'')+': '+esc(og.o.nom)+'</th>';
      og.cs.forEach(function(a){
        h2+='<th class="rev-h-aff" colspan="8" title="Reste à payer à date '+fmt(resteAPayer(a))+'">'+esc(a.nom)+'</th>';
        COLS_R.forEach(function(c){ h3+='<th class="rev-h-col" title="'+esc(c[1])+'">'+c[0]+'</th>'; });
      });
    });
    var nbCols=2+opColsR.reduce(function(s,og){ return s+og.cs.length*8; },0);
    var body='';
    body+=extRow('avant', nbCols);
    months.forEach(function(m,ri){
      body+='<tr'+(m===cur?' class="gp-cur"':'')+'><td class="scol sc0 rnum">'+(ri+1)+'</td><td class="scol sc1 mh'+(m===cur?' cur':'')+'">'+mLong(m)+(m<cur?'':' (à venir)')+'</td>';
      opColsR.forEach(function(og){
        og.cs.forEach(function(a){
          var ejs=ejsOfAffaire(a.id).filter(isMaterialise);
          var ejsRA=ejsOfAffaire(a.id).filter(isRisque); /* aléas non matérialisables */
          var ejM=0, cpM=0;
          ejs.forEach(function(e){ if(e.mois===m) ejM+=montantOf(e); cpM+=cpPrevu(e,m); });
          var past=m<cur; /* alerte uniquement sur les mois ÉCOULÉS ; le mois courant reste saisissable */
          var r=realOf(a.id,m); /* null = NON SAISI (distinct d'un réalisé saisi à 0) */
          var hasR=r&&(Object.prototype.hasOwnProperty.call(r,'ej')||Object.prototype.hasOwnProperty.call(r,'cp'));
          var eEj=(hasR?r.ej||0:0)-ejM, eCp=(hasR?r.cp||0:0)-cpM;
          var tolEj=Math.max(1,ejM*0.01), tolCp=Math.max(1,cpM*0.02);
          var inco=past&&hasR&&(Math.abs(eEj)>tolEj||Math.abs(eCp)>tolCp);
          var statut;
          if(past&&!hasR) statut='<span class="badge warn" title="Mois écoulé sans réalisé saisi — alerte remontée au tableau de bord (un réalisé saisi à 0 vaut constatation « rien », bien distinct de non saisi)">non saisi</span>';
          else if(past) statut=badgeEcart(eEj,tolEj,'EJ')+' '+badgeEcart(eCp,tolCp,'CP');
          else if(m===cur) statut=hasR?(badgeEcart(eEj,tolEj,'EJ')+' '+badgeEcart(eCp,tolCp,'CP')):'<span class="badge info" title="Mois en cours : le réalisé peut ne pas être encore saisi — information, pas une alerte">à saisir</span>';
          else statut='';
          var actions='';
          if(inco){
            /* --- corrections EJ (montant de l'EJ prévu) --- */
            if(Math.abs(eEj)>tolEj){
              actions+='<button class="btn small" data-act="ajej" data-k="'+a.id+'|'+m+'" data-v="'+Math.round(eEj)+'" title="Mettre à jour le montant de l\'EJ engagé à ce mois de l\'écart constaté ('+(eEj>0?'+':'')+fmt0(eEj)+' € — écart EJ '+(eEj>0?'en avance':'en retard')+') : le montant de l\'EJ devient le réalisé">Ajuster l\'EJ au réalisé</button> ';
              actions+='<button class="btn small" data-act="const-ej" data-k="'+a.id+'|'+m+'" title="Reporter comme EJ réalisé le montant engagé prévu à ce mois ('+fmt0(ejM)+' €)">EJ = prévu</button> ';
              if(eEj>tolEj) actions+='<button class="btn small" data-act="addej" data-k="'+a.id+'|'+m+'" data-v="'+Math.round(eEj)+'" title="Créer un EJ engagé supplémentaire sur cette affaire à ce mois pour '+fmt(eEj)+' (écart EJ en avance : réalisé > engagé)">+ EJ engagé</button> ';
              else actions+='<button class="btn small" data-act="delej" data-k="'+a.id+'|'+m+'" title="Décaler l\'EJ engagé à ce mois (et le début de son profil de CP) au mois suivant — écart EJ en retard">Décaler l\'EJ</button> ';
              var ra=null;
              for(var i=0;i<ejsRA.length;i++){ var no=nextOcc(ejsRA[i]); if(no&&no<=m){ ra=ejsRA[i]; break; } }
              if(ra) actions+='<button class="btn small" data-act="mat" data-ej="'+ra.id+'" data-m="'+m+'" title="Matérialiser « '+esc(ra.numero)+' » (apparition prévue '+mLong(nextOcc(ra))+', passée) à ce mois : il devient un EJ engagé">Matérialiser '+esc(ra.numero)+'</button> ';
            }
            /* --- corrections CP (consommation) --- */
            if(Math.abs(eCp)>tolCp){
              actions+='<button class="btn small" data-act="const-cp" data-k="'+a.id+'|'+m+'" title="Reporter comme CP réalisés les CP prévus à ce mois ('+fmt0(cpM)+' €)">CP = prévu</button> ';
              if(eCp<0) actions+='<button class="btn small" data-act="delcp" data-k="'+a.id+'|'+m+'" title="Reporter au mois suivant les CP prévus à ce mois et non réalisés (décale d\'un mois le profil de CP de l\'EJ concerné) — écart CP en retard">Reporter le CP</button> ';
              var ejCp=null;
              for(var i2=0;i2<ejs.length;i2++){ if(cpPrevu(ejs[i2],m)>0){ ejCp=ejs[i2]; break; } }
              if(!ejCp) ejCp=ejs[0]||null;
              if(ejCp) actions+='<button class="btn small" data-act="prof" data-ej="'+ejCp.id+'" title="Ouvrir le réglage du profil de consommation des CP de « '+esc(ejCp.numero)+' » (décaler, étendre, personnaliser, saisir mois par mois…)">Profil CP</button>';
            }
          }
          body+='<td class="num mono'+(ejM>0?' gp-cell':'')+'"'+(ejM>0?' data-realsum="ej|'+a.id+'|'+m+'" title="Somme des EJ engagés à ce mois — cliquer pour le détail"':'')+'>'+fmt0(ejM)+'</td>'+
             '<td class="num mono'+(cpM>0?' gp-cell':'')+'"'+(cpM>0?' data-realsum="cp|'+a.id+'|'+m+'" title="Somme des CP prévus à ce mois — cliquer pour le détail"':'')+'>'+fmt0(cpM)+'</td>'+
             '<td class="num"><input type="text" inputmode="decimal" class="real-in" data-real="'+a.id+'|'+m+'" data-f="ej" value="'+(hasR&&Object.prototype.hasOwnProperty.call(r,'ej')?fmt0(r.ej||0):'')+'"'+(m<=cur?'':' disabled')+' title="EJ effectivement constatés en '+mLong(m)+' (mois passé ou en cours : saisir le réalisé — « 0 » = constaté à zéro, distinct de non saisi)"></td>'+
             '<td class="num"><input type="text" inputmode="decimal" class="real-in" data-real="'+a.id+'|'+m+'" data-f="cp" value="'+(hasR&&Object.prototype.hasOwnProperty.call(r,'cp')?fmt0(r.cp||0):'')+'"'+(m<=cur?'':' disabled')+' title="CP effectivement payés en '+mLong(m)+' (mois passé ou en cours : saisir le réalisé — « 0 » = constaté à zéro, distinct de non saisi)"></td>'+
             '<td class="num mono">'+(past?fmtS(eEj):'')+'</td>'+
             '<td class="num mono">'+(past?fmtS(eCp):'')+'</td>'+
             '<td>'+statut+'</td>'+
             '<td style="white-space:nowrap">'+actions+'</td>';
        });
      });
      body+='</tr>';
    });
    body+=extRow('après', nbCols);
    var foot='<tr class="gp-tot"><td class="scol sc0"></td><td class="scol sc1">Total</td>';
    opColsR.forEach(function(og){
      og.cs.forEach(function(a){
        var tEj=0, tCp=0, tRej=0, tRcp=0;
        months.forEach(function(m){
          var ejM=0, cpM=0;
          ejsOfAffaire(a.id).filter(isMaterialise).forEach(function(e){ if(e.mois===m) ejM+=montantOf(e); cpM+=cpPrevu(e,m); });
          var r=realOf(a.id,m)||{ej:0,cp:0};
          tEj+=ejM; tCp+=cpM; tRej+=r.ej||0; tRcp+=r.cp||0;
        });
        foot+='<td class="num mono">'+fmt0(tEj)+'</td><td class="num mono">'+fmt0(tCp)+'</td><td class="num mono">'+fmt0(tRej)+'</td><td class="num mono">'+fmt0(tRcp)+'</td><td colspan="4"></td>';
      });
    });
    foot+='</tr>';
    h+='<div class="grid-wrap"><table class="liste rev-table"><thead><tr>'+h1+'</tr><tr>'+h2+'</tr><tr>'+h3+'</tr></thead><tbody>'+body+'</tbody><tfoot>'+foot+'</tfoot></table></div>';
  }
  mount('view-realise', h, function(w){
    wireRealHeader(w);
    w.addEventListener('change', function(ev){
      var t=ev.target;
      if(t.dataset&&t.dataset.real){
        var k=t.dataset.real, pp=k.split('|'), aid=pp[0], m=pp[1];
        /* « saisi à 0 » (champ rempli, valeur 0) != « non saisi » (champ vide) :
           on conserve l'entrée dès qu'un champ est rempli, même à 0 */
        var cur2=state.realise[k]?deepCopy(state.realise[k]):{};
        var v=parseMontant(t.value);
        if(v==null) delete cur2[t.dataset.f]; else cur2[t.dataset.f]=v;
        if(Object.prototype.hasOwnProperty.call(cur2,'ej')||Object.prototype.hasOwnProperty.call(cur2,'cp')) state.realise[k]=cur2;
        else delete state.realise[k];
        save(); renderRealise(); return;
      }
    });
    w.addEventListener('click', function(ev){
      var rs=ev.target.closest('[data-realsum]');
      if(rs&&rs.dataset&&rs.dataset.realsum){
        var p2=rs.dataset.realsum.split('|'), kind=p2[0], aid=p2[1], m=p2[2];
        var row=rs.closest('tr'), next=row.nextSibling, key=rs.dataset.realsum;
        var html=realSumDetail(kind,aid,m);
        if(next&&next.classList&&next.classList.contains('gp-detail-row')){ if(next.dataset.for===key){ next.parentNode.removeChild(next); return; } next.dataset.for=key; next.innerHTML=html; return; }
        var tr=document.createElement('tr'); tr.className='gp-detail-row'; tr.dataset.for=key; tr.innerHTML=html;
        row.parentNode.insertBefore(tr, row.nextSibling);
        return;
      }
      var b=ev.target.closest('button[data-act]'); if(!b) return;
      var act=b.dataset.act;
      if(act==='const-ej'||act==='const-cp'){
        var k=b.dataset.k, pp=k.split('|'), aid=pp[0], m=pp[1];
        var cur3=state.realise[k]||{ej:0,cp:0};
        if(act==='const-ej'){
          var ejM=0;
          ejsOfAffaire(aid).filter(isMaterialise).forEach(function(e){ if(e.mois===m) ejM+=montantOf(e); });
          cur3.ej=ejM;
        } else {
          var cpM=0;
          ejsOfAffaire(aid).filter(isMaterialise).forEach(function(e){ cpM+=cpPrevu(e,m); });
          cur3.cp=cpM;
        }
        state.realise[k]=cur3; /* constatation explicite : même à 0, c'est saisi (pas « non saisi ») */
        save(); renderRealise(); return;
      }
      if(act==='ajej'){
        /* met à jour le montant de l'EJ engagé à ce mois de l'écart constaté */
        var kA=b.dataset.k, ppA=kA.split('|'), aidA=ppA[0], mA=ppA[1];
        var vA=parseFloat(b.dataset.v)||0;
        var cand=ejsOfAffaire(aidA).filter(function(e){ return isMaterialise(e)&&e.mois===mA; });
        if(!cand.length||!vA) return;
        cand[0].montant=Math.max(0,(cand[0].montant||0)+vA);
        recomputeProfils(state); save(); renderRealise(); return;
      }
      if(act==='delej'){
        /* décale l'EJ engagé à ce mois (et le début de son profil CP) au mois suivant */
        var kD=b.dataset.k, ppD=kD.split('|'), aidD=ppD[0], mD=ppD[1];
        var candD=ejsOfAffaire(aidD).filter(function(e){ return isMaterialise(e)&&e.mois===mD; });
        if(!candD.length) return;
        var eD=candD[0];
        eD.mois=mAdd(mD,1);
        var pD=profilOf(eD);
        if(pD.debut===mD){ pD.debut=mAdd(mD,1); pD.fin=mAdd(mD,1); state.profils[eD.id]=pD; }
        recomputeProfils(state); save(); renderRealise(); return;
      }
      if(act==='delcp'){
        /* reporte au mois suivant les CP prévus à ce mois et non réalisés */
        var kC=b.dataset.k, ppC=kC.split('|'), aidC=ppC[0], mC=ppC[1];
        var ejC=null;
        ejsOfAffaire(aidC).filter(isMaterialise).forEach(function(e){ if(!ejC&&cpPrevu(e,mC)>0) ejC=e; });
        if(!ejC) return;
        var pC=profilOf(ejC);
        if(pC.type==='ponctuelle'&&pC.debut===mC){ pC.debut=mAdd(mC,1); pC.fin=pC.debut; state.profils[ejC.id]=pC; }
        else if(pC.type==='uniforme'&&pC.debut<=mC&&mC<=pC.fin){ pC.debut=mAdd(pC.debut,1); pC.fin=mAdd(pC.fin,1); state.profils[ejC.id]=pC; }
        recomputeProfils(state); save(); renderRealise(); return;
      }
      if(act==='addej'){
        var k2=b.dataset.k, pp2=k2.split('|'), aid2=pp2[0], m2=pp2[1];
        var v2=parseFloat(b.dataset.v)||0; if(v2<=0) return;
        var n=state.ejs.filter(function(e){ return e.affaireId===aid2; }).length+1;
        state.ejs.push({id:uid(),affaireId:aid2,numero:'EJ-'+String(n).padStart(2,'0'),libelle:'Écart constaté dans le réalisé',stade:'engage',mois:m2,montant:Math.round(v2)});
        recomputeProfils(state); save(); renderRealise(); return;
      }
      if(act==='mat'){
        var e3=ejById(b.dataset.ej); if(!e3) return;
        materialiserAt(e3, b.dataset.m);
        save(); renderRealise(); return;
      }
      if(act==='prof'){ openProfilPopup(b.dataset.ej); return; }
    });
  });
}

function wireRealHeader(w){
}

