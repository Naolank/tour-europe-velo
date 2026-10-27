/* === B6P-ADMIN : interface d'administration (chargée seulement avec ?admin). Supprimez ce fichier avant la mise en ligne si vous ne voulez plus d'admin. === */
(function(){
if(window.__b6admin||!window.__b6)return;window.__b6admin=1;
var B=window.__b6,D=document,H=D.documentElement;
var DEFAULT_HASH='ceb7c684a5c99e590e39c8a7ebd619c1669b8b616912c54764667ee8e487c43e';
var LANGS=[['fr','Français'],['en','English'],['de','Deutsch'],['it','Italiano'],['es','Español'],['rm','Rumantsch']];
var INL={B:1,I:1,EM:1,STRONG:1,A:1,SPAN:1,SMALL:1,BR:1,CODE:1,U:1,MARK:1,SUB:1,SUP:1,S:1,LABEL:1};
function $(s,r){return (r||D).querySelector(s)}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;')}
/* ---- SHA-256 ---- */
function sha256(str){var m=Math.pow,mx=m(2,32),i,j,r='',w=[],b=str.length*8,hh=sha256.h=sha256.h||[],k=sha256.k=sha256.k||[],pc=k.length,ic={};
 for(var c=2;pc<64;c++){if(!ic[c]){for(i=0;i<313;i+=c)ic[i]=c;hh[pc]=(m(c,.5)*mx)|0;k[pc++]=(m(c,1/3)*mx)|0}}
 str=unescape(encodeURIComponent(str));b=str.length*8;str+='\x80';while(str.length%64-56)str+='\x00';
 for(i=0;i<str.length;i++){j=str.charCodeAt(i);w[i>>2]|=j<<((3-i)%4)*8}
 w[w.length]=((b/mx)|0);w[w.length]=b;
 var hs=hh.slice(0,8);
 for(j=0;j<w.length;){var ww=w.slice(j,j+=16),o=hs;hs=hs.slice(0,8);
  for(i=0;i<64;i++){var w15=ww[i-15],w2=ww[i-2],a=hs[0],e=hs[4];
   var t1=hs[7]+(((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7)))+((e&hs[5])^((~e)&hs[6]))+k[i]+(ww[i]=(i<16)?ww[i]:(ww[i-16]+(((w15>>>7)|(w15<<25))^((w15>>>18)|(w15<<14))^(w15>>>3))+ww[i-7]+(((w2>>>17)|(w2<<15))^((w2>>>19)|(w2<<13))^(w2>>>10)))|0);
   var t2=(((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10)))+((a&hs[1])^(a&hs[2])^(hs[1]&hs[2]));
   hs=[(t1+t2)|0].concat(hs);hs[4]=(hs[4]+t1)|0}
  for(i=0;i<8;i++)hs[i]=(hs[i]+o[i])|0}
 for(i=0;i<8;i++)for(j=3;j+1;j--){var bb=(hs[i]>>(j*8))&255;r+=((bb<16)?0:'')+bb.toString(16)}
 return r}
function ph(p){return sha256('b6p|'+p)}
/* ---- état ---- */
function ED(){return B.ED()}
function ss(k,v){try{if(v===undefined)return sessionStorage.getItem(k);if(v===null)sessionStorage.removeItem(k);else sessionStorage.setItem(k,v)}catch(e){return null}}
var editMode=ss('b6p-edit')==='1',sel=null,ce=null,ui,hov=null;
var leaving=false,formDirty=false;
function LS(k,v){try{if(v===undefined)return localStorage.getItem(k);if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v)}catch(e){return null}}
/* ---- ce qui est en ligne / ce qui ne l’est pas encore ---- */
function sig(o){var s=typeof o==='string'?o:JSON.stringify(o||{}),h=5381,i=s.length;while(i--)h=(h*33^s.charCodeAt(i))>>>0;return s.length+'-'+h.toString(36)}
var pubED={ops:[]},pubKnown=false;
function loadPub(){try{var x=new XMLHttpRequest();x.open('GET','site-edits.json?t='+Date.now(),true);
 x.onload=function(){try{var j=JSON.parse(x.responseText);if(j&&typeof j==='object'){j.ops=j.ops||[];pubED=j;pubKnown=true}}catch(e){}refresh()};
 x.onerror=function(){refresh()};x.send()}catch(e){}}
function imgDirty(){return LS('b6p-imgdirty')==='1'&&Object.keys(B.IM()).length>0}
function isDirty(){if(pubKnown)return sig(ED())!==sig(pubED)||imgDirty();return LS('b6p-dirty')==='1'}
function setDirty(v){LS('b6p-dirty',v?'1':null);if(!v)LS('b6p-imgdirty',null);refresh()}
function published(){pubED=JSON.parse(JSON.stringify(ED()));pubED.ops=pubED.ops||[];pubKnown=true;LS('b6p-pubat',String(Date.now()));setDirty(false)}
function since(t){var mn=Math.round((Date.now()-t)/60000);if(mn<1)return 'à l’instant';if(mn<60)return 'il y a '+mn+' min';var hh=Math.round(mn/60);if(hh<24)return 'il y a '+hh+' h';var jj=Math.round(hh/24);return 'il y a '+jj+' jour'+(jj>1?'s':'')}
function stateText(){var at=+(LS('b6p-pubat')||0);
 if(isDirty())return{bad:1,t:'Modifications pas encore en ligne',s:at?'Dernière mise en ligne '+since(at)+'.':'Aucune mise en ligne depuis ce navigateur.'};
 return{bad:0,t:'Tout est en ligne',s:at?'Mis en ligne '+since(at)+'.':'Le site public correspond à ce que vous voyez ici.'}}
function pend(){var e=ED(),p=pubKnown?pubED:{},out=[];
 function J(x){return JSON.stringify(x===undefined?null:x)}
 function dif(a,b){return J(a)!==J(b)}
 var es=(e.cfg&&e.cfg.shop)||{},ps=(p.cfg&&p.cfg.shop)||{};
 if(dif(e.ops||[],p.ops||[]))out.push('Pages du site : '+(e.ops||[]).length+' modification(s) enregistrée(s)');
 if(dif(es.items,ps.items))out.push('Articles à vendre : '+((es.items||[]).length)+' article(s)');
 if(dif(es.gear,ps.gear))out.push('Notre équipement : '+((es.gear||[]).length)+' élément(s)');
 if(dif(es.api,ps.api))out.push('Adresse du serveur de paiement');
 if(dif(e.tr,p.tr))out.push('Traductions de la boutique');
 if(dif(e.css,p.css))out.push('Couleurs et CSS perso');
 if(dif(e.seo,p.seo))out.push('Titre et description pour Google');
 if(dif(e.pw,p.pw))out.push('Nouveau mot de passe de l’administration');
 var ec=Object.assign({},e.cfg||{}),pc=Object.assign({},p.cfg||{});delete ec.shop;delete pc.shop;
 if(dif(ec,pc))out.push('Réglages du site (roue, liens, comptes, mentions légales)');
 var ni=Object.keys(B.IM()).length;if(ni&&(imgDirty()||!pubKnown))out.push(ni+' image(s) envoyée(s) depuis l’administration');
 if(!out.length&&isDirty())out.push('Modifications enregistrées dans ce navigateur');
 return out}
function hist(){try{return JSON.parse(ss('b6p-hist')||'[]')}catch(e){return[]}}
function fut(){try{return JSON.parse(ss('b6p-fut')||'[]')}catch(e){return[]}}
function saveDraft(){try{localStorage.setItem('b6p-draft',JSON.stringify(ED()));localStorage.setItem('b6p-draftimg',JSON.stringify(B.IM()));status('Brouillon enregistré dans ce navigateur.');return true}catch(e){status('⚠ Brouillon trop lourd pour ce navigateur : téléchargez-le tout de suite (onglet Copie de secours).',1);return false}}
function snap(){var h=hist();h.push(JSON.stringify(ED()));while(h.length>25||JSON.stringify(h).length>3e6)h.shift();ss('b6p-hist',JSON.stringify(h));ss('b6p-fut','[]')}
function commit(){LS('b6p-dirty','1');saveDraft();B.apply();refresh()}
function reloadWith(){LS('b6p-dirty','1');formDirty=false;leaving=true;saveDraft();ss('b6p-view',curView());ss('b6p-toast','Enregistré. Vos modifications sont prêtes à être mises en ligne.');location.reload()}
function undo(){var h=hist();if(!h.length)return status('Rien à annuler.');var f=fut();f.push(JSON.stringify(ED()));ss('b6p-fut',JSON.stringify(f));var e=JSON.parse(h.pop());ss('b6p-hist',JSON.stringify(h));B.setED(e);reloadWith()}
function redo(){var f=fut();if(!f.length)return status('Rien à rétablir.');var h=hist();h.push(JSON.stringify(ED()));ss('b6p-hist',JSON.stringify(h));var e=JSON.parse(f.pop());ss('b6p-fut',JSON.stringify(f));B.setED(e);reloadWith()}
function lang(){return H.lang||'fr'}
function curView(){var v=D.querySelector('[id^="v-"]:not([hidden])');return v?v.id.slice(2):''}
function uid(){return Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-3)}
function findOp(t,s){var o=ED().ops;for(var i=0;i<o.length;i++)if(o[i].t===t&&o[i].s===s)return o[i];return null}
function clean(html){return html.replace(/\sdata-b6="\d+"/g,'').replace(/\sdata-b6k="1"/g,'').replace(/\sdata-i18n-skip=""/g,'').replace(/\scontenteditable="(true|false)"/g,'').replace(/\sclass="(\s*b6-(hv|sel)\s*)+"/g,'').replace(/\sb6-(hv|sel)/g,'').replace(/ class=""/g,'')}
/* ---- glisser-déposer générique (souris + tactile, sans librairie) ---- */
function dragList(container,itemSel,handleSel,getArr,afterReorder){
 if(container.__b6drag)return;container.__b6drag=1;
 container.addEventListener('pointerdown',function(e){
  var h=e.target.closest&&e.target.closest(handleSel);if(!h||!container.contains(h))return;
  var item=h.closest(itemSel);if(!item)return;
  e.preventDefault();
  var items0=[].slice.call(container.querySelectorAll(itemSel)),fromIdx=items0.indexOf(item);
  item.classList.add('b6-dragging');
  try{h.setPointerCapture(e.pointerId)}catch(x){}
  function clearMarks(){[].forEach.call(container.querySelectorAll(itemSel),function(it){it.classList.remove('b6-drop-before','b6-drop-after')})}
  function findTarget(y){var items=[].slice.call(container.querySelectorAll(itemSel));
   for(var i=0;i<items.length;i++){if(items[i]===item)continue;var r=items[i].getBoundingClientRect();
    if(y>=r.top&&y<=r.bottom)return{el:items[i],before:(y<r.top+r.height/2)}}
   return null}
  function onMove(ev){clearMarks();var t=findTarget(ev.clientY);if(t)t.el.classList.add(t.before?'b6-drop-before':'b6-drop-after')}
  function onUp(ev){
   container.removeEventListener('pointermove',onMove);container.removeEventListener('pointerup',onUp);container.removeEventListener('pointercancel',onUp);
   clearMarks();item.classList.remove('b6-dragging');
   var t=findTarget(ev.clientY),items=[].slice.call(container.querySelectorAll(itemSel)),toIdx;
   if(t){toIdx=items.indexOf(t.el);if(!t.before)toIdx++;if(toIdx>fromIdx)toIdx--}else toIdx=fromIdx;
   if(toIdx!==fromIdx){var arr=getArr(),v=arr.splice(fromIdx,1)[0];toIdx=Math.max(0,Math.min(arr.length,toIdx));arr.splice(toIdx,0,v);afterReorder()}
  }
  container.addEventListener('pointermove',onMove);container.addEventListener('pointerup',onUp);container.addEventListener('pointercancel',onUp);
 })}
/* ---- styles ---- */
var css=D.createElement('style');css.id='b6a-css';css.textContent=
'.b6-hv{outline:2px dashed #ff7a1a!important;outline-offset:1px;cursor:crosshair!important}.b6-sel{outline:3px solid #19c37d!important;outline-offset:1px}'+
'#b6a,#b6a *{box-sizing:border-box;font-family:system-ui,Arial,sans-serif}'+
'#b6a{position:fixed;right:12px;bottom:12px;width:340px;max-height:80vh;overflow:auto;background:#12161c;color:#e8edf3;border:1px solid #2c3540;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.5);z-index:2147483000;font-size:13px;line-height:1.35}'+
'#b6a header{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#0b0e12;border-bottom:1px solid #2c3540;position:sticky;top:0;z-index:2}'+
'#b6a header b{flex:1;font-size:13px}#b6a .b6c{padding:10px 12px;border-bottom:1px solid #222a33}#b6a .b6c h4{margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#8fa0b3;font-family:system-ui,Arial,sans-serif}#b6a div,#b6m div{border:0;background:none;padding:0;margin:0;box-shadow:none}#b6a .b6c{padding:10px 12px}#b6a .b6st{padding:6px 12px}#b6m>div{padding:14px 16px;background:#12161c}'+
'#b6a button,#b6a .bt{background:#222c38;color:#e8edf3;border:1px solid #33404e;border-radius:8px;padding:7px 9px;font-size:12px;cursor:pointer;margin:2px 2px 2px 0}#b6a button:hover{background:#2c3a4a}#b6a button.on{background:#19c37d;color:#04140c;border-color:#19c37d;font-weight:700}#b6a button.red{background:#5a1f1f;border-color:#8a3030}#b6a button.pri{background:#ff7a1a;color:#1b0d00;border-color:#ff7a1a;font-weight:700}'+
'#b6a input,#b6a select,#b6a textarea{width:100%;background:#0b0e12;color:#e8edf3;border:1px solid #33404e;border-radius:8px;padding:7px 8px;font-size:12px;margin:2px 0}#b6a textarea{min-height:80px;font-family:ui-monospace,Menlo,monospace}#b6a input[type=color]{padding:0;height:30px}#b6a input[type=checkbox]{width:auto}'+
'#b6a .b6r{display:flex;gap:6px;align-items:center}#b6a .b6r>*{flex:1}#b6a .b6sm{color:#8fa0b3;font-size:11px}#b6a .b6st{padding:6px 12px;color:#8fa0b3;font-size:11px}'+
'#b6m{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:2147483100;display:flex;align-items:center;justify-content:center;padding:12px}#b6m>div{background:#12161c;color:#e8edf3;border:1px solid #2c3540;border-radius:14px;width:min(760px,100%);max-height:92vh;overflow:auto;padding:14px 16px;font-size:13px}'+
'#b6m *{box-sizing:border-box;font-family:system-ui,Arial,sans-serif}#b6m button{background:#222c38;color:#e8edf3;border:1px solid #33404e;border-radius:8px;padding:7px 10px;font-size:12px;cursor:pointer;margin:2px 2px 2px 0}#b6m button.on{background:#19c37d;color:#04140c;border-color:#19c37d}#b6m button.pri{background:#ff7a1a;color:#1b0d00;border-color:#ff7a1a;font-weight:700}#b6m button.red{background:#5a1f1f;border-color:#8a3030}'+
'#b6m input,#b6m select,#b6m textarea{width:100%;background:#0b0e12;color:#e8edf3;border:1px solid #33404e;border-radius:8px;padding:7px 8px;font-size:12px;margin:2px 0 8px}#b6m textarea{min-height:110px;font-family:ui-monospace,Menlo,monospace}#b6m label{display:block;font-size:11px;color:#8fa0b3;margin-top:4px}#b6m h3{margin:0 0 8px}#b6m .b6sm{color:#8fa0b3;font-size:11px}#b6m p{margin:4px 0 8px}'+
'#b6a .b6pub{background:#2a1c08;border-bottom:1px solid #7a5312}#b6a .b6pub h4{color:#ffb84d}#b6a .b6pub ul{margin:4px 0 6px;padding-left:16px;color:#cfd8e3;font-size:11px}#b6a .b6pub li{margin:1px 0}'+
'#b6a #a-pubgo,#b6m .b6state button{width:100%;margin:2px 0}'+
'#b6m .b6tabs{display:flex;flex-wrap:wrap;gap:4px;margin:0 0 10px}#b6m .b6tabs button{margin:0}'+
'#b6m .b6state{display:flex;gap:8px;align-items:center;flex-wrap:wrap;background:#0f2419;border:1px solid #1e5c3f;border-radius:10px;padding:9px 11px;margin:0 0 10px}#b6m .b6state.bad{background:#2a1c08;border-color:#7a5312}#b6m .b6state>div{flex:1;min-width:190px}#b6m .b6state button{flex:0 0 auto;max-width:220px}'+
'#b6m .b6r{display:flex;gap:8px;flex-wrap:wrap;align-items:flex-start}#b6m .b6r>div{flex:1;min-width:130px}'+
'#b6m .b6ex{color:#7f93a8;font-size:11px;margin:-6px 0 8px;line-height:1.4}#b6m .b6ex b{color:#9fb2c6}'+
'#b6m .b6ck{list-style:none;margin:6px 0;padding:0}#b6m .b6ck li{margin:3px 0;font-size:12px}#b6m .b6ck .y{color:#5fd6a0}#b6m .b6ck .n{color:#ffab6b}'+
'#b6m .b6box{border:1px solid #2c3540;border-radius:10px;padding:10px 12px;margin:8px 0;background:#0e1319}#b6m .b6box h4{margin:0 0 4px;font-size:12px;color:#ffb84d}'+
/* ---- glisser-déposer : retour visuel ---- */
'.b6dh{cursor:grab;touch-action:none;user-select:none}.b6dh:active{cursor:grabbing}'+
'.b6-dragging{opacity:.45;box-shadow:0 10px 24px rgba(0,0,0,.45)!important;outline:2px dashed #ff7a1a}'+
'.b6-drop-before{box-shadow:inset 0 3px 0 0 #19c37d!important}.b6-drop-after{box-shadow:inset 0 -3px 0 0 #19c37d!important}'+
/* ---- badge au survol + bandeau mode édition + bouton flottant ---- */
'.b6-hv{position:relative}.b6-hv::after{content:"✎ Modifier";position:absolute;top:-11px;left:0;background:#19c37d;color:#04140c;font:700 10px/1.6 system-ui,Arial,sans-serif;padding:0 6px;border-radius:5px;z-index:2147482999;pointer-events:none;white-space:nowrap}'+
'#b6bar{position:fixed;top:0;left:0;right:0;z-index:2147483200;background:#19c37d;color:#04140c;font:700 12px/1 system-ui,Arial,sans-serif;text-align:center;padding:7px 10px;box-shadow:0 2px 10px rgba(0,0,0,.3)}#b6bar button{margin-left:10px;background:#04140c;color:#19c37d;border:0;border-radius:6px;padding:4px 9px;font-weight:700;font-size:11px;cursor:pointer}'+
'#b6fab{position:fixed;z-index:2147483050;transform:translate(-50%,-50%);display:none}'+
'#b6fab button{background:#ff7a1a;color:#1b0d00;border:0;border-radius:999px;padding:7px 12px;font:700 12px system-ui,Arial,sans-serif;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.4)}'+
'#b6fab #b6fabmenu{position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);background:#12161c;border:1px solid #2c3540;border-radius:10px;padding:5px;display:flex;gap:4px;white-space:nowrap;box-shadow:0 10px 30px rgba(0,0,0,.5)}'+
'#b6fab #b6fabmenu button{background:#222c38;color:#e8edf3;border:1px solid #33404e;border-radius:8px;padding:6px 9px;font-size:12px;font-weight:400;box-shadow:none}#b6fab #b6fabmenu button:hover{background:#2c3a4a}'+
'#b6toast{position:fixed;left:50%;bottom:24px;transform:translate(-50%,20px);background:#19c37d;color:#04140c;font:700 13px system-ui,Arial,sans-serif;padding:11px 18px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.4);z-index:2147483200;opacity:0;transition:opacity .25s,transform .25s}'+
'#b6toast.on{opacity:1;transform:translate(-50%,0)}'+
'#b6m>div{animation:b6pop .16s ease-out}@keyframes b6pop{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}'+
'@media(max-width:640px){#b6a{left:0;right:0;bottom:0;width:auto;max-height:70vh;border-radius:14px 14px 0 0}#b6m{padding:0}#b6m>div{border-radius:0;width:100%;max-height:100vh;height:100vh;padding:12px 12px 28px}#b6m .b6tabs button{flex:1 1 46%;text-align:left}#b6m .b6state button{max-width:none;width:100%}}';
D.head.appendChild(css);
/* ---- fenêtres ---- */
function modal(html,onmount){var m=$('#b6m');if(m)m.remove();m=D.createElement('div');m.id='b6m';m.setAttribute('translate','no');m.setAttribute('data-i18n-skip','');m.innerHTML='<div>'+html+'</div>';D.body.appendChild(m);
 ['mousedown','click','keydown','keyup','keypress','touchstart'].forEach(function(t){m.addEventListener(t,function(e){e.stopPropagation()})});
 if(onmount)onmount(m);return m}
function closeModal(){formDirty=false;var m=$('#b6m');if(m)m.remove()}
function askLeave(what){if(!formDirty)return true;if(!confirm('Cet onglet contient des changements que vous n’avez pas enregistrés.\n\n'+what+' quand même ?\nVos changements de cet onglet seront perdus.'))return false;formDirty=false;return true}
var stTm=0,inRef=false;
function status(t,bad){var s=$('#b6s');if(!s)return;s.textContent=t;s.style.color=bad===2?'#ffb84d':bad?'#ff8080':'#8fa0b3';
 clearTimeout(stTm);if(!inRef)stTm=setTimeout(refresh,6000)}
/* ---- connexion ---- */
function login(){
 if(ss('b6p-sess')==='1')return start();
 modal('<h3>🔒 Administration du site</h3><p class="b6sm">Entre le mot de passe pour modifier le site.</p><input id="b6pw" type="password" placeholder="Mot de passe" autocomplete="off"><div><button class="pri" id="b6ok">Entrer</button> <button id="b6no">Annuler</button></div><p class="b6sm" id="b6er" style="color:#ff8080"></p>',function(m){
  var pw=$('#b6pw',m),er=$('#b6er',m);pw.focus();
  function go(){var lock=+(ss('b6p-lock')||0);if(Date.now()<lock){er.textContent='Trop d’essais : réessayez dans '+Math.ceil((lock-Date.now())/1000)+' s.';return}
   var hash=(ED().pw)||DEFAULT_HASH;
   if(ph(pw.value)===hash){ss('b6p-fail','0');ss('b6p-sess','1');
    if(!localStorage.getItem('b6p-draft')){B.setED(JSON.parse(JSON.stringify(ED())));saveDraft()}
    closeModal();start()}
   else{var f=+(ss('b6p-fail')||0)+1;ss('b6p-fail',String(f));er.textContent='Mot de passe incorrect.';if(f>=5){ss('b6p-lock',String(Date.now()+30000));ss('b6p-fail','0')}pw.value=''}}
  $('#b6ok',m).onclick=go;pw.onkeydown=function(e){if(e.key==='Enter')go()};$('#b6no',m).onclick=function(){leaving=true;closeModal();location.href=location.pathname}})}
/* ---- panneau ---- */
function build(){
 ui=D.createElement('div');ui.id='b6a';ui.setAttribute('translate','no');ui.setAttribute('data-i18n-skip','');
 ui.innerHTML=
 '<header><b>🛠 Admin · Boucle des Six Pays</b><button id="a-min" title="Réduire le panneau">⌄</button><button id="a-quit" title="Quitter l’admin">✕</button></header>'+
 '<div id="a-body">'+
 '<div class="b6c b6pub" id="a-pub" hidden><h4>À mettre en ligne</h4><ul id="a-publ"></ul><button class="pri" id="a-pubgo">🚀 Mettre en ligne</button></div>'+
 '<div class="b6c"><h4>Mode</h4><button id="a-edit"></button> <button id="a-undo">↶ Annuler</button><button id="a-redo">↷ Rétablir</button>'+
 '<div class="b6r"><div><label class="b6sm">Page</label><select id="a-view"></select></div><div><label class="b6sm">Langue affichée</label><select id="a-lang"></select></div></div></div>'+
 '<div class="b6c" id="a-selbox"><h4>Élément sélectionné</h4><div id="a-sel" class="b6sm">Activez « Éditer la page » puis cliquez sur un élément du site.</div><div id="a-acts"></div></div>'+
 '<div class="b6c"><h4>Ajouter</h4><div class="b6r"><select id="a-kind"><option value="titre">Titre</option><option value="texte">Paragraphe</option><option value="image">Image</option><option value="bouton">Bouton / lien</option><option value="carte">Carte (titre + texte)</option><option value="video">Vidéo (YouTube / Vimeo)</option><option value="sep">Séparateur</option><option value="html">HTML libre</option></select>'+
 '<select id="a-pos"><option value="after">après la sélection</option><option value="before">avant</option><option value="last">dedans (fin)</option><option value="first">dedans (début)</option></select></div><button class="pri" id="a-add">＋ Insérer</button></div>'+
 '<div class="b6c"><h4>Site</h4><button id="a-set">⚙ Réglages du site</button><button id="a-help">❓ Aide</button><button id="a-save">💾 Copie de secours</button></div>'+
 '</div><div class="b6st" id="b6s"></div>';
 D.body.appendChild(ui);
 ['mousedown','keydown','keyup','keypress','touchstart'].forEach(function(t){ui.addEventListener(t,function(e){e.stopPropagation()})});
 var vs=$('#a-view');[].forEach.call(D.querySelectorAll('#ddlist [data-v]'),function(b){var o=D.createElement('option');o.value=b.getAttribute('data-v');o.textContent=b.textContent.trim();vs.appendChild(o)});
 vs.onchange=function(){gotoView(vs.value)};
 var ls=$('#a-lang');LANGS.forEach(function(l){var o=D.createElement('option');o.value=l[0];o.textContent=l[1];ls.appendChild(o)});ls.onchange=function(){setLang(ls.value)};
 $('#a-edit').onclick=function(){setEdit(!editMode)};$('#a-undo').onclick=undo;$('#a-redo').onclick=redo;
 $('#a-min').onclick=function(){var b=$('#a-body');b.style.display=b.style.display==='none'?'':'none'};
 $('#a-quit').onclick=quit;$('#a-add').onclick=addBlock;$('#a-set').onclick=function(){settings('home')};$('#a-help').onclick=function(){settings('home')};$('#a-save').onclick=function(){settings('save')};
 $('#a-pubgo').onclick=function(){settings('pub')};
 setInterval(function(){ls.value=lang();var v=curView();if(v&&vs.value!==v)vs.value=v},1000);
}
function gotoView(v){allow=true;var b=D.querySelector('#ddlist [data-v="'+v+'"]');if(b)b.click();setTimeout(function(){allow=false;select(null)},60)}
function setLang(l){allow=true;var b=D.querySelector('#langl [data-l="'+l+'"]');if(b)b.click();setTimeout(function(){allow=false},60);setTimeout(function(){select(null)},200)}
var allow=false;
function setEdit(on){editMode=on;ss('b6p-edit',on?'1':'0');refresh();if(!on)select(null);bar();fabHide()}
function bar(){var b=$('#b6bar');
 if(!editMode){if(b)b.remove();return}
 if(b)return;b=D.createElement('div');b.id='b6bar';b.setAttribute('data-i18n-skip','');
 b.innerHTML='✎ Mode édition actif — cliquez sur un élément de la page pour le modifier <button id="b6barq">Quitter le mode édition</button>';
 D.body.appendChild(b);$('#b6barq',b).onclick=function(){setEdit(false)}}
function toast(msg){var t=$('#b6toast');if(t)t.remove();t=D.createElement('div');t.id='b6toast';t.setAttribute('data-i18n-skip','');t.textContent='✔ '+msg;D.body.appendChild(t);
 requestAnimationFrame(function(){t.classList.add('on')});setTimeout(function(){t.classList.remove('on');setTimeout(function(){t&&t.remove()},300)},2600)}
function refresh(){var b=$('#a-edit');if(!b)return;inRef=true;b.textContent=editMode?'✎ Édition ACTIVE':'✎ Éditer la page';b.className=editMode?'on':'';
 var st=stateText(),box=$('#a-pub'),lst=$('#a-publ');
 if(box){if(st.bad){box.hidden=false;var p=pend();lst.innerHTML=p.slice(0,4).map(function(x){return '<li>'+esc(x)+'</li>'}).join('')+(p.length>4?'<li>et '+(p.length-4)+' autre(s)</li>':'')}else box.hidden=true}
 status(st.bad?'Modifications pas encore en ligne. Cliquez sur « Mettre en ligne ».':'Tout est en ligne.',st.bad?2:0);
 var m=$('#b6m');if(m&&$('#b6stt',m))setStateLine(m);inRef=false}
function quit(){if(isDirty()&&!confirm('Vous avez des modifications qui ne sont pas encore en ligne.\n\nElles restent enregistrées dans ce navigateur, vous pourrez les mettre en ligne plus tard.\n\nQuitter l’administration ?'))return;
 leaving=true;ss('b6p-sess',null);ss('b6p-edit',null);location.href=location.pathname}
/* ---- sélection ---- */
function inUI(t){return t&&t.closest&&(t.closest('#b6a')||t.closest('#b6m')||t.closest('#b6fab')||t.closest('#b6bar')||t.closest('#b6toast'))}
function block(el){while(el&&el!==D.body&&INL[el.tagName])el=el.parentElement;return el}
function onOver(e){if(!editMode)return;if(e.target.closest&&e.target.closest('#b6fab'))return;if(inUI(e.target))return fabHide();if(hov)hov.classList.remove('b6-hv');hov=e.target;if(hov!==sel&&hov!==D.body)hov.classList.add('b6-hv');onSectionHover(e.target)}
function onClick(e){if(!editMode||allow||inUI(e.target))return;
 if(ce&&ce.contains(e.target))return;
 e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
 var t=e.target;if(t.closest&&t.ownerSVGElement)t=t.ownerSVGElement;if(t===D.body||t===H)return select(null);select(t)}
function onBlock(e){if(!editMode||allow||inUI(e.target))return;if(ce&&ce.contains(e.target))return;e.stopPropagation();if(e.type!=='touchstart')e.preventDefault()}
function select(el){if(ce)endText(true);if(sel)sel.classList.remove('b6-sel');if(hov){hov.classList.remove('b6-hv');hov=null}sel=el;if(sel){sel.classList.remove('b6-hv');sel.classList.add('b6-sel')}acts()}
function label(el){var t=el.tagName.toLowerCase(),c=(el.textContent||'').trim().replace(/\s+/g,' ').slice(0,50);return '<b>&lt;'+t+'&gt;</b>'+(el.id?' #'+esc(el.id):'')+(c?' « '+esc(c)+' »':'')}
function acts(){var a=$('#a-acts'),s=$('#a-sel');if(!sel){s.innerHTML='Activez « Éditer la page » puis cliquez sur un élément du site.';a.innerHTML='';return}
 s.innerHTML=label(sel);var im=sel.tagName==='IMG',lk=sel.closest('a'),b='';
 b+='<button data-a="txt">✎ Texte</button><button data-a="tr">🌍 Traductions</button>';
 if(im)b+='<button data-a="img">🖼 Changer l’image</button><button data-a="alt">Alt</button>';
 if(lk)b+='<button data-a="lnk">🔗 Lien</button>';
 b+='<button data-a="bg">🖼 Image de fond</button><button data-a="sty">🎨 Style</button><button data-a="up">↑</button><button data-a="dn">↓</button><button data-a="dup">⧉ Dupliquer</button><button data-a="par">↖ Parent</button><button data-a="chi">↘ Enfant</button><button data-a="del" class="red">🗑 Supprimer</button>';
 a.innerHTML=b;[].forEach.call(a.querySelectorAll('button'),function(x){x.onclick=function(){act(x.getAttribute('data-a'))}})}
function act(k){if(!sel)return;
 if(k==='par'){if(sel.parentElement&&sel.parentElement!==D.body)select(sel.parentElement)}
 else if(k==='chi'){var c=sel.firstElementChild;if(c)select(c)}
 else if(k==='txt')startText();
 else if(k==='tr')transl();
 else if(k==='img')pickImage(function(id){snap();setAttr(sel,'src','@img:'+id);commit()});
 else if(k==='bg')pickImage(function(id){snap();setSty(sel,{'background-image':'url(@img:'+id+')','background-size':'cover','background-position':'center'});commit()});
 else if(k==='alt'){var v=prompt('Texte alternatif de l’image (accessibilité) :',sel.getAttribute('alt')||'');if(v!==null){snap();setAttr(sel,'alt',v);commit()}}
 else if(k==='lnk'){var a=sel.closest('a'),u=prompt('Adresse du lien (https://… ou #…) :',a.getAttribute('href')||'');if(u!==null){snap();setAttr(a,'href',u);var nt=confirm('Ouvrir dans un nouvel onglet ?\n(OK = oui, Annuler = non)');if(nt){setAttr(a,'target','_blank');setAttr(a,'rel','noopener')}else setAttr(a,'target',null);commit()}}
 else if(k==='sty')styleDlg();
 else if(k==='del')del();
 else if(k==='up'||k==='dn')move(k);
 else if(k==='dup')dup()}
function setAttr(el,a,v){var s=B.S(el),o=null,ops=ED().ops;for(var i=0;i<ops.length;i++)if(ops[i].t==='attr'&&ops[i].s===s&&ops[i].a===a)o=ops[i];if(!o){o={t:'attr',s:s,a:a};ops.push(o)}o.v=v}
function setSty(el,props){var s=B.S(el),o=findOp('sty',s);if(!o){o={t:'sty',s:s,c:''};ED().ops.push(o)}var m=parseDecl(o.c);for(var k in props){if(props[k]===''||props[k]==null)delete m[k];else m[k]=props[k]}o.c=Object.keys(m).map(function(k){return k+':'+m[k]}).join(';')}
function parseDecl(c){var m={};(c||'').split(';').forEach(function(x){var i=x.indexOf(':');if(i>0)m[x.slice(0,i).trim()]=x.slice(i+1).trim()});return m}
/* ---- texte ---- */
function startText(){var b=block(sel);if(!b||b===D.body)return;sel.classList.remove('b6-sel');ce=b;b.setAttribute('contenteditable','true');b.focus();ce.classList.add('b6-sel');
 var a=$('#a-acts');a.innerHTML='<div class="b6sm">Écrivez directement dans la page (langue : <b>'+lang().toUpperCase()+'</b>).</div><button data-t="b"><b>G</b></button><button data-t="i"><i>I</i></button><button data-t="a">🔗</button><button data-t="br">↵ saut</button><button class="pri" data-t="ok">✔ Valider</button><button data-t="no">✕ Annuler</button>';
 [].forEach.call(a.querySelectorAll('button'),function(x){x.onmousedown=function(e){e.preventDefault()};x.onclick=function(){var t=x.getAttribute('data-t');
  if(t==='b')D.execCommand('bold');else if(t==='i')D.execCommand('italic');else if(t==='br')D.execCommand('insertLineBreak');
  else if(t==='a'){var u=prompt('Adresse du lien :','https://');if(u)D.execCommand('createLink',false,u)}
  else if(t==='ok')endText(false);else endText(true,true)}})}
function endText(auto,cancel){if(!ce)return;var b=ce;ce=null;b.removeAttribute('contenteditable');b.classList.remove('b6-sel');
 var orig=b.__b6orig;if(cancel){B.apply();select(b);return}
 var html=clean(b.innerHTML);
 var w=b.closest('[data-b6a]');
 snap();
 if(w&&w!==b){var o=addOp(w.getAttribute('data-b6a'));if(o){o.h=o.h||{};o.h[lang()]=clean(w.innerHTML);w.__h=undefined}}
 else if(w&&w===b){var o2=addOp(w.getAttribute('data-b6a'));if(o2){o2.h=o2.h||{};o2.h[lang()]=html}}
 else{var s=B.S(b),o3=findOp('txt',s);if(!o3){o3={t:'txt',s:s,h:{}};ED().ops.push(o3)}o3.h[lang()]=html}
 commit();select(b)}
function addOp(id){var o=ED().ops;for(var i=0;i<o.length;i++)if(o[i].t==='add'&&o[i].id===id)return o[i];return null}
/* ---- traductions ---- */
function transl(){var b=block(sel);if(!b||b===D.body)return;var w=b.closest('[data-b6a]'),cur=clean(w&&w!==b?w.innerHTML:b.innerHTML),h,tgt;
 if(w){var ao=addOp(w.getAttribute('data-b6a'));h=(ao&&ao.h)||{}}else{var to=findOp('txt',B.S(b));h=(to&&to.h)||{}}
 var html='<h3>🌍 Textes dans toutes les langues</h3><p class="b6sm">HTML autorisé (&lt;b&gt;, &lt;i&gt;, &lt;a href&gt;, &lt;br&gt;). Une langue laissée vide garde la traduction automatique du site (ou le français si le texte a été modifié).</p>';
 LANGS.forEach(function(l){var v=h[l[0]]!=null?h[l[0]]:'';var mm=/^\[data-b6="(\d+)"\]$/.exec(B.S(b));if(v===''&&h[l[0]]==null){if(l[0]==='fr'&&mm&&B.FR0[mm[1]]!=null)v=B.FR0[mm[1]];else if(l[0]===lang())v=cur}html+='<label>'+l[1]+'</label><textarea data-l="'+l[0]+'" style="min-height:70px">'+esc(v)+'</textarea>'});
 html+='<div><button class="pri" id="tr-ok">✔ Enregistrer</button> <button id="tr-no">Annuler</button></div>';
 modal(html,function(m){$('#tr-no',m).onclick=closeModal;$('#tr-ok',m).onclick=function(){snap();var nh={};[].forEach.call(m.querySelectorAll('textarea'),function(t){if(t.value.trim())nh[t.getAttribute('data-l')]=t.value});
  if(w){var ao2=addOp(w.getAttribute('data-b6a'));if(ao2){ao2.h=nh;w.__h=undefined}}
  else{var s=B.S(b),to2=findOp('txt',s);if(!to2){to2={t:'txt',s:s,h:{}};ED().ops.push(to2)}to2.h=nh;if(!Object.keys(nh).length)ED().ops.splice(ED().ops.indexOf(to2),1)}
  closeModal();commit();select(b)}})}
/* ---- image ---- */
function pickImage(cb){var f=D.createElement('input');f.type='file';f.accept='image/*';f.onchange=function(){var file=f.files[0];if(!file)return;
 var r=new FileReader();r.onload=function(){var im=new Image();im.onload=function(){var mx=1600,w=im.naturalWidth,h=im.naturalHeight,k=Math.min(1,mx/Math.max(w,h));var c=D.createElement('canvas');c.width=Math.round(w*k);c.height=Math.round(h*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);
  var keep=/svg|gif/.test(file.type),data;if(keep)data=r.result;else{data=c.toDataURL('image/webp',.85);if(data.indexOf('image/webp')<0)data=c.toDataURL('image/jpeg',.85)}
  var id=uid();var IM=B.IM();IM[id]=data;B.setIM(IM);LS('b6p-imgdirty','1');cb(id)};im.onerror=function(){alert('Image illisible.')};im.src=r.result};r.readAsDataURL(file)};f.click()}
/* ---- style ---- */
function styleDlg(){var s=B.S(sel),o=findOp('sty',s),m0=parseDecl(o&&o.c),cs=getComputedStyle(sel);
 function hex(c){var m=c.match(/\d+/g);if(!m||c==='rgba(0, 0, 0, 0)')return '#000000';return '#'+m.slice(0,3).map(function(x){return ('0'+(+x).toString(16)).slice(-2)}).join('')}
 var F=[['color','Couleur du texte','color'],['background-color','Couleur de fond','color'],['font-size','Taille du texte (ex 18px, 1.2rem)','text'],['font-weight','Graisse (400, 700…)','text'],['text-align','Alignement','sel:left,center,right,justify'],['margin','Marge extérieure (ex 10px 0)','text'],['padding','Marge intérieure (ex 12px)','text'],['border','Bordure (ex 1px solid #ccc)','text'],['border-radius','Arrondi (ex 12px)','text'],['width','Largeur (ex 50%, 300px)','text'],['max-width','Largeur max','text'],['height','Hauteur','text'],['opacity','Opacité (0 à 1)','text'],['display','Affichage (none, block, flex…)','text'],['transform','Transformation (ex rotate(3deg))','text']];
 var html='<h3>🎨 Style de l’élément</h3><p class="b6sm">Laissez vide pour ne rien changer. Les couleurs : coche la case pour les appliquer.</p>';
 F.forEach(function(f){var v=m0[f[0]]||'';
  if(f[2]==='color'){html+='<label>'+f[1]+'</label><div style="display:flex;gap:8px;align-items:center"><input type="checkbox" data-on="'+f[0]+'"'+(v?' checked':'')+' style="width:auto"><input type="color" data-p="'+f[0]+'" value="'+(v&&v[0]==='#'?v:hex(cs[f[0]==='color'?'color':'backgroundColor']))+'" style="padding:0;height:30px"></div>'}
  else if(f[2].indexOf('sel:')===0){html+='<label>'+f[1]+'</label><select data-p="'+f[0]+'"><option value="">(aucun)</option>'+f[2].slice(4).split(',').map(function(x){return '<option'+(v===x?' selected':'')+'>'+x+'</option>'}).join('')+'</select>'}
  else html+='<label>'+f[1]+'</label><input data-p="'+f[0]+'" value="'+esc(v)+'">'});
 html+='<label>CSS libre supplémentaire (ex : box-shadow:0 4px 12px #0003;)</label><textarea id="st-free" style="min-height:60px">'+esc(Object.keys(m0).filter(function(k){return !F.some(function(f){return f[0]===k})}).map(function(k){return k+':'+m0[k]}).join(';\n'))+'</textarea>';
 html+='<div><button class="pri" id="st-ok">✔ Appliquer</button> <button id="st-rs" class="red">Effacer le style</button> <button id="st-no">Fermer</button></div>';
 modal(html,function(m){$('#st-no',m).onclick=closeModal;
  $('#st-rs',m).onclick=function(){snap();var ops=ED().ops,i=ops.indexOf(findOp('sty',s));if(i>=0)ops.splice(i,1);closeModal();commit()};
  $('#st-ok',m).onclick=function(){snap();var p={};[].forEach.call(m.querySelectorAll('[data-p]'),function(x){var k=x.getAttribute('data-p');if(x.type==='color'){var c=m.querySelector('[data-on="'+k+'"]');p[k]=c&&c.checked?x.value:''}else p[k]=x.value.trim()});
   var free=parseDecl($('#st-free',m).value.replace(/\n/g,''));
   var op=findOp('sty',s);if(!op){op={t:'sty',s:s,c:''};ED().ops.push(op)}
   var old=parseDecl(op.c);for(var k in old)if(!(k in p)&&!(k in free))free[k]=old[k]; // garde le reste
   for(var k2 in p)if(p[k2])free[k2]=p[k2];else delete free[k2];
   op.c=Object.keys(free).map(function(k){return k+':'+free[k]}).join(';');if(!op.c)ED().ops.splice(ED().ops.indexOf(op),1);
   closeModal();commit()}})}
/* ---- supprimer / déplacer / dupliquer ---- */
function del(){var el=sel;if(!confirm('Supprimer cet élément de la page ?\n\nVous pouvez revenir en arrière avec « ↶ Annuler », ou le remettre depuis Réglages puis l’onglet « 📝 Mes modifications ».'))return;snap();
 var p=el.parentElement,w=el.closest('[data-b6a]');
 if(w&&w===el||(w&&w===p&&p.children.length===1)){var id=w.getAttribute('data-b6a'),ops=ED().ops;ED().ops=ops.filter(function(o){return !(o.t==='add'&&o.id===id)});w.remove();select(null);commit();return}
 ED().ops.push({t:'del',s:B.S(el)});select(null);commit()}
function move(k){var el=sel;if(el.closest('[data-b6a]')===el&&0){}
 var sib=k==='up'?el.previousElementSibling:el.nextElementSibling;while(sib&&(sib.tagName==='SCRIPT'||getComputedStyle(sib).display==='none'))sib=k==='up'?sib.previousElementSibling:sib.nextElementSibling;
 if(!sib)return status('Déjà en '+(k==='up'?'premier':'dernier')+' dans son conteneur.');
 snap();ED().ops.push({t:'mv',s:B.S(el),ref:B.S(sib),pos:k==='up'?'before':'after'});commit();el.scrollIntoView({block:'center',behavior:'smooth'})}
function dup(){var el=sel;snap();var id='a'+uid(),h=clean(el.outerHTML);ED().ops.push({t:'add',id:id,ref:B.S(el),pos:'after',h:{'*':h}});commit();var w=B.q('[data-b6a="'+id+'"]');if(w&&w.firstElementChild)select(w.firstElementChild)}
/* ---- ajouter ---- */
var TPL={titre:'<h2>Nouveau titre</h2>',texte:'<p>Nouveau texte. Cliquez sur « ✎ Texte » pour le modifier.</p>',
 bouton:'<p><a href="https://" target="_blank" rel="noopener" style="display:inline-block;padding:12px 20px;border-radius:12px;background:var(--c1,#e8531e);color:#fff;font-weight:700;text-decoration:none">Bouton</a></p>',
 carte:'<div style="padding:18px;border:1px solid var(--line,#8884);border-radius:14px;background:var(--card,transparent);margin:10px 0"><h3 style="margin:0 0 6px">Titre</h3><p style="margin:0">Texte de la carte.</p></div>',
 sep:'<hr style="margin:18px 0;border:0;border-top:1px solid var(--line,#8884)">'};
function addBlock(){var k=$('#a-kind').value,pos=$('#a-pos').value,ref=sel||D.querySelector('.view:not([hidden])')||D.body;
 if(!sel&&pos!=='last'&&pos!=='first')pos='last';
 insertBlock(k,ref,pos)}
function insertBlock(k,ref,pos){
 function put(html){snap();var id='a'+uid();ED().ops.push({t:'add',id:id,ref:B.S(ref),pos:pos,h:{'*':html}});commit();var w=B.q('[data-b6a="'+id+'"]');if(w){w.scrollIntoView({block:'center',behavior:'smooth'});select(w.firstElementChild||w)}toast('Bloc ajouté.')}
 if(k==='image')return pickImage(function(id){put('<img src="@img:'+id+'" alt="" style="max-width:100%;height:auto;border-radius:12px;display:block;margin:10px auto">')});
 if(k==='bouton'){var tx=prompt('Texte du bouton :','En savoir plus');if(tx===null)return;var u2=prompt('Adresse du lien (https://…) :','https://');if(!u2)return;
  return put('<p><a href="'+esc(u2)+'" target="_blank" rel="noopener" style="display:inline-block;padding:12px 20px;border-radius:12px;background:var(--c1,#e8531e);color:#fff;font-weight:700;text-decoration:none">'+esc(tx)+'</a></p>')}
 if(k==='video'){var u=prompt('Adresse de la vidéo (YouTube, Vimeo, Instagram ou TikTok) :','https://www.youtube.com/watch?v=');if(!u)return;
  var m=u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/),v=u.match(/vimeo\.com\/(\d+)/),ig=u.match(/instagram\.com\/(?:p|reel|tv)\/([\w-]+)/),tk=/tiktok\.com\//i.test(u);
  if(m)return put('<div style="position:relative;padding-top:56.25%;margin:10px 0"><iframe src="https://www.youtube-nocookie.com/embed/'+m[1]+'" style="position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:12px" allowfullscreen loading="lazy" title="Vidéo"></iframe></div>');
  if(v)return put('<div style="position:relative;padding-top:56.25%;margin:10px 0"><iframe src="https://player.vimeo.com/video/'+v[1]+'" style="position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:12px" allowfullscreen loading="lazy" title="Vidéo"></iframe></div>');
  if(ig)return put('<div style="margin:10px 0"><iframe src="https://www.instagram.com/p/'+ig[1]+'/embed" style="width:100%;border:0;border-radius:12px;min-height:420px" loading="lazy" title="Vidéo Instagram"></iframe></div>');
  if(tk)return put('<p style="margin:10px 0"><a href="'+esc(u)+'" target="_blank" rel="noopener" style="display:inline-block;padding:12px 20px;border-radius:12px;background:#000;color:#fff;font-weight:700;text-decoration:none">🎵 Voir la vidéo TikTok</a></p>');
  return alert('Lien non reconnu (YouTube, Vimeo, Instagram ou TikTok).')}
 if(k==='html'){return modal('<h3>HTML libre</h3><p class="b6sm">Collez votre code HTML (sans &lt;script&gt;, il serait retiré).</p><textarea id="hl" style="min-height:160px"></textarea><div><button class="pri" id="hl-ok">Insérer</button> <button id="hl-no">Annuler</button></div>',function(m){$('#hl-no',m).onclick=closeModal;$('#hl-ok',m).onclick=function(){var h=$('#hl',m).value.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi,'');closeModal();if(h.trim())put(h)}})}
 put(TPL[k])}
/* ---- bouton flottant « + Ajouter un bloc » entre les sections ---- */
var fabTarget=null;
function initFab(){
 var fab=D.createElement('div');fab.id='b6fab';fab.setAttribute('data-i18n-skip','');
 fab.innerHTML='<button id="b6fabbtn" title="Ajouter un bloc ici">＋ Ajouter un bloc</button><div id="b6fabmenu" hidden>'
  +'<button data-k="image">🖼 Photo</button><button data-k="texte">📝 Paragraphe</button><button data-k="bouton">🔗 Lien</button><button data-k="video">🎬 Vidéo</button></div>';
 D.body.appendChild(fab);
 $('#b6fabbtn',fab).onclick=function(e){e.stopPropagation();var mn=$('#b6fabmenu',fab);mn.hidden=!mn.hidden};
 [].forEach.call(fab.querySelectorAll('[data-k]'),function(b){b.onclick=function(e){e.stopPropagation();$('#b6fabmenu',fab).hidden=true;if(fabTarget)insertBlock(b.getAttribute('data-k'),fabTarget,'after')}});
 D.addEventListener('scroll',positionFab,true);window.addEventListener('resize',positionFab);
}
function fabHide(){var f=$('#b6fab');if(f){f.style.display='none';var mn=$('#b6fabmenu',f);if(mn)mn.hidden=true}fabTarget=null}
function positionFab(){var f=$('#b6fab');if(!f||!fabTarget||f.style.display==='none')return;var r=fabTarget.getBoundingClientRect();f.style.left=(r.left+r.width/2)+'px';f.style.top=(r.bottom)+'px'}
function onSectionHover(el){
 if(!editMode)return fabHide();
 var sec=el&&el.closest&&el.closest('.wrap>*,.view>*');
 if(!sec){return}
 fabTarget=sec;var f=$('#b6fab');if(!f)return;f.style.display='block';positionFab()}
/* ---- réglages ---- */
function dl(name,text,type){var a=D.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:type||'application/json'}));a.download=name;D.body.appendChild(a);a.click();setTimeout(function(){a.remove()},500)}
var TABLIST=[['home','🏠 Accueil'],['pub','🚀 Mettre en ligne'],['shop','🛒 Articles à vendre'],['gear','🎒 Notre équipement'],['partners','🤝 Partenaires'],['tr','🌍 Traductions'],['hid','📝 Mes modifications'],['save','💾 Copie de secours'],['seo','🔎 Titre et Google'],['pay','💳 Paiement'],['acct','👤 Comptes clients'],['cfg','🎡 Roue, liens, mentions légales'],['css','🎨 Couleurs et CSS'],['pw','🔒 Mot de passe']];
function setStateLine(m){var st=stateText(),box=$('#b6stt',m);if(!box)return;
 box.className='b6state'+(st.bad?' bad':'');
 var p=pend(),d=st.bad?'<div class="b6sm">'+esc(st.s)+'</div><div class="b6sm" style="margin-top:3px">À mettre en ligne : '+esc(p.join(' · ')||'modifications enregistrées')+'</div>':'<div class="b6sm">'+esc(st.s)+'</div>';
 box.innerHTML='<div><b>'+(st.bad?'🟠 ':'🟢 ')+esc(st.t)+'</b>'+d+'</div>'+(st.bad?'<button class="pri" id="b6stgo">🚀 Mettre en ligne</button>':'');
 var g=$('#b6stgo',m);if(g)g.onclick=function(){if(!askLeave('Aller à l’onglet Mettre en ligne'))return;settings('pub')}}
function settings(tab){tab=typeof tab==='string'?tab:'home';
 var tabs=TABLIST;
 var h='<h3>⚙ Administration du site</h3><div class="b6state" id="b6stt"></div><div class="b6tabs">'+tabs.map(function(t){return '<button data-tab="'+t[0]+'" class="'+(t[0]===tab?'on':'')+'">'+t[1]+'</button>'}).join('')+'</div><div id="tabc"></div><div style="margin-top:12px"><button id="set-x">Fermer</button></div>';
 modal(h,function(m){[].forEach.call(m.querySelectorAll('[data-tab]'),function(b){b.onclick=function(){if(!askLeave('Changer d’onglet'))return;settings(b.getAttribute('data-tab'))}});
  $('#set-x',m).onclick=function(){if(askLeave('Fermer cette fenêtre'))closeModal()};
  setStateLine(m);TABS[tab](m,$('#tabc',m))})}
var TABS={};
TABS.home=function(m,c){
 c.innerHTML='<p>Bienvenue. Ici vous modifiez votre site tout seul, à toute heure. Vos changements restent dans ce navigateur jusqu’au moment où vous cliquez sur « Mettre en ligne ».</p>'
 +'<div class="b6box"><h4>1. Changer un texte ou une photo</h4><p class="b6sm">Cliquez sur « ✎ Éditer la page » dans le petit panneau en bas à droite. Cliquez ensuite sur le texte à changer dans la page, puis sur « ✎ Texte ». Écrivez, puis cliquez sur « ✔ Valider ». Pour une photo, cliquez dessus puis sur « 🖼 Changer l’image ».</p></div>'
 +'<div class="b6box"><h4>2. Ajouter un article à vendre</h4><p class="b6sm">Onglet « 🛒 Articles à vendre », bouton « ＋ Ajouter un article ». Remplissez le nom, le prix, une photo, puis « ✔ Enregistrer et recharger ». Pour le matériel que vous utilisez, c’est l’onglet « 🎒 Notre équipement ».</p></div>'
 +'<div class="b6box"><h4>3. Ajouter un partenaire</h4><p class="b6sm">Onglet « 🤝 Partenaires », bouton « ＋ Ajouter un partenaire ». Remplissez le nom, choisissez une image, puis « ✔ Enregistrer et recharger ».</p></div>'
 +'<div class="b6box"><h4>4. Mettre en ligne</h4><p class="b6sm">Onglet « 🚀 Mettre en ligne », bouton « Publier maintenant ». Le site public se met à jour en 1 à 2 minutes. Tant que vous n’avez pas publié, personne d’autre que vous ne voit vos changements.</p></div>'
 +'<div class="b6box"><h4>5. Revenir en arrière</h4><p class="b6sm">Bouton « ↶ Annuler » dans le panneau, autant de fois que nécessaire (les 25 dernières étapes sont gardées). Pour tout remettre comme en ligne : onglet « 💾 Copie de secours », bouton « Abandonner mon brouillon ». L’onglet « 📝 Mes modifications » permet aussi d’annuler une modification précise.</p></div>'
 +'<p><b>Les gestes les plus utiles</b></p>'
 +'<div><button class="pri" id="h-edit">✎ Éditer la page</button> <button id="h-shop">🛒 Ajouter un article</button> <button id="h-part">🤝 Ajouter un partenaire</button> <button id="h-pub">🚀 Mettre en ligne</button> <button id="h-undo">↶ Annuler la dernière modification</button></div>'
 +'<p class="b6sm" style="margin-top:12px">Pour aller plus loin, deux guides sont dans votre dossier de site, à côté de <code>index.html</code> : <code>GUIDE-BOUTIQUE.md</code> (boutique, paiement, comptes clients, envoi automatique) et <code>SITE_BRIEF.md</code> (le site en général). Chaque onglet de cette fenêtre contient aussi son mode d’emploi en haut.</p>';
 $('#h-edit',c).onclick=function(){setEdit(true);closeModal()};
 $('#h-shop',c).onclick=function(){settings('shop')};
 $('#h-part',c).onclick=function(){settings('partners')};
 $('#h-pub',c).onclick=function(){settings('pub')};
 $('#h-undo',c).onclick=function(){if(confirm('Annuler votre dernière modification ?'))undo()}};
TABS.css=function(m,c){c.innerHTML='<p class="b6sm">Pour changer les couleurs, les polices ou les tailles sur tout le site d’un coup. C’est du CSS : si vous ne connaissez pas, laissez cet onglet tranquille, tout se fait très bien en cliquant dans la page.</p>'
 +'<div class="b6ex">Exemple pour changer la couleur principale : <b>:root{--c1:#e8531e}</b></div>'
 +'<textarea id="cssb" style="min-height:240px">'+esc(ED().css||'')+'</textarea><button class="pri" id="cssok">✔ Appliquer</button><div id="cssmsg" class="b6sm"></div>';
 c.addEventListener('input',function(){formDirty=true});
 $('#cssok',c).onclick=function(){snap();ED().css=$('#cssb',c).value;formDirty=false;commit();setStateLine(m);$('#cssmsg',c).textContent='Appliqué. Pensez à mettre en ligne.';status('CSS appliqué.')}};
TABS.cfg=function(m,c){var cfg0=B.cfg0,cur=(typeof CONFIG!=='undefined'?CONFIG:null);if(!cfg0||!cur){c.innerHTML='<p>Configuration introuvable.</p>';return}
 var h='<p class="b6sm">Les réglages de la roue, les liens vers Instagram, TikTok et Strava, et les mentions légales. Pour les partenaires, allez dans l’onglet « 🤝 Partenaires ». Les cases marquées JSON attendent une liste écrite dans un format précis : si vous n’êtes pas sûr, notez d’abord ce que vous voulez changer et gardez une copie de secours avant.</p><p class="b6sm">Enregistrer recharge la page.</p>',F=[];
 function add(path,v){var id='f'+F.length;F.push([id,path,v]);var t=typeof v;
  if(t==='boolean')h+='<label>'+path+'</label><select id="'+id+'"><option value="true"'+(v?' selected':'')+'>oui</option><option value="false"'+(v?'':' selected')+'>non</option></select>';
  else if(t==='number'||t==='string')h+='<label>'+path+'</label><input id="'+id+'" value="'+esc(v)+'">';
  else h+='<label>'+path+' (JSON)</label><textarea id="'+id+'" style="min-height:90px">'+esc(JSON.stringify(v,null,1))+'</textarea>'}
 Object.keys(cfg0).forEach(function(k){if(k==='shop'||k==='firebase'||k==='partnerLogos'||k==='partners'||k==='partnerAds')return;var v=cur[k];if(v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length&&k!=='spinCodes'){Object.keys(v).forEach(function(s){add(k+'.'+s,v[s])})}else add(k,v)});
 h+='<button class="pri" id="cfgok">✔ Enregistrer et recharger</button>';c.innerHTML=h;
 c.addEventListener('input',function(){formDirty=true});
 $('#cfgok',c).onclick=function(){var cfg={};try{F.forEach(function(f){var el=$('#'+f[0],c),orig=f[2],v;
   if(typeof orig==='boolean')v=el.value==='true';else if(typeof orig==='number'){v=parseFloat(String(el.value).replace(',','.'));if(isNaN(v))throw new Error(f[1]+' : nombre attendu')}else if(typeof orig==='string')v=el.value;else v=JSON.parse(el.value);
   var parts=f[1].split('.'),o0=cfg0,i;for(i=0;i<parts.length;i++)o0=o0&&o0[parts[i]];
   if(JSON.stringify(o0)!==JSON.stringify(v)){var t=cfg;for(i=0;i<parts.length-1;i++){t[parts[i]]=t[parts[i]]||{};t=t[parts[i]]}t[parts[parts.length-1]]=v}})}catch(e){return alert('Erreur : '+e.message)}
  var keepShop=ED().cfg&&ED().cfg.shop;if(keepShop)cfg.shop=keepShop;var keepFb=ED().cfg&&ED().cfg.firebase;if(keepFb)cfg.firebase=keepFb;
  ['partnerLogos','partners','partnerAds'].forEach(function(k){var kv=(ED().cfg&&ED().cfg[k]!=null)?ED().cfg[k]:cfg0[k];if(kv!=null)cfg[k]=kv});
  snap();ED().cfg=cfg;reloadWith()}};

/* ---- photos d’une liste (article, version ou couleur) : même fonctionnement partout ---- */
function photoList(list,pfx,d){list=list||[];
 var h='<div>'+list.map(function(u,k){return '<span style="display:inline-block;margin:3px;text-align:center"><img src="'+esc(u)+'" alt="" style="height:64px;border-radius:8px;display:block"><button data-a="'+pfx+'l" '+d+' data-k="'+k+'" title="Déplacer à gauche">←</button><button data-a="'+pfx+'r" '+d+' data-k="'+k+'" title="Déplacer à droite">→</button><button class="red" data-a="'+pfx+'x" '+d+' data-k="'+k+'" title="Retirer cette photo">✕</button></span>'}).join('');
 return h+(list.length<5?'<div><button data-a="'+pfx+'+" '+d+'>📷 Ajouter une photo ('+list.length+'/5)</button></div>':'<div class="b6sm">5 photos : c’est le maximum.</div>')+'</div>'}
function poidsTxt(n){return n>=1048576?(n/1048576).toFixed(1).replace('.',',')+' Mo':Math.max(1,Math.round(n/1024))+' Ko'}
var POIDSMAX=2097152;
function poidsPrevu(items,key){var e=ED(),base=JSON.stringify(e).length;
 if(items){try{base=base-JSON.stringify(((e.cfg||{}).shop||{})[key||'items']||[]).length+JSON.stringify(items).length}catch(x){}}
 return base}
function poidsLigne(poids){return poids>POIDSMAX
 ? '<div class="b6box" style="border-color:#7a5312"><h4>Attention au poids</h4><p class="b6sm">Ce que vous allez publier pèse environ <b translate="no" data-i18n-skip>'+poidsTxt(poids)+'</b>. Au-delà de 2 Mo le site devient lent à charger et la mise en ligne peut échouer. Retirez quelques photos, ou gardez-les seulement sur l’article plutôt que sur chaque version et chaque couleur.</p></div>'
 : '<p class="b6sm">Poids de ce que vous allez publier : environ <b translate="no" data-i18n-skip>'+poidsTxt(poids)+'</b> (seuil conseillé : 2 Mo).</p>'}
TABS.shop=function(m,c){var cur=(typeof CONFIG!=='undefined'&&CONFIG.shop&&CONFIG.shop.items)||[],items=JSON.parse(JSON.stringify(cur));
 items.forEach(function(it){if(!Array.isArray(it.imgs))it.imgs=it.img?[it.img]:[];delete it.img;it.imgs=it.imgs.slice(0,5);
  if(Array.isArray(it.colors))it.colors.forEach(function(cl){if(Array.isArray(cl.imgs))cl.imgs=cl.imgs.slice(0,5)});else if(it.colors!=null)delete it.colors;
  (it.v||[]).forEach(function(v){if(Array.isArray(v.imgs))v.imgs=v.imgs.slice(0,5);else if(v.imgs!=null)delete v.imgs})});
 function slug(x){return String(x||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,24)||'article'}
 function mkImg(data,cb){var im=new Image();im.onload=function(){var k=Math.min(1,900/Math.max(im.naturalWidth,im.naturalHeight)),cv=D.createElement('canvas');cv.width=Math.round(im.naturalWidth*k);cv.height=Math.round(im.naturalHeight*k);cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height);var o=cv.toDataURL('image/webp',.8);if(o.indexOf('image/webp')<0)o=cv.toDataURL('image/jpeg',.82);cb(o)};im.onerror=function(){cb(data)};im.src=data}
 function hex6(x){x=String(x||'').trim();return /^#[0-9a-fA-F]{6}$/.test(x)?x:''}
 function prixBas(){var all=[],bas=[];items.forEach(function(it){(it.v||[]).forEach(function(v){var x=+v.p;if(x>0)all.push(x)})});
  if(all.length<2)return[];all.sort(function(x,y){return x-y});var med=all[Math.floor(all.length/2)];
  items.forEach(function(it){(it.v||[]).forEach(function(v){var x=+v.p;if(!(x>=1)||(med>0&&x<med*0.3))bas.push({n:it.n||'(sans nom)',k:v.k||'',p:v.p})})});return bas}
 var lastDel=null;
 function render(){var y=m.scrollTop,poids=poidsPrevu(items),
  h='<p class="b6sm">Ici vous ajoutez, modifiez ou retirez les articles que vous vendez. Chaque article a sa propre page et un bouton « Ajouter au panier ». Une version est un choix possible du même article, avec son prix, par exemple Maillot vélo ou T-shirt, lot de 5 ou lot de 10.</p>'
  +'<p class="b6sm">Rien ne change sur le site public tant que vous n’avez pas cliqué sur « ✔ Enregistrer et recharger », puis sur « 🚀 Mettre en ligne ».</p>'
  +'<div class="b6box"><h4>Quelles photos voit le client</h4><p class="b6sm">Dans l’ordre : les photos de la couleur choisie si elles existent, sinon celles de la version choisie, sinon celles de l’article. Une version sans photos montre donc celles de l’article. Les couleurs sont facultatives : si un article n’en a pas, rien ne change pour lui.</p></div>'
  +poidsLigne(poids)
  +(function(){var bas=prixBas();return bas.length?'<div class="b6box" style="border-color:#7a5312"><h4>Vérifiez ces prix</h4><p class="b6sm">Ces prix sont très bas par rapport aux autres. Un prix trop bas, ou à 0, fait partir la commande chez l’imprimeur sans que vous soyez payé.</p><ul class="b6ck">'+bas.map(function(x){return '<li class="n">'+esc(x.n)+' · version '+esc(x.k)+' : '+esc(String(x.p))+' euros</li>'}).join('')+'</ul></div>':''})()
  +(lastDel?'<div class="b6box"><h4>Suppression</h4><p class="b6sm">« '+esc(lastDel.it.n||'article')+' » a été retiré de la liste. Rien n’est perdu tant que vous n’avez pas enregistré.</p><button data-a="undel">↶ Annuler la suppression</button></div>':'');
  items.forEach(function(it,i){h+='<div class="b6item" data-idx="'+i+'" style="border:1px solid #8886;border-radius:10px;padding:10px;margin:10px 0"><div><button class="b6dh" data-drag="1" title="Glisser pour réordonner">⠿⠿</button> <b>'+esc(it.e||'')+' '+esc(it.n||'(sans nom)')+'</b> <button class="red" data-a="del" data-i="'+i+'">🗑 Supprimer l’article</button></div>'
   +'<label>Nom de l’article</label><input data-i="'+i+'" data-f="n" value="'+esc(it.n||'')+'"><div class="b6ex">Exemple : <b>Maillot officiel</b></div>'
   +'<label>Emoji (petit badge sur la photo)</label><input data-i="'+i+'" data-f="e" maxlength="4" value="'+esc(it.e||'')+'"><div class="b6ex">Exemple : <b>👕</b>. Laissez vide si vous n’en voulez pas.</div>'
   +'<label>Phrase courte (sous le nom, dans la grille)</label><input data-i="'+i+'" data-f="tag" value="'+esc(it.tag||'')+'"><div class="b6ex">Exemple : <b>Tissu technique, coupe cycliste</b></div>'
   +'<label>Accroche (en haut de la page de l’article)</label><textarea data-i="'+i+'" data-f="lead" style="min-height:60px">'+esc(it.lead||'')+'</textarea><div class="b6ex">Une ou deux phrases qui donnent envie. Exemple : <b>Le maillot que nous portons sur les 1 503 km.</b></div>'
   +'<label>Description détaillée</label><textarea data-i="'+i+'" data-f="about" style="min-height:120px">'+esc((it.about||[]).join('\n\n'))+'</textarea><div class="b6ex">Pour séparer deux paragraphes, laissez une ligne vide entre eux.</div>'
   +'<label>Tailles proposées</label><input data-i="'+i+'" data-f="sizes" value="'+esc((it.sizes||[]).join(', '))+'"><div class="b6ex">Séparez les tailles par des virgules. Exemple : <b>S, M, L, XL</b>. Laissez vide s’il n’y a pas de taille.</div>'
   +'<label>Conseil de taille (facultatif)</label><input data-i="'+i+'" data-f="sg" value="'+esc(it.sg||'')+'"><div class="b6ex">Exemple : <b>Taille petit, prenez une taille au-dessus.</b></div>'
   +'<label>Photos de l’article (jusqu’à 5)</label>'+photoList(it.imgs,'ip','data-i="'+i+'"')
   +'<div class="b6ex">Elles défilent toutes seules sur la page de l’article, avec les flèches, le glissement du doigt et le zoom. Ce sont elles que le client voit si la version et la couleur choisies n’ont pas leurs propres photos.</div>'
   +'<div style="margin-top:10px"><b>Versions et prix</b></div>';
   it.v.forEach(function(v,j){h+='<div style="background:#8881;border-radius:8px;padding:8px;margin:6px 0"><label>Nom de la version</label><input data-i="'+i+'" data-j="'+j+'" data-f="k" value="'+esc(v.k||'')+'"><div class="b6ex">Exemple : <b>Maillot vélo</b>, <b>T-shirt</b>, ou <b>Lot de 5</b></div>'
    +'<label>Prix en euros</label><input data-i="'+i+'" data-j="'+j+'" data-f="p" inputmode="decimal" value="'+esc(v.p)+'"><div class="b6ex">Écrivez seulement le nombre. Exemple : <b>59</b> ou <b>59,90</b></div>'
    +'<label>Détails de cette version</label><textarea data-i="'+i+'" data-j="'+j+'" data-f="d" style="min-height:70px">'+esc((v.d||[]).join('\n'))+'</textarea><div class="b6ex">Une ligne par point, ils s’affichent en liste. Exemple : <b>Tissu respirant</b> puis <b>Poche arrière zippée</b></div>'
    +'<label>Photos de cette version (jusqu’à 5)</label>'+photoList(v.imgs,'vp','data-i="'+i+'" data-j="'+j+'"')
    +'<div class="b6ex">Quand le client choisit cette version, ce sont ces photos qui s’affichent. Si vous n’en mettez pas, il voit celles de l’article.</div>'
    +'<label>Lien de paiement Stripe de cette version (facultatif)</label><input data-i="'+i+'" data-j="'+j+'" data-f="u" value="'+esc(v.u||'')+'"><div class="b6ex">Exemple : <b>https://buy.stripe.com/aBcDeF</b>. C’est une solution de repli, valable seulement tant que votre serveur de paiement n’est pas configuré. Un client qui passe par ce lien ne crée aucune commande sur le serveur : pas de message vers votre bot, pas d’envoi automatique chez l’imprimeur, et son panier n’est pas vidé. Dès que le serveur fonctionne, laissez cette case vide.</div>'
    +'<label>Identifiant Printful (facultatif)</label><input data-i="'+i+'" data-j="'+j+'" data-f="pf" value="'+esc(v.pf||'')+'"><div class="b6ex">Il sert à envoyer la commande toute seule chez Printful, qui imprime et expédie. Vous le trouvez dans votre compte Printful, sur la fiche du produit, sous le nom « Variant ID » (un nombre). Exemple : <b>4012</b>, ou un numéro par taille : <b>S:4012, M:4013, L:4014</b>.<br>Si vous laissez vide, la vente marche quand même : vous recevez la commande et vous l’expédiez vous-même.</div>'
    +(it.v.length>1?'<button class="red" data-a="delv" data-i="'+i+'" data-j="'+j+'">🗑 Supprimer cette version</button>':'')+'</div>'});
   h+='<button data-a="addv" data-i="'+i+'">＋ Ajouter une version</button>'
    +'<div style="margin-top:12px"><b>Couleurs (facultatif)</b></div><div class="b6ex">Si vous ajoutez des couleurs, le client voit des pastilles sous la photo et les photos changent quand il en choisit une. Si vous n’en ajoutez pas, rien ne change pour cet article.</div>';
   (it.colors||[]).forEach(function(cl,ci){h+='<div style="background:#8881;border-radius:8px;padding:8px;margin:6px 0"><div><b>'+esc(cl.k||'(sans nom)')+'</b> <button data-a="cup" data-i="'+i+'" data-c="'+ci+'">↑</button><button data-a="cdn" data-i="'+i+'" data-c="'+ci+'">↓</button><button class="red" data-a="cdel" data-i="'+i+'" data-c="'+ci+'">🗑 Supprimer cette couleur</button></div>'
    +'<label>Nom de la couleur (vu par le client)</label><input data-i="'+i+'" data-c="'+ci+'" data-f="ck" value="'+esc(cl.k||'')+'"><div class="b6ex">Exemple : <b>Noir</b>, <b>Bleu nuit</b></div>'
    +'<div class="b6r"><div><label>Pastille</label><input type="color" data-i="'+i+'" data-c="'+ci+'" data-f="ch" value="'+(hex6(cl.h)||'#111111')+'" style="height:34px;padding:0"></div><div><label>Code de la couleur</label><input data-i="'+i+'" data-c="'+ci+'" data-f="chx" value="'+esc(cl.h||'')+'"><div class="b6ex">Exemple : <b>#111111</b></div></div></div>'
    +'<label>Photos de cette couleur (jusqu’à 5)</label>'+photoList(cl.imgs,'cp','data-i="'+i+'" data-c="'+ci+'"')
    +'<div class="b6ex">Ces photos passent avant celles de la version et celles de l’article.</div></div>'});
   h+='<button data-a="cadd" data-i="'+i+'">＋ Ajouter une couleur</button></div>'});
  h+='<button data-a="add">＋ Ajouter un article</button> <button class="pri" id="shopok">✔ Enregistrer et recharger</button><div id="shoper" style="color:#ff8080;margin-top:6px"></div>';
  c.innerHTML=h;m.scrollTop=y}
 function field(el){var i=+el.getAttribute('data-i'),f=el.getAttribute('data-f'),j=el.getAttribute('data-j'),ci=el.getAttribute('data-c'),it=items[i],v=el.value;if(!it)return;
  if(ci!=null){var cl=(it.colors||[])[+ci];if(!cl)return;
   if(f==='ck')cl.k=v;
   else if(f==='ch'||f==='chx'){cl.h=v;var o=c.querySelector('input[data-i="'+i+'"][data-c="'+ci+'"][data-f="'+(f==='ch'?'chx':'ch')+'"]');if(o){if(f==='chx'){if(hex6(v))o.value=hex6(v)}else o.value=v}}
   return}
  if(j!=null){var x=it.v[+j];if(!x)return;if(f==='p')x.p=parseFloat(String(v).replace(',','.'))||0;else if(f==='d')x.d=v.split('\n').map(function(t){return t.trim()}).filter(Boolean);else x[f]=v;return}
  if(f==='about')it.about=v.split(/\n\s*\n/).map(function(t){return t.trim()}).filter(Boolean);else if(f==='sizes')it.sizes=v.split(/[,;\s]+/).filter(Boolean);else it[f]=v}
 function plist(b,make){var i=+b.getAttribute('data-i'),j=b.getAttribute('data-j'),ci=b.getAttribute('data-c'),it=items[i];if(!it)return null;
  if(ci!=null){var cl=(it.colors||[])[+ci];if(!cl)return null;if(!cl.imgs&&make)cl.imgs=[];return cl.imgs||null}
  if(j!=null){var v=it.v[+j];if(!v)return null;if(!v.imgs&&make)v.imgs=[];return v.imgs||null}
  if(!it.imgs&&make)it.imgs=[];return it.imgs||null}
 dragList(c,'.b6item','[data-drag]',function(){return items},function(){formDirty=true;render()});
 c.addEventListener('input',function(e){if(e.target.getAttribute&&e.target.getAttribute('data-f')){formDirty=true;field(e.target)}});
 c.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-a]');if(!b||!c.contains(b))return;var a=b.getAttribute('data-a'),i=+b.getAttribute('data-i'),j=+b.getAttribute('data-j'),ci=+b.getAttribute('data-c');
  if(/^(ip|vp|cp)(\+|l|r|x)$/.test(a)){var op=a.slice(2),L=plist(b,op==='+'),k=+b.getAttribute('data-k');if(!L)return;
   if(op==='+'){if(L.length>=5)return;return pickImage(function(id){var d2=B.IM()[id];mkImg(d2,function(o){L.push(o);formDirty=true;render()})})}
   if(op==='x'){if(!confirm('Retirer cette photo ?'))return;L.splice(k,1)}
   else if(op==='l'&&k>0)L.splice(k-1,0,L.splice(k,1)[0]);
   else if(op==='r'&&k<L.length-1)L.splice(k+1,0,L.splice(k,1)[0]);
   else return;
   formDirty=true;return render()}
  if(a==='up'&&i>0){items.splice(i-1,0,items.splice(i,1)[0])}else if(a==='dn'&&i<items.length-1){items.splice(i+1,0,items.splice(i,1)[0])}
  else if(a==='del'){var nm=items[i]&&items[i].n||'cet article';if(!confirm('Supprimer l’article « '+nm+' » ?\n\nVous pourrez annuler juste après, avec le bouton « Annuler la suppression ».'))return;lastDel={i:i,it:items[i]};items.splice(i,1)}
  else if(a==='undel'){if(lastDel){items.splice(lastDel.i,0,lastDel.it);lastDel=null}}
  else if(a==='delv'){if(!confirm('Supprimer la version « '+((items[i].v[j]&&items[i].v[j].k)||'')+' » de cet article ?'))return;items[i].v.splice(j,1)}
  else if(a==='addv'){var ref=items[i].v[items[i].v.length-1];items[i].v.push({k:'Nouvelle version',p:(ref&&ref.p>=1?ref.p:25),u:'',d:[]})}
  else if(a==='add'){items.push({id:'a'+uid(),e:'🎁',n:'Nouvel article',tag:'',lead:'',about:[],v:[{k:'Standard',p:10,u:'',d:[]}],sizes:[],sg:''})}
  else if(a==='cadd'){var it2=items[i];it2.colors=it2.colors||[];if(it2.colors.length>=12)return;it2.colors.push({k:'Nouvelle couleur',h:'#111111',imgs:[]})}
  else if(a==='cdel'){var cs=items[i].colors||[];if(!cs[ci])return;if(!confirm('Supprimer la couleur « '+(cs[ci].k||'')+' » ?\n\nSes photos seront retirées de cet article.'))return;cs.splice(ci,1);if(!cs.length)delete items[i].colors}
  else if(a==='cup'&&ci>0){items[i].colors.splice(ci-1,0,items[i].colors.splice(ci,1)[0])}
  else if(a==='cdn'&&items[i].colors&&ci<items[i].colors.length-1){items[i].colors.splice(ci+1,0,items[i].colors.splice(ci,1)[0])}
  else return;formDirty=true;render()});
 c.addEventListener('click',function(e){if(e.target.id!=='shopok')return;var er=$('#shoper',c),seen={};
  for(var i=0;i<items.length;i++){var it=items[i];if(!String(it.n||'').trim())return er.textContent='Article '+(i+1)+' : le nom est obligatoire.';
   if(!it.v.length)return er.textContent=it.n+' : ajoutez au moins une version avec un prix.';
   if((it.imgs||[]).length>5)return er.textContent='L’article « '+it.n+' » : 5 photos au maximum pour l’article.';
   var base=slug(it.id&&!/^a[a-z0-9]{8,}$/.test(it.id)?it.id:it.n),id=base,k=2;while(seen[id])id=base+'-'+(k++);seen[id]=1;it.id=id;
   for(var j=0;j<it.v.length;j++){var v=it.v[j];if(!String(v.k||'').trim())return er.textContent=it.n+' : donnez un nom à chaque version.';if(!(v.p>=1))return er.textContent='L’article « '+it.n+' », version « '+(v.k||'')+' » : le prix doit être d’au moins 1 euro. Un prix à 0 ferait partir la commande chez l’imprimeur sans que vous soyez payé.';if(v.u&&!/^https:\/\//i.test(v.u))return er.textContent=it.n+' : le lien Stripe doit commencer par https://';
    if((v.imgs||[]).length>5)return er.textContent='L’article « '+it.n+' », version « '+v.k+' » : 5 photos au maximum.';
    if(v.imgs&&!v.imgs.length)delete v.imgs}
   if(it.colors){for(var ci=0;ci<it.colors.length;ci++){var cl=it.colors[ci];
     if(!String(cl.k||'').trim())return er.textContent='L’article « '+it.n+' » : donnez un nom à chaque couleur.';
     if(!hex6(cl.h))return er.textContent='L’article « '+it.n+' », couleur « '+cl.k+' » : le code de la couleur doit s’écrire comme #111111 (un dièse et six caractères).';
     cl.h=hex6(cl.h);
     if((cl.imgs||[]).length>5)return er.textContent='L’article « '+it.n+' », couleur « '+cl.k+' » : 5 photos au maximum.';
     if(cl.imgs&&!cl.imgs.length)delete cl.imgs}
    if(!it.colors.length)delete it.colors}}
  var poids=poidsPrevu(items);
  if(poids>POIDSMAX&&!confirm('Ce que vous allez publier pèse environ '+poidsTxt(poids)+'.\n\nAu-delà de 2 Mo le site devient lent à charger et la mise en ligne peut échouer. Vous pouvez retirer quelques photos des versions et des couleurs.\n\nEnregistrer quand même ?'))return;
  snap();var ed=ED();ed.cfg=ed.cfg||{};ed.cfg.shop=Object.assign({},ed.cfg.shop||{},{items:items});withTr(c,reloadWith)});
 render()};
TABS.seo=function(m,c){var s=ED().seo||{};function mv(sel,a){var e=D.querySelector(sel);return e?e.getAttribute(a)||'':''}
 var v={title:s.title||D.title,description:s.description||mv('meta[name="description"]','content'),ogtitle:s.ogtitle||mv('meta[property="og:title"]','content'),ogdesc:s.ogdesc||mv('meta[property="og:description"]','content'),ogimage:s.ogimage||mv('meta[property="og:image"]','content'),ogurl:s.ogurl||mv('meta[property="og:url"]','content')};
 c.innerHTML='<p class="b6sm">Le titre et la description sont ce que Google affiche, et ce qui apparaît quand quelqu’un partage votre site sur WhatsApp ou Instagram. Ils s’appliquent tout de suite sur le site. Pour que l’aperçu de partage change aussi, téléchargez <code>index.html</code> dans l’onglet « 💾 Copie de secours » et remplacez le fichier en ligne.</p>'+
 [['title','Titre de l’onglet du navigateur','Exemple : <b>La Boucle des Six Pays</b>'],['description','Description affichée par Google','Deux lignes maximum, environ 150 caractères'],['ogtitle','Titre quand on partage le lien','Souvent le même que le titre de l’onglet'],['ogdesc','Description quand on partage le lien','Une phrase courte qui donne envie de cliquer'],['ogimage','Image affichée quand on partage le lien','Adresse complète d’une image. Exemple : <b>https://mon-site.fr/og.png</b>'],['ogurl','Adresse de votre site','Exemple : <b>https://naolank.github.io/tour-europe-velo/</b>']].map(function(f){return '<label>'+f[1]+'</label><input data-k="'+f[0]+'" value="'+esc(v[f[0]])+'"><div class="b6ex">'+f[2]+'</div>'}).join('')+'<button class="pri" id="seook">✔ Appliquer</button>';
 c.addEventListener('input',function(){formDirty=true});
 $('#seook',c).onclick=function(){snap();var n={};[].forEach.call(c.querySelectorAll('[data-k]'),function(i){n[i.getAttribute('data-k')]=i.value});ED().seo=n;formDirty=false;commit();setStateLine(m);status('Titre et description appliqués.')}};
TABS.hid=function(m,c){var ops=ED().ops,h='<p class="b6sm">La liste de tout ce que vous avez changé sur les pages du site. Vous pouvez annuler une modification précise sans toucher au reste. Un élément « masqué » est un élément que vous avez supprimé : il n’apparaît plus sur le site, mais il peut revenir.</p>',any=false;
 ops.forEach(function(o,i){if(o.t==='del'){any=true;var e=B.q(o.s);h+='<div style="margin:4px 0">🗑 masqué : <code>'+esc((e?(e.textContent||'').trim().slice(0,40):o.s))+'</code> <button data-r="'+i+'">Restaurer</button></div>'}
  else if(o.t==='add'){any=true;h+='<div style="margin:4px 0">＋ ajouté : <code>'+esc(((o.h&&(o.h['*']||o.h.fr))||'').replace(/<[^>]+>/g,' ').slice(0,40))+'</code> <button data-r="'+i+'" class="red">Retirer</button></div>'}
  else if(o.t==='sty'||o.t==='attr'||o.t==='txt'||o.t==='mv'){any=true;h+='<div style="margin:4px 0" class="b6sm">'+o.t+' · '+esc(o.s)+(o.a?' ['+o.a+']':'')+' <button data-r="'+i+'">Annuler cette modif</button></div>'}});
 if(!any)h+='<p>Aucune modification pour le moment.</p>';c.innerHTML=h;
 [].forEach.call(c.querySelectorAll('[data-r]'),function(b){b.onclick=function(){if(!confirm('Annuler cette modification ?\n\nVous pourrez revenir en arrière avec le bouton « ↶ Annuler » du panneau.'))return;snap();var i=+b.getAttribute('data-r'),o=ED().ops[i];ED().ops.splice(i,1);if(o.t==='add'){var w=D.querySelector('[data-b6a="'+o.id+'"]');if(w)w.remove();commit();TABS.hid(m,c)}else if(o.t==='del'||o.t==='sty'){commit();TABS.hid(m,c)}else reloadWith()}})};

function shopCfg(){var e=ED();e.cfg=e.cfg||{};e.cfg.shop=e.cfg.shop||{};return e.cfg.shop}

/* ===== Traduction automatique (MyMemory, gratuit, depuis le navigateur) ===== */
var TL=['en','it','de','es','rm'],TLN={en:'anglais',it:'italien',de:'allemand',es:'espagnol',rm:'romanche'};
function frStrings(){var out={},sh=(ED().cfg&&ED().cfg.shop)||{},cs=(typeof CONFIG!=='undefined'&&CONFIG.shop)||{};
 function add(t){t=String(t==null?'':t).replace(/\s+/g,' ').trim();if(t&&/[A-Za-zÀ-ÿ]{2}/.test(t)&&t.length<=480)out[t]=1}
 [['items',sh.items||cs.items],['gear',sh.gear||cs.gear]].forEach(function(g){(g[1]||[]).forEach(function(it){add(it.n);add(it.tag);add(it.lead);(it.about||[]).forEach(add);add(it.sg);add(it.btn);(it.v||[]).forEach(function(v){add(v.k);(v.d||[]).forEach(add)});(it.colors||[]).forEach(function(cl){add(cl.k)})})});
 return Object.keys(out)}
function mm(txt,l){return fetch('https://api.mymemory.translated.net/get?q='+encodeURIComponent(txt)+'&langpair=fr|'+l+'&de=aymericpriv@gmail.com').then(function(r){return r.json()}).then(function(j){var t=j&&j.responseData&&j.responseData.translatedText;if(!t||/MYMEMORY WARNING|INVALID|QUERY LENGTH/i.test(t))throw new Error('x');return String(t).replace(/&#39;/g,"’").replace(/&quot;/g,'"').replace(/&amp;/g,'&')})}
function autoTr(force,prog,budget){var e=ED();e.tr=e.tr||{};var todo=[];frStrings().forEach(function(k){TL.forEach(function(l){if(force||!(e.tr[k]&&e.tr[k][l]))todo.push([k,l])})});var done=0,fail=0,t0=Date.now();
 function next(i){if(i>=todo.length||(budget&&Date.now()-t0>budget))return Promise.resolve({n:todo.length,fail:fail,left:todo.length-i});var t=todo[i];prog&&prog(i,todo.length);
  return mm(t[0],t[1]).then(function(v){(e.tr[t[0]]=e.tr[t[0]]||{})[t[1]]=v}).catch(function(){fail++}).then(function(){return new Promise(function(r){setTimeout(r,250)})}).then(function(){return next(i+1)})}
 return next(0)}
function withTr(c,fn){var m=c?$('#trmsg',c)||c.appendChild(Object.assign(D.createElement('div'),{id:'trmsg',className:'b6sm'})):null;
 autoTr(false,function(i,n){if(m)m.textContent='Traduction automatique en 5 langues… '+(i+1)+' / '+n+'. Patiente quelques secondes.'},25000).then(function(r){
  if(r.left||r.fail)alert('Traduction automatique : '+((r.left||0)+(r.fail||0))+' texte(s) ne sont pas encore traduits.\n\nVotre enregistrement est bien pris en compte. Allez dans Réglages puis l’onglet Traductions pour terminer la traduction quand vous voulez.');
  fn()},function(){fn()})}
TABS.tr=function(m,c){var e=ED();e.tr=e.tr||{};
 function render(){var keys=frStrings(),miss=0;keys.forEach(function(k){TL.forEach(function(l){if(!(e.tr[k]&&e.tr[k][l]))miss++})});
  var h='<p class="b6sm"><b>Traduction automatique.</b> Vos textes de la boutique (articles à vendre et équipement) sont traduits en anglais, italien, allemand, espagnol et romanche à chaque « Enregistrer ». C’est une traduction automatique : relisez et corrigez ci-dessous si besoin, vos corrections sont gardées. Le reste du site est déjà traduit.</p><p><b>'+keys.length+'</b> texte(s), <b>'+miss+'</b> traduction(s) manquante(s). <button class="pri" id="trgo">🌍 Traduire ce qui manque</button> <button id="trall">Tout retraduire, mes corrections seront écrasées</button></p><div id="trmsg2" class="b6sm"></div>';
  keys.forEach(function(k,i){h+='<details style="border:1px solid #8886;border-radius:8px;padding:6px 8px;margin:6px 0"><summary>'+esc(k.length>90?k.slice(0,90)+'…':k)+'</summary>'+TL.map(function(l){return '<label>'+TLN[l]+'</label><textarea data-i="'+i+'" data-l="'+l+'" style="min-height:44px">'+esc((e.tr[k]&&e.tr[k][l])||'')+'</textarea>'}).join('')+'</details>'});
  c.innerHTML=h;
  c.querySelectorAll('textarea[data-l]').forEach(function(t){t.oninput=function(){var k=keys[+t.getAttribute('data-i')];(e.tr[k]=e.tr[k]||{})[t.getAttribute('data-l')]=t.value}});
  function run(force){snap();var mm2=$('#trmsg2',c);autoTr(force,function(i,n){mm2.textContent='Traduction… '+(i+1)+' / '+n},120000).then(function(r){saveDraft();render();$('#trmsg2',c).textContent=(r.left||r.fail)?'Il reste '+((r.left||0)+(r.fail||0))+' texte(s) à traduire. Relancez quand vous voulez.':'✔ Traduit. Pensez à mettre en ligne.'})}
  $('#trgo',c).onclick=function(){run(false)};$('#trall',c).onclick=function(){if(confirm('Tout retraduire ?\n\nVos corrections seront remplacées par la traduction automatique.'))run(true)}}
 render()};
TABS.gear=function(m,c){var cur=(typeof CONFIG!=='undefined'&&CONFIG.shop&&CONFIG.shop.gear)||[],items=JSON.parse(JSON.stringify(cur));items.forEach(function(it){it.imgs=Array.isArray(it.imgs)?it.imgs.slice(0,5):[]});
 function slug(x){return String(x||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,24)||'article'}
 function mkImg(data,cb){var im=new Image();im.onload=function(){var k=Math.min(1,900/Math.max(im.naturalWidth,im.naturalHeight)),cv=D.createElement('canvas');cv.width=Math.round(im.naturalWidth*k);cv.height=Math.round(im.naturalHeight*k);cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height);var o=cv.toDataURL('image/webp',.8);if(o.indexOf('image/webp')<0)o=cv.toDataURL('image/jpeg',.82);cb(o)};im.onerror=function(){cb(data)};im.src=data}
 var lastDel=null;
 function render(){var y=m.scrollTop,h='<p class="b6sm">Ici vous présentez le matériel que vous utilisez vraiment pour le voyage. La présentation est la même que pour les articles à vendre, mais le bouton emmène le visiteur chez le vendeur, sur son site.</p>'
  +'<p class="b6sm">Si vous n’avez pas encore le lien, laissez-le vide : la page écrit alors « Lien d’achat bientôt disponible ». Rien ne change sur le site public avant « ✔ Enregistrer et recharger » puis « 🚀 Mettre en ligne ».</p>'
  +poidsLigne(poidsPrevu(items,'gear'))
  +(lastDel?'<div class="b6box"><h4>Suppression</h4><p class="b6sm">« '+esc(lastDel.it.n||'élément')+' » a été retiré de la liste. Rien n’est perdu tant que vous n’avez pas enregistré.</p><button data-a="undel">↶ Annuler la suppression</button></div>':'');
  items.forEach(function(it,i){h+='<div class="b6item" data-idx="'+i+'" style="border:1px solid #8886;border-radius:10px;padding:10px;margin:10px 0"><div><button class="b6dh" data-drag="1" title="Glisser pour réordonner">⠿⠿</button> <b>'+esc(it.e||'')+' '+esc(it.n||'(sans nom)')+'</b> <button class="red" data-a="del" data-i="'+i+'">🗑 Supprimer</button></div>'
   +'<label>Nom du matériel</label><input data-i="'+i+'" data-f="n" value="'+esc(it.n||'')+'"><div class="b6ex">Exemple : <b>Sacoche de guidon 8 L</b></div>'
   +'<label>Emoji (petit badge sur la photo)</label><input data-i="'+i+'" data-f="e" maxlength="4" value="'+esc(it.e||'')+'"><div class="b6ex">Exemple : <b>🎒</b>. Laissez vide si vous n’en voulez pas.</div>'
   +'<label>Phrase courte (sous le nom, dans la grille)</label><input data-i="'+i+'" data-f="tag" value="'+esc(it.tag||'')+'"><div class="b6ex">Exemple : <b>Étanche, fixation rapide</b></div>'
   +'<label>Accroche (en haut de la page)</label><textarea data-i="'+i+'" data-f="lead" style="min-height:60px">'+esc(it.lead||'')+'</textarea><div class="b6ex">Une ou deux phrases. Exemple : <b>Elle a tenu les six pays sans broncher.</b></div>'
   +'<label>Description détaillée</label><textarea data-i="'+i+'" data-f="about" style="min-height:120px">'+esc((it.about||[]).join('\n\n'))+'</textarea><div class="b6ex">Pour séparer deux paragraphes, laissez une ligne vide entre eux.</div>'
   +'<label>Lien d’achat chez le vendeur</label><input data-i="'+i+'" data-f="u" value="'+esc(it.u||'')+'"><div class="b6ex">Collez l’adresse de la page du produit. Elle doit commencer par <b>https://</b></div>'
   +'<label>Texte du bouton</label><input data-i="'+i+'" data-f="btn" value="'+esc(it.btn||'Acheter chez le vendeur')+'"><div class="b6ex">Exemple : <b>Voir chez le vendeur</b></div>'
   +'<label>Photos (jusqu’à 5, elles défilent sur la page)</label>'+photoList(it.imgs,'gp','data-i="'+i+'"')
   +'<div class="b6ex">La première photo est celle que l’on voit dans la grille. Les flèches servent à changer leur ordre.</div></div>'});
  h+='<button data-a="add">＋ Ajouter un équipement</button> <button class="pri" id="gearok">✔ Enregistrer et recharger</button><div id="gearer" style="color:#ff8080;margin-top:6px"></div>';c.innerHTML=h;m.scrollTop=y}
 dragList(c,'.b6item','[data-drag]',function(){return items},function(){formDirty=true;render()});
 c.addEventListener('input',function(e){var el=e.target,f=el.getAttribute&&el.getAttribute('data-f');if(!f)return;var it=items[+el.getAttribute('data-i')];if(!it)return;formDirty=true;it[f]=f==='about'?el.value.split(/\n\s*\n/).map(function(t){return t.trim()}).filter(Boolean):el.value});
 c.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-a]');if(b&&c.contains(b)){var a=b.getAttribute('data-a'),i=+b.getAttribute('data-i'),j=+b.getAttribute('data-j');
  if(a==='up'&&i>0)items.splice(i-1,0,items.splice(i,1)[0]);else if(a==='dn'&&i<items.length-1)items.splice(i+1,0,items.splice(i,1)[0]);
  else if(a==='del'){var nm=items[i]&&items[i].n||'cet élément';if(!confirm('Supprimer « '+nm+' » de la liste ?\n\nVous pourrez annuler juste après, avec le bouton « Annuler la suppression ».'))return;lastDel={i:i,it:items[i]};items.splice(i,1)}
  else if(a==='undel'){if(lastDel){items.splice(lastDel.i,0,lastDel.it);lastDel=null}}
  else if(a==='add')items.push({id:'a'+uid(),e:'🎒',n:'Nouvel équipement',tag:'',lead:'',about:[],u:'',btn:'Acheter chez le vendeur',imgs:[]});
  else if(/^gp(\+|l|r|x)$/.test(a)){var op=a.slice(2),L=items[i]&&items[i].imgs,k=+b.getAttribute('data-k');if(!L)return;
   if(op==='+'){if(L.length>=5)return;return pickImage(function(id){var d=B.IM()[id];mkImg(d,function(o){L.push(o);formDirty=true;render()})})}
   if(op==='x'){if(!confirm('Retirer cette photo ?'))return;L.splice(k,1)}
   else if(op==='l'&&k>0)L.splice(k-1,0,L.splice(k,1)[0]);
   else if(op==='r'&&k<L.length-1)L.splice(k+1,0,L.splice(k,1)[0]);
   else return}
  else return;formDirty=true;return render()}
  if(e.target.id!=='gearok')return;var er=$('#gearer',c),seen={};
  for(var i2=0;i2<items.length;i2++){var it=items[i2];if(!String(it.n||'').trim())return er.textContent='Équipement '+(i2+1)+' : le nom est obligatoire.';if(it.u&&!/^https:\/\//i.test(it.u))return er.textContent=it.n+' : le lien doit commencer par https://';
   if((it.imgs||[]).length>5)return er.textContent='L’équipement « '+it.n+' » : 5 photos au maximum.';
   var base=slug(it.id&&!/^a[a-z0-9]{8,}$/.test(it.id)?it.id:it.n),id=base,k=2;while(seen[id])id=base+'-'+(k++);seen[id]=1;it.id=id}
  var pg=poidsPrevu(items,'gear');
  if(pg>POIDSMAX&&!confirm('Ce que vous allez publier pèse environ '+poidsTxt(pg)+'.\n\nAu-delà de 2 Mo le site devient lent à charger et la mise en ligne peut échouer. Vous pouvez retirer quelques photos.\n\nEnregistrer quand même ?'))return;
  snap();shopCfg().gear=items;withTr(c,reloadWith)});
 render()};
TABS.partners=function(m,c){var cfg0=B.cfg0,cur=(typeof CONFIG!=='undefined'?CONFIG:null);if(!cfg0||!cur){c.innerHTML='<p>Configuration introuvable.</p>';return}
 var base=(ED().cfg&&ED().cfg.partnerLogos)||cur.partnerLogos||cfg0.partnerLogos||[];
 var items=JSON.parse(JSON.stringify(base)).map(function(p){var imgs=Array.isArray(p.imgs)?p.imgs.slice(0,3):(p.img?[p.img]:[]);return{n:p.n||'',imgs:imgs,u:p.u||'',maj:!!p.maj,d:p.d||''}});
 function mkImg(data,cb){var im=new Image();im.onload=function(){var k=Math.min(1,600/Math.max(im.naturalWidth,im.naturalHeight)),cv=D.createElement('canvas');cv.width=Math.round(im.naturalWidth*k);cv.height=Math.round(im.naturalHeight*k);cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height);var o=cv.toDataURL('image/webp',.85);if(o.indexOf('image/webp')<0)o=cv.toDataURL('image/jpeg',.85);cb(o)};im.onerror=function(){cb(data)};im.src=data}
 var lastDel=null;
 function render(){var y=m.scrollTop,h='<p class="b6sm">Ici vous ajoutez les marques et personnes qui vous soutiennent. Chacune apparaît sur la page « Partenaires », avec son logo, sa description et un lien vers son site. Cochez « Partenaire majeur » pour qu’elle apparaisse aussi dans le bandeau qui défile sur la page d’accueil.</p>'
  +'<p class="b6sm">Rien ne change sur le site public tant que vous n’avez pas cliqué sur « ✔ Enregistrer et recharger », puis sur « 🚀 Mettre en ligne ».</p>'
  +(lastDel?'<div class="b6box"><h4>Suppression</h4><p class="b6sm">« '+esc(lastDel.it.n||'partenaire')+' » a été retiré de la liste. Rien n’est perdu tant que vous n’avez pas enregistré.</p><button data-a="undel">↶ Annuler la suppression</button></div>':'');
  if(!items.length)h+='<p class="b6sm">Aucun partenaire pour le moment.</p>';
  items.forEach(function(it,i){h+='<div class="b6item" data-idx="'+i+'" style="border:1px solid #8886;border-radius:10px;padding:10px;margin:10px 0">'
   +'<div><button class="b6dh" data-drag="1" title="Glisser pour réordonner">⠿⠿</button> '+(it.imgs[0]?'<img src="'+esc(it.imgs[0])+'" alt="" style="height:48px;border-radius:6px;vertical-align:middle;margin-right:8px">':'')+'<b>'+esc(it.n||'(sans nom)')+'</b> <button class="red" data-a="del" data-i="'+i+'">🗑 Supprimer</button></div>'
   +'<label>Nom du partenaire</label><input data-i="'+i+'" data-f="n" value="'+esc(it.n||'')+'"><div class="b6ex">Exemple : <b>Vélo Confort Lyon</b></div>'
   +'<label>Photos (jusqu’à 3, affichées en petit carrousel sur la page Partenaires)</label><div style="display:flex;gap:8px;flex-wrap:wrap">'
   +[0,1,2].map(function(k){var has=!!it.imgs[k];return '<div style="text-align:center">'+(has?'<img src="'+esc(it.imgs[k])+'" alt="" style="height:60px;border-radius:6px;display:block;margin-bottom:4px">':'<div style="width:60px;height:60px;border-radius:6px;background:#8883;display:flex;align-items:center;justify-content:center;margin-bottom:4px;color:#8886">'+(k+1)+'</div>')+'<button data-a="pimg" data-i="'+i+'" data-k="'+k+'">🖼 '+(has?'Changer':'Ajouter')+'</button>'+(has?'<br><button class="red" data-a="pimgx" data-i="'+i+'" data-k="'+k+'">✕ Retirer</button>':'')+'</div>'}).join('')
   +'</div>'
   +'<label>Description (affichée sur la page Partenaires)</label><textarea data-i="'+i+'" data-f="d" style="min-height:70px">'+esc(it.d||'')+'</textarea><div class="b6ex">Facultatif. Une ou deux phrases qui présentent le partenaire.</div>'
   +'<label>Lien vers son site</label><input data-i="'+i+'" data-f="u" value="'+esc(it.u||'')+'"><div class="b6ex">Facultatif. Doit commencer par <b>https://</b></div>'
   +'<label><input type="checkbox" style="width:auto;vertical-align:middle" data-i="'+i+'" data-f="maj" '+(it.maj?'checked':'')+'> Partenaire majeur (apparaît aussi dans le bandeau qui défile sur la page d’accueil)</label>'
   +'</div>'});
  h+='<button data-a="add">＋ Ajouter un partenaire</button> <button class="pri" id="partok">✔ Enregistrer et recharger</button><div id="parter" style="color:#ff8080;margin-top:6px"></div>';
  c.innerHTML=h;m.scrollTop=y}
 dragList(c,'.b6item','[data-drag]',function(){return items},function(){formDirty=true;render()});
 c.addEventListener('input',function(e){var el=e.target,f=el.getAttribute&&el.getAttribute('data-f');if(!f)return;var it=items[+el.getAttribute('data-i')];if(!it)return;formDirty=true;it[f]=f==='maj'?el.checked:el.value});
 c.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-a]');if(b&&c.contains(b)){var a=b.getAttribute('data-a'),i=+b.getAttribute('data-i');
  if(a==='up'&&i>0)items.splice(i-1,0,items.splice(i,1)[0]);else if(a==='dn'&&i<items.length-1)items.splice(i+1,0,items.splice(i,1)[0]);
  else if(a==='del'){var nm=items[i]&&items[i].n||'ce partenaire';if(!confirm('Supprimer « '+nm+' » de la liste ?\n\nVous pourrez annuler juste après, avec le bouton « Annuler la suppression ».'))return;lastDel={i:i,it:items[i]};items.splice(i,1)}
  else if(a==='undel'){if(lastDel){items.splice(lastDel.i,0,lastDel.it);lastDel=null}}
  else if(a==='add')items.push({n:'Nouveau partenaire',imgs:[],u:'',maj:false,d:''});
  else if(a==='pimg'){var k=+b.getAttribute('data-k')||0;return pickImage(function(id){var d=B.IM()[id];mkImg(d,function(o){items[i].imgs[k]=o;formDirty=true;render()})})}
  else if(a==='pimgx'){var k2=+b.getAttribute('data-k')||0;if(!confirm('Retirer cette photo ?'))return;items[i].imgs.splice(k2,1)}
  else return;formDirty=true;return render()}
  if(e.target.id!=='partok')return;var er=$('#parter',c);
  for(var i2=0;i2<items.length;i2++){var it=items[i2];if(!String(it.n||'').trim())return er.textContent='Partenaire '+(i2+1)+' : le nom est obligatoire.';if(it.u&&!/^https:\/\//i.test(it.u))return er.textContent=it.n+' : le lien doit commencer par https://'}
  snap();var ed=ED();ed.cfg=ed.cfg||{};ed.cfg.partnerLogos=items.map(function(it){var o={n:it.n};var imgs=(it.imgs||[]).filter(Boolean).slice(0,3);if(imgs.length){o.imgs=imgs;o.img=imgs[0]}if(it.u)o.u=it.u;if(it.maj)o.maj=true;if(it.d)o.d=it.d;return o});withTr(c,reloadWith)});
 render()};
/* libellés en clair des réglages que le serveur de paiement peut annoncer sur /health */
/* === Route /health du serveur de paiement : format figé, clés exactes. === */
function hLine(ok,txt,note){return '<li class="'+(ok?'y':'n')+'">'+(ok?'✔ ':'✖ ')+esc(txt)+(ok?' : prêt':' : à faire')+(note?' <span class="b6sm" translate="no" data-i18n-skip>('+esc(note)+')</span>':'')+'</li>'}
function hInfo(txt,val){return '<li class="y" style="color:#cfd8e3">· '+esc(txt)+' : <b translate="no" data-i18n-skip>'+esc(val)+'</b></li>'}
/* ce que la clé « configure » peut contenir, en clair */
var HCFG=[['stripe_cle','Clé secrète Stripe'],['stripe_webhook_secret','Signature du webhook Stripe','Sans elle, aucune commande ne devient payée.'],
 ['kv_orders','Mémoire des commandes'],['site_url','Adresse du site'],['admin_jeton','Mot de passe de la liste des commandes'],
 ['origine_autorisee','Origine autorisée'],['printful_cle','Clé Printful'],['printful_boutique','Boutique Printful'],
 ['bot_json','Message vers votre bot'],['bot_telegram','Message Telegram']];
var HSTRIPE={reelle:'clé réelle, les paiements sont de vrais paiements',essai:'clé de test, rien ne part chez l’imprimeur et rien ne vous est facturé',absente:'aucune clé',"forme inhabituelle":'forme inhabituelle, vérifiez-la'};
/* mode d’envoi des commandes chez l’imprimeur */
var EMODE={automatique:['automatique','Chaque commande payée part toute seule chez Printful, qui imprime et expédie. Vous n’avez rien à faire.'],
 brouillon:['brouillon','Chaque commande arrive chez Printful en brouillon et attend votre validation dans votre tableau de bord. Tant que vous ne validez pas, rien n’est imprimé.'],
 inactif:['inactif','Rien ne part chez Printful. Vous recevez chaque commande et vous l’expédiez vous-même.'],
 inconnu:['information non disponible','Votre serveur n’a pas renvoyé ce réglage. Il est peut-être d’une version plus ancienne. Mettez-le à jour, ou regardez vos réglages Printful à la main.']};
function emodeBox(k,note){var e=EMODE[k]||EMODE.inconnu;
 return '<div class="b6box"><h4>Mode d’envoi des commandes : '+e[0]+'</h4><p class="b6sm">'+e[1]+(note?' '+note:'')+'</p></div>'}
TABS.pay=function(m,c){var s=(typeof CONFIG!=='undefined'&&CONFIG.shop)||{},ed=shopCfg(),cur=ed.api!=null?ed.api:(s.api||'');
 c.innerHTML='<p class="b6sm"><b>Comment une commande devient un paiement.</b> Le site envoie le panier à votre serveur de paiement (le Worker Cloudflare), qui ouvre la page de paiement Stripe. Le site n’écrit « Paiement reçu » que lorsque Stripe a confirmé le paiement à ce serveur. Votre bot reçoit alors un message complet : montant, articles, client, adresse. La mise en place pas à pas est dans <code>GUIDE-BOUTIQUE.md</code>.</p>'
 +'<label>Adresse du serveur de paiement</label><input id="payapi" value="'+esc(cur)+'"><div class="b6ex">Exemple : <b>https://boutique-b6p.mon-compte.workers.dev</b>. Laissez vide tant que vous ne l’avez pas créé.</div>'
 +'<p class="b6sm">Tant que cette adresse est vide, le panier envoie seulement une demande de commande, jamais marquée comme payée. Les liens Stripe article par article se mettent dans l’onglet « 🛒 Articles à vendre ».</p>'
 +'<div class="b6box"><h4>Trois états de commande à connaître</h4>'
 +'<p class="b6sm"><b>Paiement d’essai.</b> Avec une clé Stripe de test, rien ne part chez l’imprimeur et rien ne vous est facturé. L’état de la commande le dit.</p>'
 +'<p class="b6sm"><b>Brouillon.</b> La commande arrive chez Printful sans être confirmée. C’est vous qui la validez dans votre tableau de bord Printful, et l’impression démarre à ce moment seulement.</p>'
 +'<p class="b6sm"><b>Montant anormal.</b> La somme encaissée ne correspond pas au total attendu. Rien ne part chez l’imprimeur et la commande n’est ni payée ni annulée. C’est le seul cas qui demande une action de votre part : ouvrez la liste des commandes, comparez le montant avec le panier, puis remboursez ou expédiez à la main.</p></div>'
 +'<button id="paytest">🔍 Tester le serveur de paiement</button> <button class="pri" id="payok">✔ Enregistrer et recharger</button><div id="paymsg" class="b6sm" style="margin-top:6px"></div>';
 function localChecks(u){var items=(ed.items&&ed.items.length?ed.items:(s.items||[]))||[],nl=0,np=0,nv=0;
  items.forEach(function(it){(it.v||[]).forEach(function(v){nv++;if(v.u)nl++;if(v.pf)np++})});
  var fb=(ED().cfg&&ED().cfg.firebase)||(typeof CONFIG!=='undefined'&&CONFIG.firebase)||{};
  var out='<p style="margin-top:10px"><b>De votre côté, sur le site</b></p><ul class="b6ck">';
  out+=hLine(!!u,'Adresse du serveur de paiement');
  out+=hLine(items.length>0,'Au moins un article à vendre',items.length+' article(s)');
  out+=hLine(nl>0,'Liens de paiement Stripe par version',nl+' sur '+nv+' version(s)');
  out+=hLine(np>0,'Identifiant Printful rempli',np+' sur '+nv+' version(s)');
  out+=hLine(!!fb.apiKey,'Comptes clients (facultatif)');
  return out+'</ul>'}
 function num(x){if(typeof x!=='number'||!isFinite(x))return null;var t=String(x),i=t.indexOf('.');return i<0?t:t.slice(0,i)+','+t.slice(i+1)}
 /* lecture de /health : clés exactes, rien n’est deviné */
 function readHealth(j){
  var cf=j&&typeof j.configure==='object'&&j.configure?j.configure:null,
      envoi=typeof j.envoi_printful==='string'?j.envoi_printful:null,
      b='';
  if(envoi&&!EMODE[envoi])envoi=null;
  if(envoi==='automatique'&&cf&&cf.printful_cle===false)envoi=null;
  b+=emodeBox(envoi||'inconnu',envoi&&j.paiements_de_test_envoyes_a_printful===false?'Un paiement d’essai ne déclenche jamais d’envoi chez l’imprimeur.':'');
  if(cf){b+='<p><b>Réglages de votre serveur de paiement</b></p><ul class="b6ck">';
   HCFG.forEach(function(k){if(!(k[0] in cf))return;b+=hLine(cf[k[0]]===true,k[1],k[2]||'')});
   if('stripe_cle_mode' in cf)b+=hInfo('Type de clé Stripe',HSTRIPE[cf.stripe_cle_mode]||String(cf.stripe_cle_mode));
   b+='</ul>'}
  else b+='<p class="b6sm">Ce serveur ne renvoie pas la liste de ses réglages. Information non disponible : il est peut-être d’une version plus ancienne.</p>';
  /* règles de la boutique, telles que le serveur les annonce */
  var r='';
  if(j.montant_verifie_avant_confirmation===true)r+=hInfo('Montant vérifié avant toute confirmation','oui');
  else if('montant_verifie_avant_confirmation' in j)r+=hLine(false,'Montant vérifié avant toute confirmation');
  if(num(j.commande_minimale_eur)!=null)r+=hInfo('Commande minimale',num(j.commande_minimale_eur)+' euros');
  if(num(j.quantite_maximale_par_commande)!=null)r+=hInfo('Quantité maximale par commande',num(j.quantite_maximale_par_commande)+' article(s)');
  if(num(j.conservation_commandes_payees_jours)!=null)r+=hInfo('Commandes payées gardées',num(j.conservation_commandes_payees_jours)+' jours');
  if(j.origine_renvoyee)r+=hInfo('Origine renvoyée aux navigateurs',String(j.origine_renvoyee));
  else if('origine_renvoyee' in j)r+=hLine(false,'Origine renvoyée aux navigateurs','aucune, les navigateurs refuseront les appels');
  if(j.livraison&&typeof j.livraison==='object'){
   r+=hInfo('Livraison facturée au client',j.livraison.facturee?(num(j.livraison.montant_eur)||'?')+' euros':'non');
   if(j.livraison.pays_livres&&j.livraison.pays_livres.length)r+=hInfo('Pays livrés',j.livraison.pays_livres.join(', '))}
  if(j.catalogue&&typeof j.catalogue==='object'&&typeof j.catalogue.articles==='number')
   r+=hLine(j.catalogue.articles>0,'Catalogue lu par le serveur',j.catalogue.articles+' article(s)');
  if(r)b+='<p><b>Règles appliquées par le serveur</b></p><ul class="b6ck">'+r+'</ul>';
  if(j.manquant&&j.manquant.length)b+='<div class="b6box" style="border-color:#7a5312"><h4>Ce qui manque pour encaisser</h4><ul class="b6ck">'+j.manquant.map(function(x){return '<li class="n">✖ '+esc(String(x))+'</li>'}).join('')+'</ul></div>';
  if(j.conseils&&j.conseils.length)b+='<div class="b6box"><h4>Conseils du serveur</h4><ul class="b6ck">'+j.conseils.map(function(x){return '<li style="color:#cfd8e3">· '+esc(String(x))+'</li>'}).join('')+'</ul></div>';
  return {body:b,pret:j.pret===true,resume:typeof j.resume==='string'?j.resume:''}}
 $('#paytest',c).onclick=function(){var u=$('#payapi',c).value.trim().replace(/\/+$/,''),msg=$('#paymsg',c);
  if(!/^https:\/\//i.test(u)){msg.innerHTML='<b>L’adresse doit commencer par https://</b>'+localChecks('');return}
  msg.textContent='Test en cours…';
  function fin(head,body){msg.innerHTML=head+(body||'')+localChecks(u)}
  function fallback(why){return fetch(u+'/order?id=test0000test',{cache:'no-store'}).then(function(r){return r.json()}).then(function(j){
    fin('<p><b>'+esc(why)+'</b> Essai de secours sur la route /order : '+(j&&j.status?'le serveur répond.':'réponse inattendue.')+'</p>',emodeBox('inconnu',''))
   }).catch(function(){fin('<p style="color:#ff8080"><b>Aucune réponse du serveur.</b> Vérifiez l’adresse, et que le réglage ALLOWED_ORIGIN du serveur contient bien l’adresse de votre site.</p>')})}
  fetch(u+'/health',{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error('http');return r.json()}).then(function(j){
   if(!j||typeof j!=='object')return fallback('La route /health a répondu quelque chose d’illisible.');
   if(!('configure' in j)&&!('envoi_printful' in j)&&!('pret' in j))return fallback('La route /health n’existe pas encore sur votre serveur.');
   var h=readHealth(j),head=h.pret
    ?'<p style="color:#5fd6a0"><b>✔ Le serveur répond et la boutique peut encaisser.</b>'+(h.resume?' '+esc(h.resume):'')+'</p>'
    :'<p style="color:#ffab6b"><b>⚠ Le serveur répond, mais il manque des réglages.</b>'+(h.resume?' '+esc(h.resume):'')+'</p>';
   fin(head,h.body)
  }).catch(function(){return fallback('La route /health ne répond pas sur votre serveur.')})};
 $('#payok',c).onclick=function(){var u=$('#payapi',c).value.trim();if(u&&!/^https:\/\//i.test(u))return alert('L’adresse doit commencer par https://');snap();shopCfg().api=u;reloadWith()};
 c.addEventListener('input',function(){formDirty=true})};
TABS.acct=function(m,c){var f=(typeof CONFIG!=='undefined'&&CONFIG.firebase)||{},ed=ED().cfg&&ED().cfg.firebase||f,
 K=[['apiKey','Clé du projet (apiKey)','Elle commence par <b>AIza</b>'],['authDomain','Domaine de connexion (authDomain)','Exemple : <b>mon-projet.firebaseapp.com</b>'],['projectId','Nom du projet (projectId)','Exemple : <b>mon-projet</b>'],['appId','Identifiant de l’application (appId)','Exemple : <b>1:123456789:web:abc123</b>']];
 c.innerHTML='<p class="b6sm">Les comptes clients servent à garder le panier et les bons gagnés à la roue d’un appareil à l’autre. C’est facultatif. Tant que ces cases sont vides, le bouton Compte reste caché sur le site.</p>'
 +'<p class="b6sm">Pour les remplir : créez un projet Firebase (gratuit), activez Authentication (e-mail et Google) puis Firestore, ajoutez une application Web, et recopiez ici les 4 valeurs que Firebase affiche sous « firebaseConfig ». Les détails et les règles Firestore sont dans <code>GUIDE-BOUTIQUE.md</code>.</p>'
 +K.map(function(k){return '<label>'+k[1]+'</label><input data-k="'+k[0]+'" value="'+esc(ed[k[0]]||'')+'"><div class="b6ex">'+k[2]+'</div>'}).join('')+'<button class="pri" id="fbok">✔ Enregistrer et recharger</button>';
 c.addEventListener('input',function(){formDirty=true});
 $('#fbok',c).onclick=function(){var o={};K.forEach(function(k){o[k[0]]=$('[data-k="'+k[0]+'"]',c).value.trim()});snap();var e=ED();e.cfg=e.cfg||{};e.cfg.firebase=o.apiKey?o:{};reloadWith()}};
TABS.pub=function(m,c){var g=function(k){return LS(k)||''};
 var p=pend(),nimg=Object.keys(B.IM()).length,poids=poidsPrevu();
 c.innerHTML='<p class="b6sm"><b>Mettre le site à jour en un clic.</b> Le bouton ci-dessous dépose le fichier de vos modifications dans votre dépôt GitHub. Le site public se met à jour en 1 à 2 minutes.</p>'
 +'<div class="b6box"><h4>Ce qui va partir en ligne</h4>'+(p.length?'<ul class="b6ck">'+p.map(function(x){return '<li class="n">→ '+esc(x)+'</li>'}).join('')+'</ul>':'<p class="b6sm">Rien de nouveau pour le moment. Le site en ligne correspond déjà à ce que vous voyez.</p>')
 +(poids>POIDSMAX?'<p class="b6sm" style="color:#ffab6b"><b>Attention au poids.</b> Votre fichier pèse environ <b translate="no" data-i18n-skip>'+poidsTxt(poids)+'</b>. Au-delà de 2 Mo le site devient lent à charger et l’envoi peut échouer. Retirez quelques photos dans l’onglet « 🛒 Articles à vendre ».</p>':'')+'<p class="b6sm">Fichiers envoyés : <code>site-edits.json</code> (environ <span translate="no" data-i18n-skip>'+poidsTxt(poids)+'</span>)'+(nimg?' et <code>site-images.json</code> ('+nimg+' image(s))':'')+'. Votre mot de passe et votre jeton GitHub ne sont jamais envoyés dans ces fichiers, ils restent dans ce navigateur.</p></div>'
 +'<p class="b6sm">La première fois seulement : il faut un jeton GitHub (« fine-grained token ») limité à ce dépôt, avec le droit Contents : Read and write. Vous le créez dans GitHub › Settings › Developer settings. Ensuite ce navigateur le garde et vous n’avez plus qu’à cliquer sur le bouton.</p>'
 +'<label>Dépôt GitHub (propriétaire/nom)</label><input id="gh1" value="'+esc(g('b6p-ghrepo')||'naolank/tour-europe-velo')+'"><div class="b6ex">Exemple : <b>naolank/tour-europe-velo</b></div>'
 +'<label>Branchez</label><input id="gh2" value="'+esc(g('b6p-ghbr')||'main')+'"><div class="b6ex">Exemple : <b>main</b>. Laissez ainsi si vous ne savez pas.</div>'
 +'<label>Dossier du site dans le dépôt</label><input id="gh3" value="'+esc(g('b6p-ghdir'))+'"><div class="b6ex">Laissez vide si <code>index.html</code> est à la racine du dépôt. Exemple sinon : <b>docs</b></div>'
 +'<label>Jeton GitHub</label><input id="gh4" type="password" value="" autocomplete="off" placeholder="'+(ss('b6p-ghtok')?'Déjà saisi pour cette session':'github_pat_…')+'"><div class="b6ex">Il commence par <b>github_pat_</b>. Il n’est jamais réécrit dans cette case et il s’efface dès que vous fermez l’onglet du navigateur : vous devrez le retaper à chaque session. C’est voulu : ce jeton permet de réécrire tout votre site, mieux vaut qu’il ne traîne pas sur cet appareil.'+(ss('b6p-ghtok')?'<br>Il est encore en mémoire pour cette session : laissez la case vide pour le réutiliser.':'')+'</div>'
 +'<button class="pri" id="ghgo">🚀 Publier maintenant</button> <button id="ghdl">⬇ Autre méthode : télécharger le fichier</button><div id="ghmsg" class="b6sm" style="margin-top:8px"></div>';
 function put(repo,br,path,text,tok){var u='https://api.github.com/repos/'+repo+'/contents/'+path.split('/').map(encodeURIComponent).join('/'),h={Authorization:'Bearer '+tok,Accept:'application/vnd.github+json'};
  return fetch(u+'?ref='+encodeURIComponent(br),{headers:h}).then(function(r){return r.ok?r.json():{}}).then(function(cur){var b64=btoa(unescape(encodeURIComponent(text)));return fetch(u,{method:'PUT',headers:h,body:JSON.stringify({message:'Mise à jour du site (admin)',content:b64,branch:br,sha:cur.sha})})}).then(function(r){if(!r.ok)throw new Error(path+' : erreur '+r.status);return r.json()})}
 $('#ghdl',c).onclick=function(){settings('save')};
 $('#ghgo',c).onclick=function(){var repo=$('#gh1',c).value.trim(),br=$('#gh2',c).value.trim()||'main',dir=$('#gh3',c).value.trim().replace(/^\/+|\/+$/g,''),tok=$('#gh4',c).value.trim(),msg=$('#ghmsg',c);
  if(!/^[\w.-]+\/[\w.-]+$/.test(repo))return msg.textContent='Le dépôt doit s’écrire propriétaire/nom, par exemple naolank/tour-europe-velo.';
  if(!tok)tok=ss('b6p-ghtok')||'';
  if(!tok)return msg.textContent='Il manque le jeton GitHub. Retapez-le : il n’est pas gardé d’une session à l’autre.';
  var lst=pend(),rec=lst.length?'\n\nCe qui part en ligne :\n· '+lst.join('\n· '):'\n\nRien de nouveau : le fichier sera simplement redéposé à l’identique.';
  if(!confirm('Mettre le site public à jour maintenant ?'+rec+'\n\nDépôt : '+repo+' (branchez '+br+')\n\nLe site sera à jour dans 1 à 2 minutes.'))return;
  LS('b6p-ghrepo',repo);LS('b6p-ghbr',br);LS('b6p-ghdir',dir);LS('b6p-ghtok',null);ss('b6p-ghtok',tok);
  var pre=dir?dir+'/':'',files=[[pre+'site-edits.json',JSON.stringify(ED(),null,1)]];if(Object.keys(B.IM()).length)files.push([pre+'site-images.json',JSON.stringify(B.IM())]);
  msg.style.color='';msg.textContent='Envoi en cours, ne fermez pas cette fenêtre…';
  files.reduce(function(p2,f){return p2.then(function(){return put(repo,br,f[0],f[1],tok)})},Promise.resolve()).then(function(){
   published();msg.style.color='#5fd6a0';
   msg.innerHTML='✔ C’est publié. Le site public se met à jour dans 1 à 2 minutes. Pour le voir tout de suite, rechargez la page du site avec Ctrl et Maj et R.';
   setStateLine(m);
  }).catch(function(e){msg.style.color='#ff8080';msg.textContent='✖ Échec : '+e.message+'. Vérifiez le jeton, le nom du dépôt et la branche. Rien n’a été modifié en ligne.'})}};
TABS.save=function(m,c){var nimg=Object.keys(B.IM()).length,size=Math.round(JSON.stringify(B.IM()).length/1024);
 c.innerHTML='<p class="b6sm">Deux usages : garder une copie de vos modifications sur votre ordinateur, ou les mettre en ligne à la main si l’onglet « 🚀 Mettre en ligne » ne fonctionne pas.</p>'
 +'<div class="b6box"><h4>Mettre en ligne à la main</h4><ol class="b6sm" style="padding-left:18px;line-height:1.6"><li>Cliquez sur « Télécharger site-edits.json »'+(nimg?' et sur « site-images.json » ('+nimg+' image(s), environ '+size+' Ko)':'')+'.</li><li>Déposez ce ou ces fichiers dans votre dépôt GitHub, au même endroit que <code>index.html</code>, en remplaçant les anciens.</li><li>Si vous avez changé le titre ou la description : téléchargez aussi <code>index.html</code> ci-dessous et remplacez-le.</li><li>Attendez 1 à 2 minutes, puis rechargez le site avec Ctrl et Maj et R.</li></ol></div>'
 +'<button class="pri" id="sv1">⬇ Télécharger site-edits.json</button> <button id="sv2"'+(nimg?'':' disabled')+'>⬇ site-images.json</button> <button id="sv3">⬇ index.html (titre et description)</button>'
 +'<div id="svmsg" class="b6sm" style="margin-top:6px"></div><hr style="border:0;border-top:1px solid #33404e">'+
 '<p class="b6sm">Reprendre une copie de secours (choisissez un ou deux fichiers .json enregistrés plus tôt) :</p><input type="file" id="imp" accept=".json" multiple>'+
 '<p class="b6sm">Tout remettre comme sur le site en ligne. Vos modifications non publiées seront perdues :</p><button id="rst" class="red">Abandonner mon brouillon</button>';
 $('#sv1',c).onclick=function(){var e=JSON.parse(JSON.stringify(ED()));dl('site-edits.json',JSON.stringify(e,null,1));
  var msg=$('#svmsg',c);msg.innerHTML='Fichier téléchargé. Vos modifications ne sont pas encore en ligne : déposez le fichier dans le dépôt. <button id="svok">J’ai déposé le fichier, c’est en ligne</button>';
  $('#svok',c).onclick=function(){published();setStateLine(m);$('#svmsg',c).textContent='Noté. L’état en haut indique maintenant que tout est en ligne.'}};
 $('#sv2',c).onclick=function(){dl('site-images.json',JSON.stringify(B.IM()))};
 $('#sv3',c).onclick=function(){fetch(location.pathname.replace(/\/?$/,function(x){return x?'/index.html':''})).then(function(r){return r.text()}).then(function(src){var s=ED().seo||{};
   function rep(re,val){if(val==null||val==='')return;src=src.replace(re,function(m,a,b){return a+String(val).replace(/&/g,'&amp;').replace(/"/g,'&quot;')+b})}
   if(s.title)src=src.replace(/<title>[\s\S]*?<\/title>/,'<title>'+String(s.title).replace(/</g,'&lt;')+'</title>');
   rep(/(<meta name="description" content=")[^"]*(")/,s.description);rep(/(<meta property="og:title" content=")[^"]*(")/,s.ogtitle);rep(/(<meta property="og:description" content=")[^"]*(")/,s.ogdesc);
   rep(/(<meta property="og:image" content=")[^"]*(")/,s.ogimage);rep(/(<meta name="twitter:image" content=")[^"]*(")/,s.ogimage);rep(/(<meta property="og:url" content=")[^"]*(")/,s.ogurl);
   dl('index.html',src,'text/html')}).catch(function(){alert('Impossible de relire index.html ici (ouvrez le site via http/https, pas en fichier local).')})};
 $('#imp',c).onchange=function(ev){var files=[].slice.call(ev.target.files),left=files.length,got={};files.forEach(function(f){var r=new FileReader();r.onload=function(){try{var j=JSON.parse(r.result);if(j&&j.ops)got.ed=j;else got.im=j}catch(e){alert('Fichier invalide : '+f.name)}if(--left===0){snap();if(got.ed)B.setED(got.ed);if(got.im)B.setIM(got.im);reloadWith()}};r.readAsText(f)})};
 $('#rst',c).onclick=function(){if(!confirm('Abandonner votre brouillon ?\n\nToutes les modifications faites depuis la dernière mise en ligne seront perdues. Le site redevient exactement comme la version en ligne.\n\nCette action ne peut pas être annulée.'))return;
  if(!confirm('Confirmez une dernière fois : abandonner le brouillon ?'))return;
  LS('b6p-draft',null);LS('b6p-draftimg',null);LS('b6p-dirty',null);LS('b6p-imgdirty',null);ss('b6p-hist',null);ss('b6p-fut',null);leaving=true;location.reload()}};
/* mot de passe long tiré au hasard, sans caractères qui se ressemblent */
function genPw(){var al='abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789',n=24,out='',i,r=null;
 try{r=new Uint32Array(n);(window.crypto||window.msCrypto).getRandomValues(r)}catch(e){r=null}
 for(i=0;i<n;i++){out+=al.charAt((r?r[i]:Math.floor(Math.random()*4294967296))%al.length);if(i%6===5&&i<n-1)out+='-'}
 return out}
TABS.pw=function(m,c){c.innerHTML='<p class="b6sm">C’est le mot de passe qui ouvre cette administration. Choisissez le vôtre avant la mise en ligne du site. Seule son empreinte est enregistrée, jamais le mot de passe lui-même, et elle ne quitte pas votre navigateur avant que vous publiez.</p>'
 +'<div class="b6box"><h4>À lire avant de choisir</h4>'
 +'<p class="b6sm">Ce mot de passe ne protège rien de solide, et il ne pourra jamais le faire. Son empreinte part en ligne dans le fichier du site, sans grain de sel. N’importe qui peut la lire et essayer des millions de mots de passe sur son propre ordinateur, sans que vous le sachiez.</p>'
 +'<p class="b6sm">Un contrôle a retrouvé le mot de passe de départ en essayant une simple liste de vingt-quatre mots courants. Depuis un navigateur, on ne sait pas faire mieux : il n’y a pas de serveur pour ralentir les essais.</p>'
 +'<p class="b6sm">Ce qui protège vraiment votre site, c’est votre jeton GitHub. Sans lui, personne ne peut rien publier en ligne, même en ouvrant cette fenêtre. Gardez ce jeton pour vous, et évitez de donner l’adresse avec <code>?admin</code>.</p>'
 +'<p class="b6sm">Le mieux que vous puissiez faire ici : un mot de passe long, tiré au hasard, qui ne ressemble à aucun mot.</p>'
 +'<label>Proposition tirée au hasard</label><input id="pgen" readonly value="'+esc(genPw())+'" style="font-family:ui-monospace,Menlo,monospace">'
 +'<div class="b6ex">Copiez-le dans votre gestionnaire de mots de passe avant de l’utiliser. Personne ne peut vous le rappeler ensuite.</div>'
 +'<button id="pgnew">🎲 Une autre proposition</button> <button id="pgcp">📋 Copier</button> <button id="pguse">↓ Utiliser cette proposition</button><span id="pgmsg" class="b6sm"> </span></div>'
 +'<p class="b6sm">Le nouveau mot de passe devient actif seulement après « 🚀 Mettre en ligne ». Notez-le quelque part : personne ne peut vous le rappeler.</p>'
 +'<label>Nouveau mot de passe</label><input id="p1" type="password"><div class="b6ex">8 caractères au minimum. Plus il est long, mieux c’est.</div><label>Écrivez-le une deuxième fois</label><input id="p2" type="password"><button class="pri" id="pwok">✔ Changer le mot de passe</button>';
 c.addEventListener('input',function(){formDirty=true});
 function pgm(t){var e=$('#pgmsg',c);if(e)e.textContent=' '+t}
 $('#pgnew',c).onclick=function(){$('#pgen',c).value=genPw();pgm('Nouvelle proposition.')};
 $('#pgcp',c).onclick=function(){var f=$('#pgen',c);
  function old(){try{f.removeAttribute('readonly');f.select();f.setSelectionRange(0,99);var ok=D.execCommand('copy');f.setAttribute('readonly','readonly');pgm(ok?'Copié.':'Copiez impossible : sélectionnez le texte et copiez-le à la main.')}catch(e){pgm('Copiez impossible : sélectionnez le texte et copiez-le à la main.')}}
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(f.value).then(function(){pgm('Copié.')},old);else old()};
 $('#pguse',c).onclick=function(){var v=$('#pgen',c).value;$('#p1',c).value=v;$('#p2',c).value=v;formDirty=true;pgm('Recopié dans les deux cases. Vérifiez que vous l’avez bien gardé quelque part.')};
 $('#pwok',c).onclick=function(){var a=$('#p1',c).value,b=$('#p2',c).value;if(a.length<8)return alert('Il faut 8 caractères au minimum.');if(a!==b)return alert('Les deux mots de passe ne sont pas identiques.');
  if(!confirm('Changer le mot de passe de l’administration ?\n\nIl deviendra actif après la mise en ligne. Notez-le bien avant de continuer.'))return;
  snap();ED().pw=ph(a);formDirty=false;commit();alert('Mot de passe changé dans votre brouillon.\n\nAllez dans l’onglet « 🚀 Mettre en ligne » pour qu’il devienne actif.');settings('pub')}};
/* ---- démarrage ---- */
function start(){build();try{if(LS('b6p-ghtok')){ss('b6p-ghtok',LS('b6p-ghtok'));LS('b6p-ghtok',null)}}catch(e){}
 
 D.addEventListener('mouseover',onOver,true);D.addEventListener('click',onClick,true);['mousedown','mouseup','pointerdown','touchstart','dblclick','contextmenu','submit'].forEach(function(t){D.addEventListener(t,onBlock,true)});
 D.addEventListener('keydown',function(e){if(e.key==='Escape'&&ce)endText(true,true)},true);
 window.addEventListener('beforeunload',function(e){if(leaving)return;if(ce||formDirty||isDirty()){e.preventDefault();e.returnValue=''}});
 refresh();loadPub();setTimeout(function(){var v=ss('b6p-view');if(v){ss('b6p-view',null);gotoView(v)}},700);
 setInterval(refresh,60000);
 try{if(!localStorage.getItem('b6p-draft'))saveDraft()}catch(e){}
 bar();initFab();
 var tm=ss('b6p-toast');if(tm){ss('b6p-toast',null);setTimeout(function(){toast(tm)},400)}}
login();
})();
