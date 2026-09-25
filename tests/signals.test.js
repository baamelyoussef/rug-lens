import test from 'node:test';import assert from 'node:assert/strict';import '../extension/signals.js';
const {observe,momentum}=RugLensSignals,now=Date.now();
const result=status=>({checks:[{id:'mint',label:'Mint authority',status}]});
test('risk notices report new evidence once, preserve unknown and expire',()=>{
 const state={};assert.equal(observe(state,result('clear'),[],{},now).length,0);
 assert.equal(observe(state,result('flag'),[],{},now+1).length,1);
 observe(state,result('unknown'),[],{},now+2);assert.equal(observe(state,result('flag'),[],{},now+3).length,1);
 assert.equal(observe(state,result('flag'),[],{},now+300002).length,0);
});
test('large prints are recent, sized relative to liquidity and deduplicated',()=>{
 const state={},t={signature:'abc',side:'sell',usd:2000,at:now};
 assert.equal(observe(state,result('clear'),[t],{liquidityUsd:500000},now).length,0);
 const other={};assert.equal(observe(other,result('clear'),[t],{liquidityUsd:50000},now).length,1);
 assert.equal(observe(other,result('clear'),[t],{liquidityUsd:50000},now+1).length,1);
 assert.equal(observe({},result('clear'),[{...t,at:now-61000}],{},now).length,0);
});
test('momentum requires sufficient priced observations and never treats buys as safety',()=>{
 assert.equal(momentum({},{}),null);assert.equal(momentum({},{pricedCount:3,volumeUsd:300,sellPct:90}),null);
 const r=momentum({priceChange5m:20},{pricedCount:20,volumeUsd:300,sellPct:10});assert.match(r.label,/Buying pressure/);assert.match(r.detail,/does not reduce/);
 assert.match(momentum({priceChange5m:-20},{pricedCount:20,volumeUsd:300,sellPct:90}).label,/falling price/);
});

test('stage-policy changes are distinguished from newly observed risk evidence',()=>{
 const state={},now=Date.now(),result={checks:[],lifecycle:{id:'new',label:'New Pairs'}};
 RugLensSignals.observe(state,result,[],{},now);
 const events=RugLensSignals.observe(state,{checks:[{id:'liquidity',status:'flag',label:'Pool liquidity'}],lifecycle:{id:'migrated',label:'Migrated'}},[],{},now+1000);
 assert.ok(events.some(e=>e.label==='Stage changed · Migrated'));
 assert.ok(events.some(e=>e.label==='Findings under the new stage'));
 assert.ok(!events.some(e=>e.label==='New risk evidence'));
});
