import test from 'node:test';
import assert from 'node:assert/strict';
import {createMarketBatch,selectMarketPair} from '../extension/market-batch.js';
import {MINT,MARKET} from './fixtures.js';
const SECOND='C'.repeat(32),OTHER_POOL='D'.repeat(32);
const pair=(mint=MINT,market=MARKET,usd=100)=>({chainId:'solana',baseToken:{address:mint},pairAddress:market,liquidity:{usd}});

test('visible token requests coalesce and results cannot leak across tokens or chains',async()=>{
  const calls=[];
  const load=createMarketBatch(async(url,priority)=>{calls.push({url,priority});return [pair(),pair(SECOND,OTHER_POOL,900),{...pair(MINT,OTHER_POOL,10000),chainId:'ethereum'}];},{windowMs:0});
  const [first,second]=await Promise.all([load(MINT),load(SECOND,{priority:1})]);
  assert.equal(calls.length,1);assert.equal(calls[0].priority,1);
  assert.equal(calls[0].url.split('/').at(-1),`${MINT},${SECOND}`);
  assert.deepEqual(first.pairs.map(p=>p.pairAddress),[MARKET]);
  assert.deepEqual(second.pairs.map(p=>p.pairAddress),[OTHER_POOL]);
});

test('single first scan is dispatched without requiring a later token',async()=>{
  let requests=0;const load=createMarketBatch(async()=>{requests++;return [pair()];},{windowMs:0});
  assert.equal((await load(MINT)).pairs.length,1);assert.equal(requests,1);
});

test('batch size never exceeds 30 and all queued tokens finish',async()=>{
  const chars='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const mints=Array.from({length:64},(_,i)=>'A'.repeat(30)+chars[Math.floor(i/chars.length)]+chars[i%chars.length]);
  const sizes=[];
  const load=createMarketBatch(async url=>{const batch=url.split('/').at(-1).split(',');sizes.push(batch.length);return batch.map(m=>pair(m));},{windowMs:0});
  const results=await Promise.all(mints.map(m=>load(m)));
  assert.deepEqual(sizes,[30,30,4]);assert.equal(results.length,64);
  assert.ok(results.every((r,i)=>r.mint===mints[i]&&r.pairs.length===1&&r.pairs[0].baseToken.address===mints[i]));
});

test('refresh joins in-flight work and caches preserve evidence timestamp',async()=>{
  let at=1000,requests=0,release;
  const load=createMarketBatch(async()=>{requests++;if(requests===2)await new Promise(r=>{release=r;});return [pair()];},{windowMs:0,now:()=>at});
  const first=await load(MINT);at=2000;
  assert.equal((await load(MINT)).at,first.at);assert.equal(requests,1);
  const refresh=load(MINT,{force:true}),duplicate=load(MINT,{force:true}),ordinary=load(MINT);
  assert.equal(refresh,duplicate);assert.equal(refresh,ordinary);
  await new Promise(r=>setTimeout(r,5));assert.equal(requests,2);release();
  assert.equal((await refresh).at,2000);
});

test('missing pairs stay empty, expire quickly, failures do not become safe cached results',async()=>{
  let mode='empty',at=0,requests=0;
  const load=createMarketBatch(async()=>{requests++;if(mode==='error')throw Error('unavailable');if(mode==='malformed')return null;return [];},{windowMs:0,now:()=>at});
  assert.deepEqual((await load(MINT)).pairs,[]);at=4999;await load(MINT);assert.equal(requests,1);
  at=5001;await load(MINT);assert.equal(requests,2);
  mode='error';await assert.rejects(load(MINT,{force:true}),/unavailable/);
  mode='malformed';await assert.rejects(load(MINT,{force:true}),/invalid response/);
  mode='empty';await load(MINT,{force:true});assert.equal(requests,5);
});

test('cache and pending bounds reject excess work and allow later retries',async()=>{
  let requests=0;
  const load=createMarketBatch(async url=>{requests++;return url.split('/').at(-1).split(',').map(m=>pair(m));},{windowMs:0,limit:1,maxPending:1});
  const first=load(MINT);await assert.rejects(load(SECOND),/queue full/);await first;
  await load(SECOND);await load(MINT);assert.equal(requests,3);
});

test('selected pool is never silently replaced, even by a more liquid or different-token pair',()=>{
  const pairs=[pair(MINT,MARKET,10),pair(MINT,OTHER_POOL,999),pair(SECOND,MARKET,99999)];
  assert.equal(selectMarketPair(pairs,MINT,MARKET).liquidity.usd,10);
  assert.equal(selectMarketPair(pairs,MINT,MINT).pairAddress,OTHER_POOL);
  assert.equal(selectMarketPair(pairs,MINT,'E'.repeat(32)),null);
});
