/* ================= Vue : Données ================= */

function renderDonnees(){
  var sup=fsSupported();
  var h='<div class="card"><h2>Dossier de versions (JSON)</h2>'+
    '<p class="hint">Toutes les données vivent dans un <strong>dossier choisi sur votre poste</strong> (lecteur réseau, dossier partagé…) : l\'application liste les fichiers <strong>JSON de format compatible</strong> (<code>format: "cosi2-donnees"</code>) du dossier. <strong>Chaque sauvegarde écrit un NOUVEAU fichier</strong> — rien n\'est jamais écrasé : nom <code>cosi2-donnees-&lt;timestamp&gt;-&lt;utilisateur&gt;.json</code>, avec votre nom (champ « Utilisateur » en en-tête) dans le nom du fichier et dans le champ <code>auteur</code> du JSON. La liste des versions (sélecteur en en-tête, historique, comparaison) est simplement la liste de ces fichiers, triée par date. Pensez à <strong>Actualiser</strong> avant de saisir (dernier fichier = état courant) et à <strong>Sauvegarder</strong> ensuite. L\'onglet actif et les sélections restent propres à chaque navigateur.</p>'+
    (cmpVer()?'<p class="hint">Mode comparaison actif : version '+(cmpIdx()+1)+' du '+fmtDateVer(cmpVer().date)+' affichée en regard des données courantes dans les onglets (donnée courante = donnée ancienne + écart).</p>':'');
  if(sup){
    h+='<div class="formrow">'+
      '<label class="fld">Utilisateur<input type="text" id="d-user" value="'+esc(currentUser())+'" placeholder="votre nom" title="Votre nom : repris dans le nom de chaque fichier de sauvegarde et dans le champ « auteur »"></label>'+
      '<button class="btn" id="d-open">'+(DATAFILE.handle?'Changer de dossier…':'Connecter un dossier…')+'</button>'+
      '<button class="btn" id="d-saveas">Exporter une copie (fichier JSON)…</button>'+
      '<button class="btn primary" id="d-save" title="Écrit un nouveau fichier cosi2-donnees-<timestamp>-<utilisateur>.json dans le dossier">Sauvegarder (nouveau fichier)</button>'+
      '<button class="btn" id="d-refresh">Actualiser (dernier fichier)</button>'+
      '</div>'+
      '<p class="hint" id="d-fileinfo"></p>';
  } else {
    h+='<p class="hint">Ce navigateur ne permet pas l\'accès direct aux dossiers (l\'application fonctionne avec Chrome ou Edge). En attendant, utilisez la copie locale ci-dessous : exporter, déposer le fichier dans le dossier partagé, puis importer chez l\'autre poste.</p>';
  }
  h+='</div>';

  h+='<div class="card"><h2>Copie locale (ce navigateur)</h2>'+
    '<p class="hint">Les données sont aussi enregistrées automatiquement dans le stockage local de ce navigateur — c\'est une copie de secours, elle est écrasée à chaque chargement du dossier de versions. L\'export produit un fichier JSON au format des sauvegardes (état courant figé en dernière version, travail non enregistré inclus) : déposez-le dans le dossier partagé pour y ajouter une version ; l\'import accepte ce format ainsi que les anciennes sauvegardes multi-versions.</p>'+
    '<div class="formrow">'+
    '<button class="btn" id="d-export">Exporter la copie (JSON)</button>'+
    '<label class="btn" style="display:inline-block">Importer un fichier de sauvegarde…<input type="file" id="d-import" accept=".json,application/json" style="display:none"></label>'+
    '<button class="btn" id="d-demo">Charger le jeu de démonstration</button>'+
    '<button class="btn danger" id="d-clear">Tout effacer</button>'+
    '</div></div>';

  h+='<div class="card"><h2>Modèle</h2>'+
    '<p class="hint">Une <strong>opération</strong> regroupe des <strong>affaires</strong> ; chaque affaire est soldée par des <strong>EJ</strong> (engagements juridiques), chacun à un <strong>stade</strong> : <strong>EJ programmé</strong> ou <strong>engagé</strong> (risque/aléa matérialisé, à date fixée), <strong>aléa</strong> (part forfaitaire — par défaut 5 % du reste à payer de l\'affaire, modifiable) ou <strong>risque</strong> (montant selon une distribution, probabilité, date d\'apparition ponctuelle / récurrente / uniforme). Chaque EJ a un <strong>profil de consommation des CP</strong> : ponctuelle, uniforme sur une période (la date de l\'EJ — choisie à la matérialisation d\'un risque — peut servir de début) ou personnalisée. Les <strong>révisions de prix</strong> sont propres à chaque affaire et combinent les <strong>séries d\'indices</strong> (onglet « Indices ») selon sa formule d\'indice. L\'onglet <strong>Réalisé</strong> saisit, par affaire et par mois passé, l\'EJ et le CP effectivement constatés ; la <strong>GP à saisir</strong> agrège par affaire et par opération les montants prévisionnels d\'EJ et de CP par mois (EJ/CP engagés, aléas, risques, révisions, réalisé), et le <strong>tableau de bord</strong> montre l\'entonnoir des montants de l\'opération dans le temps, les CP prévus/réalisés, les risques en cours, les prochains EJ et les alertes de cohérence avec le réalisé.</p>'+
    '<p class="hint">Format du fichier JSON (les mois sont « AAAA-MM ») :</p>'+
            '<pre style="background:#f6f8fa;border:1px solid var(--line);border-radius:8px;padding:10px;overflow:auto;font-size:11px">' +
    '{\n' +
    '  "format": "cosi2-donnees", "version": 3, "enregistre": "2026-10-31T18:11:47.236Z", "auteur": "louis",\n' +
    '  "donnees": {\n' +
    '    "indices":  [ { "id", "nom", "valeurs": { "AAAA-MM": valeur } } ],\n' +
    '    "versions": [\n' +
    '      { "id", "date", "sig",\n' +
    '        "operations":   [ { "id", "nom", "description" } ],\n' +
    '        "affaires":     [ { "id", "opId", "nom", "titulaire", "refContrat",\n' +
    '                            "montantInitial" (EJ initial), "dateRefRev" (AAAA-MM),\n' +
    '                            "formule" (indice ; la RP en découle : {e}*({i}/{i0}-1)) } ],\n' +
    '        "ejs":          [ { "id", "affaireId", "numero", "libelle", "mois", "montant",\n' +
    '                            "stade": "prog"|"alea"|"risque"|"engage",\n' +
    '                            "aleaPct?", "montantExplicite?",            (aléa)\n' +
    '                            "distType?", "distA?", "distB?", "distC?", "probabilite?",\n' +
    '                            "dateType?", "dateA?", "dateB?", "freq?" }  (risque) ],\n' +
    '        "cps":            { "ejId|AAAA-MM": montant },\n' +
    '        "profils":        { "ejId": { "type": "ponctuelle"|"uniforme"|"perso", "debut", "fin" } },\n' +
    '        "realise":        { "affaireId|AAAA-MM": { "ej": n, "cp": n } },\n' +
    '        "revisions":      { "affaireId|AAAA-MM": montantOuFormule },\n' +
    '        "revisionsCalc":  { "affaireId|AAAA-MM": revisionCalculee } }\n' +
    '    ]\n' +
    '  }\n' +
    '}\n' +
    '</pre>'+
    '<p class="hint">Un dossier = un historique : <strong>chaque sauvegarde y dépose un nouveau fichier</strong> <code>cosi2-donnees-&lt;AAAA-MM-JJTHH-MM-SS&gt;-&lt;utilisateur&gt;.json</code> contenant une seule version (l\'état à ce moment) ; les anciens fichiers restent en place. Le sélecteur de versions en en-tête liste tous les fichiers compatibles du dossier.</p></div>';

  mount('view-donnees', h, function(w){
    var fi=w.querySelector('#d-fileinfo');
    if(fi){
      if(DATAFILE.handle){
        var nb=(DATAFILE.files||[]).length;
        fi.textContent='Dossier connecté : «'+DATAFILE.name+'» — '+nb+' fichier(s) de versions ('+state.versions.length+' version(s))'+(dataDirty?' — modifications non enregistrées.':' — à jour.');
      } else {
        fi.textContent='Aucun dossier connecté : les données restent dans ce navigateur.';
      }
    }
    var du=w.querySelector('#d-user');
    if(du) du.addEventListener('change',function(){ setCurrentUser(du.value); var un=document.getElementById('user-name'); if(un) un.value=du.value; });
    var bo=w.querySelector('#d-open'); if(bo) bo.addEventListener('click', openDataFileAction);
    var bs=w.querySelector('#d-saveas'); if(bs) bs.addEventListener('click', saveAsFile);
    var bg=w.querySelector('#d-save'); if(bg) bg.addEventListener('click', saveToDir);
    var br=w.querySelector('#d-refresh'); if(br) br.addEventListener('click', refreshFromDir);
    w.querySelector('#d-export').addEventListener('click',function(){
      download('cosi2-donnees-'+curMois()+'.json', JSON.stringify(exportPayload(),null,2), 'application/json');
    });
    w.querySelector('#d-demo').addEventListener('click',function(){
      if(!confirm('Remplacer les données actuelles par le jeu de démonstration ?')) return;
      var v=state.ui.view; state=demoState(); state.ui.view=v; save(); render();
    });
    w.querySelector('#d-clear').addEventListener('click',function(){
      if(!confirm('Effacer définitivement toutes les données ?')) return;
      var v=state.ui.view; state=defaultState(); state.ui.view=v; save(); render();
    });
    w.querySelector('#d-import').addEventListener('change',function(ev){
      var f=ev.target.files[0]; if(!f) return;
      var rd=new FileReader();
      rd.onload=function(){
        try{
          state=repairState(applyDataPayload(JSON.parse(rd.result)));
          save(); render();
        }catch(e){ alert('Fichier invalide : '+e.message); }
      };
      rd.readAsText(f);
    });
  });
}

