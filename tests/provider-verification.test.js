import test from 'node:test';
import assert from 'node:assert/strict';
import {createHolderVerifier} from '../extension/provider-verification.js';
import {MINT} from './fixtures.js';

// Minimal real COLONY account/report evidence captured 2026-09-25, slot 450467961.
// RugCheck listed only a small Orca market and mislabeled this PumpSwap reserve
// as 25.18% single-holder ownership. Its pool owner/discriminator/base mint agree.
const COLONY='Gh6k5FNVRFk1eNUNhwLHbwf7854ioY16yZs9izUppump';
const POOL='HarXwdY6AFpaAvfYsAk7zs9SYu4G9YkXYgFBJPYkYK4Z';
const WALLET='GgbCFRHHAPv5i1fqt1D1buf8FPNA31oKrkZvXDyZymsT';
const account={owner:'pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA',executable:false,data:['8ZptBBGxbbz/AACl19VvOcNjJkLerHB8hubCXU3yjRHaL4Utgak94Mkps+klB4xI3/p48QKxsPkBHLiyhIsUeYhAax+LpTfS8A9fBpuIV/6rgYT7aH9jRhjANdrEOdwa6ztVmKDwAAAAAAEiBvaj+QoDpoY7eco6Ep/fafr13I3HZt8WYGGF6dXDv16ZkYl4HwaIciSou+tRCTTHtRpsrIgf7JpdYMqWQIP79W4vjNezzYAPEysALlRpMJsffK2XwhPB1OnaD9TAu87eq2tZ0AMAAEOIH2DLPhx6UHZcKCFkdfBMmxGxfoWBpIeY/AH1u9ltAACqQh4YBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==','base64']};
const raw=(mint=COLONY)=>({mint,token:{mintAuthority:null,freezeAuthority:null},topHolders:[{address:'7NH999XiCw8MYyXtyb1heieCGmmJZv32Vcidszhu3u4n',owner:POOL,pct:25.17882},{owner:WALLET,pct:3.4045}],risks:[{name:'Large Amount of LP Unlocked',level:'danger'},{name:'Low Liquidity',level:'danger'},{name:'Single holder ownership',level:'warn'}]});

test('COLONY reserve is excluded only after confirmed same-mint PumpSwap verification',async()=>{
  const calls=[];
  const verify=createHolderVerifier({call:async(method,params)=>{calls.push({method,params});return {context:{slot:450467961},value:[account]};}});
  const report=await verify(raw(),COLONY);
  assert.equal(calls.length,1);assert.equal(calls[0].method,'getMultipleAccounts');assert.deepEqual(calls[0].params[0],[POOL]);
  assert.equal(calls[0].params[1].commitment,'confirmed');
  assert.deepEqual(report.holders,[{address:WALLET,pct:3.4045}]);
  assert.equal(report.holderVerification.status,'verified');
  assert.deepEqual(report.holderVerification.excludedPools.map(p=>p.address),[POOL]);
  assert.equal(report.holdersTopComplete,false);
  assert.ok(report.providerWarnings.every(w=>w.scoringEligible===false&&w.contextOnly));
});

test('cross-coin requests batch and cache classification without excluding a different-mint pool',async()=>{
  let calls=0;
  const verify=createHolderVerifier({call:async()=>{calls++;return {value:[account]};}});
  const [same,other]=await Promise.all([verify(raw(),COLONY),verify(raw(MINT),MINT)]);
  assert.equal(calls,1);assert.equal(same.holders.length,1);
  assert.equal(other.holders[0].address,POOL);assert.equal(other.holders[0].pct,25.17882);
  assert.equal(other.holders[0].accountType,'unresolved');
  assert.match(other.holderVerification.unresolved[0].reason,/does not match/);
  await verify(raw(),COLONY);assert.equal(calls,1);
});

test('a confirmed wallet retains its full concentration; an unsupported program is not excluded',async()=>{
  const source=raw();source.topHolders[1].pct=22;
  const verify=createHolderVerifier({call:async()=>({value:[{...account,owner:'unknown-program'}, {owner:'11111111111111111111111111111111',executable:false,data:['','base64']}]})});
  const report=await verify(source,COLONY);
  assert.equal(report.holders.length,2);assert.equal(report.holders[0].accountType,'unresolved');
  assert.equal(report.holders[1].pct,22);assert.equal(report.holders[1].accountType,'wallet');
  assert.equal(report.holderVerification.status,'partial');assert.equal(report.holderVerification.excludedPools.length,0);
});

test('malformed pool discriminator and incomplete RPC responses do not remove holders',async()=>{
  const malformed=createHolderVerifier({call:async()=>({value:[{...account,data:['AAAA'+account.data[0].slice(4),'base64']}]})});
  const report=await malformed(raw(),COLONY);
  assert.equal(report.holders.length,2);assert.equal(report.holders[0].accountType,'unresolved');
  const incomplete=createHolderVerifier({call:async()=>({value:[]})});
  const failed=await incomplete(raw(),COLONY);
  assert.equal(failed.holders[0].pct,25.17882);assert.equal(failed.holderVerification.status,'unavailable');
  assert.match(failed.holderVerification.unresolved[0].reason,/Incomplete/);
});

test('timeout preserves contract checks and late successful verification warms the next scan',async()=>{
  let finish,calls=0;
  const verify=createHolderVerifier({timeoutMs:10,call:()=>{calls++;return new Promise(resolve=>{finish=resolve;});}});
  const timedOut=await verify(raw(),COLONY);
  assert.equal(timedOut.metrics.mintActive,false);assert.equal(timedOut.holderVerification.status,'unavailable');
  assert.equal(timedOut.holders[0].accountType,'unresolved');
  finish({value:[account]});await new Promise(resolve=>setTimeout(resolve,0));
  const next=await verify(raw(),COLONY);
  assert.equal(next.holderVerification.status,'verified');assert.equal(next.holders.length,1);assert.equal(calls,1);
  assert.equal(timedOut.holders.length,2,'late response cannot rewrite previous evidence');
});

test('no suspicious holder or wrong report identity makes no verification request',async()=>{
  let calls=0;const verify=createHolderVerifier({call:async()=>{calls++;}});
  const small={...raw(),topHolders:[{owner:WALLET,pct:3}]};
  assert.equal((await verify(small,COLONY)).holderVerification.status,'not-needed');
  await assert.rejects(verify(raw(),MINT),/does not match/);assert.equal(calls,0);
});
