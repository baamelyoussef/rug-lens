import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {derivePumpCurveAddress,isEd25519Point,verifyPumpCurve} from '../extension/pump-curve.js';
const vectors=JSON.parse(readFileSync(new URL('./data/pump-pda-vectors.json',import.meta.url)));
const captured=JSON.parse(readFileSync(new URL('./data/pump-curve-accounts.json',import.meta.url)));
const at=Date.parse(captured.fetchedAt),slot=captured.response.context.slot;
const clone=account=>JSON.parse(JSON.stringify(account));
function modify(account,fn){const copy=clone(account),bytes=Buffer.from(copy.data[0],'base64');fn(bytes);copy.data[0]=bytes.toString('base64');return copy;}
function slice(account,length){const copy=clone(account);copy.data[0]=Buffer.from(copy.data[0],'base64').subarray(0,length).toString('base64');copy.space=length;return copy;}
test('local PDA and Edwards point check match fixed vectors generated with the official Solana SDK',async()=>{
 for(const {mint,address}of vectors.vectors)assert.equal(await derivePumpCurveAddress(mint),address);
 for(const {hex,isPoint}of vectors.points)assert.equal(isEd25519Point(Buffer.from(hex,'hex')),isPoint);
 await assert.rejects(derivePumpCurveAddress('A'.repeat(32)),/Invalid/);
});
test('captured Pump curves bind to mint and preserve native and non-native quote units',async()=>{
 const results=await Promise.all(captured.mints.map((mint,i)=>verifyPumpCurve(mint,captured.addresses[i],captured.response.value[i],slot,at)));
 assert.equal(results.length,5);for(const row of results){assert.equal(row.status,'verified');assert.equal(row.slot,slot);assert.equal(row.at,at);assert.equal(row.complete,false);assert.match(row.realQuoteReservesRaw,/^\d+$/);}
 for(const index of [0,1,4]){assert.equal(results[index].quoteIsNativeSol,true);assert.equal(results[index].quoteDecimals,9);assert.equal(results[index].quoteMint,'11111111111111111111111111111111');assert.equal(results[index].realQuoteSol,Number(BigInt(results[index].realQuoteReservesRaw))/1e9);}
 for(const index of [2,3]){assert.equal(results[index].quoteMint,'8J69rbLTzWWgUJziFY8jeu5tDwEPBwUz4pKBMr5rpump');assert.equal(results[index].quoteIsNativeSol,false);assert.equal(results[index].quoteDecimals,undefined);assert.equal(results[index].realQuoteSol,undefined);}
});
test('wrong mint, unrelated account, malformed fields and inconsistent reserve state cannot verify',async()=>{
 const mint=captured.mints[0],address=captured.addresses[0],good=captured.response.value[0];
 assert.equal(await verifyPumpCurve(captured.mints[1],address,good,slot,at),null);
 assert.equal(await verifyPumpCurve(mint,captured.addresses[1],good,slot,at),null);
 for(const bad of [{...good,owner:mint},{...good,executable:true},{...good,space:0},modify(good,b=>b[0]++),modify(good,b=>b[48]=2),modify(good,b=>b[81]=2),modify(good,b=>b[48]=1),modify(good,b=>b.fill(0,40,48)),modify(good,b=>b.fill(255,32,40)),slice(good,100),slice(good,80),slice(good,48)])assert.equal(await verifyPumpCurve(mint,address,bad,slot,at),null);
 assert.equal(await verifyPumpCurve(mint,address,good,NaN,at),null);assert.equal(await verifyPumpCurve(mint,address,good,slot,0),null);
});
test('official legacy trailing-field defaults are supported without accepting truncated fields',async()=>{
 const mint=captured.mints[0],address=captured.addresses[0],account=captured.response.value[0];
 for(const length of [49,81,82,83,115,123,124,125]){
  const result=await verifyPumpCurve(mint,address,slice(account,length),slot,at);
  assert.equal(result.status,'verified');assert.equal(result.quoteIsNativeSol,true);assert.equal(result.mayhem,false);assert.equal(result.cashback,false);assert.equal(result.holderReward,false);
  if(length<81)assert.equal(result.creator,'11111111111111111111111111111111');
 }
});
test('completed curves retain complete status and large integer reserves are never rounded to SOL',async()=>{
 const mint=captured.mints[0],address=captured.addresses[0],good=captured.response.value[0];
 const done=modify(good,b=>{b.fill(0,24,32);b[48]=1;});assert.equal((await verifyPumpCurve(mint,address,done,slot,at)).complete,true);
 const large=modify(good,b=>{b.fill(255,16,24);b.fill(255,32,40);});const verified=await verifyPumpCurve(mint,address,large,slot,at);
 assert.equal(verified.realQuoteReservesRaw,'18446744073709551615');assert.equal(verified.realQuoteSol,undefined);
});
