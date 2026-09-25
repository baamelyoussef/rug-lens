import test from 'node:test';import assert from 'node:assert/strict';import '../extension/engine.js';
const {evaluate}=globalThis.RugLensEngine;
const check=(r,id)=>r.checks.find(c=>c.id===id);
test('empty, null, malformed and missing data never mean safe',()=>{
  for(const metrics of [{},{top10Pct:null,mintActive:null},{top10Pct:NaN,bundlePct:200,liquidityUsd:'0'}]){
    const r=evaluate({metrics});assert.equal(r.level,'unknown');assert.equal(r.score,null);assert.equal(r.coverage,0);
  }
});
test('known danger is flagged even with very limited coverage',()=>{const r=evaluate({metrics:{freezeActive:true}});assert.equal(r.level,'critical');assert.equal(r.score,75);assert.ok(r.coverage<10);});
test('pool holders excluded; partial small sample cannot clear largest-holder rule',()=>{
  const r=evaluate({holders:[{address:'pool',isPool:true,pct:80},{address:'a',pct:3}]});assert.equal(check(r,'largest').status,'unknown');assert.equal(r.sample,1);
});
test('partial samples can reveal a dangerous large holder',()=>{const r=evaluate({holders:[{pct:15}]});assert.equal(check(r,'largest').points,18);});
test('same CEX funder does not trigger common private-wallet funding',()=>{
  const holders=Array.from({length:10},(_,i)=>({address:String(i),pct:1+i*.1,funder:'exchange',funderIsService:true,fundingTimeLabel:'1m',fundingAgeSeconds:60}));
  const r=evaluate({holders});assert.equal(check(r,'sharedFunding').points,0);assert.equal(check(r,'fundingTime').points,0);
});
test('correlated holder heuristics are capped, not added without limit',()=>{
  const holders=Array.from({length:10},(_,i)=>({address:String(i),pct:2.5,sol:.01,bought:0,fresh:true,platform:'same',funder:'private',fundingTimeLabel:'1m',fundingAgeSeconds:60,entryMc:4000}));
  const r=evaluate({holders,metrics:{marketCapUsd:50000,bundlePct:40,insiderPct:40,sniperPct:40}});
  assert.equal(r.score,50);assert.ok(r.hardFlags.length>0);assert.ok(r.groups.coordination>40);assert.equal(check(r,'lowBalances').points,10);
});
test('no recorded data is distinct from numeric zero',()=>{
  const holders=Array.from({length:10},(_,i)=>({address:String(i),pct:2,sol:null,bought:null}));const r=evaluate({holders});
  assert.equal(check(r,'lowBalances').status,'unknown');assert.equal(check(r,'zeroBuys').status,'unknown');
});
test('manual answers expire and unknown does not clear missing checks',()=>{
  assert.equal(check(evaluate({manual:{devHistory:{status:'flag',at:Date.now()}}}),'devHistory').points,20);
  assert.equal(check(evaluate({manual:{devHistory:{status:'clear',at:Date.now()-301000}}}),'devHistory').status,'unknown');
});
test('API rugged true is explicit and overrides an empty report',()=>{const r=evaluate({rugged:true});assert.equal(r.score,100);assert.equal(r.level,'rugged');});
test('lower observed risk requires coverage and all critical checks',()=>{
  const metrics={mintActive:false,freezeActive:false,metadataMutable:false,permanentDelegate:false,nonTransferable:false,defaultFrozen:false,transferHook:false,transferFeePct:0,pausable:false,top10Pct:10,insiderPct:0,bundlePct:0,sniperPct:0,devPct:0,liquidityUsd:50000,lpLockedPct:100,marketCapUsd:10000,volume24hUsd:100000};
  const holders=Array.from({length:10},(_,i)=>({address:String(i),pct:1+i*.1,sol:2+i,bought:5,fresh:false,entryMc:1000+i*700,funder:'private'+i,fundingTimeLabel:i+'d',fundingAgeSeconds:86400*i,platform:'app'+i}));
  const r=evaluate({metrics,holders,holdersTopComplete:true});assert.equal(r.level,'lower');assert.equal(r.missingCore.length,0);
  const stale=evaluate({metrics,holders,holdersTopComplete:true,staleEvidence:true});assert.equal(stale.level,'limited');assert.match(stale.summary,/refresh/);
  delete metrics.lpLockedPct;
  const automaticOnly=evaluate({metrics,holders,holdersTopComplete:true});
  assert.equal(automaticOnly.level,'lower');assert.ok(automaticOnly.autoCoverage>0);
  assert.equal(automaticOnly.manualKnown,0);assert.equal(automaticOnly.autoTotal,42);
  assert.equal(check(automaticOnly,'lpLock').status,'unknown');assert.equal(automaticOnly.adequate,true);
  delete metrics.freezeActive;
  const missing=evaluate({metrics,holders,holdersTopComplete:true});
  assert.equal(missing.level,'limited');assert.ok(missing.missingCore.includes('freeze'));
});

test('sparse data gets a distinct neutral status; manual reviews cannot inflate auto coverage',()=>{
  const sparse=evaluate({metrics:{mintActive:false}});
  assert.equal(sparse.label,'Wait for data');assert.equal(sparse.autoKnown,1);
  const manual=Object.fromEntries(RugLensEngine.manualIds.map(id=>[id,{status:'clear',at:Date.now()}]));
  const r=evaluate({metrics:{mintActive:false},manual});
  assert.equal(r.autoCoverage,sparse.autoCoverage);assert.equal(r.level,'limited');assert.equal(r.manualKnown,9);
  assert.equal(evaluate({}).label,'Wait for data');
});
test('strong concentration flags red without requiring API coverage; missing data stays gray',()=>{
 assert.equal(evaluate({metrics:{bundlePct:40}}).level,'high');
 assert.equal(evaluate({metrics:{top10Pct:80}}).level,'high');
 assert.equal(evaluate({metrics:{mintActive:false,freezeActive:false}}).level,'limited');
 assert.equal(evaluate({metrics:{liquidityUsd:8000}}).level,'caution');
});
test('critical contract facts stay red; a generic provider severity cannot manufacture a red flag',()=>{
 assert.equal(evaluate({metrics:{permanentDelegate:true}}).level,'critical');
 assert.equal(evaluate({metrics:{nonTransferable:true}}).level,'critical');
 const r=evaluate({providerWarnings:[{name:'Severe provider risk',level:'danger'}]});assert.equal(r.level,'caution');assert.equal(r.score,null);assert.equal(r.hardFlags.length,0);
});
test('only explicit rug evidence uses the stop verdict',()=>{
 assert.notEqual(evaluate({metrics:{freezeActive:true,mintActive:true,bundlePct:90}}).level,'rugged');
 assert.equal(evaluate({rugged:true}).label,'Reported rug');
});
test('attention ratio is context, never a fraud score',()=>{
 const r=evaluate({metrics:{watchers:1000,holderCount:10}});assert.equal(r.score,null);assert.equal(r.context[0].value,'100×');
});
test('crash plus heavy selling escalates, but a crash by itself is not a rug',()=>{
 assert.equal(evaluate({metrics:{priceChange5m:-90}}).level,'caution');
 const r=evaluate({metrics:{priceChange5m:-70,buys5m:3,sells5m:40}});assert.equal(r.level,'high');
});
test('null liquidity cannot become a zero-liquidity depth flag',()=>{
 const r=evaluate({metrics:{marketCapUsd:10000,liquidityUsd:null}});assert.equal(check(r,'liquidityDepth').status,'unknown');
});

test('creator rug history is transparent reputational caution; a rally does not erase it',()=>{
 const r=evaluate({rugged:false,metrics:{marketCapUsd:30000,priceChange5m:200},providerWarnings:[{name:'Creator history of rugged tokens',level:'danger'}]});
 assert.equal(r.score,20);assert.equal(r.level,'caution');assert.equal(r.rugged,false);assert.match(r.summary,/Creator history warning/);assert.equal(check(r,'devHistory').source,'RugCheck report');assert.equal(r.manualKnown,0);
});


const baseline=()=>({metrics:{mintActive:false,freezeActive:false,permanentDelegate:false,nonTransferable:false,defaultFrozen:false,transferHook:false,transferFeePct:0,pausable:false,liquidityUsd:50000,top10Pct:18},holders:Array.from({length:8},(_,i)=>({address:String(i),pct:1+i*.2}))});
test('fresh baseline can show observed no-major-flags while bundle and insider gaps remain explicit',()=>{
 const r=evaluate(baseline());
 assert.equal(r.label,'No major flags');assert.equal(r.decision.action,'no-major-flags');assert.equal(r.decision.baselineComplete,true);
 assert.equal(check(r,'largest').status,'unknown');assert.equal(r.adequate,false);
 assert.ok(r.missingCore.includes('bundles'));assert.ok(r.missingCore.includes('insiders'));
 assert.ok(r.decision.gaps.includes('Bundle/insider exposure not measured'));
 assert.equal(r.decision.coordinationKnown,0);
});
test('baseline requires fresh critical controls, liquidity and meaningful holder coverage',()=>{
 for(const key of ['mintActive','freezeActive','permanentDelegate','nonTransferable','defaultFrozen','transferHook','transferFeePct','pausable','liquidityUsd']){
  const input=baseline();delete input.metrics[key];assert.equal(evaluate(input).decision.action,'wait',key);
 }
 const small=baseline();small.holders=small.holders.slice(0,3);assert.equal(evaluate(small).decision.action,'wait');
 const concentrated=baseline();concentrated.metrics.top10Pct=28;assert.equal(evaluate(concentrated).decision.baselineComplete,false);
 for(const extra of [{staleEvidence:true},{sourceConflicts:true},{sourceConflicts:['mint disagreement']}]){
  const r=evaluate({...baseline(),...extra});assert.equal(r.decision.action,'wait');assert.equal(r.level,'limited');
 }
 assert.equal(evaluate({...baseline(),sourceConflicts:[]}).decision.action,'no-major-flags');
});
test('a tiny known top-ten aggregate bounds individual holdings without pretending holders were sampled',()=>{
 const input=baseline();input.holders=[];input.metrics.top10Pct=4;const bounded=evaluate(input);
 assert.equal(bounded.decision.action,'no-major-flags');assert.equal(check(bounded,'largest').status,'unknown');assert.match(bounded.decision.gaps.join(' '),/bound the largest/);
 input.metrics.top10Pct=8;assert.equal(evaluate(input).decision.action,'wait');
});
test('modest reported bundle holdings do not create a red label or a rug claim',()=>{
 for(const bundlePct of [0,5,10]){const r=evaluate({...baseline(),metrics:{...baseline().metrics,bundlePct}});assert.equal(r.decision.action,'no-major-flags');assert.equal(check(r,'bundles').points,0);}
 for(const bundlePct of [11,20,25,29]){const r=evaluate({metrics:{bundlePct}});assert.equal(r.level,'caution');assert.equal(r.hardFlags.length,0);}
 for(const bundlePct of [30,35,80]){const r=evaluate({metrics:{bundlePct}});assert.equal(r.decision.action,'avoid');assert.equal(r.rugged,false);}
});
test('severe direct evidence keeps the risk floors even with no supporting coverage',()=>{
 const cases=[['mintActive',true,70],['freezeActive',true,75],['permanentDelegate',true,75],['nonTransferable',true,80],['paused',true,80],['defaultFrozen',true,65],['transferFeePct',25,65],['insiderPct',30,50],['devPct',20,50],['top10Pct',70,50]];
 for(const [key,value,floor] of cases){const r=evaluate({metrics:{[key]:value}});assert.equal(r.decision.action,'avoid',key);assert.ok(r.score>=floor,key);assert.equal(r.rugged,false,key);}
 const holder=evaluate({holders:[{address:'wallet',pct:25,accountType:'wallet'}]});assert.equal(holder.decision.action,'avoid');assert.ok(holder.score>=50);
 const loss=evaluate({trend:{liquidityChangePct:-85,seconds:60}});assert.equal(loss.decision.action,'avoid');assert.ok(loss.score>=70);
});
test('unidentified program accounts cannot be called non-pool whales or clear distribution',()=>{
 const r=evaluate({...baseline(),holders:[...baseline().holders,{address:'unknown-program',pct:25,accountType:'unresolved'}]});
 assert.equal(r.decision.action,'wait');assert.equal(r.hardFlags.length,0);assert.equal(check(r,'largest').status,'unknown');assert.match(r.decision.gaps.join(' '),/could not be distinguished from a pool/);
});
test('unscoped side-pool provider warnings neither add risk nor corroborate an avoid verdict',()=>{
 const warnings=[{name:'Large Amount of LP Unlocked',level:'danger',scoringEligible:false,scope:'unscoped'},{name:'Low Liquidity',level:'danger',contextOnly:true}];
 const r=evaluate({...baseline(),providerWarnings:warnings});assert.equal(r.decision.action,'no-major-flags');assert.equal(r.score,0);assert.equal(r.hardFlags.length,0);
 const empty=evaluate({providerWarnings:warnings});assert.equal(empty.decision.action,'wait');assert.equal(empty.score,null);
});
test('several correlated soft heuristics stay caution, while independent material risks can corroborate avoid',()=>{
 const holders=Array.from({length:10},(_,i)=>({address:String(i),pct:2.5,sol:.01,bought:0,fresh:true,platform:'same',entryMc:4000}));
 const soft=evaluate({holders,metrics:{marketCapUsd:50000,freshHoldingPct:40}});assert.equal(soft.score,40);assert.equal(soft.decision.action,'caution');assert.equal(soft.decision.corroborated,false);
 const independent=evaluate({metrics:{transferHook:true,pausable:true,liquidityUsd:2000}});assert.equal(independent.decision.action,'avoid');assert.equal(independent.decision.corroborated,true);assert.deepEqual(independent.decision.materialFamilies,['contract','market']);
});
test('manual clear cannot erase provider-reported creator rug history',()=>{
 const r=evaluate({providerWarnings:[{name:'Creator history of rugged tokens',level:'danger'}],manual:{devHistory:{status:'clear',at:Date.now()}}});assert.equal(r.score,20);assert.equal(r.label,'Caution');assert.equal(check(r,'devHistory').source,'RugCheck report');
});

const curveInput=()=>{
 const input=baseline();delete input.metrics.liquidityUsd;input.mint='mint';
 input.launchCurve={status:'verified',mint:'mint',program:'pump',quoteIsNativeSol:true,complete:false,at:Date.now(),virtualTokenReservesRaw:'500000000000000',virtualQuoteReservesRaw:'80000000000',realTokenReservesRaw:'250000000000000',realQuoteReservesRaw:'50000000000',tokenSupplyRaw:'1000000000000000',source:'Solana confirmed Pump curve account'};return input;
};
test('verified launch curve capacity supplies liquidity evidence before DEX indexing, without invented USD or LP lock',()=>{
 const input=curveInput(),r=evaluate(input);
 assert.equal(r.label,'No major flags');assert.equal(r.decision.baselineComplete,true);assert.equal(check(r,'liquidity').points,0);assert.match(check(r,'liquidity').detail,/10%/);
 assert.equal(check(r,'liquidityDepth').status,'not-applicable');assert.equal(check(r,'lpLock').status,'not-applicable');assert.match(r.decision.gaps.join(' '),/executable sell quote/);
 // Units cancel: a non-SOL quote follows the same capacity model, never a made-up price.
 input.launchCurve.quoteIsNativeSol=false;input.launchCurve.quoteMint='customQuote';const custom=evaluate(input);assert.equal(check(custom,'liquidity').points,0);assert.equal(custom.decision.action,'wait');assert.ok(custom.decision.missingBaseline.includes('quoteAsset'));assert.match(custom.summary,/another token/);
});
test('thin curve real reserves are flagged even when virtual liquidity is high',()=>{
 for(const [real,points,covered] of [['0',15,0],['2000000000',10,1],['8000000000',5,5],['15000000000',0,10]]){
  const input=curveInput();input.launchCurve.realQuoteReservesRaw=real;const r=evaluate(input),c=check(r,'liquidity');assert.equal(c.points,points,real);assert.match(c.detail,covered?new RegExp(`at least ${covered}%`):/do not cover/);assert.notEqual(r.label,'Wait for data');
 }
});
test('unverified, stale, completed, mismatched and malformed curves cannot clear missing liquidity',()=>{
 for(const patch of [{status:'reported'},{mint:'other'},{complete:true},{at:Date.now()-30001},{at:Date.now()+60000},{realQuoteReservesRaw:'900000000000'},{virtualTokenReservesRaw:'0'},{tokenSupplyRaw:'18446744073709551616'},{virtualQuoteReservesRaw:'NaN'}]){
  const input=curveInput();Object.assign(input.launchCurve,patch);const r=evaluate(input);assert.equal(check(r,'liquidity').status,'unknown',JSON.stringify(patch));assert.equal(r.decision.action,'wait');
 }
});
test('explicit selected AMM is assessed separately from an active launch curve',()=>{
 const input=curveInput();input.launchCurve.realQuoteReservesRaw='0';input.metrics.liquidityUsd=50000;input.marketAt=Date.now();input.marketMint=input.mint;input.marketLiquidityUsd=50000;input.pairDex='pumpswap';input.pairAddress='actual-pool';input.selectedMarket='actual-pool';
 const r=evaluate(input);assert.equal(check(r,'liquidity').points,0);assert.match(check(r,'liquidity').detail,/reported liquidity/);
});


function stageInput(stage){
 const input=curveInput();input.stage=stage;input.stageMint=input.mint;input.stageAt=Date.now();input.stageSource='Terminal Trenches column';
 if(stage==='migrated'){delete input.launchCurve;input.metrics.liquidityUsd=50000;Object.assign(input,{marketMint:input.mint,marketAt:Date.now(),marketLiquidityUsd:50000,pairDex:'pumpswap',pairAddress:'pool'});}
 return input;
}
test('modest current bundles are lower weight in fresh New Pairs, while later stages retain caution',()=>{
 for(const stage of ['new','final','migrated']){const input=stageInput(stage);input.metrics.bundlePct=15;const r=evaluate(input);assert.equal(r.lifecycle.id,stage);assert.equal(check(r,'bundles').points,stage==='new'?4:8);assert.equal(r.label,stage==='new'?'No major flags':'Caution');}
 for(const bundlePct of [0,5,10]){const input=stageInput('new');input.metrics.bundlePct=bundlePct;assert.equal(check(evaluate(input),'bundles').points,0);}
 for(const bundlePct of [21,29]){const input=stageInput('new');input.metrics.bundlePct=bundlePct;assert.equal(check(evaluate(input),'bundles').points,14);}
});
test('severe retained bundle exposure and dangerous controls survive every lifecycle discount',()=>{
 for(const stage of ['new','final','migrated'])for(const [key,value]of [['bundlePct',30],['freezeActive',true],['permanentDelegate',true],['insiderPct',30]]){
  const input=stageInput(stage);input.metrics[key]=value;const r=evaluate(input);assert.equal(r.decision.action,'avoid',stage+key);assert.ok(r.hardFlags.length);
 }
});
test('bundle count or initial participation cannot become current bundled supply',()=>{
 const input=stageInput('new');input.metrics.bundleCount=25;input.metrics.initialBundlePct=70;
 const r=evaluate(input);assert.equal(check(r,'bundles').status,'unknown');assert.ok(r.missingCore.includes('bundles'));assert.equal(r.hardFlags.length,0);
});
test('launch discounts do not suppress observed labeled selling or linked supply',()=>{
 const input=stageInput('new');input.metrics.bundlePct=15;
 input.activity={count:12,pricedCount:12,volumeUsd:1000,sellPct:90,taggedSellUsd:700,synchronized:4};
 const r=evaluate(input);assert.equal(check(r,'bundles').points,8);assert.equal(check(r,'taggedSelling').points,20);assert.equal(check(r,'sampleSelling').points,8);assert.equal(check(r,'tradeSync').points,4);
 input.chain={jointBuys:[{wallets:['a','b','c'],supply:30}]};assert.equal(evaluate(input).decision.action,'avoid');
});
test('New, Final and Migrated assign distinct weak-pattern weights without erasing evidence',()=>{
 const weights=[];
 for(const stage of ['new','final','migrated']){
  const input=stageInput(stage);input.metrics.sniperPct=15;input.metrics.freshHoldingPct=15;input.holders=input.holders.map(h=>({...h,fresh:true}));
  const r=evaluate(input);weights.push(check(r,'freshWallets').points);assert.match(check(r,'freshWallets').detail,/fresh-wallet/);assert.equal(r.lifecycle.adjustments.length>0,stage!=='migrated');
 }
 assert.deepEqual(weights,[4,8,12]);
});
test('stale or mismatched stage evidence cannot grant a New Pairs discount',()=>{
 for(const patch of [{stageAt:Date.now()-120001},{stageAt:Date.now()+60000},{stageMint:'other'},{stage:'unknown'}]){
  const input=stageInput('new');input.metrics.bundlePct=15;Object.assign(input,patch);const r=evaluate(input);assert.notEqual(r.lifecycle.id,'new');assert.equal(check(r,'bundles').points,8);
 }
});
test('active curve wins over unscoped synthetic DEX liquidity and disables conventional LP scoring',()=>{
 const input=stageInput('final');input.launchCurve.realQuoteReservesRaw='0';Object.assign(input.metrics,{liquidityUsd:90000,marketCapUsd:1e9,volume24hUsd:1e8,lpLockedPct:0});input.trend={liquidityChangePct:-90,seconds:60};input.manual={lpLock:{status:'flag',at:Date.now()}};
 const r=evaluate(input);assert.equal(check(r,'liquidity').points,15);assert.equal(r.hardFlags.length,0);
 for(const id of ['liquidityDepth','turnover','lpLock','liquidityDrop'])assert.equal(check(r,id).status,'not-applicable');
 assert.equal(r.autoTotal,39);assert.ok(r.autoKnown<=r.autoTotal);
});
test('New curve stress uses observed current exposure instead of a hypothetical unavailable total-supply slice',()=>{
 const input=stageInput('new');input.launchCurve.realQuoteReservesRaw='500000000';input.holders=[{address:'observed-wallet',pct:.1,accountType:'wallet'}];input.metrics.top10Pct=.1;
 const r=evaluate(input);assert.equal(check(r,'liquidity').points,0);assert.match(check(r,'liquidity').detail,/0.1%-of-supply/);
 input.stage='final';assert.equal(check(evaluate(input),'liquidity').points,15);
 input.stage='new';input.holders=[];const partial=evaluate(input);assert.ok(partial.decision.missingBaseline.includes('exitSize'));assert.notEqual(partial.label,'No major flags');
});
test('completed curve does not establish an active migrated pool or keep a New discount',()=>{
 const input=stageInput('new');input.launchCurve.complete=true;input.launchCurve.realTokenReservesRaw='0';input.metrics.bundlePct=15;input.metrics.liquidityUsd=90000;
 let r=evaluate(input);assert.equal(r.lifecycle.id,'transition');assert.equal(check(r,'bundles').points,8);assert.equal(check(r,'liquidity').status,'unknown');assert.equal(r.decision.baselineComplete,false);
 Object.assign(input,{stage:'migrated',marketAt:Date.now(),marketMint:input.mint,marketLiquidityUsd:90000,pairDex:'pumpswap',pairAddress:'destination-pool'});r=evaluate(input);assert.equal(r.lifecycle.id,'migrated');assert.equal(check(r,'liquidity').points,0);
});
test('active curve contradicting Migrated stage prevents a green verdict',()=>{
 const input=stageInput('new');input.stage='migrated';const r=evaluate(input);assert.equal(r.lifecycle.conflict,true);assert.equal(r.decision.action,'wait');assert.equal(r.lifecycle.id,'unknown');
});


test('completed curve cannot borrow page liquidity to establish a destination-pool baseline',()=>{
 const input=stageInput('new');input.launchCurve.complete=true;input.launchCurve.realTokenReservesRaw='0';input.metrics.liquidityUsd=90000;
 Object.assign(input,{stage:'migrated',marketAt:Date.now(),marketMint:input.mint,pairDex:'pumpswap',pairAddress:'pool'});
 let r=evaluate(input);assert.equal(r.lifecycle.id,'transition');assert.equal(check(r,'liquidity').status,'unknown');assert.notEqual(r.label,'No major flags');
 input.marketLiquidityUsd=2000;r=evaluate(input);assert.equal(r.lifecycle.id,'migrated');assert.equal(check(r,'liquidity').points,15);assert.match(check(r,'liquidity').detail,/2,000/);
 input.marketMint='other';assert.equal(evaluate(input).lifecycle.id,'transition');
});
