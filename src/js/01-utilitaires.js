/* ================= Utilitaires ================= */

var LS_KEY = 'cosi2.gestionPrevisionnelle.v1';

function uid(){ return 'x' + Math.random().toString(36).slice(2,10); }

function mParse(m){ var p=m.split('-'); return { y:+p[0], mm:+p[1] }; }
function mAdd(m,n){ var a=mParse(m), t=a.y*12+(a.mm-1)+n;
  return Math.floor(t/12) + '-' + String(t%12+1).padStart(2,'0'); }
function mDiff(a,b){ var A=mParse(a),B=mParse(b); return (B.y*12+B.mm)-(A.y*12+A.mm); }
function mRange(a,b){ var out=[],m=a; while(mDiff(m,b)>=0){ out.push(m); m=mAdd(m,1); if(out.length>500) break; } return out; }
function mLabel(m){ var a=mParse(m); return String(a.mm).padStart(2,'0') + '/' + String(a.y).slice(2); }
/* Champ mois custom (remplace les input type="month" peu pratiques) : texte MM/AAAA
   + bouton ▾ ouvrant un petit sélecteur de mois. L'input garde id/data-* -> handlers inchangés. */
function monthInputHTML(id, value, cls, title, attrs){
  var v=value?mLabel(value):'';
  return '<span class="month-wrap"><input type="text" inputmode="numeric" class="month-in'+(cls?' '+cls:'')+'"'+(id?' id="'+id+'"':'')+' placeholder="MM/AAAA" value="'+esc(v)+'" title="'+esc(title||'Mois au format MM/AAAA')+'"'+(attrs?' '+attrs:'')+'><button type="button" class="month-btn" tabindex="-1" title="Choisir un mois dans le calendrier">▾</button></span>';
}
/* Petit calendrier mensuel (popup) : navigue par année, clique un mois -> renseigne l'input et déclenche son change */
function openMonthPicker(input){
  var cur=parseIdxDate(input.value)||curMois();
  var y=+cur.slice(0,4);
  var ov=document.createElement('div'); ov.className='modal-ov';
  function render(){
    var noms=['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
    var h='<div class="modal month-pick"><div class="mp-head"><button type="button" class="btn small" id="mp-prev">−</button><strong>'+y+'</strong><button type="button" class="btn small" id="mp-next">+</button></div><div class="mp-grid">';
    for(var mm=1;mm<=12;mm++){ h+='<button type="button" class="btn small mp-m" data-m="'+y+'-'+String(mm).padStart(2,'0')+'">'+noms[mm-1]+'</button>'; }
    h+='</div><div class="formrow"><button type="button" class="btn" id="mp-close">Fermer</button></div></div>';
    ov.innerHTML=h;
    ov.querySelector('#mp-prev').onclick=function(){ y--; render(); };
    ov.querySelector('#mp-next').onclick=function(){ y++; render(); };
    ov.querySelector('#mp-close').onclick=function(){ ov.remove(); };
    var btns=ov.querySelectorAll('.mp-m');
    for(var i=0;i<btns.length;i++){ btns[i].onclick=function(){
      input.value=mLabel(this.dataset.m);
      ov.remove();
      if(input.dispatchEvent){ try{ input.dispatchEvent(new Event('change',{bubbles:true})); }catch(e){} }
    }; }
  }
  render();
  document.body.appendChild(ov);
  ov.addEventListener('click',function(ev){ if(ev.target===ov) ov.remove(); });
}
function mLong(m){ var noms=['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
  var a=mParse(m); return noms[a.mm-1]+' '+a.y; }
function curMois(){ var d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }

function fmt(n){ return (Math.round(n)).toLocaleString('fr-FR') + ' €'; }
function fmt0(n){ return Math.round(n).toLocaleString('fr-FR'); }
function fmtIdx(v){ return v==null?'':v.toLocaleString('fr-FR',{minimumFractionDigits:0,maximumFractionDigits:2}); }
function fmtM(n){
  var v=n, s='';
  if(n<0){ s='-'; v=-n; }
  if(v>=1e6) return s + (v/1e6).toLocaleString('fr-FR',{maximumFractionDigits:2}) + ' M€';
  if(v>=1e3) return s + (v/1e3).toLocaleString('fr-FR',{maximumFractionDigits:1}) + ' k€';
  return s + Math.round(v) + ' €';
}
/* Montant en k€ entier pour l'export texte : 2 400 000 -> "2 400 k€" */
function kEur(v){ return Math.round(v/1000).toLocaleString('fr-FR')+' k€'; }
/* Copie dans le presse-papiers (avec repli textarea si clipboard API indisponible) */
function copyTextToClipboard(txt){
  if(navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(txt);
  return new Promise(function(res,rej){
    try{
      var ta=document.createElement('textarea');
      ta.value=txt; ta.style.position='fixed'; ta.style.opacity='0';
      document.body.appendChild(ta); ta.focus(); ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      res();
    }catch(e){ rej(e); }
  });
}
function parseMontant(s){
  if(s==null) return null;
  var t=String(s).replace(/\s| |€/g,'').replace(',','.');
  if(t==='') return null;
  var v=parseFloat(t);
  if(isNaN(v)) return null;
  return Math.round(v*100)/100;
}

function download(name, content, type){
  var a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([content],{type:type||'text/plain'}));
  a.download=name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function(){ URL.revokeObjectURL(a.href); },2000);
}

