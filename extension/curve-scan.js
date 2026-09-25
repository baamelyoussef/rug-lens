import {rpc} from './chain-scan.js';
import {valid} from './providers.js';
import {verifyPumpCurve} from './pump-curve.js';

function publicKey(value){
 if(!valid(value))return false;
 const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';let n=0n,size=0;
 for(const ch of value)n=n*58n+BigInt(alphabet.indexOf(ch));
 while(n){size++;n/=256n;}for(const ch of value){if(ch!=='1')break;size++;}return size===32;
}

// Curve reads supplement the report without changing its timestamp or deriving
// pool-lock status/USD liquidity from reserves. The decoder independently checks
// the program, account layout and mint's canonical bonding-curve address.
export function createCurveScanner({call=rpc,verify=verifyPumpCurve,windowMs=25,timeoutMs=1500,ttlMs=25000,failureTtlMs=3000,maxPending=120,maxActive=2,now=Date.now}={}){
 const cache=new Map(),pending=new Map(),queued=new Map();let timer=null,active=0,generation=0;
 const failure=message=>({curveError:message});
 function remember(job,data,at){
  if((cache.get(job.key)?.generation||0)>job.generation)return;
  cache.delete(job.key);cache.set(job.key,{data,at,generation:job.generation});
  while(cache.size>200)cache.delete(cache.keys().next().value);
 }
 function schedule(){if(timer===null&&queued.size)timer=setTimeout(flush,windowMs);}
 async function flush(){
  timer=null;
  const batch=[...queued.values()].slice(0,50);for(const job of batch)queued.delete(job.key);schedule();
  if(!batch.length)return;
  let values,timeout;
  try{
   if(active>=maxActive)throw Error('Pump curve verifier is busy; retry next scan');
   active++;
   const request=(async()=>{
    try{
     const addresses=[...new Set(batch.map(job=>job.address))];
     const result=await call('getMultipleAccounts',[addresses,{encoding:'base64',commitment:'confirmed'}]);
     if(!Array.isArray(result?.value)||result.value.length!==addresses.length)throw Error('Incomplete Pump curve account response');
     const at=now(),accounts=new Map(addresses.map((address,index)=>[address,result.value[index]]));
     return await Promise.all(batch.map(async job=>{
      const account=accounts.get(job.address);let data;
      if(!account)data=failure('Pump curve account was not found');
      else {
       const curve=await verify(job.mint,job.address,account,result.context?.slot,at);
       data=curve?{launchCurve:curve}:failure('Pump curve account failed program, mint-address or layout verification');
      }
      return {data,at};
     }));
    }finally{active--;}
   })();
   // The RPC may be behind the shared rate limiter. Return promptly, but cache
   // a late verified response for the next scan without rewriting old evidence.
   request.then(late=>late.forEach((value,index)=>remember(batch[index],value.data,value.at)),()=>{});
   values=await Promise.race([request,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Pump curve verification timed out; retry next scan')),timeoutMs);})]);
  }catch(error){values=batch.map(()=>({data:failure(error?.message||'Pump curve verification unavailable'),at:now()}));}
  finally{clearTimeout(timeout);}
  batch.forEach((job,index)=>{
   const value=values[index];remember(job,value.data,value.at);
   if(pending.get(job.key)===job.promise)pending.delete(job.key);
   job.resolve(value.data);
  });
 }
 return function loadCurve(rawReport,mint){
  if(!publicKey(mint)||rawReport?.mint!==mint)return Promise.resolve(failure('Pump curve report does not match this token'));
  const markets=(Array.isArray(rawReport.markets)?rawReport.markets:[]).filter(m=>m?.marketType==='pump_fun');
  if(!markets.length)return Promise.resolve({});
  const matches=markets.filter(m=>m.mintA===mint&&publicKey(m.pubkey)),addresses=[...new Set(matches.map(m=>m.pubkey))];
  if(!addresses.length)return Promise.resolve(failure('Pump curve market has no valid address matching this token'));
  if(addresses.length!==1)return Promise.resolve(failure('Report lists conflicting Pump curve addresses for this token'));
  const address=addresses[0],key=mint+':'+address;
  if(pending.has(key))return pending.get(key);
  const cached=cache.get(key);
  if(cached&&now()-cached.at<(cached.data.launchCurve?ttlMs:failureTtlMs))return Promise.resolve(cached.data);
  if(pending.size>=maxPending)return Promise.resolve(failure('Pump curve verifier queue full; retry next scan'));
  const job={key,mint,address,generation:++generation};job.promise=new Promise(resolve=>{job.resolve=resolve;});
  pending.set(key,job.promise);queued.set(key,job);schedule();return job.promise;
 };
}

export const loadCurve=createCurveScanner();
