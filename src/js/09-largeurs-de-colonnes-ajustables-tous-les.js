/* ===== Largeurs de colonnes ajustables (tous les onglets) ===== */

function tableColMap(tb){
  var occ=[], map=[];
  for(var ri=0;ri<tb.rows.length;ri++){
    var row=tb.rows[ri]; occ[ri]=occ[ri]||[]; map[ri]=map[ri]||[];
    var c=0;
    for(var ci=0;ci<row.cells.length;ci++){
      var cell=row.cells[ci], rs=cell.rowSpan||1, cs=cell.colSpan||1;
      while(occ[ri][c]) c++;
      for(var k=0;k<cs;k++){
        for(var r2=0;r2<rs;r2++){ map[ri+r2]=map[ri+r2]||[]; map[ri+r2][c+k]=cell; }
        for(var r3=0;r3<rs;r3++){ occ[ri+r3]=occ[ri+r3]||[]; occ[ri+r3][c+k]=1; }
      }
      c+=cs;
    }
  }
  return map;
}
function applyColWidth(map, th, col, wpx){
  th.style.width=wpx+'px'; th.style.minWidth=wpx+'px';
  if((th.colSpan||1)>1) return;
  for(var ri=0;ri<map.length;ri++){
    var cell=map[ri][col];
    if(cell && cell!==th && (cell.colSpan||1)===1){ cell.style.width=wpx+'px'; cell.style.minWidth=wpx+'px'; }
  }
}
function addColHandle(tb, map, th, col){
  if(th.querySelector('.colrsz')) return;
  var h=document.createElement('div');
  h.className='colrsz';
  h.title='Glisser pour ajuster la largeur de la colonne';
  h.addEventListener('mousedown', function(ev){
    if(ev.button!==0) return;
    ev.preventDefault(); ev.stopPropagation();
    var x0=ev.clientX, w0=th.getBoundingClientRect().width;
    h.classList.add('drag');
    document.body.style.cursor='col-resize';
    function mv(e2){ applyColWidth(map, th, col, Math.max(34, Math.round(w0+(e2.clientX-x0)))); }
    function up(){
      h.classList.remove('drag');
      document.body.style.cursor='';
      document.removeEventListener('mousemove',mv);
      document.removeEventListener('mouseup',up);
    }
    document.addEventListener('mousemove',mv);
    document.addEventListener('mouseup',up);
  });
  th.appendChild(h);
}
function wireColumnResize(w){
  Array.prototype.forEach.call(w.querySelectorAll('table'), function(tb){
    var nHead=0;
    if(tb.tHead && tb.tHead.rows.length) nHead=tb.tHead.rows.length;
    else{
      var r0=tb.rows[0];
      if(r0 && r0.cells.length && r0.cells[0].tagName==='TH') nHead=1;
    }
    if(!nHead) return;
    var map=tableColMap(tb), leaf=map[nHead-1]; if(!leaf) return;
    var seen=[];
    for(var col=0;col<leaf.length;col++){
      var th=leaf[col];
      if(!th || seen.indexOf(th)>=0) continue;
      seen.push(th);
      if(th.classList.contains('sc0')) continue;
      addColHandle(tb, map, th, col);
    }
  });
}
function mount(id, html, wire){
  var host=document.getElementById(id);
  var w=document.createElement('div');
  w.innerHTML=html;
  host.replaceChildren(w);
  if(wire) wire(w);
  try{ wireColumnResize(w); }catch(e){}
}
function opSelect(id, current, allowAll){
  var h='<select id="'+id+'">';
  if(allowAll) h+='<option value="">Toutes les opérations</option>';
  state.operations.forEach(function(o){
    h+='<option value="'+o.id+'"'+(current===o.id?' selected':'')+'>'+esc(o.nom)+'</option>';
  });
  h+='</select>';
  return h;
}
function affaireSelect(id, current, allowAll){
  var h='<select id="'+id+'">';
  if(allowAll) h+='<option value="">Toutes les affaires</option>';
  state.operations.forEach(function(o){
    var as=state.affaires.filter(function(a){ return a.opId===o.id; });
    if(!as.length) return;
    h+='<optgroup label="'+esc(o.nom)+'">';
    as.forEach(function(a){ h+='<option value="'+a.id+'"'+(current===a.id?' selected':'')+'>'+esc(a.nom)+'</option>'; });
    h+='</optgroup>';
  });
  h+='</select>';
  return h;
}
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

