import test from 'node:test';
import assert from 'node:assert/strict';
import {MINT,MARKET} from './fixtures.js';
import {readFileSync} from 'node:fs';
const SECOND='C'.repeat(32),SECOND_POOL='D'.repeat(32),OTHER_POOL='E'.repeat(32);
let serial=0;
async function scanner(){
 let handler;
 const state={mode:'good',urls:[],hold:null};
 globalThis.chrome={storage:{local:{get:async()=>({}),set:async()=>{}}},runtime:{id:'test-extension',getManifest:()=>({version:'test'}),onMessage:{addListener(fn){handler=fn;}}}};
 const pair=(mint,market)=>({chainId:'solana',pairAddress:market,baseToken:{address:mint},liquidity:{usd:mint===MINT?10000:20000},txns:{m5:{buys:30,sells:5}}});
 globalThis.fetch=async (url,options)=>{
  state.urls.push(url);
  if(url.includes('mainnet-beta.solana')){
   const {method,params}=JSON.parse(options.body),addresses=params[0];
   const value=method==='getMultipleAccounts'?addresses.map(address=>state.poolAccounts?.[address]||state.mintAccounts?.[address]||null):state.poolAccounts?.[addresses]||null;
   return {ok:true,json:async()=>({result:{value,context:{slot:123}}})};
  }
  if(url.includes('rugcheck')){
   const mint=url.split('/').at(-2);
   if(state.rugStatus)return {ok:false,status:state.rugStatus};
   if(state.poolAccounts?.[mint])return {ok:false,status:400};
   return {ok:true,json:async()=>state.rugReport||({mint,token:{mintAuthority:null,freezeAuthority:state.freezeActive?SECOND:null},rugged:false})};
  }
  if(state.hold)await state.hold;
  if(state.mode==='dex-fails')return {ok:false,status:503};
  let pairs=[];
  if(url.includes('/tokens/v1/'))pairs=url.split('/').at(-1).split(',').map(mint=>pair(mint,mint===MINT?MARKET:SECOND_POOL));
  if(url.includes('/latest/dex/pairs/'))pairs=[pair(MINT,url.split('/').at(-1))];
  if(state.mode==='other-pool')pairs=[pair(MINT,OTHER_POOL)];
  if(state.mode==='wrong-token')pairs=[pair(SECOND,MARKET)];
  if(state.mode==='empty')pairs=[];
  return {ok:true,json:async()=>url.includes('/latest/dex/pairs/')?{pairs}:pairs};
 };
 await import(`../extension/background.js?test=${++serial}`);
 const send=message=>new Promise(resolve=>handler({type:'RUG_LENS_ANALYZE',mint:MINT,market:MARKET,...message},{id:'test-extension',url:'https://trade.padre.gg/trenches',tab:{}},resolve));
 return {send,state};
}

test('background validates inputs, caches and retains contract evidence when market provider fails',async()=>{
 const {send,state}=await scanner();
 const invalid=await send({mint:'not-an-address'});assert.match(invalid.error,/Invalid/);assert.equal(state.urls.length,0);
 const first=await send({});assert.equal(first.metrics.mintActive,false);assert.equal(first.metrics.liquidityUsd,10000);assert.equal(first.metrics.buys5m,30);assert.equal(state.urls.length,2);
 const cached=await send({});assert.equal(cached.at,first.at);assert.equal(state.urls.length,2);
 state.mode='dex-fails';const partial=await send({force:true});assert.equal(partial.metrics.mintActive,false);assert.equal(partial.metrics.liquidityUsd,undefined);assert.match(partial.errors[0],/503/);
});

test('contract and market scans remain independent and legacy all shares both caches',async()=>{
 const {send,state}=await scanner();
 const contract=await send({part:'contract'});assert.equal(contract.metrics.mintActive,false);assert.equal(state.urls.length,1);assert.match(state.urls.at(-1),/rugcheck/);
 const again=await send({part:'contract',market:OTHER_POOL});assert.equal(again.at,contract.at);assert.equal(state.urls.length,1);
 const market=await send({part:'market'});assert.equal(market.metrics.liquidityUsd,10000);assert.equal(market.metrics.mintActive,undefined);assert.match(state.urls.at(-1),/tokens\/v1/);
 const all=await send({});assert.equal(all.metrics.mintActive,false);assert.equal(all.metrics.liquidityUsd,10000);assert.equal(state.urls.length,2);
});

test('visible coins use one batch and never receive a different token market',async()=>{
 const {send,state}=await scanner();
 const [first,second]=await Promise.all([send({part:'market'}),send({mint:SECOND,market:SECOND_POOL,part:'market'})]);
 assert.equal(state.urls.length,1);assert.match(state.urls[0],new RegExp(`${MINT},${SECOND}$`));
 assert.equal(first.mint,MINT);assert.equal(first.metrics.liquidityUsd,10000);assert.equal(first.pairAddress,MARKET);
 assert.equal(second.mint,SECOND);assert.equal(second.metrics.liquidityUsd,20000);assert.equal(second.pairAddress,SECOND_POOL);
});

test('forced duplicate scans share pending work and a slow market does not block contract replies',async()=>{
 const {send,state}=await scanner();let release;
 state.hold=new Promise(r=>{release=r;});
 const first=send({part:'market',force:true}),second=send({part:'market',force:true});
 const contract=await send({part:'contract'});assert.equal(contract.metrics.mintActive,false);
 await new Promise(r=>setTimeout(r,80));assert.equal(state.urls.filter(url=>url.includes('dexscreener')).length,1);
 release();const [a,b]=await Promise.all([first,second]);assert.equal(a.at,b.at);
});

test('a secondary selected pool gets an exact lookup, never primary-pool values',async()=>{
 const {send,state}=await scanner();
 const result=await send({part:'market',market:OTHER_POOL});
 assert.equal(state.urls.length,2);assert.match(state.urls[1],new RegExp(`/pairs/solana/${OTHER_POOL}$`));
 assert.equal(result.pairAddress,OTHER_POOL);
 state.mode='wrong-token';const wrong=await send({part:'market',force:true});
 assert.equal(wrong.metrics.liquidityUsd,undefined);assert.equal(wrong.pairAddress,undefined);assert.match(wrong.errors[0],/selected pool/);
 state.mode='empty';const missing=await send({part:'market',force:true});
 assert.equal(missing.metrics.liquidityUsd,undefined);assert.match(missing.errors[0],/selected pool/);
});

test('legacy pool-only lookup preserves selected pool and resolves token before its report',async()=>{
 const {send,state}=await scanner();
 const result=await send({mint:undefined,market:MARKET});
 assert.equal(result.mint,MINT);assert.equal(result.pairAddress,MARKET);assert.equal(result.metrics.mintActive,false);
 assert.equal(state.urls.length,2);assert.match(state.urls[0],/\/pairs\/solana\//);assert.match(state.urls[1],new RegExp(`/tokens/${MINT}/report$`));
});

function poolAccount(mint){
 const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
 let n=0n;for(const ch of mint)n=n*58n+BigInt(alphabet.indexOf(ch));
 const bytes=Buffer.alloc(211);bytes.set([241,154,109,4,17,177,109,188]);
 for(let i=74;i>=43;i--){bytes[i]=Number(n%256n);n/=256n;}
 return {owner:'pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA',executable:false,data:[bytes.toString('base64'),'base64']};
}
test('forced pool-address refresh also refreshes an already cached resolved token',async()=>{
 const {send,state}=await scanner(),mint='9NPmnDgL39NmoivaE1XfiFWm7o61repcfkVyvyv9pump',pool='2RyKJCowXHSxxuSjAwVtKHgABaSDM5shyBgjKPnZU2YB';
 state.poolAccounts={[pool]:poolAccount(mint)};
 const before=await send({mint,part:'contract'});assert.equal(before.metrics.freezeActive,false);
 state.freezeActive=true;
 const refreshed=await send({mint:pool,part:'contract',force:true});
 assert.equal(refreshed.error,undefined);assert.equal(refreshed.mint,mint);assert.equal(refreshed.resolution.address,pool);assert.equal(refreshed.metrics.freezeActive,true);
 assert.equal(state.urls.filter(url=>url.endsWith(`/tokens/${mint}/report`)).length,2);
 assert.equal((await send({mint,part:'contract'})).metrics.freezeActive,true);
});

test('concurrent circular pool resolutions fail instead of awaiting one another',async()=>{
 const {send,state}=await scanner(),a='9NPmnDgL39NmoivaE1XfiFWm7o61repcfkVyvyv9pump',b='2RyKJCowXHSxxuSjAwVtKHgABaSDM5shyBgjKPnZU2YB';
 state.poolAccounts={[a]:poolAccount(b),[b]:poolAccount(a)};
 const [first,second]=await Promise.all([send({mint:a,part:'contract'}),send({mint:b,part:'contract'})]);
 assert.match(first.error,/Circular/);assert.match(second.error,/Circular/);
});

const REAL_MINT='9NPmnDgL39NmoivaE1XfiFWm7o61repcfkVyvyv9pump';
function mintAccount(){return {owner:'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',executable:false,data:{program:'spl-token',parsed:{type:'mint',info:{isInitialized:true,mintAuthority:null,freezeAuthority:null,supply:'1000000000000000',decimals:6}}}};}
test('missing indexed reports use direct mint evidence while retaining provider failure and no invented holders',async()=>{
 const {send,state}=await scanner();state.rugStatus=404;state.mintAccounts={[REAL_MINT]:mintAccount()};
 const result=await send({mint:REAL_MINT,part:'contract',scanPriority:3});
 assert.equal(result.error,undefined);assert.equal(result.mint,REAL_MINT);assert.equal(result.metrics.mintActive,false);assert.equal(result.metrics.transferFeePct,0);
 assert.match(result.sources.mint,/Solana/);assert.match(result.errors[0],/404/);assert.equal(result.partial,true);assert.deepEqual(result.holders,[]);assert.equal(result.holdersTopComplete,false);
 assert.equal(state.urls.filter(url=>url.includes('mainnet-beta')).length,1);
 const cached=await send({mint:REAL_MINT,part:'contract'});assert.equal(cached.at,result.at);assert.equal(state.urls.length,2);
});
test('provider failure with a non-mint account remains unavailable rather than a false clean result',async()=>{
 const {send,state}=await scanner();state.rugStatus=503;
 const result=await send({mint:REAL_MINT,part:'contract'});assert.match(result.error,/503.*not a verified SPL/);assert.equal(result.metrics,undefined);
});


test('background supplies verified launch curve evidence without waiting for DEX indexing',async()=>{
 const {send,state}=await scanner();
 const fixture=JSON.parse(readFileSync(new URL('./data/pump-curve-accounts.json',import.meta.url)));
 const index=fixture.names.indexOf('Jean'),mint=fixture.mints[index],address=fixture.addresses[index];
 state.rugReport={mint,token:{mintAuthority:null,freezeAuthority:null},markets:[{marketType:'pump_fun',mintA:mint,pubkey:address}]};
 state.poolAccounts={[address]:fixture.response.value[index]};
 const result=await send({mint,market:mint,part:'contract'});
 assert.equal(result.metrics.mintActive,false);assert.equal(result.launchCurve.mint,mint);assert.equal(result.launchCurve.status,'verified');assert.equal(result.launchCurve.quoteIsNativeSol,true);assert.equal(result.launchCurve.slot,123);assert.equal(result.metrics.liquidityUsd,undefined);
 assert.ok(state.urls.every(url=>!url.includes('dexscreener')));
 state.poolAccounts[address]={...state.poolAccounts[address],owner:'11111111111111111111111111111111'};
 const wrongMint=fixture.mints[0],wrongAddress=fixture.addresses[0];state.rugReport={mint:wrongMint,token:{mintAuthority:null,freezeAuthority:null},markets:[{marketType:'pump_fun',mintA:wrongMint,pubkey:wrongAddress}]};
 state.poolAccounts[wrongAddress]=state.poolAccounts[address];
 const partial=await send({mint:wrongMint,market:wrongMint,part:'contract'});
 assert.equal(partial.metrics.mintActive,false);assert.equal(partial.launchCurve,undefined);assert.match(partial.errors.join(' '),/Launch curve:.*verification/);
});
