/* ================= Démarrage ================= */

document.getElementById('nav').addEventListener('click', function(ev){
  var b=ev.target.closest('button'); if(!b) return;
  setView(b.dataset.view);
});
var brandLink=document.getElementById('brand-link');
if(brandLink) brandLink.addEventListener('click', function(ev){ ev.preventDefault(); setView('dashboard'); });

document.getElementById('btn-open').addEventListener('click', openDataFileAction);
document.getElementById('btn-save').addEventListener('click', saveToDir);
document.getElementById('btn-refresh').addEventListener('click', refreshFromDir);
var uname=document.getElementById('user-name');
if(uname){
  uname.value=currentUser();
  uname.addEventListener('change', function(){
    setCurrentUser(uname.value);
    var du=document.getElementById('d-user'); if(du) du.value=uname.value;
    updateFileBar();
  });
}
var gop=document.getElementById('g-op'), gaff=document.getElementById('g-aff');
if(gop) gop.addEventListener('change',function(){ state.ui.op=gop.value; state.ui.aff=''; save(); render(); });
if(gaff) gaff.addEventListener('change',function(){ state.ui.aff=gaff.value; save(); render(); });
var vsel=document.getElementById('ver-sel');
if(vsel) vsel.addEventListener('change', function(){
  if(this.value===''){ quitHist(); } else { enterHist(+this.value); }
});
var cmpsel=document.getElementById('cmp-sel');
if(cmpsel) cmpsel.addEventListener('change', function(){
  if(this.value===''){ quitCmp(); } else { enterCmp(this.value); }
});
var bhq=document.getElementById('btn-hquit');
if(bhq) bhq.addEventListener('click', quitHist);
var bhr=document.getElementById('btn-hrestore');
if(bhr) bhr.addEventListener('click', restoreVersion);
window.addEventListener('beforeunload', function(ev){
  if(dataDirty && DATAFILE.handle && DATAFILE.loaded){ ev.preventDefault(); ev.returnValue=''; }
});
window.addEventListener('error', function(ev){
  var st=document.getElementById('file-status');
  if(!st) return;
  var msg=String((ev&&ev.message)||(ev&&ev.error)||'erreur inconnue');
  try{
    st.classList.remove('ok');
    st.innerHTML='<span class="dot"></span>Erreur interne : '+esc(msg)+' — détail dans la console (F12).';
  }catch(e2){}
});

function bootError(e){
  var host=document.getElementById('view-dashboard');
  if(!host) return;
  host.style.display='';
  host.innerHTML='<div class="card" style="border-color:#f3c8c8;background:var(--red-bg)">'+
    '<h2>Erreur au démarrage</h2>'+
    '<p style="margin:0;white-space:pre-wrap;font-family:monospace;font-size:12px">'+esc(String((e&&e.stack)||e))+'</p>'+
    '<p class="hint">Les données de ce navigateur ne sont pas perdues : exportez-en une copie pour diagnostic, ou réinitialisez-les.</p>'+
    '<div class="formrow">'+
    '<button class="btn" id="boot-export">Exporter les données brutes (JSON)</button>'+
    '<button class="btn danger" id="boot-reset">Réinitialiser les données</button></div></div>';
  var ex=document.getElementById('boot-export');
  if(ex) ex.addEventListener('click', function(){
    try{ download('cosi2-donnees-brutes.json', String(localStorage.getItem(LS_KEY)||'{}'), 'application/json'); }catch(e2){}
  });
  var rs=document.getElementById('boot-reset');
  if(rs) rs.addEventListener('click', function(){
    if(!confirm('Effacer les données de ce navigateur et recharger le jeu de démonstration ?')) return;
    try{ localStorage.removeItem(LS_KEY); }catch(e2){}
    location.reload();
  });
}

/* Sélecteurs de mois custom : le bouton ▾ ouvre le calendrier mensuel */
document.addEventListener('click', function(ev){
  var mb=ev.target&&ev.target.closest?ev.target.closest('.month-btn'):null;
  if(!mb) return;
  var wrap=mb.closest('.month-wrap');
  var input=wrap?wrap.querySelector('input'):null;
  if(input) openMonthPicker(input);
});

/* Liens des alertes : amènent sur l'onglet (et la colonne / affaire) où traiter */
document.addEventListener('click', function(ev){
  var b=ev.target&&ev.target.closest?ev.target.closest('button[data-goto]'):null;
  if(!b) return;
  state.ui.view=b.dataset.goto;
  if(b.dataset.col) state.ui.focusCol=b.dataset.col;
  if(b.dataset.aff){ var af2=affaireById(b.dataset.aff); if(af2){ state.ui.aff=af2.id; state.ui.op=af2.opId; } }
  save(); render();
});

try{
  load();
  render();
  updateFileBar();
  initDataFile();
}catch(e){
  try{ bootError(e); }catch(e2){}
}

})();
