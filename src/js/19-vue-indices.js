/* ================= Vue : Indices ================= */

function renderIndices(){
  var h='<div class="card"><h2>Indices de prix</h2>'+
    '<p class="hint"><strong>Séries d\'indices en tableau</strong> : lignes = mois (de l\'affaire la plus ancienne au dernier CP), colonnes = séries — <strong>collage direct depuis Excel</strong>. Référencées par {NOM} dans les formules d\'affaire. <span class="hint-ic" title="Chaque affaire combine les séries dans sa formule d\'indice (onglet Révisions de prix), ex. {BT01} ou {BT01}/{BT01_0} (série au mois de référence). Pour un mois donné, la valeur retenue est la dernière définie à ou avant ce mois. Collage Excel : 1ère colonne = mois (AAAA-MM, MM/AAAA, MM/AA ou n° de série), colonnes suivantes = valeurs des séries dans l\'ordre.">i</span></p>'+
    (cmpVer()?'<p class="hint">Mode comparaison : les séries d\'indices ne sont pas versionnées — elles sont identiques dans toutes les versions sauvegardées ; seuls les montants de révision figés à chaque sauvegarde diffèrent.</p>':'');

  if(state.indices.length===0) h+='<p class="hint">Aucune série d\'indices définie.</p>';
  else{
    h+='<table class="liste" style="max-width:760px"><tr><th style="width:26%">Série</th><th>Référence en formule</th><th class="num">Valeurs</th><th class="num">Dernière valeur</th><th></th></tr>';
    state.indices.forEach(function(sr){
      var keys=Object.keys(sr.valeurs).sort(), last=null;
      keys.forEach(function(k){ var v=sr.valeurs[k]; if(typeof v==='number'&&isFinite(v)) last=k; });
      h+='<tr>'+
        '<td><input type="text" data-serienom="'+sr.id+'" value="'+esc(sr.nom)+'" style="width:100%" title="Renommer la série (les formules qui la référencent par son nom doivent être mises à jour)"></td>'+
        '<td class="mono">{'+esc(sr.nom)+'}</td>'+
        '<td class="num">'+keys.length+'</td>'+
        '<td class="num mono">'+(last?mLong(last)+' : '+fmtIdx(sr.valeurs[last]):'—')+'</td>'+
        '<td><button class="btn small danger" data-delserie="'+sr.id+'" title="Supprimer la série ; les formules qui la référencent seront en erreur">Supprimer</button></td></tr>';
    });
    h+='</table>';
  }
  h+='<div class="formrow" style="margin-top:12px">'+
    '<label class="fld">Nouvelle série<input type="text" id="idx-serie-nom" placeholder="BT01 — INSEE" title="Nom de la nouvelle série d\'indices"></label>'+
    '<button class="btn primary" id="idx-addserie" title="Ajouter la série (elle devient une colonne du tableau)">Ajouter la série</button></div>';

  /* ---- Tableau de saisie : dates en lignes, séries en colonnes, collage Excel ---- */
  var series=state.indices, months=idxGridMonths();
  h+='<h3>Saisie en tableau — toutes les séries</h3>';
  if(!series.length){
    h+='<p class="hint">Ajoutez d\'abord une série ci-dessus.</p>';
  }else{
    h+='<p class="hint">Le tableau couvre <strong>tous les mois de la période</strong> : du premier mois de l\'affaire la plus récente (date de réf. de révision) jusqu\'au dernier mois du dernier CP. Cellules éditables. <strong>Coller depuis Excel</strong> : copiez un bloc (1ʳᵉ colonne = mois, puis une colonne par série dans l\'ordre), cliquez une cellule du tableau (colonne « Mois » de préférence), puis <strong>Ctrl+V</strong>. Dates acceptées : AAAA-MM, MM/AAAA, MM/AA, n° de série Excel. La 1ʳᵉ colonne collée crée les nouveaux mois.</p>'+
       '<p class="hint" id="idx-paste-info"></p>';
    h+='<div class="grid-wrap" style="max-height:60vh"><table class="liste idx-grid" id="idx-grid"><thead><tr><th data-c="0" title="Colonne des mois — collez ici pour créer des lignes">Mois</th>';
    series.forEach(function(sr,si){
      h+='<th data-c="'+(si+1)+'" title="Colonne de la série '+esc(sr.nom)+'">'+esc(sr.nom)+'<br><span class="muted mono" style="font-weight:400">{'+esc(sr.nom)+'}</span></th>';
    });
    h+='</tr></thead><tbody>';
    months.forEach(function(m,ri){
      h+='<tr><td class="mcell" data-c="0" data-r="'+ri+'" title="Ligne '+mLong(m)+' — cliquez ici puis collez un bloc Excel">'+mLabel(m)+'</td>';
      series.forEach(function(sr,si){
        var v=sr.valeurs[m];
        h+='<td data-c="'+(si+1)+'" data-r="'+ri+'"><input type="text" inputmode="decimal" class="cell" data-iv="'+sr.id+'|'+m+'" value="'+(v==null?'':v)+'" title="'+esc(sr.nom)+' — '+mLong(m)+' (saisie directe ou collage Excel dans le tableau)"></td>';
      });
      h+='</tr>';
    });
    h+='</tbody></table></div>';
  }
  h+='</div>';

  mount('view-indices', h, function(w){
    w.addEventListener('change', function(ev){
      var t=ev.target;
      if(t.dataset&&t.dataset.iv){
        var p=t.dataset.iv.split('|'), s2=idxById(p[0]);
        if(s2){
          var v=parseMontant(t.value);
          if(v==null) delete s2.valeurs[p[1]]; else s2.valeurs[p[1]]=v;
          save(); render();
        }
        return;
      }
      if(t.dataset&&t.dataset.serienom){
        var s3=idxById(t.dataset.serienom);
        if(s3){ s3.nom=t.value.trim()||s3.nom; save(); render(); }
        return;
      }
    });
    /* collage Excel : ancré sur la cellule cliquée (mois en 1ʳᵉ colonne, séries ensuite) */
    var grid=w.querySelector('#idx-grid');
    if(grid) grid.addEventListener('paste', function(ev){
      var cell=(ev.target&&ev.target.closest)?ev.target.closest('td[data-c],th[data-c]'):null;
      if(!cell) return;
      var cd=ev.clipboardData||window.clipboardData;
      var txt=cd&&cd.getData?cd.getData('text/plain'):'';
      if(!txt) return;
      ev.preventDefault();
      var r0=+(cell.dataset.r||0); if(r0<0) r0=0;
      var g0=+(cell.dataset.c||0);
      var rows=txt.replace(/\r/g,'').split('\n').filter(function(l){ return l.trim()!==''; }).map(function(l){ return l.split('\t'); });
      var months=idxGridMonths(), series=state.indices;
      var filled=0, created=0, skipped=0;
      for(var i=0;i<rows.length;i++){
        var month=null;
        if(g0===0){
          month=parseIdxDate(rows[i][0]);
          if(!month){ skipped++; continue; }
          if(months.indexOf(month)<0){
            months.push(month);
            series.forEach(function(s){ if(!(month in s.valeurs)) s.valeurs[month]=null; });
            created++;
          }
        }else{
          var ri=r0+i;
          if(ri>=months.length){ skipped+=rows[i].length; continue; }
          month=months[ri];
        }
        for(var j=0;j<rows[i].length;j++){
          var g=g0+j;
          if(g===0) continue;
          if(g0===0&&j===0) continue; /* colonne date */
          var si=g-1;
          if(si<0||si>=series.length){ skipped++; continue; }
          var raw=String(rows[i][j]==null?'':rows[i][j]).trim();
          if(raw===''){ if(month in series[si].valeurs){ delete series[si].valeurs[month]; filled++; } continue; }
          var v=parseMontant(raw);
          if(v==null||!isFinite(v)){ skipped++; continue; }
          series[si].valeurs[month]=v; filled++;
        }
      }
      save(); render();
      var info=document.getElementById('idx-paste-info');
      if(info) info.textContent=filled+' valeur(s) collée(s)'+(created?', '+created+' mois créé(s)':'')+(skipped?', '+skipped+' cellule(s) ignorée(s)':'');
    });
    w.addEventListener('click', function(ev){
      var t=ev.target.closest('button'); if(!t) return;
      if(t.id==='idx-addserie'){
        var nom=w.querySelector('#idx-serie-nom').value.trim();
        if(!nom) return;
        state.indices.push({id:uid(),nom:nom,valeurs:{}});
        save(); render(); return;
      }
      if(t.dataset.delserie){
        var s6=idxById(t.dataset.delserie);
        if(!confirm('Supprimer la série « '+(s6?s6.nom:'')+' » ?')) return;
        state.indices=state.indices.filter(function(s){ return s.id!==t.dataset.delserie; });
        save(); render(); return;
      }
    });
  });
}

