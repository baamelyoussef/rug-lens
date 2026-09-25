import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeMintAccount,createContractFallback} from '../extension/contract-fallback.js';
const MINT='9NPmnDgL39NmoivaE1XfiFWm7o61repcfkVyvyv9pump',SECOND='9o8zC4Y6RKSHejvCV9eF84bgw4P25i47Tn8Y5SW1cvWZ';
const SPL='TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',TOKEN2022='TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
function account(owner=SPL,extensions){return {owner,executable:false,data:{program:owner===SPL?'spl-token':'spl-token-2022',parsed:{type:'mint',info:{isInitialized:true,mintAuthority:null,freezeAuthority:null,supply:'18446744073709551615',decimals:6,...(extensions!==undefined?{extensions}:{})}}}};}
test('direct SPL mint checks validate type, identity and u64 supply without rounding',()=>{
 const result=decodeMintAccount(MINT,account(),{slot:123,at:10});
 assert.equal(result.metrics.mintActive,false);assert.equal(result.metrics.freezeActive,false);assert.equal(result.metrics.transferFeePct,0);assert.equal(result.metrics.transferHook,false);assert.equal(result.contractSlot,123);assert.equal(result.at,10);
 assert.equal(result.tokenSupply.raw,'18446744073709551615');assert.deepEqual(result.holders,[]);assert.equal(result.holdersTopComplete,false);
 for(const bad of [null,{...account(),owner:MINT},{...account(),executable:true},account()]){
  if(bad?.data&&bad.owner===SPL&&bad.executable===false)bad.data.parsed.type='account';
  assert.throws(()=>decodeMintAccount(MINT,bad),/mint/);
 }
 const tooLarge=account();tooLarge.data.parsed.info.supply='18446744073709551616';assert.throws(()=>decodeMintAccount(MINT,tooLarge),/complete/);
 assert.throws(()=>decodeMintAccount('A'.repeat(32),account()),/verified/);
});
test('Token-2022 absent and unknown extension lists do not clear unsupported controls',()=>{
 for(const extensions of [undefined,[{extension:'unparseableExtension'}],[{extension:'futureControl'}],[{extension:'permissionedBurnConfig',state:{authority:SECOND}}]]){
  const result=decodeMintAccount(MINT,account(TOKEN2022,extensions));
  assert.equal(result.metrics.mintActive,false);assert.equal(result.metrics.transferHook,undefined);assert.equal(result.metrics.transferFeePct,undefined);assert.match(result.errors[0],/incomplete/);
 }
 const parsed=decodeMintAccount(MINT,account(TOKEN2022,[{extension:'tokenMetadata',state:{mint:MINT,updateAuthority:null}}]));
 assert.equal(parsed.metrics.permanentDelegate,false);assert.equal(parsed.metrics.pausable,false);assert.equal(parsed.metrics.transferFeePct,0);assert.equal(parsed.metrics.metadataMutable,false);
});
test('Token-2022 dangerous controls are read from exact parsed states; differing fee epochs remain unknown',()=>{
 const extensions=[{extension:'permanentDelegate',state:{delegate:SECOND}},{extension:'transferHook',state:{programId:null,authority:SECOND}},
 {extension:'pausableConfig',state:{authority:SECOND,paused:true}},{extension:'defaultAccountState',state:{accountState:'frozen'}},{extension:'nonTransferable'},
 {extension:'transferFeeConfig',state:{transferFeeConfigAuthority:null,olderTransferFee:{transferFeeBasisPoints:100},newerTransferFee:{transferFeeBasisPoints:500}}}];
 const result=decodeMintAccount(MINT,account(TOKEN2022,extensions));
 for(const key of ['permanentDelegate','transferHook','pausable','paused','defaultFrozen','nonTransferable'])assert.equal(result.metrics[key],true,key);
 assert.equal(result.metrics.feeMutable,false);assert.equal(result.metrics.transferFeePct,undefined);assert.match(result.errors[0],/schedules/);
 extensions.at(-1).state.olderTransferFee.transferFeeBasisPoints=500;assert.equal(decodeMintAccount(MINT,account(TOKEN2022,extensions)).metrics.transferFeePct,5);
 extensions[0].state={};assert.equal(decodeMintAccount(MINT,account(TOKEN2022,extensions)).metrics.permanentDelegate,undefined);
});
test('fallback batches and deduplicates mints, preserves timestamps, refreshes failures and caps work',async()=>{
 let time=100,calls=0,missing=true,seen;
 const load=createContractFallback({windowMs:0,now:()=>time,maxPending:2,call:async(method,params)=>{calls++;seen={method,params};return {value:params[0].map(mint=>mint===SECOND&&missing?null:account()),context:{slot:10}};}});
 const [a,duplicate,b]=await Promise.all([load(MINT),load(MINT),load(SECOND)]);
 assert.equal(calls,1);assert.equal(a,duplicate);assert.equal(seen.method,'getMultipleAccounts');assert.deepEqual(seen.params[0],[MINT,SECOND]);assert.equal(seen.params[1].encoding,'jsonParsed');assert.match(b.error,/mint/);
 time+=2000;assert.equal((await load(MINT)).at,100);assert.equal((await load(SECOND)).at,100);assert.equal(calls,1);
 time+=2000;missing=false;assert.equal((await load(SECOND)).metrics.freezeActive,false);assert.equal(calls,2);
 time+=26000;await load(MINT);assert.equal(calls,3);
});
test('a truncated RPC batch never assigns an account to the wrong requested mint and recovers',async()=>{
 let broken=true;const load=createContractFallback({windowMs:0,call:async()=>({value:broken?[]:[account()]})});
 assert.match((await load(MINT)).error,/Incomplete/);broken=false;assert.equal((await load(MINT,{force:true})).metrics.mintActive,false);
});
