// Deterministic scheduler/work-count benchmark. No network and no browser timing claims.
// Usage: node scripts/benchmark-feed.mjs [baseline-git-ref]
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {parseHTML} from 'linkedom';
const root=new URL('../',import.meta.url),baseline=process.argv[2]||'7f78aa0';
const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const html=`<html><body><main id="main-page"><section><h2>New</h2>${Array.from({length:30},(_,i)=>`<article><div><h1 class="notranslate">Coin ${i}</h1><span><button id="button-copy-address-context-${'A'.repeat(31)+alphabet[i]}"><h1>Coin ${i}</h1></button></span></div><div aria-label="Top 10 holders">20%</div></article>`).join('')}</section></main></body></html>`;
const flush=()=>new Promise(resolve=>setImmediate(resolve));
async function run(ref){
 const {document,window}=parseHTML(html);window.HTMLElement.prototype.getBoundingClientRect=()=>({width:100,height:30,top:0,bottom:30,left:0,right:100});
 const start=1800000000000;let now=start,id=0,scans=0,evaluations=0,requests=0,completed=0;const timers=new Map();
 class Clock extends Date{static now(){return now;}}
 const later=(fn,delay)=>{const key=++id;timers.set(key,{fn,at:now+delay});return key;};
 const context=vm.createContext({document,location:{href:'https://trade.padre.gg/trenches'},innerHeight:1000,innerWidth:1600,URL,console,Date:Clock,
  setTimeout:later,clearTimeout:key=>timers.delete(key),setInterval:()=>{},MutationObserver:class{observe(){}},
  chrome:{storage:{local:{get:(_,cb)=>cb({enabled:true,external:true})},onChanged:{addListener(){}}},runtime:{sendMessage:m=>{
   if(m.type==='RUG_LENS_RECORD')return Promise.resolve({saved:true});requests++;
   return new Promise(resolve=>later(()=>{completed++;resolve({mint:m.mint,at:now,metrics:{mintActive:false},holders:[],sources:{}});},200));
  }}},
  // This benchmark isolates request dispatch; browser idle scheduling is tested separately.
  RugLensWork:{create:()=>({post:(_,job)=>job(),pause(){},clear(){}})},
  RugLensUI:{isOpen:()=>false,close(){},panel(){},badge(){const host=document.createElement('rug-lens-badge');return {host,update(){}};}}});
 for(const file of ['activity.js','signals.js','engine.js','adapter.js','content.js']){
  if(file==='content.js'){
   const read=context.RugLensAdapter.links;context.RugLensAdapter.links=doc=>{scans++;return read(doc);};
   const evaluate=context.RugLensEngine.evaluate;context.RugLensEngine.evaluate=input=>{evaluations++;return evaluate(input);};
  }
  const source=ref?execFileSync('git',['show',`${ref}:extension/${file}`],{cwd:root,encoding:'utf8'}):readFileSync(new URL(`extension/${file}`,root),'utf8');
  vm.runInContext(source,context);
 }
 const initialEvaluations=evaluations;await flush();
 while(completed<60&&now-start<10000){
  now+=100;
  for(const [key,timer] of [...timers])if(timer.at<=now){timers.delete(key);timer.fn();}
  await flush();
 }
 if(completed!==60)throw Error(`Expected 60 provider completions, received ${completed}`);
 return {initialEvaluations,allCoinsCompletedAtMs:now-start,domScans:scans,totalEvaluations:evaluations,requests};
}
console.log(JSON.stringify({scenario:'30 cards; two mocked 200ms providers per coin; eight coin slots; no DOM mutations',baseline:{ref:baseline,...await run(baseline)},patched:await run()},null,2));
