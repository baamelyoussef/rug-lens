import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';import {parseHTML} from 'linkedom';import {fixture,MARKET} from './fixtures.js';
function setup({external=false,sendMessage,html=fixture(),url=`https://trade.padre.gg/trade/solana/${MARKET}`,adapterPatch,enginePatch,initialNow=Date.now()}={}){
  const {document,window}=parseHTML(html);if(document.querySelector('.scroll'))document.querySelector('.scroll').scrollTop=0;window.HTMLElement.prototype.getBoundingClientRect=()=>({width:100,height:30,top:50,bottom:80,left:0,right:100});
  let tick,storageChange,now=initialNow,timerId=0;const timers=new Map(),updates=[],panels=[];let opened=false;class Clock extends Date{static now(){return now;}}
  const sandbox={document,location:{href:url},innerHeight:1000,innerWidth:1600,URL,console,Date:Clock,
    MutationObserver:class{observe(){}},setInterval(fn){tick=fn;},setTimeout(fn,delay){const id=++timerId;timers.set(id,{fn,at:now+delay});return id;},clearTimeout(id){timers.delete(id);},
    chrome:{storage:{local:{get(defaults,cb){cb({enabled:true,external});}},onChanged:{addListener(fn){storageChange=fn;}}},runtime:{sendMessage:sendMessage||(()=>{throw Error('Page-only mode must not send network requests');})}},
    RugLensUI:{isOpen:()=>opened,close(){opened=false;},badge(onClick){const host=document.createElement('rug-lens-badge');host.addEventListener('click',onClick);return {host,update(result){updates.push(result);}};},panel(model){opened=true;panels.push(model);}}};
  const ctx=vm.createContext(sandbox);
  for(const f of ['activity.js','signals.js','engine.js','adapter.js','content.js']){if(f==='content.js'){adapterPatch?.(ctx.RugLensAdapter);enginePatch?.(ctx.RugLensEngine);}vm.runInContext(readFileSync(new URL(`../extension/${f}`,import.meta.url),'utf8'),ctx);}
  return {document,sandbox,tick:()=>tick(),updates,panels,storageChange,now:()=>now,advance(ms){now+=ms;for(const [id,timer] of [...timers])if(timer.at<=now){timers.delete(id);timer.fn();}}};
}
test('content script injects one heading badge and opens evidence without page-only networking',()=>{
  const s=setup();assert.equal(s.document.querySelectorAll('rug-lens-badge').length,1);s.tick();s.tick();assert.equal(s.document.querySelectorAll('rug-lens-badge').length,1);
  s.document.querySelector('rug-lens-badge').dispatchEvent(new s.document.defaultView.Event('click'));assert.equal(s.panels.at(-1).mint,'A'.repeat(32));assert.ok(s.panels.at(-1).result.known>0);
});
test('navigation clears previous token badge before data for new token arrives',()=>{
  const s=setup();s.sandbox.location.href='https://trade.padre.gg/trade/solana/'+'F'.repeat(32);s.tick();assert.equal(s.document.querySelectorAll('rug-lens-badge').length,0);
});
test('detail page ignores other trade links and replaces disconnected header badges',()=>{
  const s=setup(),link=s.document.createElement('a');link.href=`https://trade.padre.gg/trade/solana/${MARKET}`;link.textContent='Related coin';s.document.body.append(link);s.tick();assert.equal(s.document.querySelectorAll('rug-lens-badge').length,1);
  const heading=s.document.querySelector('h2');heading.replaceWith(heading.cloneNode(true));s.tick();assert.equal(s.document.querySelectorAll('rug-lens-badge').length,1);assert.equal(s.document.querySelector('h2').nextElementSibling.tagName,'RUG-LENS-BADGE');
});
test('switching from holders to trades preserves the holder sample and accumulates unique trades',()=>{
 const s=setup();s.document.querySelector('section').remove();
 const area=s.document.createElement('section');area.innerHTML=`<div data-trade-shell="true"><div><a href="https://solscan.io/tx/${'C'.repeat(88)}">2s</a></div><div>1</div><span>Sell</span><div>20K</div><div>1M</div><div>$100</div><div>1</div><div class="_makerCell_a"><span aria-label="Bundler"></span><div class="_address_a">abc…def</div></div><div></div></div>`;s.document.body.append(area);
 s.tick();s.tick();s.document.querySelector('rug-lens-badge').dispatchEvent(new s.document.defaultView.Event('click'));
 const m=s.panels.at(-1);assert.equal(m.result.activity.count,1);assert.equal(m.result.activity.taggedSellUsd,100);assert.equal(m.result.sample,10);
});

test('contract evidence renders before a slow market response finishes',async()=>{
 const pending={};const s=setup({external:true,sendMessage:m=>new Promise(resolve=>{pending[m.part]=resolve;})});
 s.document.querySelector('rug-lens-badge').dispatchEvent(new s.document.defaultView.Event('click'));
 await new Promise(resolve=>setImmediate(resolve));pending.contract({mint:'A'.repeat(32),at:Date.now(),metrics:{permanentDelegate:true},holders:[],sources:{}});
 await new Promise(resolve=>setImmediate(resolve));
 let model=s.panels.at(-1);assert.equal(model.metrics.permanentDelegate,true);assert.equal(model.loading,true);assert.deepEqual(Array.from(model.partsPending),['market']);assert.equal(model.result.level,'critical');
 pending.market({mint:'A'.repeat(32),at:Date.now(),metrics:{liquidityUsd:9000},sources:{}});
 await new Promise(resolve=>setImmediate(resolve));model=s.panels.at(-1);assert.equal(model.loading,false);assert.equal(model.metrics.permanentDelegate,true);assert.equal(model.metrics.liquidityUsd,9000);
});

test('Trenches fetches reports without opening a coin and retains a resolved pool mint on rescans',async()=>{
 const pool='2RyKJCowXHSxxuSjAwVtKHgABaSDM5shyBgjKPnZU2YB',mint='9NPmnDgL39NmoivaE1XfiFWm7o61repcfkVyvyv9pump',calls=[];
 const html=`<html><body><main id="main-page"><article><div><h1 class="notranslate">merci</h1><span><button id="button-copy-address-context-${pool}"><h1>merci</h1></button></span></div><div aria-label="Top 10 holders">20%</div></article></main></body></html>`;
 const s=setup({html,url:'https://trade.padre.gg/trenches',external:true,sendMessage:async m=>{
  if(m.type==='RUG_LENS_RECORD')return {saved:true};calls.push(m);return m.part==='contract'?{mint,at:Date.now(),metrics:{freezeActive:true},resolution:m.mint===pool?{address:pool,mint,source:'Solana PumpSwap pool account'}:undefined}:{mint:m.mint,at:Date.now(),metrics:{liquidityUsd:50000}};
 }});
 await new Promise(r=>setImmediate(r));assert.equal(calls.length,2);assert.equal(s.panels.length,0);assert.equal(s.updates.at(-1).level,'critical');
 s.tick();await new Promise(r=>setImmediate(r));assert.equal(calls.length,3);assert.equal(calls[2].mint,mint);assert.equal(calls[2].market,pool);
 s.tick();assert.equal(calls.length,3);assert.equal(s.document.querySelectorAll('rug-lens-badge').length,1);
});

test('Terminal holder observations retain verified pool exclusions and unresolved account gaps',async()=>{
 const pool='C'.repeat(31)+'1',unresolved='E'.repeat(32),mint='A'.repeat(32);
 const s=setup({external:true,html:fixture().replace('2.5%</span>','25.18%</span>'),sendMessage:async m=>{
  if(m.type==='RUG_LENS_RECORD')return {saved:true};
  return m.part==='contract'?{mint,at:Date.now(),metrics:{},holders:[{address:unresolved,pct:22,accountType:'unresolved'}],holderVerification:{status:'partial',excludedPools:[{address:pool,mint}],unresolved:[{address:unresolved,pct:22}]}}:{mint,at:Date.now(),metrics:{liquidityUsd:50000}};
 }});
 await new Promise(r=>setImmediate(r));s.document.querySelector('rug-lens-badge').dispatchEvent(new s.document.defaultView.Event('click'));
 const m=s.panels.at(-1);assert.ok(!m.evidenceHolders.some(h=>h.address===pool));assert.equal(m.evidenceHolders.find(h=>h.address===unresolved).accountType,'unresolved');
 assert.ok(!m.result.hardFlags.includes('One non-pool wallet holds at least 20%'));assert.equal(m.result.decision.baselineComplete,false);assert.ok(m.result.decision.gaps.some(g=>g.includes('distinguished from a pool')));
});

test('failed zero-coverage scans are journaled as abstentions rather than disappearing',async()=>{
 const mint='A'.repeat(32),messages=[],html=`<html><body><main id="main-page"><article><div><h1 class="notranslate">unknown</h1><span><button id="button-copy-address-context-${mint}"><h1>unknown</h1></button></span></div><div aria-label="Top 10 holders"></div></article></main></body></html>`;
 setup({html,url:'https://trade.padre.gg/trenches',external:true,sendMessage:async m=>{messages.push(m);return m.type==='RUG_LENS_RECORD'?{saved:true}:{error:'Provider unavailable'};}});
 await new Promise(r=>setImmediate(r));const entry=messages.find(m=>m.type==='RUG_LENS_RECORD');assert.ok(entry);assert.equal(entry.snapshot.result.autoKnown,0);assert.equal(entry.snapshot.result.level,'unknown');assert.match(entry.snapshot.error,/unavailable/);
});

const flush=()=>new Promise(resolve=>setImmediate(resolve));
function feedHTML(stages){return `<html><body><main id="main-page">${stages.map(([stage,count])=>`<section data-test-stage="${stage}"><h2>${{new:'New',final:'Soon',migrated:'Migrated'}[stage]}</h2>${Array.from({length:count},(_,i)=>{const mint=({new:'A',final:'B',migrated:'C'}[stage]).repeat(31)+'123456789ABCDEFGHJKLMNPQRSTUVWXYZ'[i];return `<article><div><h1 class="notranslate">${stage}${i}</h1><span><button id="button-copy-address-context-${mint}"><h1>${stage}${i}</h1></button></span></div><div aria-label="Top 10 holders">20%</div></article>`;}).join('')}</section>`).join('')}</main></body></html>`;}
function stageAdapter(adapter){const links=adapter.links;adapter.links=doc=>links(doc).map(entry=>({...entry,stage:entry.element.closest('section').dataset.testStage,stagePriority:{new:3,final:2,migrated:1}[entry.element.closest('section').dataset.testStage]}));}
test('Trenches starts New Pairs, then Final Stretch, then Migrated independently of column DOM order',async()=>{
 const calls=[],html=feedHTML([['migrated',3],['final',3],['new',3]]);
 const s=setup({external:true,html,url:'https://trade.padre.gg/trenches',adapterPatch:stageAdapter,sendMessage:m=>{calls.push(m);return new Promise(()=>{});}});
 await flush();const contracts=calls.filter(m=>m.part==='contract');assert.deepEqual(contracts.map(m=>m.scanPriority),[3,3,3,2,2,2,1,1]);assert.equal(s.document.querySelectorAll('rug-lens-badge').length,9);
});
test('the oldest waiting card gets a bounded fair slot while new pairs keep arriving',async()=>{
 const calls=[],pending=[],html=feedHTML([['new',8],['migrated',1]]);
 const s=setup({external:true,html,url:'https://trade.padre.gg/trenches',adapterPatch:stageAdapter,sendMessage:m=>{if(m.type==='RUG_LENS_RECORD')return {saved:true};calls.push(m);return new Promise(resolve=>pending.push({m,resolve}));}});
 await flush();assert.equal(calls.length,16);
 const extra=s.document.createElement('article');extra.innerHTML='<div><h1 class="notranslate">fresh</h1><span><button id="button-copy-address-context-DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD"><h1>fresh</h1></button></span></div><div aria-label="Top 10 holders">20%</div>';s.document.querySelector('section').append(extra);
 s.advance(16000);s.tick();const firstMint=pending[0].m.mint;
 for(const task of pending.filter(p=>p.m.mint===firstMint))task.resolve({mint:firstMint,at:s.now(),metrics:{liquidityUsd:10000}});
 await flush();s.tick();await flush();assert.equal(calls.at(-1).mint,'C'.repeat(31)+'1');assert.equal(calls.at(-1).scanPriority,1);
});
test('a failed part retries promptly without refetching fresh evidence from the other part',async()=>{
 const calls=[],s=setup({external:true,sendMessage:async m=>{if(m.type==='RUG_LENS_RECORD')return {saved:true};calls.push(m);return m.part==='contract'?{error:'Provider unavailable'}:{mint:m.mint,at:Date.now(),metrics:{liquidityUsd:10000}};}});
 await flush();assert.equal(calls.length,2);s.advance(2999);await flush();assert.equal(calls.length,2);s.advance(1);s.tick();await flush();assert.equal(calls.length,3);assert.equal(calls.at(-1).part,'contract');
 s.advance(5999);s.tick();await flush();assert.equal(calls.length,3);s.advance(1);s.tick();await flush();assert.equal(calls.length,4);
});
test('a selected loading card promotes its pending parts without launching duplicate scans each tick',async()=>{
 const calls=[],s=setup({external:true,html:feedHTML([['new',1]]),url:'https://trade.padre.gg/trenches',adapterPatch:stageAdapter,sendMessage:m=>{calls.push(m);return new Promise(()=>{});}});
 await flush();s.document.querySelector('rug-lens-badge').dispatchEvent(new s.document.defaultView.Event('click'));await flush();assert.equal(calls.length,4);assert.deepEqual(calls.slice(2).map(m=>m.scanPriority),[4,4]);s.tick();assert.equal(calls.length,4);
});
test('stalled provider replies hit a deadline and release slots for a scheduled retry',async()=>{
 const calls=[],s=setup({external:true,sendMessage:m=>{if(m.type==='RUG_LENS_RECORD')return {saved:true};calls.push(m);return new Promise(()=>{});}});
 await flush();s.document.querySelector('rug-lens-badge').dispatchEvent(new s.document.defaultView.Event('click'));s.advance(22000);await flush();assert.equal(s.panels.at(-1).loading,false);assert.match(s.panels.at(-1).error,/timed out/);s.advance(3000);s.tick();await flush();assert.equal(calls.length,4);
});
test('journal and panel position storage writes do not trigger rescans',()=>{
 let reads=0;const s=setup({adapterPatch:adapter=>{const read=adapter.read;adapter.read=(...args)=>{reads++;return read(...args);};}});const before=reads;
 s.storageChange({scanJournal:{newValue:[]},panelPosition:{newValue:{left:20,top:20}}},'local');assert.equal(reads,before);s.storageChange({enabled:{newValue:true}},'local');assert.equal(reads,before+1);
});
test('refresh dates follow each provider observation rather than the slowest response finishing',async()=>{
 const calls=[],pending={};const s=setup({external:true,sendMessage:m=>{if(m.type==='RUG_LENS_RECORD')return {saved:true};calls.push(m);return new Promise(resolve=>{pending[m.part]=resolve;});}});
 await flush();pending.market({mint:'A'.repeat(32),at:s.now(),metrics:{liquidityUsd:9000}});await flush();s.advance(15000);pending.contract({mint:'A'.repeat(32),at:s.now(),metrics:{mintActive:false}});await flush();s.advance(10000);s.tick();await flush();assert.equal(calls.length,3);assert.equal(calls.at(-1).part,'market');
});

test('quiet pages wake themselves for failed-part retries and obey rate-limit backoff',async()=>{
 const calls=[],s=setup({external:true,sendMessage:async m=>{if(m.type==='RUG_LENS_RECORD')return {saved:true};calls.push(m);return {error:m.part==='contract'?'Provider unavailable':'Provider rate limited; retry in 30 seconds'};}});
 await flush();s.advance(300);await flush();s.advance(2700);await flush();assert.equal(calls.filter(m=>m.part==='contract').length,2);assert.equal(calls.filter(m=>m.part==='market').length,1);
});
test('cards below the viewport receive background scans without opening their pages',async()=>{
 const calls=[],s=setup({external:true,html:feedHTML([['new',1],['migrated',1]]),url:'https://trade.padre.gg/trenches',adapterPatch:adapter=>{stageAdapter(adapter);const links=adapter.links;adapter.links=doc=>links(doc).map(entry=>{entry.element.getBoundingClientRect=()=>({width:100,height:30,top:2000,bottom:2030,left:0,right:100});return entry;});},sendMessage:m=>{calls.push(m);return new Promise(()=>{});}});
 await flush();assert.equal(calls.filter(m=>m.part==='contract').length,2);assert.equal(s.document.querySelectorAll('rug-lens-badge').length,2);
});

function stageSetup({stage='new',adapterPatch,...options}={}){
 const inputs=[],html=feedHTML([[stage,1]]).replaceAll(({new:'A',final:'B',migrated:'C'}[stage]).repeat(31)+'1','A'.repeat(32));
 const s=setup({html,url:'https://trade.padre.gg/trenches',...options,adapterPatch,enginePatch:engine=>{const evaluate=engine.evaluate;engine.evaluate=input=>{inputs.push(input);return evaluate(input);};}});
 return {...s,inputs};
}
function navigateToDetail(s,{mint='A'.repeat(32),stage}={}){
 let html=fixture({mint});if(stage)html=html.replace('</h2></div>','</h2></div><div><span>Stage</span><span>'+stage+'</span></div>');
 s.document.body.innerHTML=parseHTML(html).document.body.innerHTML;s.sandbox.location.href=`https://trade.padre.gg/trade/solana/${MARKET}`;s.tick();s.advance(700);
}
test('fresh scoped Trenches stage reaches the engine and the panel with its provenance',()=>{
 for(const stage of ['new','final','migrated']){
  const s=stageSetup({stage}),input=s.inputs.at(-1);assert.equal(input.stage,stage);assert.equal(input.stageMint,'A'.repeat(32));assert.equal(input.mint,input.stageMint);assert.equal(input.stageAt,s.now());assert.equal(input.stageSource,'Terminal Trenches column');
  s.document.querySelector('rug-lens-badge').dispatchEvent(new s.document.defaultView.Event('click'));assert.equal(s.panels.at(-1).stage,stage);assert.equal(s.panels.at(-1).stageAt,input.stageAt);
 }
});
test('same-mint feed stage survives a detail route keyed by a different pool address only for 120 seconds',()=>{
 const s=stageSetup({stage:'final'}),observedAt=s.now();navigateToDetail(s);
 assert.equal(s.inputs.at(-1).stage,'final');assert.equal(s.inputs.at(-1).stageAt,observedAt);assert.equal(s.inputs.at(-1).stageMint,'A'.repeat(32));
 s.advance(120000);s.tick();assert.equal(s.inputs.at(-1).stage,'unknown');assert.equal(s.inputs.at(-1).stageAt,null);
});
test('stage cache never carries another mint or accepts an observation with a mismatched mint',()=>{
 const s=stageSetup({stage:'new'});navigateToDetail(s,{mint:'C'.repeat(32)});assert.equal(s.inputs.at(-1).stage,'unknown');assert.equal(s.inputs.at(-1).stageMint,'C'.repeat(32));
 const invalid=stageSetup({adapterPatch:adapter=>{const links=adapter.links;adapter.links=doc=>links(doc).map(e=>({...e,stageMint:'D'.repeat(32)}));}});assert.equal(invalid.inputs.at(-1).stage,'unknown');
});
test('new explicit migration evidence replaces the feed stage without borrowing neighboring columns',()=>{
 const s=stageSetup({stage:'new'});navigateToDetail(s,{stage:'Migrated'});assert.equal(s.inputs.at(-1).stage,'migrated');assert.equal(s.inputs.at(-1).stageSource,'Terminal token header');
 const other=setup({html:fixture().replace('</main>','<section><h2>New Pairs</h2></section></main>')});other.document.querySelector('rug-lens-badge').dispatchEvent(new other.document.defaultView.Event('click'));assert.equal(other.panels.at(-1).stage,'unknown');
});
test('moving a live feed card to Migrated updates both its engine stage and queue stage',()=>{
 const s=stageSetup();s.document.querySelector('section h2').textContent='Migrated';s.tick();assert.equal(s.inputs.at(-1).stage,'migrated');
 s.document.querySelector('rug-lens-badge').dispatchEvent(new s.document.defaultView.Event('click'));assert.equal(s.panels.at(-1).stagePriority,1);assert.deepEqual(Array.from(s.panels.at(-1).history,h=>[h.stage,h.mint]),[['new','A'.repeat(32)],['migrated','A'.repeat(32)]]);
});
test('fresh market evidence carries its exact provider timestamp and pair identity to the engine',async()=>{
 const now=Date.now(),s=stageSetup({initialNow:now,external:true,sendMessage:async m=>m.type==='RUG_LENS_RECORD'?{saved:true}:m.part==='market'?{mint:m.mint,at:now,pairDex:'pumpswap',pairAddress:'F'.repeat(32),metrics:{liquidityUsd:50000}}:{mint:m.mint,at:now,metrics:{mintActive:false}}});
 await flush();const input=s.inputs.at(-1);assert.equal(input.marketAt,now);assert.equal(input.marketMint,'A'.repeat(32));assert.equal(input.marketLiquidityUsd,50000);assert.equal(input.pairDex,'pumpswap');assert.equal(input.pairAddress,'F'.repeat(32));assert.equal(input.selectedMarket,'A'.repeat(32));
});
test('an AMM response without its own liquidity cannot borrow the Terminal page liquidity',async()=>{
 const now=Date.now(),s=stageSetup({initialNow:now,external:true,adapterPatch:adapter=>{const links=adapter.links;adapter.links=doc=>links(doc).map(entry=>({...entry,metrics:{...entry.metrics,liquidityUsd:75000}}));},sendMessage:async m=>m.type==='RUG_LENS_RECORD'?{saved:true}:m.part==='market'?{mint:m.mint,at:now,pairDex:'pumpswap',pairAddress:'F'.repeat(32),metrics:{volume1h:10000}}:{mint:m.mint,at:now,metrics:{mintActive:false}}});
 await flush();const input=s.inputs.at(-1);assert.equal(input.metrics.liquidityUsd,75000);assert.equal(input.marketMint,'A'.repeat(32));assert.equal(input.marketLiquidityUsd,undefined);assert.equal(input.pairDex,'pumpswap');assert.equal(input.marketAt,now);
});
test('detail history carries the latest mint-scoped stage instead of comparing across a phase change',()=>{
 const s=stageSetup({stage:'final'});navigateToDetail(s);s.document.querySelector('rug-lens-badge').dispatchEvent(new s.document.defaultView.Event('click'));let row=s.panels.at(-1).history.at(-1);assert.equal(row.stage,'final');assert.equal(row.mint,'A'.repeat(32));assert.equal(row.pool,MARKET);
 const header=s.document.querySelector('h2').parentElement,field=s.document.createElement('div');field.innerHTML='<span>Stage</span><span>Migrated</span>';header.append(field);s.tick();row=s.panels.at(-1).history.at(-1);assert.equal(row.stage,'migrated');assert.equal(row.mint,'A'.repeat(32));
});
