/* In-tab analysis only. No trading automation or background notifications. */
(() => {
 const finite=n=>typeof n==='number'&&Number.isFinite(n);
 function momentum(metrics={},activity={}){
  if(activity.pricedCount<10||!(activity.volumeUsd>=100)||!finite(activity.sellPct))return null;
  const falling=finite(metrics.priceChange5m)&&metrics.priceChange5m<=-10;
  const rising=finite(metrics.priceChange5m)&&metrics.priceChange5m>=10;
  if(activity.sellPct>=75)return {tone:'caution',label:falling?'Selling pressure with falling price':'Selling dominates the visible sample',detail:'Observed USD flow is sell-heavy. The visible trade filter can skew this reading; it is not a full-market or wash-trading verdict.'};
  if(activity.sellPct<=25)return {tone:'neutral',label:rising?'Buying pressure with rising price':'Buying dominates the visible sample',detail:'Observed USD flow is buy-heavy. Buying pressure does not reduce contract or ownership risk.'};
  return {tone:'neutral',label:'No clear direction in sampled flow',detail:'Buying and selling are mixed in the visible sample. No directional conclusion.'};
 }
 function observe(state,result,trades=[],metrics={},now=Date.now()){
  state.events=(state.events||[]).filter(e=>now-e.at<300000);
  state.seen=state.seen||new Set();
  const phase=result.lifecycle?.id,changedPhase=!!phase&&!!state.phase&&phase!==state.phase;
  if(changedPhase)state.events.unshift({at:now,kind:'neutral',label:`Stage changed · ${result.lifecycle.label}`,detail:'The analysis policy has changed. Point differences across stages do not by themselves establish new selling or a new rug event.'});
  if(phase)state.phase=phase;
  const flags=new Map(result.checks.filter(c=>c.status==='flag').map(c=>[c.id,c]));
  if(state.flags){
   const added=[...flags.values()].filter(c=>!state.flags.has(c.id));
   if(added.length)state.events.unshift({at:now,kind:'risk',label:changedPhase?'Findings under the new stage':'New risk evidence',detail:added.map(c=>c.label).join(' · ')});
  }
  // Unknown does not clear an earlier finding or cause a repeated alert when data returns.
  state.flags=state.flags||new Set();
  for(const c of result.checks){if(c.status==='flag')state.flags.add(c.id);else if(c.status==='clear')state.flags.delete(c.id);}
  const threshold=Math.max(1000,finite(metrics.liquidityUsd)&&metrics.liquidityUsd>0?metrics.liquidityUsd*.01:1000);
  for(const t of trades){
   if(!t.signature||state.seen.has(t.signature))continue;state.seen.add(t.signature);
   if(!finite(t.at)||t.at>now+2000||now-t.at>60000||!finite(t.usd)||t.usd<threshold||!['buy','sell'].includes(t.side))continue;
   state.events.unshift({at:t.at,kind:t.side==='sell'?'sell':'buy',label:t.side==='sell'?'Large sell observed':'Large buy observed',detail:`$${Math.round(t.usd).toLocaleString('en-US')} in one displayed trade${t.developer?' · developer label':t.insider?' · insider label':t.bundler?' · bundler label':''}. Size threshold: $${Math.round(threshold).toLocaleString('en-US')} (greater of $1,000 or 1% of reported liquidity). Size does not prove wallet wealth or intent.`,signature:t.signature});
  }
  while(state.seen.size>1000)state.seen.delete(state.seen.values().next().value);
  state.events.sort((a,b)=>b.at-a.at);state.events=state.events.slice(0,8);
  return state.events;
 }
 globalThis.RugLensSignals={momentum,observe};
})();
