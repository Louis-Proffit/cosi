/* Build : compile les sources src/ en UN SEUL fichier HTML autonome.
   - par défaut : dist/index.html (CSS DSFR @gouvfr/dsfr + app.css + blocs JS inline)
   - options : --watch (rebuild auto à chaque modif de src/), --no-dsfr, --out <fichier>
   Usage : npm run build | npm run watch | node build.js --watch */
const fs = require('fs');
const path = require('path');
const root = __dirname;

function readIf(p) { try { return fs.readFileSync(p, 'utf8'); } catch (e) { return null; } }

function build() {
  const args = process.argv.slice(2);
  const noDsfr = args.indexOf('--no-dsfr') >= 0;

  /* --- CSS : DSFR d'abord, puis le CSS applicatif (qui prime) --- */
  const cssParts = [];
  if (!noDsfr) {
    const dsfrCss = readIf(path.join(root, 'node_modules/@gouvfr/dsfr/dist/dsfr.min.css'));
    if (dsfrCss) cssParts.push('/* ===== @gouvfr/dsfr (design system de l\'État) ===== */\n' + dsfrCss);
    const dsfrUtil = readIf(path.join(root, 'node_modules/@gouvfr/dsfr/dist/utility/utility.min.css'));
    if (dsfrUtil) cssParts.push('/* ===== @gouvfr/dsfr utility ===== */\n' + dsfrUtil);
  }
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
  return out;
}

function writeAll(out, outFile) {
  const args = process.argv.slice(2);
  const outIdx = args.indexOf('--out');
  const dest = outFile || (outIdx >= 0 ? path.join(root, args[outIdx + 1]) : path.join(root, 'dist/index.html'));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, out);
  const rel = path.relative(root, dest);
  console.log('build OK -> ' + rel +
    '  (' + out.length + ' cars ; ' + fs.readdirSync(path.join(root, 'src/js')).filter(f => f.endsWith('.js')).length + ' blocs JS' +
    (args.indexOf('--no-dsfr') >= 0 ? ' ; sans DSFR' : ' ; DSFR inline') + ')');
}

const args = process.argv.slice(2);
if (args.indexOf('--watch') >= 0) {
  // watch : rebuild à chaque modification de src/ (template, css, js)
  writeAll(build());
  const targets = [path.join(root, 'src/template.html'), path.join(root, 'src/css'), path.join(root, 'src/js')];
  let timer = null;
  const rebuild = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try { writeAll(build()); } catch (e) { console.error('[watch] rebuild KO :', e.message); }
    }, 250);
  };
  targets.forEach(t => {
    try { fs.watch(t, { recursive: fs.statSync(t).isDirectory() }, rebuild); }
    catch (e) { try { fs.watch(t, rebuild); } catch (e2) { console.error('[watch] impossible de surveiller', t, e2.message); } }
  });
  console.log('watch actif : toute modif de src/ régénère dist/index.html (Ctrl+C pour arrêter)');
} else {
  writeAll(build());
}
