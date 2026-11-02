# COSI — gestion prévisionnelle des opérations

Application web **autonome** (un seul fichier HTML compilé) pour suivre les opérations
et leurs affaires : engagements juridiques (EJ), consommations de paiements (CP),
risques & aléas, révisions de prix, réalisé, et « GP à saisir ».

- **Build** : `npm run build` → `dist/index.html` (DSFR + CSS + JS inlinés, ouvrable
  directement dans Chrome/Edge).
- **Watch** : `npm run watch` (ou `npm run dev`) — rebuild auto à chaque modif de `src/`.
- **Tests** : `npm test` — build + harnais headless (`test/run-tests.js`, ~450 assertions).

## Architecture

```
src/template.html      squelette HTML (header DSFR, sections des onglets)
src/css/app.css        styles applicatifs (par-dessus @gouvfr/dsfr)
src/js/00..23-*.js     blocs JS concaténés dans l'ordre alphabétique, un seul IIFE
build.js               compile src/ → dist/index.html (unique sortie)
test/run-tests.js      harnais de tests headless (stubs DOM + eval du script buildé)
```

État global `state` (modèle de données) + `state.ui` (vue courante, filtres, options,
préférences d'affichage), persisté en `localStorage` et dans un **dossier partagé**
(champ `data/` ignoré par git).

## Modèle de données (format `cosi2-donnees`, version 3)

Chaque sauvegarde écrit un **nouveau fichier** `cosi2-donnees-<timestamp>-<utilisateur>.json`
dans le dossier connecté (File System Access API) ; l'historique = la liste de ces fichiers.
Un fichier = `{ format, version, enregistre, auteur, donnees: { indices, versions[] } }`,
chaque version contenant `operations`, `affaires`, `ejs`, `cps`, `profils`, `realise`,
`revisions`, `revisionsCalc`.

- **Opération** : `id`, `numero` (nombres), `nom`, `description`.
- **Affaire** : `id`, `opId` (rattachement déplaçable), `nom`, `titulaire`, `refContrat`,
  `dateRefRev` (mois de référence des révisions, « AAAA-MM »), `formule` (formule d'indice).
- **EJ** (engagement juridique) : `id`, `affaireId`, `numero`, `libelle`, `mois`, `montant`,
  `stade` : `prog` (programmé) | `engage` (matérialisé) | `alea` | `risque`.
  - *Aléa* : forfaitaire — `aleaPct` (% du reste à payer, défaut 5 %) ou `montantExplicite`.
  - *Risque* : distribution du montant (`distType` fixe/uniforme/triangulaire/gaussienne,
    `distA/B/C`), `probabilite`, date d'apparition (`dateType` ponctuelle/récurrente/uniforme,
    `dateA/B`, `freq`).
- **CP** : `cps["<ejId>|<AAAA-MM>"] = montant`. Profils (`profils[ejId]`) : `ponctuelle`,
  `uniforme` (début–fin), `perso` (saisie libre mois par mois). **Pas de CP avant le mois de l'EJ**.
- **Réalisé** : `realise["<affId>|<AAAA-MM>"] = { ej, cp }` — saisi à 0 = constatation « rien »,
  distinct de « non saisi » (alerte sur les mois révolus non saisis, depuis la date de réf.
  de l'affaire la plus ancienne).
- **Indices** : séries nommées, valeurs par mois (`valeurs["AAAA-MM"]`) ; référencées par
  `{NOM}` et `{NOM_0}` (valeur au mois de référence) dans les formules.

## Notions et mise en œuvre

- **Reste à payer** d'une affaire à un mois = EJ matérialisés cumulés − CP consommés cumulés
  des mêmes EJ (aléas/risques exclus des deux côtés) ; finit à 0.
- **Révisions de prix (RP)** d'un mois = base CP × (I/I₀ − 1), I = indice applicable
  (formule de l'affaire), I₀ = indice à `dateRefRev`. Base CP = **CP réalisé saisi** s'il est
  entré (même à 0), sinon la **somme des CP du mois sur EJ + risques + aléas**. Formule
  par défaut `{c}*({i}/{i0}-1)` (`{c}` = base CP), modifiable par affaire (`revisions`).
- **GP à saisir** : synthèse EJ/CP par mois et par affaire/opération, avec 4 options
  cumulables : « RP en décembre seulement », « Pas de CP en décembre », « Pas de CP en janvier »,
  « Aléa et risque en décembre ». Dès qu'un réalisé est saisi pour un mois, il a priorité
  (mois passés et mois en cours) ; les cellules concernées sont grisées (`gp-real`).
- **Tableau de bord** : KPIs à date, courbes cumulées (EJ en escalier le 1er jour du mois,
  CP lisses du 1er au dernier jour, reste à payer = EJ − CP, ligne verticale « aujourd'hui »,
  points cliquables avec détail du calcul par courbe), entonnoir hypothèse basse/haute,
  barres mensuelles EJ/CP, filtre de période début/fin, alertes avec lien « Traiter ».
- **Alertes** : cohérence EJ vs Σ CP, risques passés non matérialisés, écarts réalisé
  (retard/avance) sur mois écoulés, réalisé non saisi sur mois révolus. Chaque alerte a un
  lien vers l'onglet/colonne où la traiter.
- **Plage de dates** : jamais de mois avant la date de réf. de l'affaire la plus ancienne
  (plancher) ; boutons « −12 mois avant / ＋12 mois après » et « replier » pour ouvrir/retirer
  des lignes dans le passé (jusqu'au plancher) et le futur.

## Onglets

Sur la branche courante (`onglet-affaire-unique`) :

| Onglet | Rôle |
|---|---|
| **Tableau de bord** | KPIs, courbes, entonnoir, alertes, période |
| **Opérations & affaires** | 2 tableaux copiables/collables depuis Excel (TSV), cartes d'ajout séparées, « Toutes les opérations » |
| **Affaire (détail)** | **un seul tableau, une seule affaire à la fois** : 1 colonne par EJ (Σ EJ juste après), par aléa, par risque (écoulement des CP en cellule), puis Indice I/I₀, RP, Synthèses EJ/CP, réalisé EJ/CP, GP EJ/CP (4 options), écarts, statut, actions ; pied de colonne pour tout sauf l'indice ; chiffres calculés cliquables (détail du calcul) ; fiches EJ et popups risque/aléa ; + EJ / + Risque / + Aléa ; liens vers Structure et Indices |
| **Indices** | séries en tableau (mois en lignes), collage Excel |
| **Données** | dossier de versions (JSON), copie locale, export JSON, **export Excel (.xlsx)** (un onglet par type de données + onglet « Tableau de bord » avec graphique en courbes référencé sur les cellules), jeu de démonstration |

(Sur `main`, les 5 onglets Risques & aléas / Consommation CP / Révisions de prix / Réalisé /
GP à saisir existent séparément ; la branche `onglet-affaire-unique` les a fusionnés dans
l'onglet « Affaire ».)

Filtres **Opération / Affaire** dans la barre de chaque onglet pertinent (avec « Toutes les
opérations » / « Toutes les affaires »), synchronisés entre onglets.

## Design

Charte **DSFR** (`@gouvfr/dsfr` inliné au build) : header sans logo, boutons/titres/infobulles
uniformisés (tooltips stylés via `title`), tableaux à colonnes redimensionnables (poignées en
bord d'en-tête, largeurs persistées), popups au-dessus du header (z-index 4000).

## Tests

`npm test` : build puis `node test/run-tests.js` — stubs DOM événementiels, injection du code
dans le harnais, ~450 assertions (modèle, calculs RP/reste à payer/alertes, vues, popups,
filtres, exports, branche unifiée). Couvrir une régression = ajouter une assertion ici.
