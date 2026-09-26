(() => {
  if(globalThis.__rugLensLoaded)return;globalThis.__rugLensLoaded=true;
  const A=RugLensAdapter,E=RugLensEngine,U=RugLensUI;
  let enabled=true,external=true,current=null,selected=null,lastURL=location.href,routeAt=0,timer=null,timerAt=0,lastScanAt=0;
  const records=new Map(),badges=new Map(),stageEvidence=new Map();const TTL=30000,STAGE_TTL=120000,REFRESH_AFTER=25000,REQUEST_TIMEOUT=22000,FAIR_WAIT=15000,PARTS=['contract','market'];
  function record(key){if(!records.has(key))records.set(key,{market:key,manual:{},lastRequest:0,dueAt:Date.now(),partState:{},trades:new Map(),history:[],holderHistory:[],signalState:{}});return records.get(key);}
  function observeStage(r,data){
    const at=Number(data.stageAt??data.at),mint=data.stageMint||data.mint;
    if(!['new','final','migrated'].includes(data.stage)||mint!==r.mint||!Number.isFinite(at)||Date.now()-at<0||Date.now()-at>=STAGE_TTL)return;
    const previous=stageEvidence.get(mint);if(previous&&previous.stageAt>at)return;
    stageEvidence.delete(mint);stageEvidence.set(mint,{stage:data.stage,stageMint:mint,stageSource:data.stageSource||'Terminal Trenches column',stageAt:at});
    for(const [key,evidence] of stageEvidence)if(Date.now()-evidence.stageAt>=STAGE_TTL||stageEvidence.size>160)stageEvidence.delete(key);
  }
  function currentStage(r){
    const evidence=stageEvidence.get(r.mint);
    return evidence&&evidence.stageMint===r.mint&&Date.now()-evidence.stageAt>=0&&Date.now()-evidence.stageAt<STAGE_TTL?evidence:{stage:'unknown',stageMint:r.mint,stageSource:null,stageAt:null};
  }
  function captureHistory(r,metrics,at){
    const stage=currentStage(r),last=r.history.at(-1);
    if(!last||Date.now()-last.at>=15000||last.mint!==r.mint||last.stage!==stage.stage)r.history.push({...metrics,mint:r.mint,pool:r.market,...stage,at});
    r.history=r.history.filter(h=>Date.now()-h.at<600000);
  }
  function scopeObservations(r){
    const scope=`${r.mint}/${currentStage(r).stage}`;
    if(r.observationScope!==scope){r.trades.clear();r.holderHistory=[];r.holderObservation=null;r.observationScope=scope;}
  }
  function captureHolders(r,data){
    if(!data.holders?.length)return;
    const observation={mint:r.mint,stage:currentStage(r).stage,holders:data.holders.slice(0,100).map(h=>({...h})),holdersTopComplete:data.holdersTopComplete,at:data.at};
    r.holderObservation=observation;
    if(!r.holderHistory.length||data.at-r.holderHistory.at(-1).at>=15000)r.holderHistory.push(observation);
    r.holderHistory=r.holderHistory.filter(h=>data.at-h.at<=300000).slice(-21);
  }
  function priority(r){return r===current||(r===selected&&U.isOpen())?4:r.stagePriority||0;}
  function dueParts(r){return PARTS.filter(part=>r.force||Date.now()>=(r.partState[part]?.nextAt||0));}
  function nextDue(r){return r.force?Date.now():Math.min(...PARTS.map(part=>r.partState[part]?.nextAt||0));}
  function request(message){
    let timeout;
    return Promise.race([Promise.resolve().then(()=>chrome.runtime.sendMessage(message)),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Scan timed out; retry scheduled')),REQUEST_TIMEOUT);})]).finally(()=>clearTimeout(timeout));
  }
  function promote(r){
    if(priority(r)!==4||r.promoted)return;r.promoted=true;
    // Rejoin the same background tasks with higher queue priority; results still
    // flow through the original identity-checked handlers below.
    for(const part of r.partsPending||[])try{Promise.resolve(chrome.runtime.sendMessage({type:'RUG_LENS_ANALYZE',mint:r.requestMint,market:r.market,part,priority:true,scanPriority:4})).catch(()=>{});}catch{}
  }
  function model(r){
    const contract=external&&r.contract?.mint===r.mint&&Date.now()-r.contract.at<90000?r.contract:null;
    const market=external&&r.marketData?.mint===r.mint&&Date.now()-r.marketData.at<90000?r.marketData:null;
    const p=contract||market?{...contract,...market,holders:contract?.holders||[],providerWarnings:contract?.providerWarnings||[],rugged:contract?.rugged===true,metrics:{...contract?.metrics,...market?.metrics},sources:{...contract?.sources,...market?.sources},at:Math.min(...[contract?.at,market?.at].filter(Boolean)),errors:[...contract?.errors||[],...market?.errors||[]]}:null;
    let staleEvidence=!!p&&Date.now()-p.at>=TTL;
    const page=r.page&&Date.now()-r.page.at<10000?r.page:null;
    for(const [id,v] of Object.entries(r.manual))if(Date.now()-v.at>=300000)delete r.manual[id];
    const sources={...(p?.sources||{})};for(const key of Object.keys(page?.metrics||{})){const id={top10Pct:'top10',insiderPct:'insiders',bundlePct:'bundles',sniperPct:'snipers',devPct:'devHolding',mintActive:'mint',freezeActive:'freeze',liquidityUsd:'liquidity'}[key];if(id)sources[id]='Terminal page';}
    const metrics={...p?.metrics,...page?.metrics},disagreements=[];
    for(const [key,value] of Object.entries(page?.metrics||{})){
      const other=p?.metrics?.[key];if(other===undefined)continue;
      if(typeof value==='boolean'&&typeof other==='boolean'&&value!==other){
        disagreements.push(`${key}: Terminal reports ${value}; external report says ${other}. The active control is retained until resolved.`);
        if(['mintActive','freezeActive','metadataMutable'].includes(key)){metrics[key]=value||other;sources[{mintActive:'mint',freezeActive:'freeze',metadataMutable:'metadata'}[key]]='Terminal / RugCheck disagree; active control retained';}
      }else if(typeof value==='number'&&typeof other==='number'&&Math.abs(value-other)>Math.max(1,Math.abs(other)*.3))disagreements.push(`${key}: Terminal ${value.toLocaleString()} vs external ${other.toLocaleString()}. Different indexing times or definitions may explain this; Terminal display is used.`);
    }
    const observed=r.holderObservation?.mint===r.mint&&Date.now()-r.holderObservation.at<120000?r.holderObservation:null;
    if(observed&&Date.now()-observed.at>=TTL)staleEvidence=true;
    const activity=RugLensActivity.summarize([...r.trades.values()]);
    const chain=external&&r.chain?.mint===r.mint&&Date.now()-r.chain.at<120000?r.chain:null;
    const poolOwners=new Set((contract?.holderVerification?.excludedPools||[]).filter(pool=>pool.mint===r.mint).map(pool=>pool.address));
    const classifications=new Map((contract?.holders||[]).filter(h=>h.accountType).map(h=>[h.address,h.accountType]));
    const evidenceHolders=(observed?observed.holders:p?.holders||[]).filter(h=>!poolOwners.has(h.address)).map(h=>({...h,accountType:classifications.get(h.address)||h.accountType}));
    // An abbreviated or filtered Terminal row must not erase a provider verification gap.
    for(const h of contract?.holders||[])if(h.accountType==='unresolved'&&!evidenceHolders.some(row=>row.address===h.address))evidenceHolders.push(h);
    const stage=currentStage(r);
    const cleanHolders=holders=>holders.filter(h=>!poolOwners.has(h.address)).map(h=>({...h,accountType:classifications.get(h.address)||h.accountType}));
    const holderHistory=[...r.holderHistory.filter(h=>h.at!==observed?.at),...(observed?[observed]:[])].filter(h=>h.mint===r.mint&&h.stage===stage.stage).map(h=>({...h,holders:cleanHolders(h.holders)}));
    const holderChanges=RugLensActivity.cohort(holderHistory);
    const traderContext=RugLensActivity.holderContext(observed&&Date.now()-observed.at<TTL?cleanHolders(observed.holders):[]);
    const input={...p,mint:r.mint,selectedMarket:r.market,...stage,marketAt:market?.at,marketMint:market?.mint,marketLiquidityUsd:market?.metrics?.liquidityUsd,staleEvidence,sourceConflicts:disagreements.length>0,chain,activity,trend:RugLensActivity.trend(r.history),metrics,sources,holders:evidenceHolders,holdersTopComplete:observed?observed.holdersTopComplete:false,holderSource:observed?`Terminal holder sample (${Math.round((Date.now()-observed.at)/1000)}s ago)`:'RugCheck holder sample',manual:r.manual};
    const result=E.evaluate(input);
    const signals={momentum:RugLensSignals.momentum(metrics,activity),events:RugLensSignals.observe(r.signalState,result,[...r.trades.values()],metrics)};
    return {...r,...stage,staleEvidence,signals,holderChanges,traderContext,chain,canScanChain:external&&!!p?.holders?.some(h=>h.accountType!=='unresolved'),metrics:input.metrics,disagreements,evidenceHolders:input.holders,holderAt:observed?.at,holderVerification:contract?.holderVerification,contractAt:contract?.at,marketAt:market?.at,launchCurve:contract?.launchCurve,curveError:contract?.curveError,pageAt:page?.at,result,page:!!page,providerAt:p?.at,providerWarnings:p?.providerWarnings||[],error:[...Object.values(r.partErrors||{}),...p?.errors||[]].filter(Boolean).join('; ')};
  }
  function remember(r,m){
    if(r.loading||r.queued)return;
    const fingerprint=JSON.stringify([m.mint,m.market,m.stage,m.result.level,m.result.missingCore,m.result.decision?.gaps,m.staleEvidence,m.disagreements.map(s=>s.split(':')[0]),m.result.checks.filter(c=>c.points).map(c=>[c.id,c.points]),m.providerWarnings.map(w=>[w.name,w.scoringEligible])]);
    const cadence=m.result.activity?.count>0||m.traderContext?.sampleCount>0?60000:300000;
    if(r.journalFingerprint===fingerprint&&Date.now()-(r.journalAt||0)<cadence)return;
    r.journalFingerprint=fingerprint;r.journalAt=Date.now();
    const {mint,market,name,stage,stageMint,stageSource,stageAt,result,metrics,evidenceHolders,providerWarnings,holderVerification,launchCurve,staleEvidence,disagreements,holderAt,pageAt,contractAt,marketAt,holderChanges,traderContext,error}=m;
    try{Promise.resolve(chrome.runtime.sendMessage({type:'RUG_LENS_RECORD',snapshot:{mint,market,name,stage,stageMint,stageSource,stageAt,result,metrics,evidenceHolders,providerWarnings,holderVerification,launchCurve,staleEvidence,disagreements,holderAt,pageAt,contractAt,marketAt,holderChanges,traderContext,error}})).catch(()=>{});}catch{}
  }
  function show(r){selected=r;draw();}
  function draw(prepared){if(!selected)return;U.panel(prepared||model(selected),{chain:()=>scanChain(selected),refresh:()=>{selected.force=true;scan();fetchData(selected);},manual:(id,status)=>{selected.manual[id]={status,at:Date.now()};update(selected);}});}
  async function scanChain(r){
    if(!external||!enabled||r.chainLoading)return;
    const mint=r.mint;r.chainLoading=true;r.chainError=null;update(r);
    try{
      const data=await chrome.runtime.sendMessage({type:'RUG_LENS_CHAIN',mint,market:r.market});
      if(data?.error)throw Error(data.error);
      if(data?.mint!==mint)throw Error('On-chain result token mismatch');
      if(enabled&&external&&r.mint===mint)r.chain=data;
    }catch(e){r.chainError=e.message;}
    finally{r.chainLoading=false;update(r);}
  }
  function update(target){
    if(!enabled||document.hidden)return;
    const models=new Map();
    for(const [el,b] of badges){
      if(target&&b.record!==target)continue;
      if(!el.isConnected||!b.ui.host.isConnected){b.ui.host.remove();badges.delete(el);continue;}
      if(!models.has(b.record))models.set(b.record,model(b.record));
      const m=models.get(b.record);b.ui.update(m.result,['limited','unknown'].includes(m.result.level)?b.record.loading?'loading':b.record.queued?'queued':'ready':'ready');
      remember(b.record,m);
    }
    if(selected&&U.isOpen()&&(!target||selected===target))draw(models.get(selected));
  }

  async function fetchData(r){
    if(!external||!enabled||document.hidden)return;if(r.loading){promote(r);return;}
    const parts=dueParts(r);if(!parts.length)return;
    const force=!!r.force;r.force=false;r.lastRequest=Date.now();r.queued=false;r.loading=true;r.error=null;r.queueSince=null;
    const mint=r.mint,market=r.market;r.requestMint=mint;r.promoted=priority(r)===4;
    r.partErrors||={};r.partsPending=[...parts];update(r);
    try{
      await Promise.allSettled(parts.map(async part=>{
        const state=r.partState[part]||={};state.lastAttempt=Date.now();delete r.partErrors[part];
        try{
          const data=await request({type:'RUG_LENS_ANALYZE',mint,market,part,priority:priority(r)===4,scanPriority:priority(r),force});
          if(data?.error){const error=Error(data.error);error.retryAfterMs=data.retryAfterMs;throw error;}
          if(!data?.at)throw Error('No provider response');
          if(data.errors?.length&&!Object.keys(data.metrics||{}).length)throw Error(data.errors.join('; '));
          if(data.mint!==mint){
            if(part!=='contract'||data.resolution?.address!==mint||data.resolution?.mint!==data.mint||data.resolution?.source!=='Solana PumpSwap pool account')throw Error('Provider token mismatch; result discarded');
            if(r.mint!==mint)return;
            r.resolvedAddress=mint;r.resolvedMint=data.mint;r.mint=data.mint;r.marketData=null;r.partState.market={};delete r.partErrors.market;
          }
          if(external&&enabled&&r.mint===data.mint&&r.partState[part]===state){
            r[part==='contract'?'contract':'marketData']=data;r.name=r.name||data.name;state.failures=0;
            // Partial reports (for example a market that has not indexed yet)
            // retry promptly without repeatedly fetching the healthy other part.
            state.nextAt=data.errors?.length?Date.now()+5000:Math.max(Date.now()+1000,data.at+REFRESH_AFTER);
          }
        }catch(e){
          if(r.mint===mint&&r.partState[part]===state){
            state.failures=(state.failures||0)+1;
            const rateLimited=/rate limit|cooling down|HTTP 429/i.test(e.message);
            const retry=Math.min(30000,Math.max(rateLimited?30000:Math.min(30000,3000*2**(state.failures-1)),Number(e.retryAfterMs)||0));
            state.nextAt=Date.now()+retry;
            r.partErrors[part]=`${part==='contract'?'Contract / holders':'Market activity'}: ${e.message.includes('Extension context')?'Reload this Terminal tab after updating the extension':e.message}`;
          }
        }finally{r.partsPending=r.partsPending.filter(p=>p!==part);update(r);}
      }));
    }finally{r.loading=false;r.lastRequest=Date.now();r.dueAt=nextDue(r);update(r);schedule();}
  }

  function attach(anchor,r){
    const old=badges.get(anchor);if(old&&old.record===r)return;if(old){old.ui.host.remove();badges.delete(anchor);}
    const ui=U.badge(()=>{show(r);fetchData(r);});anchor.insertAdjacentElement('afterend',ui.host);badges.set(anchor,{record:r,ui});
  }
  function visible(el){const b=el.getBoundingClientRect();return b.width>0&&b.height>0&&b.bottom>0&&b.top<innerHeight&&b.right>0&&b.left<innerWidth;}
  function scan(){
    if(timer!==null)clearTimeout(timer);timer=null;timerAt=0;if(!enabled||document.hidden)return;lastScanAt=Date.now();
    if(location.href!==lastURL){lastURL=location.href;routeAt=Date.now();if(current)current.page=null;current=null;selected=null;U.close();for(const b of badges.values())b.ui.host.remove();badges.clear();}
    if(Date.now()-routeAt<700){schedule();return;}
    const wanted=new Set();
    const data=A.read(document,location.href);
    if(data){
      const r=record(data.market);if(r.mint&&r.mint!==data.mint){r.contract=null;r.marketData=null;r.partErrors={};r.chain=null;r.chainError=null;r.signalState={};r.manual={};r.lastRequest=0;r.partState={};r.trades.clear();r.history=[];r.holderObservation=null;}
      r.mint=data.mint;r.name=data.name;r.page=data;observeStage(r,data);scopeObservations(r);captureHolders(r,data);
      for(const trade of data.trades||[]){const old=r.trades.get(trade.signature);r.trades.set(trade.signature,{...trade,at:old?Math.min(old.at,trade.at):trade.at});}
      for(const [signature,t] of r.trades)if(Date.now()-t.at>300000)r.trades.delete(signature);
      while(r.trades.size>500)r.trades.delete(r.trades.keys().next().value);
      captureHistory(r,data.metrics,data.at);
      current=r;wanted.add(data.heading);attach(data.heading,r);fetchData(r);
    }else if(current){current.page=null;current=null;}
    const feed=[];
    // Prepare every card already present in the DOM, including cards below a
    // column's scroll viewport. This lets their first scan progress in background.
    // Measure all existing headings before inserting badges to avoid layout thrashing.
    const entries=new URL(location.href).pathname==='/trenches'?A.links(document).map(entry=>({...entry,visible:visible(entry.element)})):[];
    for(const entry of entries){
      const r=record(entry.market),mint=r.resolvedAddress===entry.mint?r.resolvedMint:entry.mint;
      if(r.mint&&r.mint!==mint){r.contract=null;r.marketData=null;r.partState={};r.partErrors={};r.chain=null;r.chainError=null;r.signalState={};r.manual={};r.trades.clear();r.history=[];r.holderObservation=null;}
      r.mint=mint;r.name=entry.name;r.stage=entry.stage||'unknown';r.stagePriority=Number(entry.stagePriority)||({new:3,final:2,migrated:1}[r.stage]||0);r.page={metrics:entry.metrics,at:entry.at};observeStage(r,r.resolvedAddress===entry.mint?{...entry,mint,stageMint:mint}:entry);
      scopeObservations(r);
      captureHistory(r,entry.metrics,entry.at);
      r.dueAt=nextDue(r);r.queued=external&&!r.loading&&dueParts(r).length>0;
      if(r.queued)r.queueSince??=Date.now();else if(!r.loading)r.queueSince=null;
      wanted.add(entry.element);attach(entry.element,r);feed.push({r,visible:entry.visible});
    }
    const active=Array.from(records.values()).filter(r=>r.loading).length,slots=Math.max(0,8-active);
    const candidates=feed.filter(({r})=>r.queued).sort((a,b)=>priority(b.r)-priority(a.r)||Number(!b.r.lastRequest)-Number(!a.r.lastRequest)||Number(b.visible)-Number(a.visible)||(a.r.queueSince-b.r.queueSince));
    // Reserve one slot for the oldest long-waiting card. Continuous arrivals in
    // New Pairs must not leave Final Stretch or Migrated indefinitely unchecked.
    const oldest=candidates.filter(({r})=>Date.now()-r.queueSince>=FAIR_WAIT).sort((a,b)=>a.r.queueSince-b.r.queueSince)[0];
    if(oldest&&slots&&!candidates.some(({r})=>priority(r)===4)){candidates.splice(candidates.indexOf(oldest),1);candidates.unshift(oldest);}
    for(const {r} of candidates.slice(0,slots))fetchData(r);
    for(const [anchor,b] of badges)if(!wanted.has(anchor)){b.ui.host.remove();badges.delete(anchor);}
    for(const [key,r] of records)if(records.size>80&&r!==current&&r!==selected&&!r.loading&&!Array.from(badges.values()).some(b=>b.record===r))records.delete(key);
    update();
    if(external){
      const observed=new Set([...feed.map(({r})=>r),...(current?[current]:[]),...(selected&&U.isOpen()?[selected]:[])]);
      const due=[...observed].filter(r=>!r.loading).map(nextDue).filter(at=>at>Date.now());
      if(due.length)schedule(Math.max(300,Math.min(...due)-Date.now()));
    }
  }
  function schedule(delay=300){if(!enabled||document.hidden)return;const floor=routeAt&&Date.now()-routeAt<700?routeAt+700:lastScanAt+1000;const at=Math.max(Date.now()+delay,floor);delay=at-Date.now();if(timer!==null&&timerAt<=at)return;if(timer!==null)clearTimeout(timer);timerAt=at;timer=setTimeout(scan,delay);}
  const observer=new MutationObserver(changes=>{
    if(!enabled||document.hidden)return;
    const trenches=new URL(location.href).pathname==='/trenches';
    if(changes.some(c=>{
      const target=c.target.nodeType===1?c.target:c.target.parentElement;
      if(target?.closest?.('rug-lens-badge,rug-lens-panel,#tracked-wallets-left,[id*="tracked-wallet"],#klux-trade-panel'))return false;
      if(trenches&&target?.closest?.('#main-page')===null&&document.getElementById('main-page')&&!target?.contains?.(document.getElementById('main-page')))return false;
      return !(c.type==='childList'&&[...c.addedNodes,...c.removedNodes].every(n=>n.nodeType===1&&/^RUG-LENS-/.test(n.tagName)));
    }))schedule();
  });
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['id','href','aria-label']});
  setInterval(()=>{if(!document.hidden)scan();},5000);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){if(timer!==null)clearTimeout(timer);timer=null;timerAt=0;}else scan();});
  chrome.storage.local.get({enabled:true,external:true},prefs=>{enabled=prefs.enabled;external=prefs.external;scan();});
  chrome.storage.onChanged.addListener((changes,area)=>{if(area!=='local'||(!changes.enabled&&!changes.external))return;if(changes.enabled)enabled=changes.enabled.newValue;if(changes.external){external=changes.external.newValue;for(const r of records.values()){r.contract=null;r.marketData=null;r.partErrors={};r.chain=null;r.chainError=null;r.lastRequest=0;r.partState={};r.force=false;}}if(!enabled){for(const b of badges.values())b.ui.host.remove();badges.clear();U.close();}else scan();});
})();
