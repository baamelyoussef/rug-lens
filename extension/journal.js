// Local evidence snapshots enable prospective review; they are not trade recommendations.
const KEY='scanJournal',LIMIT=500,RETENTION=7*86400000;
const address=v=>typeof v==='string'&&/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v);
const text=(v,n=200)=>typeof v==='string'?v.slice(0,n):'';
const numeric=v=>typeof v==='number'&&Number.isFinite(v);
const fields=obj=>Object.fromEntries(Object.entries(obj||{}).filter(([k,v])=>k.length<60&&(numeric(v)||typeof v==='boolean')).slice(0,100));
const time=(v,now)=>numeric(v)&&v>0&&v<=now+5000?v:null;
const observation=(v,now)=>v&&typeof v==='object'?{...fields(v),status:['available','insufficient'].includes(v.status)?v.status:undefined,
  reason:text(v.reason,300),reasons:(Array.isArray(v.reasons)?v.reasons:[]).slice(0,8).map(x=>text(x,200)),from:time(v.from,now),to:time(v.to,now),sampleOnly:true}:null;
const hasActivity=e=>Object.values(e.observations?.windows||{}).some(w=>w?.observedCount>0)||e.observations?.traderContext?.sampleCount>0;
export function snapshot(payload,version,now=Date.now()){
  if(!address(payload?.mint)||!payload.result||!Array.isArray(payload.result.checks))return null;
  const r=payload.result;
  if(!['unknown','limited','lower','caution','high','critical','rugged'].includes(r.level))return null;
  const checks=r.checks.slice(0,60).map(c=>({id:text(c.id,60),status:['unknown','clear','flag','not-applicable'].includes(c.status)?c.status:'unknown',points:numeric(c.points)?c.points:0,detail:text(c.detail,350),source:text(c.source,200)}));
  return {schema:2,version,at:now,mint:payload.mint,market:address(payload.market)?payload.market:null,name:text(payload.name,80),
    lifecycle:r.lifecycle?{id:text(r.lifecycle.id,30),label:text(r.lifecycle.label,60),source:text(r.lifecycle.source,200),at:time(r.lifecycle.at,now),venue:text(r.lifecycle.venue,30),conflict:r.lifecycle.conflict===true,adjustments:(r.lifecycle.adjustments||[]).slice(0,20).map(x=>({id:text(x.id,60),from:numeric(x.from)?x.from:null,to:numeric(x.to)?x.to:null}))}:null,
    level:r.level,label:text(r.label,80),score:numeric(r.score)?r.score:null,reason:text(r.decision?.reason||r.summary,400),
    decision:{baselineComplete:r.decision?.baselineComplete===true,gaps:(r.decision?.gaps||[]).map(x=>text(x,200)).slice(0,20)},error:text(payload.error,600),
    automaticKnown:r.autoKnown,automaticTotal:r.autoTotal,missingCore:(r.missingCore||[]).map(x=>text(x,60)).slice(0,30),
    metrics:fields(payload.metrics),checks,sourceTimes:{page:time(payload.pageAt,now),contract:time(payload.contractAt,now),market:time(payload.marketAt,now),holders:time(payload.holderAt,now)},
    observations:{scoring:false,windows:Object.fromEntries(['30s','120s','300s'].filter(key=>r.activity?.windows?.[key]).map(key=>[key,observation(r.activity.windows[key],now)])),holderChanges:observation(payload.holderChanges,now),traderContext:payload.traderContext?fields(payload.traderContext):null},
    holders:(payload.evidenceHolders||[]).slice(0,20).map(h=>({address:address(h.address)?h.address:null,pct:numeric(h.pct)?h.pct:null,accountType:text(h.accountType,30),isPool:h.isPool===true,
      holdingAgeSeconds:numeric(h.holdingAgeSeconds)&&h.holdingAgeSeconds>=0?h.holdingAgeSeconds:null,
      ...Object.fromEntries(['boughtTokenAmount','soldTokenAmount','boughtTradeCount','soldTradeCount'].map(k=>[k,numeric(h[k])&&h[k]>=0?h[k]:null])),
      boughtTokenAmountApproximate:h.boughtTokenAmountApproximate===true,soldTokenAmountApproximate:h.soldTokenAmountApproximate===true,
      ...Object.fromEntries(['bought','sold','realizedPnl'].flatMap(k=>{const symbol=h[k+'QuoteSymbol'],amount=h[k+'QuoteAmount'],known=['USD','SOL','USDC','USDT'].includes(symbol)&&numeric(amount)&&(k==='realizedPnl'||amount>=0);return [[k+'QuoteAmount',known?amount:null],[k+'QuoteSymbol',known?symbol:null]];}))})),
    providerWarnings:(payload.providerWarnings||[]).slice(0,20).map(w=>({name:text(w.name,160),level:text(w.level,30),scoringEligible:w.scoringEligible!==false,reason:text(w.reason,350)})),
    launchCurve:payload.launchCurve?.status==='verified'&&payload.launchCurve.mint===payload.mint&&address(payload.launchCurve.address)?{
      status:'verified',mint:payload.mint,address:payload.launchCurve.address,program:text(payload.launchCurve.program,30),complete:payload.launchCurve.complete===true,
      quoteMint:address(payload.launchCurve.quoteMint)?payload.launchCurve.quoteMint:null,quoteIsNativeSol:payload.launchCurve.quoteIsNativeSol===true,
      slot:numeric(payload.launchCurve.slot)?payload.launchCurve.slot:null,at:time(payload.launchCurve.at,now),source:text(payload.launchCurve.source,200),
      ...Object.fromEntries(['virtualTokenReservesRaw','virtualQuoteReservesRaw','realTokenReservesRaw','realQuoteReservesRaw','tokenSupplyRaw'].map(k=>[k,/^\d{1,20}$/.test(payload.launchCurve[k])?payload.launchCurve[k]:null]))}:null,
    holderVerification:payload.holderVerification?{status:text(payload.holderVerification.status,40),scope:text(payload.holderVerification.scope,250),
      excludedPools:(payload.holderVerification.excludedPools||[]).filter(p=>address(p.address)&&p.mint===payload.mint).slice(0,20).map(p=>({address:p.address,mint:p.mint,slot:numeric(p.slot)?p.slot:null,checkedAt:time(p.checkedAt,now)})),
      unresolved:(payload.holderVerification.unresolved||[]).slice(0,20).map(h=>({address:address(h.address)?h.address:null,pct:numeric(h.pct)?h.pct:null,reason:text(h.reason,200)}))}:null,
    stale:payload.staleEvidence===true,disagreements:(payload.disagreements||[]).slice(0,20).map(x=>text(x,350)),
    scope:'Evidence observed at this time. No trade execution, future return or independently verified rug outcome recorded.'};
}
export function appendSnapshot(entries,item,now=Date.now()){
  const valid=(Array.isArray(entries)?entries:[]).filter(e=>e&&numeric(e.at)&&e.at>=now-RETENTION&&e.at<=now);
  if(!item)return valid.slice(-LIMIT);
  const last=valid.findLast(e=>e.mint===item.mint&&e.market===item.market);
  const fingerprint=e=>JSON.stringify([e.level,e.label,e.lifecycle?.id,e.lifecycle?.venue,e.missingCore,e.decision,e.stale,e.disagreements?.map(s=>s.split(':')[0]),e.error,e.checks?.filter(c=>c.points>0).map(c=>[c.id,c.points]),e.providerWarnings?.map(w=>[w.name,w.scoringEligible])]);
  // Keep active observed samples each minute; quiet baseline scans each five.
  if(last&&fingerprint(last)===fingerprint(item)&&now-last.at<(hasActivity(item)?60000:300000))return valid.slice(-LIMIT);
  return [...valid,item].slice(-LIMIT);
}
export function createJournal(storage,version){
  let queue=Promise.resolve();
  return payload=>{
    const item=snapshot(payload,version);if(!item)return Promise.resolve({error:'Invalid evidence snapshot'});
    const task=queue.then(async()=>{const data=await storage.get(KEY);const entries=appendSnapshot(data[KEY],item);await storage.set({[KEY]:entries});return {saved:true};});
    queue=task.catch(()=>{});return task;
  };
}
if(globalThis.chrome?.runtime?.onMessage){
  const record=createJournal(chrome.storage.local,chrome.runtime.getManifest().version);
  chrome.runtime.onMessage.addListener((message,sender,reply)=>{
    if(message?.type!=='RUG_LENS_RECORD'||sender.id!==chrome.runtime.id||!sender.tab)return;
    try{if(new URL(sender.url).origin!=='https://trade.padre.gg')return;}catch{return;}
    record(message.snapshot).then(reply).catch(()=>reply({error:'Could not save local scan snapshot'}));return true;
  });
}
