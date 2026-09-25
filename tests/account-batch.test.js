import test from 'node:test';import assert from 'node:assert/strict';
import {createAccountBatch} from '../extension/account-batch.js';
const config={encoding:'base64',commitment:'confirmed'},parsed={encoding:'jsonParsed',commitment:'confirmed'};
const account=address=>({owner:'owner',executable:false,lamports:100,space:address.length,data:[btoa(address),'base64']});
const response=addresses=>({context:{slot:123,apiVersion:'test'},value:addresses.map(address=>address==='missing'?null:account(address))});
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
test('coalesces holder slices and whole curve reads, preserving duplicate order, nulls and slot',async()=>{
 const calls=[],batch=createAccountBatch(async(method,params)=>{calls.push([method,params]);return response(params[0]);},{windowMs:1});
 const [holder,curve]=await Promise.all([batch('getMultipleAccounts',[['abcde','missing','abcde'],{...config,dataSlice:{offset:1,length:2}}]),batch('getMultipleAccounts',[['fghij','abcde'],config])]);
 assert.equal(calls.length,1);assert.deepEqual(calls[0][1],[['abcde','missing','fghij'],config]);
 assert.deepEqual(holder.value.map(row=>row?atob(row.data[0]):null),['bc',null,'bc']);assert.deepEqual(curve.value.map(row=>atob(row.data[0])),['fghij','abcde']);assert.equal(holder.value[0].space,5);assert.equal(holder.context.slot,123);assert.equal(curve.context,holder.context);
});
test('does not combine incompatible encodings or minimum context slots',async()=>{
 const calls=[],batch=createAccountBatch(async(method,params)=>{calls.push(params);return response(params[0]);},{windowMs:1,maxActive:3});
 await Promise.all([batch('getMultipleAccounts',[['one'],config]),batch('getMultipleAccounts',[['two'],parsed]),batch('getMultipleAccounts',[['three'],{...config,minContextSlot:120}])]);
 assert.equal(calls.length,3);assert.deepEqual(calls.map(params=>params[1]),[config,parsed,{...config,minContextSlot:120}]);
});
test('a combined transport failure rejects every participating request',async()=>{
 let calls=0;const batch=createAccountBatch(async()=>{calls++;throw Error('RPC 429');},{windowMs:1});
 const results=await Promise.allSettled([batch('getMultipleAccounts',[['one'],config]),batch('getMultipleAccounts',[['two'],config])]);assert.equal(calls,1);assert.ok(results.every(r=>r.status==='rejected'&&r.reason.message==='RPC 429'));
});
test('short or contextless responses cannot be misattributed to requested accounts',async()=>{
 for(const reply of [{context:{slot:1},value:[]},{value:[null,null]},{context:{slot:-1},value:[null,null]}]){
  const batch=createAccountBatch(async()=>reply,{windowMs:1});const results=await Promise.allSettled([batch('getMultipleAccounts',[['one'],config]),batch('getMultipleAccounts',[['two'],config])]);assert.ok(results.every(r=>r.status==='rejected'&&/Incomplete/.test(r.reason.message)));
 }
});
test('splits at the address limit without splitting any individual request across slots',async()=>{
 const calls=[],batch=createAccountBatch(async(method,params)=>{calls.push(params[0]);return {...response(params[0]),context:{slot:calls.length}};},{windowMs:1,maxAddresses:3});
 const [first,second,third]=await Promise.all([batch('getMultipleAccounts',[['a','b'],config]),batch('getMultipleAccounts',[['b','c'],config]),batch('getMultipleAccounts',[['d','e'],config])]);
 assert.deepEqual(calls,[['a','b','c'],['d','e']]);assert.equal(first.context.slot,second.context.slot);assert.notEqual(second.context.slot,third.context.slot);assert.equal(third.value.length,2);
});
test('pending request cap rejects excess demand immediately and recovers after completion',async()=>{
 const batch=createAccountBatch(async(method,params)=>response(params[0]),{windowMs:1,maxPending:1});
 const first=batch('getMultipleAccounts',[['one'],config]);await assert.rejects(batch('getMultipleAccounts',[['two'],config]),/busy/);await first;assert.equal((await batch('getMultipleAccounts',[['three'],config])).value.length,1);
});
test('bounded active transports reject excess batches rather than waiting indefinitely',async()=>{
 const resolvers=[],calls=[],batch=createAccountBatch((method,params)=>{calls.push(params);return new Promise(resolve=>resolvers.push(()=>resolve(response(params[0]))));},{windowMs:1,maxActive:2,timeoutMs:1000});
 const active=Promise.all([batch('getMultipleAccounts',[['one'],config]),batch('getMultipleAccounts',[['two'],parsed])]);await delay(10);
 await assert.rejects(batch('getMultipleAccounts',[['three'],config]),/busy/);assert.equal(calls.length,2);resolvers.forEach(resolve=>resolve());await active;
});
test('deadline rejects joined callers while counting a late transport against the active bound',async()=>{
 let release,calls=0;const batch=createAccountBatch((method,params)=>{calls++;return new Promise(resolve=>{release=()=>resolve(response(params[0]));});},{windowMs:1,maxActive:1,timeoutMs:10});
 const joined=await Promise.allSettled([batch('getMultipleAccounts',[['one'],config]),batch('getMultipleAccounts',[['two'],config])]);assert.ok(joined.every(r=>r.status==='rejected'&&/timed out/.test(r.reason.message)));
 await assert.rejects(batch('getMultipleAccounts',[['three'],config]),/busy/);assert.equal(calls,1);release();await delay(0);
});
test('other RPC methods and unsupported options retain their exact transport semantics',async()=>{
 const calls=[],batch=createAccountBatch(async(method,params)=>{calls.push([method,params]);return 'direct';});
 const variants=[['getAccountInfo',['one',config]],['getMultipleAccounts',[['one'],{...config,commitment:'finalized'}]],['getMultipleAccounts',[['one'],{...parsed,dataSlice:{offset:0,length:1}}]],['getMultipleAccounts',[['one'],{...config,dataSlice:{offset:-1,length:1}}]]];
 for(const [method,params]of variants)assert.equal(await batch(method,params),'direct');assert.deepEqual(calls,variants);
});
