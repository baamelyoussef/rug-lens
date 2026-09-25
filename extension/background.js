import {createContractFallback} from './contract-fallback.js';
import {createCurveScanner} from './curve-scan.js';
import {scanChain} from './chain-scan.js';
import './journal.js';
import {normalizePair,valid} from './providers.js';
import {verifyReportHolders} from './provider-verification.js';
import {createMarketBatch,selectMarketPair} from './market-batch.js';
import {createQueue} from './request-queue.js';
const cache=new Map(),pending=new Map(),queues=new Map(),cooldown=new Map(),resolving=new Map();
const TTL=25000,LIMIT=200;
const chainCache=new Map();let chainPending=null;
function request(url,priority=0){
  const origin=new URL(url).origin;
  if(!queues.has(origin))queues.set(origin,createQueue({spacing:origin==='https://api.dexscreener.com'?250:700}));
  const queued=queues.get(origin)(async()=>{
    if((cooldown.get(origin)||0)>Date.now())throw new Error(`${new URL(url).hostname}: cooling down after rate limit`);
    const response=await fetch(url,{credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(6000)});
    if(response.status===429){cooldown.set(origin,Date.now()+30000);throw new Error(`${new URL(url).hostname}: rate limited; retry in 30 seconds`);}
    if(!response.ok){const error=new Error(`${new URL(url).hostname}: HTTP ${response.status}`);error.status=response.status;throw error;}
    return response.json();
  },typeof priority==='object'?priority.value:priority);
  if(typeof priority!=='object')return queued;
  const promote=value=>queued.promote(value);priority.listeners.add(promote);
  return queued.finally(()=>priority.listeners.delete(promote));
}
const marketBatch=createMarketBatch(request),contractFallback=createContractFallback(),curveScanner=createCurveScanner();
async function fetchContract(mint,priority,force){
  let raw,resolution;
  try{raw=await request(`https://api.rugcheck.xyz/v1/tokens/${mint}/report`,priority);}
  catch(error){
    const fallback=await contractFallback(mint,{force});
    if(fallback.error)throw Error(`${error.message}; direct mint verification: ${fallback.error}`);
    if(!fallback.resolution)return {...fallback,errors:[`RugCheck unavailable: ${error.message}; contract controls verified directly on Solana`,...(fallback.errors||[])]};
    const resolved=fallback.mint;
    // A malformed resolution must never await its own pending task, including
    // two concurrent pool lookups that resolve to each other.
    const seen=new Set([mint]);let target=resolved;
    while(target){if(seen.has(target))throw Error('Circular pool resolution rejected');seen.add(target);target=resolving.get(target);}
    resolving.set(mint,resolved);resolution=fallback.resolution;
    const report=await loadPart({mint:resolved,part:'contract',priority:typeof priority==='object'?priority.value:priority,force});
    if(report.error)throw Error(report.error);
    return {...report,resolution};
  }
  const [report,curve]=await Promise.all([verifyReportHolders(raw,mint),Array.isArray(raw.markets)&&raw.markets.some(m=>m?.marketType==='pump_fun')?curveScanner(raw,mint):{}]);
  return {...report,...curve,...(curve.curveError?{errors:[...(report.errors||[]),`Launch curve: ${curve.curveError}`]}:{}),resolution,at:Date.now()};
}
async function fetchMarket({mint,market,priority,force}){
  let data;
  if(!mint&&market){
    const result=await request(`https://api.dexscreener.com/latest/dex/pairs/solana/${market}`,priority);
    const pair=result.pairs?.find(p=>p?.chainId==='solana'&&p.pairAddress===market&&valid(p.baseToken?.address));
    if(!pair)return {error:'Market not indexed; contract address unavailable',at:Date.now()};
    mint=pair.baseToken.address;data={pairs:[pair],at:Date.now()};
  }else data=await marketBatch(mint,{priority:typeof priority==='object'?priority.value:priority,force});
  let pair=selectMarketPair(data.pairs,mint,market);
  if(!pair&&mint&&market&&market!==mint){
    // The batch endpoint can omit secondary pools. Resolve the exact requested pool;
    // never borrow the primary pool's liquidity or activity for that detail page.
    const result=await request(`https://api.dexscreener.com/latest/dex/pairs/solana/${market}`,priority);
    pair=selectMarketPair(result.pairs,mint,market);data={at:Date.now()};
  }
  const dex=normalizePair(pair,mint);
  return {mint,...dex,metrics:dex.metrics||{},sources:dex.sources||{},errors:pair?[]:['Market activity: selected pool not indexed yet'],at:data.at};
}
function loadPart(message){
  const {part,mint,market,priority=0,force=false}=message;
  const key=part==='contract'?`contract:${mint||market}`:`market:${mint||''}:${market||''}`;
  if(pending.has(key)){const task=pending.get(key);task.promote(priority);return task;}
  const cached=cache.get(key),ttl=cached?.errors?.length?5000:TTL;
  if(cached&&Date.now()-cached.at<ttl&&!force)return Promise.resolve(cached);
  // Leave room for a selected coin while eight visible feed coins load both parts.
  if(pending.size>=(priority>=4?24:20))return Promise.resolve({error:'Scanner queue full; retry shortly',at:Date.now()});
  const control={value:priority,listeners:new Set()};
  const task=Promise.resolve().then(()=>part==='contract'?fetchContract(mint||market,control,force):fetchMarket({...message,priority:control}))
    .catch(e=>({error:`Data request failed: ${e.message}`,at:Date.now()})).then(data=>{
      if(!data.error){
        cache.delete(key);cache.set(key,data);
        if(data.resolution)cache.set(`contract:${data.mint}`,{...data,resolution:undefined});
        while(cache.size>LIMIT)cache.delete(cache.keys().next().value);
      }
      return data;
    }).finally(()=>{pending.delete(key);if(part==='contract')resolving.delete(mint||market);});
  task.promote=value=>{if(value>control.value){control.value=value;for(const promote of control.listeners)promote(value);}};
  pending.set(key,task);return task;
}
async function analyze(message){
  if(message.part!=='all')return loadPart(message);
  let {mint,market,priority,force}=message,contract,activity;
  if(!mint){
    activity=await loadPart({...message,part:'market'});
    if(activity.error)return activity;
    mint=activity.mint;contract=await loadPart({mint,part:'contract',priority,force});
  }else [contract,activity]=await Promise.all(['contract','market'].map(part=>loadPart({...message,part})));
  if(contract.resolution&&contract.mint!==mint){
    mint=contract.mint;activity=await loadPart({mint,market,part:'market',priority,force});
  }
  const errors=[...(contract.errors||[]),...(activity.errors||[])];
  if(contract.error)errors.push(`Contract / holders: ${contract.error}`);
  if(activity.error)errors.push(`Market activity: ${activity.error}`);
  if(contract.error&&activity.error)return {error:errors.join('; '),at:Date.now()};
  const report=contract.error?{}:contract,dex=activity.error?{}:activity;
  // Keep available evidence from either provider, with its original observation time.
  return {...report,mint,name:dex.name,pairAddress:dex.pairAddress,pairDex:dex.pairDex,
    metrics:{...report.metrics,...dex.metrics},sources:{...report.sources,...dex.sources},errors,
    at:Math.min(...[report.at,dex.at].filter(Number.isFinite))};
}
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
  if(!['RUG_LENS_ANALYZE','RUG_LENS_CHAIN'].includes(message?.type)||sender.id!==chrome.runtime.id)return;
  if(sender.tab){try{if(new URL(sender.url).origin!=='https://trade.padre.gg')return;}catch{return;}}
  if((message.mint&&!valid(message.mint))||(message.market&&!valid(message.market))||(!message.mint&&!message.market)){reply({error:'Invalid Solana address'});return;}
  if(message.type==='RUG_LENS_CHAIN'){
    if(!valid(message.mint)){reply({error:'Token address required'});return;}
    const cached=chainCache.get(message.mint);
    if(cached&&Date.now()-cached.at<120000){reply(cached);return;}
    if(chainPending){reply({error:'Another on-chain scan is running; retry shortly'});return;}
    // Use provider-verified holder addresses; ignore arbitrary addresses in messages.
    const report=[...cache.values()].filter(r=>r.mint===message.mint&&r.holders?.length&&Date.now()-r.at<120000).at(-1);
    if(!report?.holders?.length){reply({error:'Refresh external holder evidence before the on-chain scan'});return;}
    chainPending=scanChain({mint:message.mint,holders:report.holders,creator:report.creator}).then(data=>{
      chainCache.set(message.mint,data);while(chainCache.size>50)chainCache.delete(chainCache.keys().next().value);reply(data);
    }).catch(e=>reply({error:e.message})).finally(()=>{chainPending=null;});return true;
  }
  const part=['contract','market'].includes(message.part)?message.part:'all';
  analyze({...message,part,priority:message.priority?4:Number.isInteger(message.scanPriority)?Math.max(0,Math.min(4,message.scanPriority)):0}).then(reply).catch(e=>reply({error:`Data request failed: ${e.message}`,at:Date.now()}));return true;
});
