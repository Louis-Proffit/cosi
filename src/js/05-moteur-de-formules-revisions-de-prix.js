/* ================= Moteur de formules (révisions de prix) ================= */
/* Évalue une expression mathématique simple : nombres, + - * / ^ ( ), =
   <> < > <= >=, fonctions SOMME MOYENNE MIN MAX SI ARRONDI ABS. */

function evalMath(f){
  var s=String(f==null?'':f).trim();
  if(s.charAt(0)==='=') s=s.slice(1).trim();
  if(!s) return null;
  if(/^[0-9]+(\.[0-9]+)?$/.test(s)) return parseFloat(s);
  var toks=[],i=0;
  while(i<s.length){
    var c=s.charAt(i);
    if(/\s/.test(c)){ i++; continue; }
    if((c>='0'&&c<='9')||c==='.'){
      var m=/^\d+(\.\d+)?/.exec(s.substring(i)); if(!m) throw new Error('nombre illisible');
      toks.push({t:'n',v:parseFloat(m[0])}); i+=m[0].length; continue;
    }
    var mo=/^(<=|>=|<>|!=)/.exec(s.substring(i));
    if(mo){ toks.push({t:'c',v:mo[0]==='!='?'<>':mo[0]}); i+=mo[0].length; continue; }
    if(c==='<'||c==='>'||c==='='){ toks.push({t:'c',v:c}); i++; continue; }
    var mf=/^([A-Za-z]+)/.exec(s.substring(i));
    if(mf){ i+=mf[0].length; if(s.charAt(i)==='(') toks.push({t:'f',v:mf[1].toUpperCase()}); else throw new Error('« ( » attendu après '+mf[1]); continue; }
    if('+-*/^():,'.indexOf(c)>=0){ toks.push({t:c}); i++; continue; }
    throw new Error('symbole inattendu : '+c);
  }
  if(!toks.length) throw new Error('formule vide');
  var pos=0;
  function peek(){ return toks[pos]; }
  function expect(t){ var p=peek(); if(!p||p.t!==t) throw new Error('« '+t+' » attendu'); pos++; }
  function num(v){ var n=typeof v==='number'?v:parseFloat(v); return isNaN(n)?0:n; }
  function cmpOp(op,a,b){
    if(op==='=') return a===b?1:0;
    if(op==='<>') return a!==b?1:0;
    if(op==='<') return a<b?1:0;
    if(op==='>') return a>b?1:0;
    if(op==='<=') return a<=b?1:0;
    if(op==='>=') return a>=b?1:0;
    throw new Error('comparateur inconnu');
  }
  function parseCmp(){
    var v=parseAdd();
    for(;;){ var p=peek(); if(p&&p.t==='c'){ pos++; var w=parseAdd(); v=cmpOp(p.v,v,w); } else return v; }
  }
  function parseAdd(){
    var v=parseTerm();
    for(;;){ var p=peek(); if(p&&(p.t==='+'||p.t==='-')){ pos++; var w=parseTerm(); v=p.t==='+'?v+w:v-w; } else return v; }
  }
  function parseTerm(){
    var v=parseFactor();
    for(;;){ var p=peek();
      if(p&&(p.t==='*'||p.t==='/'||p.t==='^')){
        pos++; var w=parseFactor();
        if(p.t==='*') v=v*w;
        else if(p.t==='/'){ if(w===0) throw new Error('division par zéro'); v=v/w; }
        else v=Math.pow(v,w);
      } else return v; }
  }
  function callFunc(name){
    expect('(');
    var args=[];
    if(peek()&&peek().t===')'){ pos++; }
    else{
      for(;;){ args.push(parseCmp()); if(peek()&&peek().t===','){ pos++; continue; } expect(')'); break; }
    }
    if(name==='SI'||name==='IF'){
      if(args.length<2) throw new Error('SI(condition,oui,non)');
      return num(args[0])!==0?args[1]:(args.length>2?args[2]:0);
    }
    if(name==='ARRONDI'||name==='ROUND'){
      var d=args.length>1?Math.round(num(args[1])):0, p10=Math.pow(10,d);
      return Math.round(num(args[0])*p10)/p10;
    }
    if(name==='ABS') return Math.abs(num(args[0]));
    if(!args.length) return 0;
    if(name==='SOMME'||name==='SUM') return args.reduce(function(a,b){ return a+num(b); },0);
    if(name==='MOYENNE'||name==='AVG') return args.reduce(function(a,b){ return a+num(b); },0)/args.length;
    if(name==='MIN') return Math.min.apply(null,args.map(num));
    if(name==='MAX') return Math.max.apply(null,args.map(num));
    throw new Error('fonction '+name+' inconnue');
  }
  function parseFactor(){
    var p=peek();
    if(!p) throw new Error('formule incomplète');
    if(p.t==='-'){ pos++; return -parseFactor(); }
    if(p.t==='+'){ pos++; return parseFactor(); }
    if(p.t==='n'){ pos++; return p.v; }
    if(p.t==='('){ pos++; var v=parseCmp(); expect(')'); return v; }
    if(p.t==='f'){ pos++; return callFunc(p.v); }
    throw new Error('symbole inattendu');
  }
  var val=parseCmp();
  if(pos<toks.length) throw new Error('fin de formule inattendue');
  return val;
}

