/* Build : compile les sources src/ en UN SEUL fichier HTML autonome dist/index.html
   (CSS DSFR @gouvfr/dsfr + CSS applicatif + tous les blocs JS inline, dans l'ordre).
   Usage : npm run build  (ou node build.js) */
const fs = require('fs');
const path = require('path');
const root = __dirname;

function readIf(p) { try { return fs.readFileSync(p, 'utf8'); } catch (e) { return null; } }

/* --- CSS : DSFR d'abord, puis le CSS applicatif (qui prime) --- */
const cssParts = [];
const dsfrCss = readIf(path.join(root, 'node_modules/@gouvfr/dsfr/dist/dsfr.min.css'));
if (dsfrCss) cssParts.push('/* ===== @gouvfr/dsfr (design system de l\'État) ===== */\n' + dsfrCss);
const dsfrUtil = readIf(path.join(root, 'node_modules/@gouvfr/dsfr/dist/utility/utility.min.css'));
if (dsfrUtil) cssParts.push('/* ===== @gouvfr/dsfr utility ===== */\n' + dsfrUtil);
const cssDir = path.join(root, 'src/css');
if (fs.existsSync(cssDir)) {
  fs.readdirSync(cssDir).sort().forEach(f => {
    if (f.endsWith('.css')) cssParts.push('/* ===== src/css/' + f + ' ===== */\n' + fs.readFileSync(path.join(cssDir, f), 'utf8'));
  });
}

/* --- JS : blocs src/js dans l'ordre alphabétique (préfixes 00..21) --- */
const jsParts = [];
const jsDir = path.join(root, 'src/js');
fs.readdirSync(jsDir).sort().forEach(f => {
  if (f.endsWith('.js')) jsParts.push('/* ===== src/js/' + f + ' ===== */\n' + fs.readFileSync(path.join(jsDir, f), 'utf8'));
});
if (!jsParts.length) throw new Error('aucun bloc JS dans src/js — lancez d\'abord : npm run split');

/* --- assemble le HTML --- */
const tpl = fs.readFileSync(path.join(root, 'src/template.html'), 'utf8');
let out = tpl.replace('<!--APP_CSS-->', () => '<style>\n' + cssParts.join('\n') + '\n</style>');
out = out.replace('<!--APP_JS-->', () => jsParts.join('\n'));
if (out.indexOf('<!--APP_CSS-->') >= 0 || out.indexOf('<!--APP_JS-->') >= 0) throw new Error('placeholder non remplacé');

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const dest = path.join(root, 'dist/index.html');
fs.writeFileSync(dest, out);
console.log('build OK -> ' + path.relative(root, dest) +
  '  (' + out.length + ' cars ; ' + jsParts.length + ' blocs JS ; ' + cssParts.length + ' parties CSS dont DSFR=' + !!dsfrCss + ')');
