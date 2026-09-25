import test from 'node:test';import assert from 'node:assert/strict';import {createQueue} from '../extension/request-queue.js';
test('one stalled provider request does not block a second coin',async()=>{
 const queue=createQueue({spacing:0});let release;
 const slow=queue(()=>new Promise(r=>{release=r;}));
 assert.equal(await queue(()=>Promise.resolve('fast')),'fast');release('slow');assert.equal(await slow,'slow');
});
test('queue bounds concurrency, prioritizes selected work and recovers after failures',async()=>{
 const queue=createQueue({spacing:0,concurrency:1}),order=[];let release;
 const first=queue(()=>new Promise(r=>{release=r;}));
 const feed=queue(async()=>{order.push('feed');throw Error('failed');});const failure=assert.rejects(feed,/failed/);
 const selected=queue(async()=>{order.push('selected');},1);
 release();await Promise.all([first,selected,failure]);assert.deepEqual(order,['selected','feed']);assert.equal(await queue(async()=>42),42);
});
test('parallel requests still reserve spaced start times',async()=>{
 const delays=[],queue=createQueue({spacing:700,now:()=>1000,sleep:async ms=>{delays.push(ms);}});
 await Promise.all([queue(async()=>1),queue(async()=>2),queue(async()=>3)]);
 assert.deepEqual(delays,[700,1400]);
});
test('repeated priority requests cannot starve a feed scan',async()=>{
 const queue=createQueue({spacing:0,concurrency:1}),order=[];let release;
 const first=queue(()=>new Promise(r=>{release=r;}));
 const feed=queue(async()=>{order.push('feed');});
 const selected=Array.from({length:6},(_,i)=>queue(async()=>{order.push(`selected${i}`);},1));
 release();await Promise.all([first,feed,...selected]);
 assert.deepEqual(order.slice(0,4),['selected0','selected1','selected2','feed']);
});
test('stage priorities rank selected, new pairs, final stretch and migrated, with bounded aging',async()=>{
 const queue=createQueue({spacing:0,concurrency:1,priorityBurst:3}),order=[];let release;
 const blocker=queue(()=>new Promise(r=>{release=r;}));
 const jobs=[['migrated',1],['final',2],['new',3],['selected',4]].map(([name,priority])=>queue(async()=>order.push(name),priority));
 release();await Promise.all([blocker,...jobs]);assert.deepEqual(order,['selected','new','final','migrated']);
});
test('opening a queued coin promotes its existing task without duplicating the request',async()=>{
 const queue=createQueue({spacing:0,concurrency:1}),order=[];let release;
 const blocker=queue(()=>new Promise(r=>{release=r;}));
 const coin=queue(async()=>order.push('clicked'),1),other=queue(async()=>order.push('new'),3);coin.promote(4);
 release();await Promise.all([blocker,coin,other]);assert.deepEqual(order,['clicked','new']);
});
