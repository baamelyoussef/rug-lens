import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';import {parseHTML} from 'linkedom';
function setup(){
 const {document,window}=parseHTML('<html><body></body></html>');
 const ctx=vm.createContext({document,console,setTimeout,clearTimeout});
 for(const f of ['engine.js','ui.js'])vm.runInContext(readFileSync(new URL(`../extension/${f}`,import.meta.url),'utf8'),ctx);
 return {document,window,ui:ctx.RugLensUI,model:{name:'TEST',market:'test',result:ctx.RugLensEngine.evaluate({}),manual:{}},callbacks:{refresh(){},manual(){}}};
}
function event(window,type,fields={}){const e=new window.Event(type,{bubbles:true,cancelable:true});for(const [k,v] of Object.entries(fields))Object.defineProperty(e,k,{value:v});return e;}
test('close and refresh buttons remain identical through live updates; one click closes',()=>{
 const s=setup();s.ui.panel(s.model,s.callbacks);const host=s.document.querySelector('rug-lens-panel'),root=host.shadowRoot;
 const close=root.querySelector('.close'),refresh=root.querySelector('.action');
 for(let i=0;i<8;i++)s.ui.panel({...s.model,loading:i%2===0},s.callbacks);
 assert.equal(root.querySelector('.close'),close);assert.equal(root.querySelector('.action'),refresh);
 close.dispatchEvent(event(s.window,'click'));assert.equal(s.ui.isOpen(),false);assert.equal(host.isConnected,false);
});
test('queued redraw cannot reopen a panel after close',async()=>{
 const s=setup();s.ui.panel(s.model,s.callbacks);const host=s.document.querySelector('rug-lens-panel');
 host.dispatchEvent(event(s.window,'pointerdown'));s.ui.panel({...s.model,name:'Updated'},s.callbacks);
 host.shadowRoot.querySelector('.close').dispatchEvent(event(s.window,'click'));await new Promise(r=>setTimeout(r,10));assert.equal(s.ui.isOpen(),false);
});
test('badge preserves its icon during repeated updates and opens once on mouse press',()=>{
 const s=setup();let opens=0;const badge=s.ui.badge(()=>opens++);s.document.body.append(badge.host);badge.update(s.model.result);
 const button=badge.host.shadowRoot.querySelector('button'),svg=button.querySelector('svg');
 for(let i=0;i<10;i++)badge.update(s.model.result);assert.equal(button.querySelector('svg'),svg);
 button.dispatchEvent(event(s.window,'pointerdown',{button:0,pointerType:'mouse'}));assert.equal(opens,1);
 badge.update({...s.model.result,level:'high'});button.dispatchEvent(event(s.window,'click',{detail:1}));assert.equal(opens,1);
 button.dispatchEvent(event(s.window,'click',{detail:0}));assert.equal(opens,2);
});
test('touch opens on click, not while beginning a scroll',()=>{
 const s=setup();let opens=0;const badge=s.ui.badge(()=>opens++),button=badge.host.shadowRoot.querySelector('button');
 button.dispatchEvent(event(s.window,'pointerdown',{button:0,pointerType:'touch'}));assert.equal(opens,0);
 button.dispatchEvent(event(s.window,'click',{detail:1}));assert.equal(opens,1);
});

test('scroll container stays mounted and expanded details are restored before scroll position',()=>{
 const s=setup(),positions=new WeakMap();
 // Model browser scroll clamping: collapsed content cannot hold a deep offset.
 Object.defineProperty(s.window.HTMLElement.prototype,'scrollTop',{configurable:true,get(){return positions.get(this)||0;},set(value){positions.set(this,Math.min(value,this.querySelector('[data-key="methods"]')?.open?2400:100));}});
 s.ui.panel(s.model,s.callbacks);const root=s.document.querySelector('rug-lens-panel').shadowRoot,body=root.querySelector('.body');
 body.querySelector('[data-key="methods"]').open=true;body.scrollTop=900;
 s.ui.panel({...s.model,name:'Fresh analysis'},s.callbacks);
 assert.equal(root.querySelector('.body'),body);assert.equal(body.querySelector('[data-key="methods"]').open,true);assert.equal(body.scrollTop,900);
 s.ui.close();
});

test('wheel and momentum scrolling defer content refresh without disabling native scrolling',async()=>{
 const s=setup();s.ui.panel(s.model,s.callbacks);const root=s.document.querySelector('rug-lens-panel').shadowRoot,body=root.querySelector('.body'),hero=body.firstElementChild;
 let bubbled=0;root.querySelector('.drawer').addEventListener('wheel',()=>bubbled++);
 const wheel=event(s.window,'wheel',{deltaY:200});body.dispatchEvent(wheel);
 for(let i=0;i<5;i++)s.ui.panel({...s.model,name:'Latest '+i},s.callbacks);
 assert.equal(body.firstElementChild,hero);assert.equal(wheel.defaultPrevented,false);assert.equal(bubbled,0);
 await new Promise(r=>setTimeout(r,100));body.dispatchEvent(event(s.window,'scroll'));
 await new Promise(r=>setTimeout(r,100));assert.equal(body.firstElementChild,hero);
 await new Promise(r=>setTimeout(r,110));assert.equal(root.querySelector('.body'),body);assert.notEqual(body.firstElementChild,hero);assert.match(root.querySelector('.brand').textContent,/Latest 4/);
 s.ui.close();
});

test('touch scroll remains stable until the gesture ends and pending updates cannot reopen a closed panel',async()=>{
 const s=setup();s.ui.panel(s.model,s.callbacks);const root=s.document.querySelector('rug-lens-panel').shadowRoot,body=root.querySelector('.body'),hero=body.firstElementChild;
 body.dispatchEvent(event(s.window,'touchstart'));s.ui.panel({...s.model,name:'Pending'},s.callbacks);
 await new Promise(r=>setTimeout(r,200));assert.equal(body.firstElementChild,hero);
 body.dispatchEvent(event(s.window,'touchend'));s.ui.close();await new Promise(r=>setTimeout(r,200));assert.equal(s.ui.isOpen(),false);
});

test('header drag clamps to screen, survives redraw/reopen and resets on double click',async()=>{
 const s=setup();s.window.HTMLElement.prototype.getBoundingClientRect=function(){return {left:parseFloat(this.style.left)||560,top:parseFloat(this.style.top)||64,width:448,height:342};};
 s.ui.panel(s.model,s.callbacks);let root=s.document.querySelector('rug-lens-panel').shadowRoot,head=root.querySelector('.head');
 head.dispatchEvent(event(s.window,'pointerdown',{button:0,pointerId:1,clientX:570,clientY:70}));
 s.document.dispatchEvent(event(s.window,'pointermove',{pointerId:1,clientX:100,clientY:200}));
 s.document.dispatchEvent(event(s.window,'pointerup',{pointerId:1}));
 await new Promise(r=>setTimeout(r,5));assert.equal(root.querySelector('.drawer').style.left,'90px');assert.equal(root.querySelector('.drawer').style.top,'194px');
 s.ui.panel(s.model,s.callbacks);assert.equal(root.querySelector('.drawer').style.left,'90px');
 s.ui.close();s.ui.panel(s.model,s.callbacks);root=s.document.querySelector('rug-lens-panel').shadowRoot;assert.equal(root.querySelector('.drawer').style.left,'90px');
 head=root.querySelector('.head');head.dispatchEvent(event(s.window,'pointerdown',{button:0,pointerId:2,clientX:100,clientY:200}));
 s.document.dispatchEvent(event(s.window,'pointermove',{pointerId:2,clientX:-999,clientY:9999}));s.document.dispatchEvent(event(s.window,'pointerup',{pointerId:2}));
 assert.equal(root.querySelector('.drawer').style.left,'8px');assert.equal(root.querySelector('.drawer').style.top,'418px');
 head.dispatchEvent(event(s.window,'dblclick'));assert.equal(root.querySelector('.drawer').style.left,'');
});

test('panel exposes stage policy without counting inapplicable LP checks as missing data',()=>{
 const s=setup();s.model.result.lifecycle={id:'new',label:'New Pairs',focus:'Current launch exposure',source:'Terminal New column',at:Date.now(),adjustments:[{id:'bundles',from:8,to:4}],notes:[]};
 const rule=s.model.result.checks.find(c=>c.id==='lpLock');rule.status='not-applicable';rule.detail='Recheck the destination pool after migration.';
 s.ui.panel(s.model,s.callbacks);const root=s.document.querySelector('rug-lens-panel').shadowRoot;
 assert.equal(root.querySelector('.stage strong').textContent,'New Pairs');assert.equal(root.querySelector('.stage').title,'Terminal New column');
 const policy=root.querySelector('[data-key="stage-policy"]');assert.match(policy.textContent,/8 → 4 points/);
 assert.doesNotMatch(root.querySelector('[data-key="gaps"]').textContent,/Recheck the destination pool/);
 assert.match(root.querySelector('[data-key="methods"]').textContent,/Not applicable/);
});

test('identical evidence does not rebuild the open panel body or lose expanded sections',()=>{
 const s=setup();s.ui.panel(s.model,s.callbacks);const root=s.document.querySelector('rug-lens-panel').shadowRoot,body=root.querySelector('.body'),hero=body.firstElementChild;
 root.querySelector('[data-key="methods"]').open=true;
 for(let i=0;i<20;i++)s.ui.panel(s.model,s.callbacks);
 assert.equal(body.firstElementChild,hero);assert.equal(root.querySelector('[data-key="methods"]').open,true);
 s.ui.panel({...s.model,error:'Provider is rate limited'},s.callbacks);assert.notEqual(body.firstElementChild,hero);assert.match(body.textContent,/Provider is rate limited/);
});

test('rounded two-sided wallet activity is explicitly indeterminate and never presented as an entry signal',()=>{
 const s=setup();s.model.result.activity={count:5,windows:{'30s':{seconds:30,status:'available',netBuyingWallets:1,netSellingWallets:1,balancedWallets:0,indeterminateWallets:1,twoSidedWallets:1,netTokenAmount:40000,approximate:true,eligibleCount:5,minUsd:5,walletCoverage:1,quantityCoverage:1,pricedCoverage:1}}};
 s.ui.panel(s.model,s.callbacks);const root=s.document.querySelector('rug-lens-panel').shadowRoot;
 assert.match(root.querySelector('.body').textContent,/1 direction unclear/);assert.match(root.querySelector('[data-key="wallet-flow"]').textContent,/due to rounded amounts/);assert.match(root.querySelector('[data-key="wallet-flow"]').textContent,/≈/);
});
