import test from 'node:test';import assert from 'node:assert/strict';
import {inspectTransaction,summarizeChain} from '../extension/chain.js';
import {scanChain} from '../extension/chain-scan.js';import '../extension/engine.js';
const key=c=>c.repeat(32),sig=c=>c.repeat(88),mint=key('M'),payer=key('P'),owner=key('D'),native='So11111111111111111111111111111111111111112',token='TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const holders=['A','B','C'].map(c=>({address:key(c),pct:9}));
function closure(c='A',more={}){
 const address=key(c),account=key('W');return {slot:10,transaction:{signatures:[sig(c)],message:{accountKeys:[{pubkey:payer,signer:true},{pubkey:owner,signer:true},{pubkey:address,signer:false},{pubkey:account,signer:false}],instructions:[{programId:token,parsed:{type:'initializeAccount3',info:{account,mint:native}}},{programId:token,parsed:{type:'closeAccount',info:{account,destination:address,owner}}}]}},meta:{err:null,preBalances:[1e9,1e9,0,0],postBalances:[1e9,0,1e8,0],preTokenBalances:[],postTokenBalances:[]},...more};
}
test('native closure funding is followed even with unequal amounts and different signatures',()=>{
 const rows=['A','B','C'].map(closure);rows[1].meta.postBalances[2]=12345678;rows[2].meta.postBalances[2]=77777777;
 const r=summarizeChain(rows,holders,mint,payer);assert.equal(r.closureGroups.length,1);assert.equal(r.closureGroups[0].supply,27);assert.equal(r.closureGroups[0].creatorLinked,true);
 const scored=RugLensEngine.evaluate({chain:r});assert.equal(scored.level,'high');assert.notEqual(scored.level,'rugged');
});
test('ordinary self unwrap, rent-only refund, failed tx and unknown mint are excluded',()=>{
 for(const type of ['self','rent','failed','mint','unsigned','fake-program']){
  const t=closure();const ix=t.transaction.message.instructions;
  if(type==='self')ix[1].parsed.info.owner=key('A');
  if(type==='rent')t.meta.postBalances[2]=2039280;
  if(type==='failed')t.meta.err={InstructionError:[0,'failure']};
  if(type==='mint')ix[0].parsed.info.mint=mint;
  if(type==='unsigned')t.transaction.message.accountKeys[1].signer=false;
  if(type==='fake-program')ix[1].programId=key('F');
  assert.equal(inspectTransaction(t,mint)?.closures.length||0,0,type);
 }
});
test('inner instructions and pre-existing native token accounts are parsed',()=>{
 const t=closure();t.meta.preTokenBalances=[{accountIndex:3,mint:native}];t.meta.innerInstructions=[{index:0,instructions:t.transaction.message.instructions.slice(1)}];t.transaction.message.instructions=[];
 assert.equal(inspectTransaction(t,mint).closures.length,1);
});
test('three signing holders with positive deltas establish joint acquisition; balances alone do not',()=>{
 const t=closure();t.transaction.message.instructions=[];t.transaction.message.accountKeys=holders.map(h=>({pubkey:h.address,signer:true}));
 t.meta.postTokenBalances=holders.map(h=>({owner:h.address,mint,uiTokenAmount:{amount:'100000000000000000000'}}));
 t.meta.preTokenBalances=holders.map(h=>({owner:h.address,mint,uiTokenAmount:{amount:'90000000000000000000'}}));
 assert.equal(summarizeChain([t,t],holders,mint,null).jointBuys.length,1);
 t.transaction.message.accountKeys[2].signer=false;assert.equal(summarizeChain([t],holders,mint,null).jointBuys.length,0);
});
test('empty partial chain scan never clears unknown funding checks or treats mixer use as a confirmed rug',()=>{
 const r=RugLensEngine.evaluate({chain:summarizeChain([],holders,mint,null)});
 assert.equal(r.checks.find(c=>c.id==='closureFunding').status,'unknown');assert.equal(r.checks.find(c=>c.id==='jointSigners').status,'unknown');
 const r2=RugLensEngine.evaluate({chain:summarizeChain(['A','B','C'].map(closure),holders,mint,null)});assert.equal(r2.level,'caution');
});
test('scan caps holder count, deduplicates signatures and returns partial evidence on rate limits',async()=>{
 const calls=[];const call=async(method,params)=>{calls.push([method,params]);if(method==='getSignaturesForAddress')return [{signature:sig('A'),err:null},{signature:sig('B'),err:{error:1}}];return closure();};
 const r=await scanChain({mint,holders:[...holders,...holders],creator:payer},call);assert.equal(r.sampled,3);assert.equal(r.requested,1);assert.equal(calls.filter(c=>c[0]==='getTransaction').length,1);assert.equal(r.partial,true);
 const fail=await scanChain({mint,holders},async()=>{throw Error('rate limited');});assert.equal(fail.walletsRead,0);assert.match(fail.errors[0],/rate limited/);
});
test('unclassified program accounts never enter wallet funding scans',async()=>{
 let requests=0;const result=await scanChain({mint,holders:holders.map(h=>({...h,accountType:'unresolved'}))},async()=>{requests++;return [];});
 assert.equal(requests,0);assert.equal(result.sampled,0);
});
