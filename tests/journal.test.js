import test from 'node:test';import assert from 'node:assert/strict';
import {snapshot,appendSnapshot,createJournal} from '../extension/journal.js';
const input=(mint='A'.repeat(32))=>({mint,market:mint,name:'TEST',metrics:{liquidityUsd:123,invalid:NaN},result:{level:'limited',label:'Wait for data',score:0,checks:[{id:'mint',status:'clear',points:0,source:'Solana RPC'}],missingCore:['bundles'],autoKnown:1,autoTotal:42}});
test('journal keeps evidence identity/version/time but never labels missing data as a successful prediction',()=>{
 const s=snapshot({...input(),pageAt:500,contractAt:999999},'0.5.0',1000);
 assert.equal(s.at,1000);assert.equal(s.version,'0.5.0');assert.equal(s.sourceTimes.page,500);assert.equal(s.sourceTimes.contract,null);assert.equal(s.metrics.invalid,undefined);assert.equal(s.score,0);assert.match(s.scope,/No trade execution/);
 assert.equal(snapshot({...input(),mint:'wrong'},'0.5.0'),null);
});
test('journal retains changed verdicts, deduplicates unchanged scans, expires and caps records',()=>{
 const a=snapshot(input(),'0.5.0',10000);let list=appendSnapshot([],a,10000);
 list=appendSnapshot(list,{...a,at:11000},11000);assert.equal(list.length,1);
 list=appendSnapshot(list,{...a,at:12000,level:'high'},12000);assert.equal(list.length,2);
 list=appendSnapshot(list,{...a,at:400000,level:'high'},400000);assert.equal(list.length,3);
 assert.equal(appendSnapshot(list,null,8*86400000).length,0);
 const large=Array.from({length:600},(_,i)=>({...a,at:10000+i}));assert.equal(appendSnapshot(large,null,20000).length,500);
});
test('concurrent tabs serialize storage updates without losing a token snapshot',async()=>{
 let data={};const storage={async get(){await new Promise(r=>setTimeout(r,2));return data;},async set(v){data={...data,...v};}};
 const write=createJournal(storage,'0.5.0');await Promise.all([write(input()),write(input('B'.repeat(32)))]);
 assert.equal(data.scanJournal.length,2);assert.notEqual(data.scanJournal[0].mint,data.scanJournal[1].mint);
});
test('snapshots keep distinct pools, uncertainty changes and verification proof',()=>{
 const payload={...input(),holderVerification:{status:'verified',scope:'PumpSwap account',excludedPools:[{address:'B'.repeat(32),mint:'A'.repeat(32),slot:555,checkedAt:9000}]}};
 const a=snapshot(payload,'0.5.0',10000);assert.equal(a.holderVerification.excludedPools[0].slot,555);assert.equal(a.holderVerification.excludedPools[0].checkedAt,9000);
 let list=appendSnapshot([a],{...a,market:'C'.repeat(32),at:11000},11000);assert.equal(list.length,2);
 list=appendSnapshot(list,{...a,stale:true,at:12000},12000);assert.equal(list.length,3);
 list=appendSnapshot(list,{...a,disagreements:['Mint mismatch'],at:13000},13000);assert.equal(list.length,4);
});
test('changing numeric values in an existing source conflict does not flood storage',()=>{
 const a={...snapshot(input(),'0.5.0',10000),disagreements:['marketCapUsd: Terminal 100 vs external 20']};
 const list=appendSnapshot([a],{...a,at:11000,disagreements:['marketCapUsd: Terminal 101 vs external 20']},11000);assert.equal(list.length,1);
});


test('curve snapshots retain exact reserves, quote identity and original confirmation time',()=>{
 const payload=input();payload.launchCurve={status:'verified',mint:payload.mint,address:'B'.repeat(32),program:'pump',complete:false,quoteMint:'C'.repeat(32),quoteIsNativeSol:false,slot:500,at:900,realQuoteReservesRaw:'18446744073709551615',virtualQuoteReservesRaw:'18446744073709551615',virtualTokenReservesRaw:'100',realTokenReservesRaw:'90',tokenSupplyRaw:'110'};
 const s=snapshot(payload,'0.5.1',1000);assert.equal(s.launchCurve.realQuoteReservesRaw,'18446744073709551615');assert.equal(s.launchCurve.at,900);assert.equal(s.launchCurve.quoteIsNativeSol,false);assert.equal(s.launchCurve.mint,payload.mint);
 payload.launchCurve.mint='D'.repeat(32);assert.equal(snapshot(payload,'0.5.1',1000).launchCurve,null);
});

test('journal retains stage policy and not-applicable checks, and records stage transitions',()=>{
 const payload=input();payload.result.lifecycle={id:'new',label:'New Pairs',source:'Terminal New column',at:900,venue:'curve',adjustments:[{id:'bundles',from:8,to:4}]};payload.result.checks.push({id:'lpLock',status:'not-applicable',points:0});
 const first=snapshot(payload,'0.5.2',1000);assert.equal(first.lifecycle.id,'new');assert.equal(first.lifecycle.adjustments[0].to,4);assert.equal(first.checks[1].status,'not-applicable');
 const next={...first,at:1100,lifecycle:{...first.lifecycle,id:'final'}};assert.equal(appendSnapshot([first],next,1100).length,2);
});
