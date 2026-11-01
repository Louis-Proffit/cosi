/* ================= Alertes ================= */
/* Alertes de cohérence : risques passés non matérialisés (les aléas ne se
   matérialisent pas) ; EJ/CP passés non cohérents avec le réalisé saisi dans
   l'onglet « Réalisé ». */

function computeAlerts(opId, affId){
  var cur=curMois(), out=[];
  var affs=scopedAffaires(opId||'', affId||''), ids={};
  affs.forEach(function(a){ ids[a.id]=1; });
  var ejs=state.ejs.filter(function(e){ return ids[e.affaireId]; });
  /* date de référence la plus ancienne (TOUTES les affaires) : on ne remonte pas avant */
  var minRef=null;
  state.affaires.forEach(function(a){ if(a.dateRefRev&&(!minRef||a.dateRefRev<minRef)) minRef=a.dateRefRev; });
  /* cohérence EJ : montant de l'EJ vs somme de ses CP (colonne conso de l'EJ) */
  ejs.forEach(function(e){
    if(!isMaterialise(e)) return;
    var som=cpSumOf(e.id), mt=montantOf(e), tol=Math.max(1,mt*0.001);
    if(Math.abs(mt-som)>tol){
      out.push({level:'over', view:'affaire', col:e.id, ej:e,
        txt:'EJ « '+e.numero+' » ('+affaireName(e.affaireId)+') : montant '+fmt(mt)+' mais somme des CP '+fmt(som)+' — écart de '+fmt(mt-som)+'.'});
    }
  });
  ejs.forEach(function(e){
    /* seuls les risques se matérialisent ; un aléa forfaitaire ne peut pas
       devenir un EJ engagé, donc pas d'alerte de matérialisation pour lui */
    if(isRisque(e)){
      var no=nextOcc(e);
      if(no&&no<cur){
        out.push({level:'over', view:'affaire', col:e.id, ej:e,
          txt:stadeLabel(e)+' « '+e.numero+' — '+e.libelle+' » ('+affaireName(e.affaireId)+') : apparition prévue en '+mLong(no)+', passée, et non matérialisé.'});
      }
    }
  });
  affs.forEach(function(a){
    /* alertes uniquement sur les mois ÉCOULÉS (m < cur) */
    var ejPast=0, cpPast=0, months=scopeMonths(a.opId,a.id), i;
    ejs.forEach(function(e){
      if(e.affaireId!==a.id) return;
      if(isMaterialise(e)){
        if(e.mois<cur) ejPast+=montantOf(e);
        for(i=0;i<months.length;i++){ if(months[i]<cur) cpPast+=cpPrevu(e,months[i]); }
      }
    });
    var rc=realCumul(a.id, mAdd(cur,-1));
    /* un écart en retard comme en avance est une incohérence (mois écoulés) */
    if(ejPast>0 && rc.ej < ejPast - Math.max(1,ejPast*0.01)){
      out.push({level:'over', view:'affaire', aff:a.id, txt:'Affaire « '+a.nom+' » : EJ engagés à hauteur de '+fmt(ejPast)+' sur les mois écoulés, mais seulement '+fmt(rc.ej)+' constatés dans le réalisé (retard de '+fmt(ejPast-rc.ej)+').'});
    }
    if(ejPast>0 && rc.ej > ejPast + Math.max(1,ejPast*0.01)){
      out.push({level:'warn', view:'affaire', aff:a.id, txt:'Affaire « '+a.nom+' » : '+fmt(rc.ej)+' d\'EJ réalisés sur les mois écoulés contre '+fmt(ejPast)+' d\'EJ engagés (avance de '+fmt(rc.ej-ejPast)+').'});
    }
    if(cpPast>0 && rc.cp < cpPast - Math.max(1,cpPast*0.02)){
      out.push({level:'over', view:'affaire', aff:a.id, txt:'Affaire « '+a.nom+' » : CP prévus à hauteur de '+fmt(cpPast)+' sur les mois écoulés, mais seulement '+fmt(rc.cp)+' réalisés (retard de '+fmt(cpPast-rc.cp)+').'});
    }
    if(cpPast>0 && rc.cp > cpPast + Math.max(1,cpPast*0.02)){
      out.push({level:'warn', view:'affaire', aff:a.id, txt:'Affaire « '+a.nom+' » : '+fmt(rc.cp)+' de CP réalisés sur les mois écoulés contre '+fmt(cpPast)+' prévus (avance de '+fmt(rc.cp-cpPast)+').'});
    }
    if(rc.ej>0 && ejPast<=0){
      out.push({level:'over', view:'affaire', aff:a.id, txt:'Affaire « '+a.nom+' » : '+fmt(rc.ej)+' d\'EJ réalisés sans EJ engagé à ces dates.'});
    }
    if(rc.cp>0 && cpPast<=0){
      out.push({level:'over', view:'affaire', aff:a.id, txt:'Affaire « '+a.nom+' » : '+fmt(rc.cp)+' de CP réalisés sans prévision de CP.'});
    }
    /* info (orange, pas une alerte) : mois en cours pas encore saisi dans Réalisé */
    var ejCur=0, cpCur=0;
    ejs.forEach(function(e){ if(e.affaireId===a.id&&isMaterialise(e)){ if(e.mois===cur) ejCur+=montantOf(e); cpCur+=cpPrevu(e,cur); } });
    if((ejCur>0||cpCur>0)&&!realOf(a.id,cur)){
      out.push({level:'info', view:'affaire', aff:a.id, txt:'Affaire « '+a.nom+' » : mois en cours '+mLong(cur)+' pas encore saisi dans « Réalisé » (prévu : EJ '+fmt0(ejCur)+', CP '+fmt0(cpCur)+') — simple information, à compléter.'});
    }
    /* réalisé NON SAISI pour un mois révolu = alerte (un réalisé saisi à 0 vaut
       constatation « rien » : bien distinct de « non saisi »). On s'arrête à la
       date de référence la plus ancienne. */
    if(minRef){
      var miss=[];
      for(var mm=minRef; mm<cur; mm=mAdd(mm,1)){ if(!realOf(a.id,mm)) miss.push(mm); if(miss.length>600) break; }
      if(miss.length){
        out.push({level:'warn', view:'affaire', aff:a.id,
          txt:'Affaire « '+a.nom+' » : réalisé non saisi pour '+miss.length+' mois révolu'+(miss.length>1?'s':'')+' ('+mLong(miss[0])+' … '+mLong(miss[miss.length-1])+', depuis la date de réf. '+mLong(minRef)+') — à compléter dans « Réalisé » ; un réalisé saisi à 0 vaut constatation.'});
      }
    }
  });
  return out;
}
