import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
function setup(){
 let time=0,id=0,ready=false,enabled=true;const timers=new Map(),idle=new Map(),ctx=vm.createContext({});
 vm.runInContext(readFileSync(new URL('../extension/page-work.js',import.meta.url),'utf8'),ctx);
 const work=ctx.RugLensWork.create({now:()=>time,ready:()=>ready,canRun:()=>enabled,idle:fn=>{idle.set(++id,fn);return id;},cancelIdle:id=>idle.delete(id),later:(fn,ms)=>{timers.set(++id,{fn,at:time+ms});return id;},cancelLater:id=>timers.delete(id)});
 return {work,ready:()=>{ready=true;},enabled:v=>{enabled=v;},advance(ms){time+=ms;for(const [id,t] of [...timers])if(t.at<=time){timers.delete(id);t.fn();}},idle(ms=50){const next=idle.entries().next().value;if(next){idle.delete(next[0]);next[1]({timeRemaining:()=>ms,didTimeout:ms===0});}},pending:()=>idle.size};
}
test('page loading and startup grace run before any extension job',()=>{
 const s=setup(),calls=[];s.work.post('scan',()=>calls.push('scan'));s.idle();assert.equal(calls.length,0);
 s.advance(1500);s.idle();assert.equal(calls.length,0,'Document still loading');
 s.ready();s.advance(250);s.idle();assert.deepEqual(calls,['scan']);
});
test('low idle budgets never force analysis into a busy frame, even with didTimeout',()=>{
 const s=setup();s.ready();let ran=0;s.work.post('scan',()=>ran++);s.advance(1500);
 for(let i=0;i<20;i++){s.idle(0);s.advance(100);}assert.equal(ran,0);
 s.idle(4);assert.equal(ran,0);s.advance(100);s.idle(50);assert.equal(ran,1);
});
test('background work coalesces and yields between small batches',()=>{
 const s=setup();s.ready();const calls=[];
 s.work.post('same',()=>calls.push('old'));s.work.post('same',()=>calls.push('new'));
 for(let i=0;i<4;i++)s.work.post(i,()=>calls.push(i));
 s.advance(1500);s.idle();assert.deepEqual(calls,['new',0]);
 s.idle();assert.equal(calls.length,2,'Next slice must wait for a new turn');
 s.advance(16);s.idle();assert.deepEqual(calls,['new',0,1,2]);s.advance(16);s.idle();assert.equal(calls.length,5);
});
test('input defers a pending idle callback and repeated input extends the quiet period',()=>{
 const s=setup();s.ready();let ran=0;s.work.post('scan',()=>ran++);s.advance(1500);s.work.pause(350);s.idle();assert.equal(ran,0);
 s.advance(300);s.work.pause(350);s.advance(300);s.idle();assert.equal(ran,0);s.advance(50);s.idle();assert.equal(ran,1);
});
test('clear cancels stale route work, and suspension cannot run queued jobs',()=>{
 const s=setup();s.ready();let ran=0;s.work.post('old',()=>ran++);s.advance(1500);s.work.clear();s.idle();assert.equal(ran,0);
 s.work.post('new',()=>ran++);s.enabled(false);s.idle();assert.equal(ran,0);s.enabled(true);s.work.resume();s.idle();assert.equal(ran,1);
});
test('a costly individual job yields before another job starts',()=>{
 const s=setup();s.ready();const calls=[];s.work.post('one',()=>{calls.push(1);s.advance(6);});s.work.post('two',()=>calls.push(2));
 s.advance(1500);s.idle();assert.deepEqual(calls,[1]);s.advance(16);s.idle();assert.deepEqual(calls,[1,2]);
});
