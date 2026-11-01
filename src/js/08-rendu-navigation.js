/* ================= Rendu / navigation ================= */

var VIEWS=[['dashboard','Tableau de bord'],['structure','Opérations & affaires'],['risques','Risques & aléas'],['conso','Consommation CP'],['revisions','Révisions de prix'],['realise','Réalisé'],['gp','GP à saisir'],['indices','Indices'],['donnees','Données']];

function renderNav(){
  var nav=document.getElementById('nav'), cur=state.ui.view||'dashboard', h='<ul class="fr-nav__list">';
  VIEWS.forEach(function(v){
    h+='<li class="fr-nav__item"><button type="button" data-view="'+v[0]+'" class="fr-nav__link'+(cur===v[0]?' fr-nav__link--active':'')+'"'+(cur===v[0]?' aria-current="page"':'')+'>'+v[1]+'</button></li>';
  });
  nav.innerHTML=h+'</ul>';
}
function setView(v){ state.ui.view=v; save(); render(); }
/* Filtres globaux (en-tête) : opération + affaire, appliqués à toutes les vues */
var GFK='';
function renderFilters(){
  var opSel=document.getElementById('g-op'), affSel=document.getElementById('g-aff');
  if(!opSel||!affSel) return;
  var op=state.ui.op||'', aff=state.ui.aff||'';
  if(aff&&op){ var aa=affaireById(aff); if(!aa||aa.opId!==op){ aff=''; state.ui.aff=''; } }
  var key=op+'|'+aff+'|'+state.operations.length+'|'+state.affaires.length;
  if(key!==GFK){
    GFK=key;
    var oh='<option value="">Toutes les opérations</option>';
    state.operations.forEach(function(o){ oh+='<option value="'+o.id+'"'+(op===o.id?' selected':'')+'>'+esc(o.nom)+'</option>'; });
    opSel.innerHTML=oh;
    var as=scopedAffaires(op,'');
    var ah='<option value="">Toutes les affaires</option>';
    as.forEach(function(a){ ah+='<option value="'+a.id+'"'+(aff===a.id?' selected':'')+'>'+esc(a.nom)+'</option>'; });
    affSel.innerHTML=ah;
  }
  opSel.value=op; affSel.value=aff;
}
function viewError(view, e){
  var host=document.getElementById('view-'+view)||document.getElementById('view-dashboard');
  if(!host) return;
  host.style.display='';
  host.innerHTML='<div class="card" style="border-color:#f3c8c8;background:var(--red-bg)">'+
    '<h2>Cette vue n\'a pas pu être affichée</h2>'+
    '<p style="margin:0;white-space:pre-wrap;font-family:monospace;font-size:12px">'+esc(String((e&&e.stack)||e))+'</p>'+
    '<p class="hint">Les données sont conservées. Ouvrez la console (F12) pour le détail, exportez une sauvegarde depuis l\'onglet « Données », ou réinitialisez.</p></div>';
}
function render(){
  try{ recomputeProfils(state); }catch(e){}
  renderHistBanner();
  renderCmpBanner();
  renderNav();
  renderFilters();
  VIEWS.forEach(function(v){ var el=document.getElementById('view-'+v[0]); if(el) el.style.display=(state.ui.view===v[0])?'':'none'; });
  var r={dashboard:renderDashboard, risques:renderRisques, structure:renderStructure, conso:renderConso, gp:renderGp, revisions:renderRevisions, realise:renderRealise, indices:renderIndices, donnees:renderDonnees};
  var cur=state.ui.view||'dashboard';
  try{ (r[cur]||renderDashboard)(); }
  catch(e){ viewError(cur, e); }
}

