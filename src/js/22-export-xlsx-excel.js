/* ================= Export Excel (.xlsx) ================= */
/* Générateur XLSX autonome (aucune dépendance externe) : un ZIP à entrées
   stockées (sans compression) contenant les parties OOXML. Un onglet par type
   de données + un onglet "Tableau de bord" qui reprend les données des courbes
   (EJ cumulés, CP cumulés, reste à payer, hypothèses moyenne/haute, par mois)
   avec un VRAI graphique Excel (courbes en lignes) dont chaque série référence
   directement les cellules de l'onglet ('Tableau de bord'!$B$2:$B$26…). */

function xmlEsc(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}
/* Nom de colonne Excel : 1 -> A, 26 -> Z, 27 -> AA, 28 -> AB… */
function colName(n){
  var s='';
  while(n>0){ var r=(n-1)%26; s=String.fromCharCode(65+r)+s; n=Math.floor((n-1)/26); }
  return s;
}

/* ---- CRC32 (table) ---- */
var CRC_T=null;
function crc32(bytes){
  if(!CRC_T){
    CRC_T=new Uint32Array(256);
    for(var i=0;i<256;i++){ var c=i; for(var k=0;k<8;k++) c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1); CRC_T[i]=c>>>0; }
  }
  var c=0xFFFFFFFF;
  for(var j=0;j<bytes.length;j++) c=CRC_T[(c^bytes[j])&0xFF]^(c>>>8);
  return (c^0xFFFFFFFF)>>>0;
}

/* ---- ZIP à entrées stockées (méthode 0) : entrée = {name, data(string|Uint8Array)} ---- */
function zipStore(entries){
  var enc=new TextEncoder(), parts=[], central=[], offset=0;
  entries.forEach(function(e){
    var nameB=enc.encode(e.name);
    var dataB=(typeof e.data==='string')?enc.encode(e.data):e.data;
    var crc=crc32(dataB);
    var lh=new Uint8Array(30+nameB.length), dv=new DataView(lh.buffer);
    dv.setUint32(0,0x04034b50,true); dv.setUint16(4,20,true); dv.setUint16(6,0x0800,true); /* UTF-8 */
    dv.setUint16(8,0,true); dv.setUint16(10,0,true); dv.setUint16(12,0x21,true);
    dv.setUint32(14,crc,true); dv.setUint32(18,dataB.length,true); dv.setUint32(22,dataB.length,true);
    dv.setUint16(26,nameB.length,true); dv.setUint16(28,0,true);
    lh.set(nameB,30);
    parts.push(lh,dataB);
    var ch=new Uint8Array(46+nameB.length), cv=new DataView(ch.buffer);
    cv.setUint32(0,0x02014b50,true); cv.setUint16(4,20,true); cv.setUint16(6,20,true);
    cv.setUint16(8,0x0800,true); cv.setUint16(10,0,true); cv.setUint16(12,0,true); cv.setUint16(14,0x21,true);
    cv.setUint32(16,crc,true); cv.setUint32(20,dataB.length,true); cv.setUint32(24,dataB.length,true);
    cv.setUint16(28,nameB.length,true);
    cv.setUint32(42,offset,true);
    ch.set(nameB,46);
    central.push(ch);
    offset+=30+nameB.length+dataB.length;
  });
  var cdSize=0; central.forEach(function(c){ cdSize+=c.length; });
  var end=new Uint8Array(22), ev=new DataView(end.buffer);
  ev.setUint32(0,0x06054b50,true);
  ev.setUint16(8,entries.length,true); ev.setUint16(10,entries.length,true);
  ev.setUint32(12,cdSize,true); ev.setUint32(16,offset,true);
  var out=new Uint8Array(offset+cdSize+22), p=0;
  parts.forEach(function(x){ out.set(x,p); p+=x.length; });
  central.forEach(function(x){ out.set(x,p); p+=x.length; });
  out.set(end,p);
  return out;
}

/* ---- Cellule / feuille OOXML ---- */
function xcell(ref, v, s){
  if(v==null||v==='') return '';
  if(typeof v==='number'){
    if(!isFinite(v)) return '';
    return '<c r="'+ref+'"'+(s?' s="'+s+'"':'')+'><v>'+v+'</v></c>';
  }
  return '<c r="'+ref+'" t="inlineStr"'+(s?' s="'+s+'"':'')+'><is><t xml:space="preserve">'+xmlEsc(v)+'</t></is></c>';
}
/* rows = tableau de tableaux (string -> inlineStr, number -> <v>) ; ligne 0 = en-tête (style 1), nombres = style 2 */
function sheetXML(rows, withDrawing){
  var maxC=1;
  rows.forEach(function(r){ if(r.length>maxC) maxC=r.length; });
  var out=['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'+
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
    '<dimension ref="A1:'+colName(maxC)+rows.length+'"/>',
    '<sheetViews><sheetView workbookViewId="0"/></sheetViews>',
    '<sheetFormatPr defaultRowHeight="15"/>',
    '<sheetData>'];
  rows.forEach(function(r,ri){
    var cells='';
    for(var ci=0;ci<r.length;ci++){
      var v=r[ci], s=(ri===0)?1:(typeof v==='number'?2:0);
      cells+=xcell(colName(ci+1)+(ri+1), v, s);
    }
    out.push('<row r="'+(ri+1)+'">'+cells+'</row>');
  });
  out.push('</sheetData>');
  if(withDrawing) out.push('<drawing r:id="rId1"/>');
  out.push('</worksheet>');
  return out.join('');
}

/* ---- Séries du tableau de bord (même calcul que chartEntonnoir, période complète) ---- */
function dashSeries(){
  var ejs=state.ejs, from=null, to=null;
  ejs.forEach(function(e){
    if(!from||e.mois<from) from=e.mois;
    occOf(e).forEach(function(o){ if(!from||o.m<from) from=o.m; if(!to||o.m>to) to=o.m; });
    if(!to||e.mois>to) to=e.mois;
  });
  for(var k in state.cps){ var p=k.split('|'); if(ejs.some(function(e){ return e.id===p[0]; }) && (!to||p[1]>to)) to=p[1]; }
  if(!from) from=to||curMois();
  if(!to||to<from) to=from;
  var months=mRange(from,to);
  var mat=ejs.filter(isMaterialise), aleas=ejs.filter(isAlea), risques=ejs.filter(isRisque);
  var ej=[], cp=[], rap=[], att=[], mx=[], cpC=0;
  months.forEach(function(m){
    var b=0,a=0,rF=0,rP=0,cpM=0;
    mat.forEach(function(e){ if(e.mois<=m){ b+=montantOf(e); cpM+=cpPrevu(e,m); } });
    aleas.forEach(function(e){ a+=montantOf(e)*cumOcc(e,m); });
    risques.forEach(function(e){ rF+=montantHaut(e)*cumOcc(e,m); rP+=risquePondere(e)*cumOcc(e,m); });
    cpC+=cpM;
    ej.push(Math.round(b*100)/100); cp.push(Math.round(cpC*100)/100);
    rap.push(Math.round((b-cpC)*100)/100);
    att.push(Math.round((b+a+rP)*100)/100); mx.push(Math.round((b+a+rF)*100)/100);
  });
  return {months:months, ej:ej, cp:cp, rap:rap, att:att, mx:mx};
}

/* ---- Définition des onglets : un par type de données + Tableau de bord ---- */
function xlsxSheetDefs(){
  var defs=[], r2=function(v){ return Math.round((+v||0)*100)/100; };
  defs.push({name:'Opérations', rows:[['N°','Nom','Description']].concat(
    state.operations.map(function(o){ return [o.numero||'', o.nom||'', o.description||'']; }))});
  defs.push({name:'Affaires', rows:[['N° opération','Opération','Affaire','Titulaire','Réf. contrat','Date réf. révision','Formule d\'indice']].concat(
    state.affaires.map(function(a){ var o=opById(a.opId);
      return [(o&&o.numero)||'', (o&&o.nom)||'', a.nom||'', a.titulaire||'', a.refContrat||'', a.dateRefRev||'', a.formule||'']; }))});
  defs.push({name:'EJ', rows:[['Opération','Affaire','Numéro','Libellé','Stade','Mois','Montant (€)','Détail']].concat(
    state.ejs.map(function(e){ var a=affaireById(e.affaireId), o=a?opById(a.opId):null, d='';
      if(isAlea(e)) d='Aléa '+(e.aleaPct==null?5:e.aleaPct)+' %'+(e.montantExplicite?' (montant explicite)':' du reste à payer');
      if(isRisque(e)) d='Risque — dist. '+(e.distType||'fixe')+' A='+(e.distA||'')+' B='+(e.distB==null?'':e.distB)+' C='+(e.distC==null?'':e.distC)+
        ', proba '+(e.probabilite==null?100:e.probabilite)+' %, date '+(e.dateType||'ponctuelle')+(e.dateA?' '+e.dateA:'')+(e.dateB?'..'+e.dateB:'')+(e.freq?' (freq. '+e.freq+')':'');
      return [(o&&o.nom)||'', (a&&a.nom)||'', e.numero||'', e.libelle||'', stadeLabel(e), e.mois||'', r2(montantOf(e)), d]; }))});
  var cpKeys=Object.keys(state.cps).sort();
  defs.push({name:'CP', rows:[['Opération','Affaire','EJ n°','Libellé EJ','Mois','CP (€)','Profil']].concat(
    cpKeys.map(function(k){ var p=k.split('|'), e=ejById(p[0]), a=e?affaireById(e.affaireId):null, o=a?opById(a.opId):null, pr=state.profils[p[0]];
      return [(o&&o.nom)||'', (a&&a.nom)||'', (e&&e.numero)||p[0], (e&&e.libelle)||'', p[1], r2(state.cps[k]), pr?pr.type:'']; }))});
  defs.push({name:'Profils CP', rows:[['EJ n°','Libellé EJ','Affaire','Type','Début','Fin']].concat(
    state.ejs.map(function(e){ var p=state.profils[e.id]||{}; var a=affaireById(e.affaireId);
      return [e.numero||'', e.libelle||'', (a&&a.nom)||'', p.type||'', p.debut||'', p.fin||'']; }))});
  defs.push({name:'Aléas & risques', rows:[['Opération','Affaire','Numéro','Libellé','Type','% aléa','Montant / espérance (€)','Montant haut (€)','Pondéré (€)','Distribution','A','B','C','Probabilité %','Type de date','Date A','Date B','Fréquence']].concat(
    state.ejs.filter(function(e){ return isAlea(e)||isRisque(e); }).map(function(e){ var a=affaireById(e.affaireId), o=a?opById(a.opId):null;
      return [(o&&o.nom)||'', (a&&a.nom)||'', e.numero||'', e.libelle||'', isAlea(e)?'Aléa':'Risque',
        isAlea(e)?(e.aleaPct==null?5:e.aleaPct):'', r2(montantOf(e)), r2(montantHaut(e)), r2(risquePondere(e)),
        e.distType||'', e.distA==null?'':e.distA, e.distB==null?'':e.distB, e.distC==null?'':e.distC,
        e.probabilite==null?'':e.probabilite, e.dateType||'', e.dateA||'', e.dateB||'', e.freq==null?'':e.freq]; }))});
  var rlKeys=Object.keys(state.realise).sort();
  defs.push({name:'Réalisé', rows:[['Opération','Affaire','Mois','EJ réalisé (€)','CP réalisé (€)']].concat(
    rlKeys.map(function(k){ var p=k.split('|'), a=affaireById(p[0]), o=a?opById(a.opId):null, r=state.realise[k];
      return [(o&&o.nom)||'', (a&&a.nom)||'', p[1], r2(r&&r.ej), r2(r&&r.cp)]; }))});
  var rc=computeRevisionsCalc(state), rvKeys=Object.keys(rc).sort();
  defs.push({name:'Révisions de prix', rows:[['Opération','Affaire','Mois','Révision calculée (€)']].concat(
    rvKeys.map(function(k){ var p=k.split('|'), a=affaireById(p[0]), o=a?opById(a.opId):null;
      return [(o&&o.nom)||'', (a&&a.nom)||'', p[1], r2(rc[k])]; }))});
  var allM={}; state.indices.forEach(function(ix){ for(var m in ix.valeurs) allM[m]=1; });
  var ims=Object.keys(allM).sort();
  defs.push({name:'Indices', rows:[['Indice'].concat(ims)].concat(
    state.indices.map(function(ix){ return [ix.nom||''].concat(ims.map(function(m){ return ix.valeurs[m]==null?'':+ix.valeurs[m]; })); }))});
  var ds=dashSeries();
  defs.push({name:'Tableau de bord', chart:true, rows:[['Mois','EJ engagés cumulés (€)','CP prévus cumulés (€)','Reste à payer (€)','Hypothèse moyenne (€)','Hypothèse haute (€)']].concat(
    ds.months.map(function(m,i){ return [m, ds.ej[i], ds.cp[i], ds.rap[i], ds.att[i], ds.mx[i]]; }))});
  return defs;
}

/* ---- Graphique Excel (courbes en lignes) : les séries référencent les cellules de l'onglet ---- */
function chartXML(sheetName, nRows){
  var q="'"+String(sheetName).replace(/'/g,"''")+"'";
  var cols=['B','C','D','E','F'];
  var sers=cols.map(function(col,i){
    return '<c:ser><c:idx val="'+i+'"/><c:order val="'+i+'"/>'+
      '<c:tx><c:strRef><c:f>'+q+'!$'+col+'$1</c:f></c:strRef></c:tx>'+
      '<c:cat><c:strRef><c:f>'+q+'!$A$2:$A$'+nRows+'</c:f></c:strRef></c:cat>'+
      '<c:val><c:numRef><c:f>'+q+'!$'+col+'$2:$'+col+'$'+nRows+'</c:f></c:numRef></c:val>'+
      '</c:ser>';
  }).join('');
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'+
  '<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'+
  '<c:chart><c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr b="1"/></a:pPr><a:r><a:rPr lang="fr-FR" b="1"/><a:t>Courbes cumulées (tableau de bord)</a:t></a:r></a:p></c:rich></c:tx></c:title>'+
  '<c:autoTitleDeleted val="0"/>'+
  '<c:plotArea><c:layout/>'+
  '<c:lineChart><c:grouping val="standard"/><c:marker val="1"/>'+sers+'<c:axId val="111111111"/><c:axId val="222222222"/></c:lineChart>'+
  '<c:catAx><c:axId val="111111111"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/></c:catAx>'+
  '<c:valAx><c:axId val="222222222"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:numFmt formatCode="#,##0" sourceLinked="0"/></c:valAx>'+
  '</c:plotArea><c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart></c:chartSpace>';
}
function drawingXML(){
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'+
  '<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">'+
  '<xdr:twoCellAnchor><xdr:from><xdr:col>7</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>'+
  '<xdr:to><xdr:col>17</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>26</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>'+
  '<xdr:graphicFrame><xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="Courbes cumulées"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>'+
  '<xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>'+
  '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId1"/></a:graphicData></a:graphic>'+
  '</xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor></xdr:wsDr>';
}

/* ---- Classeur complet ---- */
function buildXLSX(){
  var defs=xlsxSheetDefs(), n=defs.length;
  var chartIdx=-1; defs.forEach(function(d,i){ if(d.chart) chartIdx=i; });
  var ct='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
    '<Default Extension="xml" ContentType="application/xml"/>'+
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+
    defs.map(function(d,i){ return '<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join('')+
    (chartIdx>=0?'<Override PartName="/xl/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>'+
      '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.spreadsheetDrawing+xml"/>':'')+
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'+
    '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>'+
    '</Types>';
  var rels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'+
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'+
    '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>'+
    '</Relationships>';
  var wb='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+
    defs.map(function(d,i){ return '<sheet name="'+xmlEsc(d.name)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>'; }).join('')+
    '</sheets></workbook>';
  var wbr='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
    defs.map(function(d,i){ return '<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>'; }).join('')+
    '<Relationship Id="rId'+(n+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'+
    '</Relationships>';
  var styles='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
    '<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts>'+
    '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'+
    '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>'+
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'+
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'+
    '<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'+
    '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>'+
    '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>'+
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
  var core='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:creator>COSI</dc:creator><cp:lastModifiedBy>COSI</cp:lastModifiedBy><dcterms:created xmlns:dcterms="http://purl.org/dc/terms/" xsi:type="dcterms:W3CDTF" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'+new Date().toISOString()+'</dcterms:created></cp:coreProperties>';
  var app='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>COSI</Application></Properties>';
  var entries=[
    {name:'[Content_Types].xml', data:ct},
    {name:'_rels/.rels', data:rels},
    {name:'xl/workbook.xml', data:wb},
    {name:'xl/_rels/workbook.xml.rels', data:wbr},
    {name:'xl/styles.xml', data:styles},
    {name:'docProps/core.xml', data:core},
    {name:'docProps/app.xml', data:app}
  ];
  defs.forEach(function(d,i){
    entries.push({name:'xl/worksheets/sheet'+(i+1)+'.xml', data:sheetXML(d.rows, i===chartIdx)});
    if(i===chartIdx){
      entries.push({name:'xl/worksheets/_rels/sheet'+(i+1)+'.xml.rels', data:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>'});
      entries.push({name:'xl/drawings/drawing1.xml', data:drawingXML()});
      entries.push({name:'xl/charts/chart1.xml', data:chartXML(d.name, d.rows.length)});
    }
  });
  return zipStore(entries);
}

function exportXLSX(){
  var b=buildXLSX();
  var iso=new Date().toISOString().replace(/[:.]/g,'-');
  download('cosi-export-'+iso+'.xlsx', b, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

