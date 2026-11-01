/* Découpe index-2.html (fichier unique historique) en sources sous src/ :
   - src/template.html : squelette HTML avec placeholders <!--APP_CSS--> / <!--APP_JS-->
   - src/css/app.css   : les blocs <style> existants
   - src/js/NN-*.js    : le <script> découpé aux titres de section "==== ... ===="
   Vérifie que la concaténation des blocs JS == script d'origine (aucun changement sémantique).
   Usage : node tools/split-src.js [index-2.html] */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const src = process.argv[2] || path.join(root, 'index-2.html');
const lines = fs.readFileSync(src, 'utf8').split('\n');

/* --- repère les blocs <style> et <script> --- */
const styleIdx = [], scriptIdx = [];
lines.forEach((l, i) => {
  if (l === '<style>') styleIdx.push(i);
  if (l === '</style>') styleIdx.push(i);
  if (l === '<script>') scriptIdx.push(i);
  if (l === '</script>') scriptIdx.push(i);
});
if (styleIdx.length !== 4 || scriptIdx.length !== 2) throw new Error('structure html inattendue: ' + JSON.stringify({ styleIdx, scriptIdx }));
const [st0, st1, st2, st3] = styleIdx;
const [sc0, sc1] = scriptIdx;

/* --- CSS : concatène le contenu des blocs <style> --- */
const css = lines.slice(st0 + 1, st1).join('\n') + '\n' + lines.slice(st2 + 1, st3).join('\n');

/* --- template HTML --- */
const tpl = []
  .concat(lines.slice(0, st0))
  .concat(['<!--APP_CSS-->'])
  .concat(lines.slice(st3 + 1, sc0))
  .concat(['<script>', '<!--APP_JS-->', '</script>'])
  .concat(lines.slice(sc1 + 1))
  .join('\n');

/* --- JS : découpe aux titres de section de niveau 5 (==== ... ====) --- */
const jsLines = lines.slice(sc0 + 1, sc1); // inclut (function(){ ... })();
const headerRe = /^\/\* ={5,}.*={5,} \*\/$/;
const heads = [];
jsLines.forEach((l, i) => { if (headerRe.test(l)) heads.push(i); });
function slug(s) {
  return s.replace(/^\/\* =+\s*/, '').replace(/\s*=*\s*\*\/$/, '')
    .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'section';
}
const blocks = [];
let prev = 0;
heads.forEach((h, k) => {
  if (h > prev) blocks.push({ name: String(k).padStart(2, '0') + '-' + slug(jsLines[h]), from: prev, to: h });
  prev = h;
});
// dernier bloc : du dernier titre à la fin ; et le tout début (avant le 1er titre) -> 00-boot
blocks.push({ name: String(heads.length).padStart(2, '0') + '-' + (heads.length ? slug(jsLines[heads[heads.length - 1]]) : 'boot'), from: prev, to: jsLines.length });
const boot = { name: '00-boot', from: 0, to: heads.length ? heads[0] : jsLines.length };
const all = [boot].concat(heads.map((h, k) => ({ name: String(k + 1).padStart(2, '0') + '-' + slug(jsLines[h]), from: h, to: k + 1 < heads.length ? heads[k + 1] : jsLines.length })));

/* --- écrit les fichiers --- */
fs.mkdirSync(path.join(root, 'src', 'css'), { recursive: true });
fs.mkdirSync(path.join(root, 'src', 'js'), { recursive: true });
fs.writeFileSync(path.join(root, 'src', 'template.html'), tpl);
fs.writeFileSync(path.join(root, 'src', 'css', 'app.css'), css);
let rebuilt = [];
all.forEach(b => {
  const txt = jsLines.slice(b.from, b.to).join('\n');
  fs.writeFileSync(path.join(root, 'src', 'js', b.name + '.js'), txt + '\n');
  rebuilt.push(txt);
});
const orig = jsLines.join('\n');
if (rebuilt.join('\n') + '\n' !== orig + '\n' && rebuilt.join('\n') !== orig) {
  // tolérance: le découpage ajoute une ligne vide entre blocs -> on compare sans les fins de bloc
  if (rebuilt.join('\n').replace(/\n+$/, '') !== orig.replace(/\n+$/, '')) throw new Error('vérification échouée: la concaténation des blocs != script original');
}
console.log('split OK: ' + all.length + ' blocs JS, template + app.css écrits dans src/');
all.forEach(b => console.log('  src/js/' + b.name + '.js  (' + (b.to - b.from) + ' lignes)'));
