import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCurveScanner} from '../extension/curve-scan.js';

const A='8rCPJr6j3wevoz3UnkCPpNTnUx1ezUN3yuDkBoaGmuse',B='Efyt4tMBmiYKjJwrSPLH7RuDVUQE2ofuTebFoNNGuqeR';
const PA='GMRqWe4xXdbZSVFjGKJnqrgA2usFi4KUiL5o2k6DQdgQ',PB='AWCcPiPRjfnSVKeV9H7xSk1iepHNTdjVRSB37q6BocVd';
const raw=(mint=A,address=PA)=>({mint,at:50,markets:[{pubkey:address,mintA:mint,marketType:'pump_fun'}]});
const verify=async(mint,address,account,slot,at)=>account.mint===mint&&account.owner==='pump'?{status:'verified',mint,address,slot,at,complete:false,realQuoteReservesRaw:'123456789',source:'test confirmed account'}:null;
const account=mint=>({mint,owner:'pump'});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));

test('captured curve accounts pass the production verifier without inferring pool locks or USD prices',async()=>{
 const fixture=JSON.parse(readFileSync(new URL('./data/pump-curve-accounts.json',import.meta.url)));
 const at=Date.parse(fixture.fetchedAt);let calls=0;
 const load=createCurveScanner({windowMs:0,now:()=>at,call:async(method,params)=>{
  calls++;return {context:fixture.response.context,value:params[0].map(address=>fixture.response.value[fixture.addresses.indexOf(address)])};
 }});
 const results=await Promise.all(fixture.mints.map((mint,index)=>load(raw(mint,fixture.addresses[index]),mint)));
 assert.equal(calls,1);
 for(const result of results){assert.equal(result.launchCurve.status,'verified');assert.equal(result.launchCurve.at,at);assert.equal(result.metrics,undefined);assert.equal(result.launchCurve.liquidityUsd,undefined);}
 assert.ok(results.some(result=>!result.launchCurve.quoteIsNativeSol&&result.launchCurve.realQuoteSol===undefined));
});

test('curve scanner batches mints, deduplicates requests and preserves independent evidence timestamps',async()=>{
 let calls=0,time=100,seen;
 const load=createCurveScanner({windowMs:0,now:()=>time,verify,call:async(method,params)=>{calls++;seen={method,params};return {context:{slot:123},value:params[0].map(address=>account(address===PA?A:B))};}});
 const report=raw(),first=load(report,A),duplicate=load(report,A);
 assert.equal(first,duplicate);
 const [a,b]=await Promise.all([first,load(raw(B,PB),B)]);
 assert.equal(calls,1);assert.equal(seen.method,'getMultipleAccounts');assert.deepEqual(seen.params,[[PA,PB],{encoding:'base64',commitment:'confirmed'}]);
 assert.equal(a.launchCurve.mint,A);assert.equal(b.launchCurve.mint,B);assert.equal(a.launchCurve.at,100);assert.equal(a.launchCurve.slot,123);assert.equal(report.at,50);assert.equal(a.at,undefined);
 time=500;assert.equal(await load({...report,at:450},A),a);assert.equal(a.launchCurve.at,100);assert.equal(calls,1);
 time=25101;assert.equal((await load(report,A)).launchCurve.at,time);assert.equal(calls,2);
});

test('unsupported markets, mismatched reports and malformed addresses do not use the RPC',async()=>{
 let calls=0;const load=createCurveScanner({windowMs:0,verify,call:async()=>{calls++;}});
 assert.deepEqual(await load({mint:A,markets:[{mintA:A,pubkey:PA,marketType:'pump_swap'}]},A),{});
 assert.deepEqual(await load({mint:A},A),{});
 assert.match((await load(raw(),B)).curveError,/does not match/);
 const other=raw();other.markets[0].mintA=B;assert.match((await load(other,A)).curveError,/matching/);
 assert.match((await load(raw(A,'A'.repeat(32)),A)).curveError,/valid address/);
 const conflict=raw();conflict.markets.push({...conflict.markets[0],pubkey:PB});assert.match((await load(conflict,A)).curveError,/conflicting/);
 assert.equal(calls,0);
});

test('shared curve addresses are fetched once but verified separately for each claimed mint',async()=>{
 let requested;
 const load=createCurveScanner({windowMs:0,verify,call:async(method,params)=>{requested=params[0];return {value:[account(A)]};}});
 const [same,wrong]=await Promise.all([load(raw(),A),load(raw(B,PA),B)]);
 assert.deepEqual(requested,[PA]);assert.equal(same.launchCurve.mint,A);assert.equal(wrong.launchCurve,undefined);assert.match(wrong.curveError,/mint-address/);
 assert.equal((await load(raw(B,PA),B)).launchCurve,undefined);
});

test('missing, unsupported and incomplete account responses never produce verified reserves',async()=>{
 for(const [value,message] of [[null,/not found/],[{owner:'other'},/verification/]]){
  const load=createCurveScanner({windowMs:0,verify,call:async()=>({value:[value]})});
  const result=await load(raw(),A);assert.equal(result.launchCurve,undefined);assert.match(result.curveError,message);
 }
 const load=createCurveScanner({windowMs:0,verify,call:async()=>({value:[account(A)]})});
 const results=await Promise.all([load(raw(),A),load(raw(B,PB),B)]);
 assert.ok(results.every(r=>!r.launchCurve&&/Incomplete/.test(r.curveError)));
});

test('timeout does not hold scans and late results warm the next scan without changing returned evidence',async()=>{
 let finish,time=100,calls=0;
 const load=createCurveScanner({windowMs:0,timeoutMs:10,now:()=>time,verify,call:()=>{calls++;return new Promise(resolve=>{finish=resolve;});}});
 const old=await load(raw(),A);assert.match(old.curveError,/timed out/);assert.equal(old.launchCurve,undefined);
 time=200;finish({context:{slot:888},value:[account(A)]});await pause(0);
 const next=await load(raw(),A);assert.equal(next.launchCurve.at,200);assert.equal(next.launchCurve.slot,888);assert.equal(calls,1);assert.equal(old.launchCurve,undefined);
});

test('an older late request cannot replace a newer completed scan for the same curve',async()=>{
 const completions=[];let time=100;
 const load=createCurveScanner({windowMs:0,timeoutMs:10,failureTtlMs:0,now:()=>time,verify,call:()=>new Promise(resolve=>completions.push(resolve))});
 await load(raw(),A);const second=load(raw(),A);await pause(2);time=200;completions[1]({context:{slot:20},value:[account(A)]});
 assert.equal((await second).launchCurve.slot,20);
 time=300;completions[0]({context:{slot:10},value:[account(A)]});await pause(0);
 const latest=await load(raw(),A);assert.equal(latest.launchCurve.slot,20);assert.equal(latest.launchCurve.at,200);
});

test('queue and in-flight limits reject excess work without adding more shared RPC requests',async()=>{
 let finish,calls=0;
 const load=createCurveScanner({windowMs:0,timeoutMs:10,maxPending:1,maxActive:1,failureTtlMs:0,verify,call:()=>{calls++;return new Promise(resolve=>{finish=resolve;});}});
 const first=load(raw(),A);assert.match((await load(raw(B,PB),B)).curveError,/queue full/);
 assert.match((await first).curveError,/timed out/);
 assert.match((await load(raw(B,PB),B)).curveError,/busy/);assert.equal(calls,1);
 finish({value:[account(A)]});await pause(0);
});
