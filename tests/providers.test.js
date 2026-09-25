import test from 'node:test';import assert from 'node:assert/strict';import {normalizeReport,normalizePair} from '../extension/providers.js';import {MINT,MARKET} from './fixtures.js';
test('report from another mint is rejected',()=>assert.throws(()=>normalizeReport({mint:MARKET,token:{}},MINT)));
test('LP and locker accounts excluded; same-owner accounts aggregated',()=>{
  const owner='C'.repeat(32),pool='D'.repeat(32);const r=normalizeReport({mint:MINT,token:{mintAuthority:null},knownAccounts:{[pool]:{type:'AMM'}},topHolders:[{owner:pool,address:pool,pct:70},{owner,address:'a',pct:3},{owner,address:'b',pct:4}]},MINT);
  assert.equal(r.holders.length,1);assert.equal(r.holders[0].pct,7);assert.equal(r.metrics.mintActive,false);assert.equal(r.metrics.freezeActive,undefined);
});
test('zero LP-lock placeholders on bonding curves cannot become an unlocked-liquidity flag',()=>{
  const r=normalizeReport({mint:MINT,token:{},totalMarketLiquidity:0,markets:[{marketType:'raydium_launchlab',lp:{lpLockedPct:0}}]},MINT);assert.equal(r.metrics.lpLockedPct,undefined);assert.equal(r.metrics.liquidityUsd,undefined);
});
test('pair must match Solana base token and retains true zero liquidity',()=>{
  assert.deepEqual(normalizePair({chainId:'ethereum',baseToken:{address:MINT}},MINT),{});
  assert.deepEqual(normalizePair({chainId:'solana',baseToken:{address:MARKET}},MINT),{});
  assert.equal(normalizePair({chainId:'solana',baseToken:{address:MINT},liquidity:{usd:0}},MINT).metrics.liquidityUsd,0);
});
test('explicit Token-2022 features normalize without clearing absent fields',()=>{
 const r=normalizeReport({mint:MINT,token:{},token_extensions:{permanentDelegate:'C'.repeat(32),nonTransferable:true,defaultAccountState:{state:2},transferHook:null},transferFee:{pct:30,authority:'D'.repeat(32)}},MINT);
 assert.equal(r.metrics.permanentDelegate,true);assert.equal(r.metrics.nonTransferable,true);assert.equal(r.metrics.defaultFrozen,true);assert.equal(r.metrics.transferHook,false);assert.equal(r.metrics.pausable,undefined);assert.equal(r.metrics.transferFeePct,30);
});
test('DEX market activity keeps time windows and rejects strings instead of coercing them',()=>{
 const r=normalizePair({chainId:'solana',pairAddress:MARKET,baseToken:{address:MINT},txns:{m5:{buys:2,sells:24}},volume:{m5:500,h24:1500},priceChange:{m5:-65},liquidity:{usd:5000}},MINT);
 assert.equal(r.metrics.buys5m,2);assert.equal(r.metrics.sells5m,24);assert.equal(r.metrics.priceChange5m,-65);assert.equal(r.metrics.volume5mUsd,500);assert.equal(r.pairAddress,MARKET);
});

test('detailed fee authority and matching schedules override contradictory report defaults',()=>{
 const r=normalizeReport({mint:MINT,token:{},transferFee:{pct:0,authority:null},token_extensions:{transferFeeConfig:{transferFeeConfigAuthority:'A'.repeat(32),olderTransferFee:{transferFeeBasisPoints:100},newerTransferFee:{transferFeeBasisPoints:100}}}},MINT);
 assert.equal(r.metrics.feeMutable,true);assert.equal(r.metrics.transferFeePct,1);assert.match(r.sources.transferFee,/schedules/);
 const differing=normalizeReport({mint:MINT,token:{},token_extensions:{transferFeeConfig:{olderTransferFee:{transferFeeBasisPoints:100},newerTransferFee:{transferFeeBasisPoints:200}}}},MINT);
 assert.equal(differing.metrics.transferFeePct,undefined);
});

test('unscoped pool and concentration warnings stay visible without a danger scoring floor',()=>{
 const report=normalizeReport({mint:MINT,token:{},risks:[{name:'Low Liquidity',level:'danger'},{name:'Large Amount of LP Unlocked',level:'danger'},{name:'Single holder ownership',level:'warn'},{name:'Freeze Authority still enabled',level:'danger'},{name:'Delegate can seize holder tokens',level:'danger'},null]},MINT);
 assert.equal(report.providerWarnings.length,5);
 assert.ok(report.providerWarnings.slice(0,3).every(w=>w.contextOnly&&w.scoringEligible===false&&w.scope==='unscoped'));
 assert.ok(report.providerWarnings.slice(3).every(w=>w.scoringEligible===true));
});
