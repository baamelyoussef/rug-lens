(() => {
  const CSS=`
    :host{all:initial;color:#e6e8ed;font:12px/1.5 Geist,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color-scheme:dark}
    *{box-sizing:border-box}button,select{font:inherit}button,a,select{touch-action:manipulation}button{cursor:pointer}
    .pill{border:0;border-radius:4px;background:transparent;padding:1px;width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;color:var(--tone,#929296)}
    .pill:hover{background:#ffffff12;filter:brightness(1.2)}button:focus-visible,select:focus-visible,a:focus-visible,summary:focus-visible{outline:2px solid #20d978;outline-offset:2px}
    svg{width:16px;height:16px;display:block}.rugged,.critical,.high{--tone:#f05264}.caution{--tone:#e9b949}.lower{--tone:#20d978}.unknown,.limited{--tone:#929296}
    .drawer{position:fixed;right:16px;top:64px;width:400px;max-width:calc(100vw - 24px);height:calc(50dvh - 42px);max-height:calc(100dvh - 80px);display:flex;flex-direction:column;background:#111114;border:1px solid #303037;border-radius:10px;box-shadow:0 8px 32px #0006;overflow:hidden;color:#e6e8ed}
    .head{cursor:grab;touch-action:none;user-select:none;display:flex;align-items:center;justify-content:space-between;padding:9px 12px;flex-shrink:0;border-bottom:1px solid #29292f;position:sticky;top:0;background:#111114;z-index:2}.head:active{cursor:grabbing}.brand::before{content:"⠿";color:#777781;margin-right:8px}.brand{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12px;font-weight:700;letter-spacing:1px}.brand span{font-weight:400;color:#777781;font-size:10px;letter-spacing:0;margin-left:8px}
    .close{min-width:28px;min-height:28px;flex-shrink:0;border:0;background:transparent;color:#9999a2;padding:0 5px;font-size:22px}.body{padding:10px 12px;overflow:auto;min-height:0;flex:1 1 auto;overscroll-behavior:contain;touch-action:pan-y;scrollbar-width:thin;scrollbar-color:#3a3a43 transparent}h2{font-size:18px;line-height:1.25;margin:0 0 3px;overflow-wrap:anywhere}p{margin:5px 0;color:#a6a6b2}small{font-size:10px;color:#92929e}.address{display:block;font:10px/1.7 ui-monospace,monospace;word-break:break-all;color:#777781}
    .hero{border:1px solid color-mix(in srgb,var(--tone) 35%,#222);background:color-mix(in srgb,var(--tone) 6%,#151518);border-radius:8px;padding:10px;margin:0 0 8px}.hero-top{display:flex;align-items:center;gap:8px;color:var(--tone);font-size:15px;font-weight:650}.hero-top svg{width:21px;height:21px}.score{margin-left:auto;font:14px ui-monospace,monospace}.score small{font-size:10px}.summary{color:#e0e0e6;font-size:12px;margin-top:5px;line-height:1.5}.tag{display:inline-block;border:1px solid #38383f;border-radius:4px;padding:1px 5px;font-size:10px;color:#a8a8b1;margin-top:9px}
    .between{display:flex;justify-content:space-between;gap:8px}.stage{padding:0 0 8px;color:#adb9ca;font-size:11px}.stage strong{display:flex;align-items:center;gap:6px;font-weight:600}.stage svg{width:13px;height:13px}.stage small{display:block;margin-top:2px}.section{margin:10px 0 5px;font-size:10px;letter-spacing:1px;font-weight:700;color:#92929e}.coverage{padding:0 0 8px;color:#92929e}.bar{height:3px;background:#25252b;margin:7px 0;border-radius:2px}.fill{height:100%;background:#6b7785}.notice{padding:9px 11px;border-left:2px solid #666672;background:#1c1c21;font-size:11px;color:#b1b1bb;margin:10px 0}.warning{border-color:#e9b949}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}.stat{padding:9px;background:#19191e;border:1px solid #29292f;border-radius:6px;min-width:0}.stat strong{display:block;font-size:12px;font-weight:600;color:#dedee7;overflow-wrap:anywhere}.stat small{display:block}.stat.wide{grid-column:1/-1}
    .check{padding:8px 0;border-bottom:1px solid #25252c}.check-title{display:flex;gap:7px;align-items:center}.check-title svg{width:14px;height:14px;flex-shrink:0}.check.flag .check-title{color:#dea3a8}.check.flag{border-left:2px solid #a94f5d;padding-left:9px}.check.clear .check-title{color:#83b49b}.signal{padding:8px 10px;border:1px solid #30303a;border-radius:5px;margin:7px 0;background:#18181e}.signal strong{font-size:11px;display:flex;gap:6px;align-items:center}.signal p{font-size:11px}.signal.caution strong,.signal.sell strong{color:#cfb77f}.signal.risk strong{color:#dea3a8}.signal.neutral strong,.signal.buy strong{color:#9eafc4}.check-head{display:flex;justify-content:space-between;gap:10px;font-weight:600}.points{color:#f27b88;white-space:nowrap;font-size:11px}.check p{font-size:11px;margin:3px 0}.clear{color:#20d978;font-size:11px}.unknown-status{color:#929296;font-size:11px}
    details{margin-top:8px}summary{cursor:pointer;color:#c7c7d1;font-size:12px;padding:6px 0}select{display:block;width:100%;margin-top:7px;background:#202027;color:#dedee7;border:1px solid #393942;padding:7px;border-radius:5px}.actions{display:flex;gap:6px;flex-wrap:wrap;padding:8px 12px;margin:0;border-top:1px solid #29292f;flex-shrink:0;background:#141418}.actions button:disabled{opacity:.45;cursor:default}a,.action{background:#202027;border:1px solid #35353d;border-radius:5px;padding:6px 9px;font-size:11px;color:#d1d1dd;text-decoration:none}.action.primary{color:#a7d5be;background:#20342b;border-color:#365844;font-weight:600}.foot{margin-top:16px;padding-top:12px;border-top:1px solid #29292f;font-size:10px;color:#858591}.check a{display:inline-block;margin-top:5px;padding:2px 5px;font-size:10px}
  `;
  const paths={
    contract:'M6 10V7a6 6 0 0112 0v3 M4 10h16v12H4z M12 14v4',
    coordination:'M8 5a3 3 0 11-6 0 3 3 0 016 0 M22 5a3 3 0 11-6 0 3 3 0 016 0 M15 19a3 3 0 11-6 0 3 3 0 016 0 M7 8l4 8 M17 8l-4 8 M8 5h8',
    distribution:'M4 21V11h4v10 M10 21V3h4v18 M16 21V7h4v14',
    behaviour:'M2 16l6-7 5 4 9-10 M16 3h6v6',
    liquidity:'M12 2C9 7 4 11 4 16a8 8 0 0016 0c0-5-5-9-8-14z',
    reputation:'M12 2l8 3v6c0 5-4 9-8 11-4-2-8-6-8-11V5z M12 8v5 M12 16v1',
    rugged:'M7 2h10l5 5v10l-5 5H7l-5-5V7z M7 12h10',
    high:'M5 22V3 M5 3c5-4 9 4 15 0v11c-6 4-10-4-15 0',
    caution:'M12 3L2 21h20L12 3z M12 9v5 M12 17v1',
    lower:'M12 2l8 3v6c0 5-4 9-8 11-4-2-8-6-8-11V5l8-3z M8 12l3 3 5-6',
    unknown:'M12 2l8 3v6c0 5-4 9-8 11-4-2-8-6-8-11V5l8-3z M8 12h8'
  };
  function el(tag,cls,value){const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n;}
  function icon(level){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),path=document.createElementNS(svg.namespaceURI,'path');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.8');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');path.setAttribute('d',paths[level]||paths[['critical','high'].includes(level)?'high':'unknown']);svg.append(path);return svg;}
  let sharedSheet;
  function root(tag){
    const host=document.createElement(tag),shadow=host.attachShadow({mode:'open'});
    // Chrome shares one parsed sheet across all coin badges and the panel.
    if(typeof CSSStyleSheet!=='undefined'&&'adoptedStyleSheets' in shadow){
      if(!sharedSheet){sharedSheet=new CSSStyleSheet();sharedSheet.replaceSync(CSS);}
      shadow.adoptedStyleSheets=[sharedSheet];
    }else shadow.append(el('style','',CSS));
    return {host,shadow};
  }
  function badge(onClick){
    const {host,shadow}=root('rug-lens-badge');host.style.cssText='display:inline-flex;margin:0 2px 0 4px;width:18px;height:18px;vertical-align:middle;align-self:center;flex:0 0 18px;line-height:0;';host.setAttribute('data-row-nav-ignore','true');
    const btn=el('button','pill unknown');btn.type='button';shadow.append(btn);
    for(const name of ['pointerdown','mousedown','dblclick'])host.addEventListener(name,e=>e.stopPropagation());
    let openedOnPress=false,lastLevel=null;
    btn.addEventListener('pointerdown',e=>{
      openedOnPress=false;
      if(e.button===0&&e.pointerType==='mouse'){e.preventDefault();e.stopPropagation();openedOnPress=true;onClick();}
    });
    btn.addEventListener('pointercancel',()=>{openedOnPress=false;});
    btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(!openedOnPress||e.detail===0)onClick();openedOnPress=false;});
    return {host,update(result,state='ready'){
      const level=state==='ready'&&result?result.level:'unknown',label=state==='queued'?'Queued for scan':state==='loading'?'Checking':state==='stale'?'Refresh needed':result?.label||'Check risk';
      if(level!==lastLevel){btn.className=`pill ${level}`;btn.replaceChildren(icon(level));lastLevel=level;}
      const title=`${label}${result?.score!=null?` · ${result.score} risk points`:''}\n${result?.decision?.reason||result?.summary||'Waiting for evidence'}${result?.decision?.gaps?.length?'\n'+result.decision.gaps.slice(0,2).join(' · '):''}\n${result?.autoKnown||0}/${result?.autoTotal||0} automatic checks have data. Click for evidence.`;
      if(btn.title!==title)btn.title=title;
      const accessible=`${label} — open Rug Lens evidence`;if(btn.getAttribute('aria-label')!==accessible)btn.setAttribute('aria-label',accessible);
    }};
  }
  let active=null,returnFocus=null;
  let panelPosition=null,positionTouched=false;
  function place(drawer,point=panelPosition){
    if(!point){drawer.style.removeProperty('left');drawer.style.removeProperty('right');drawer.style.removeProperty('top');return;}
    const box=drawer.getBoundingClientRect(),width=globalThis.innerWidth||1024,height=globalThis.innerHeight||768;
    const x=Math.max(8,Math.min(point.x,Math.max(8,width-box.width-8))),y=Math.max(8,Math.min(point.y,Math.max(8,height-box.height-8)));
    drawer.style.left=x+'px';drawer.style.top=y+'px';drawer.style.right='auto';
    panelPosition={x,y};
  }
  function savePosition(){
    positionTouched=true;
    try{globalThis.chrome?.storage?.local?.set({panelPosition})?.catch?.(()=>{});}catch{}
  }
  try{globalThis.chrome?.storage?.local?.get({panelPosition:null},prefs=>{
    const p=prefs.panelPosition;
    if(!positionTouched&&p&&Number.isFinite(p.x)&&Number.isFinite(p.y)){panelPosition=p;if(active)place(active.shadow.querySelector('.drawer'));}
  });}catch{}
  function enableDrag(head,drawer){
    head.tabIndex=0;head.setAttribute('aria-label','Move risk panel');head.title='Drag to move · Double-click or Home to reset · Arrow keys to move';
    head.addEventListener('pointerdown',e=>{
      if(e.button!==0||e.target.closest('button,a,select'))return;
      const box=drawer.getBoundingClientRect();
      active.drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:box.left,top:box.top,head};
      active.pressed=true;positionTouched=true;
      head.setPointerCapture?.(e.pointerId);e.preventDefault();e.stopPropagation();
    });
    const reset=()=>{panelPosition=null;place(drawer);savePosition();};
    head.addEventListener('dblclick',e=>{if(!e.target.closest('button')){e.preventDefault();e.stopPropagation();reset();}});
    head.addEventListener('keydown',e=>{
      if(e.target!==head)return;
      if(e.key==='Home'){e.preventDefault();reset();return;}
      const steps={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]},step=steps[e.key];if(!step)return;
      e.preventDefault();e.stopPropagation();const box=drawer.getBoundingClientRect(),amount=e.shiftKey?40:10;
      place(drawer,{x:box.left+step[0]*amount,y:box.top+step[1]*amount});savePosition();
    });
  }
  document.addEventListener('pointermove',e=>{
    const drag=active?.drag;if(!drag||drag.id!==e.pointerId)return;
    place(active.shadow.querySelector('.drawer'),{x:drag.left+e.clientX-drag.x,y:drag.top+e.clientY-drag.y});e.preventDefault();
  },{capture:true,passive:false});
  for(const type of ['pointerup','pointercancel'])document.addEventListener(type,e=>{
    const drag=active?.drag;if(!drag||drag.id!==e.pointerId)return;
    active.drag=null;active.pressed=false;
    try{drag.head.releasePointerCapture?.(e.pointerId);}catch{}
    savePosition();flushLater(active);
  },true);
  globalThis.addEventListener?.('resize',()=>{if(active&&panelPosition)place(active.shadow.querySelector('.drawer'));});
  function close(){if(active?.flushTimer)clearTimeout(active.flushTimer);active?.host.remove();active=null;returnFocus?.focus?.();}
  function flushLater(root){
    if(root.flushTimer)clearTimeout(root.flushTimer);
    root.flushTimer=setTimeout(()=>{
      root.flushTimer=null;
      if(active!==root||root.pressed||root.touching||root.shadow.activeElement?.tagName==='SELECT')return;
      if(root.scrollUntil>Date.now()){flushLater(root);return;}
      const pending=root.pending;root.pending=null;if(pending)panel(...pending);
    },Math.max(0,(root.scrollUntil||0)-Date.now()));
  }
  function enableScroll(body,root){
    const hold=()=>{if(active!==root)return;root.scrollUntil=Date.now()+180;flushLater(root);};
    // Keep native scrolling inside the panel and wait for momentum to settle
    // before changing content. Replacing a scroll target interrupts gestures.
    body.addEventListener('wheel',e=>{e.stopPropagation();hold();},{passive:true});
    body.addEventListener('scroll',hold,{passive:true});
    body.addEventListener('touchstart',e=>{e.stopPropagation();root.touching=true;hold();},{passive:true});
    body.addEventListener('touchmove',e=>{e.stopPropagation();hold();},{passive:true});
    for(const type of ['touchend','touchcancel'])body.addEventListener(type,e=>{e.stopPropagation();root.touching=false;hold();},{passive:true});
  }
  for(const type of ['pointerup','pointercancel'])document.addEventListener(type,()=>{if(active?.pressed){active.pressed=false;flushLater(active);}},true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&active){e.stopPropagation();close();}});
  function observationContext(body,section,activity,model){
    const fmt=n=>Number(n).toLocaleString('en-US',{maximumFractionDigits:2});
    const duration=n=>n<60?`${Math.round(n)}s`:n<3600?`${fmt(n/60)}m`:`${fmt(n/3600)}h`;
    const windowLabel=w=>w.seconds===30?'30s':w.seconds===120?'2m':'5m';
    const windows=activity.windows||{},preferred=[windows['120s'],windows['30s'],windows['300s']].find(w=>w?.status==='available');
    if(preferred){
      const card=el('div','signal neutral'),title=el('strong');title.append(icon('behaviour'),el('span','',`Observed wallet flow · ${windowLabel(preferred)}`));
      card.append(title,el('p','',`${preferred.netBuyingWallets} net buying · ${preferred.netSellingWallets} net selling · ${preferred.balancedWallets} balanced${preferred.indeterminateWallets?` · ${preferred.indeterminateWallets} direction unclear`:''}`),el('small','','Sampled token flow · activity context · no risk-score adjustment'));body.append(card);
    }
    if(activity.count){
      const details=section('wallet-flow','Wallet flow evidence · 30s / 2m / 5m');
      for(const w of Object.values(windows)){
        const row=el('div','check');row.append(el('strong','',windowLabel(w)));
        if(w.status==='available')row.append(el('p','',`${w.netBuyingWallets} net buying, ${w.netSellingWallets} net selling, ${w.balancedWallets} balanced; ${w.twoSidedWallets} traded both ways.${w.indeterminateWallets?` ${w.indeterminateWallets} have unclear direction due to rounded amounts.`:''}`),el('p','',`${w.approximate?'≈ ':''}${fmt(w.netTokenAmount)} net tokens across complete sampled wallet records.`));
        else row.append(el('p','',`Insufficient sample: ${(w.reasons||[]).join('; ')||'more readable trades needed'}.`));
        row.append(el('small','',`${w.eligibleCount} trades ≥ $${w.minUsd} · full addresses ${Math.round(w.walletCoverage*100)}% · quantities ${Math.round(w.quantityCoverage*100)}% · USD values ${Math.round(w.pricedCoverage*100)}%`));details.append(row);
      }
      details.append(el('p','','Only observed trades within each time window; the full window may not have been captured. Rounded token amounts are estimates. Distinct wallets can share an owner. Excludes incomplete wallet quantities and small trades; this is not a wallet balance, capital inflow or proof of organic demand.'));
    }
    const change=model.holderChanges,context=model.traderContext;
    if(change?.status==='available'||context?.sampleCount){
      const details=section('holder-observations','Holder changes & trader context');
      if(change?.status==='available'){
        const shift=change.changePp>0?'increased':change.changePp<0?'decreased':'unchanged';
        details.append(el('p','',`${change.matchedCount} matched addresses: observed supply share ${shift}${change.changePp?' by '+fmt(Math.abs(change.changePp))+' percentage points':''} over ${duration(change.seconds)}.`),el('small','',`${change.matchedCount} matched of ${change.previousObservedCount} earlier / ${change.currentObservedCount} current readable holders.`),el('p','','Sales, transfers, supply changes and rounding can change these percentages. Rows leaving the sample are not treated as sold. This is a session comparison, not a launch-cohort or ownership graph.'));
      }else details.append(el('p','',change?.reasons?.join(' ')||'A fresh second holder sample with matching full addresses is needed for a comparison.'));
      if(context?.saleKnownCount)details.append(el('p','',`${context.rowsWithSales} of ${context.saleKnownCount} rows with readable sold amounts show recorded sales.`));
      if(context?.durationKnownCount)details.append(el('p','',`Displayed holding duration: median ${duration(context.medianHoldingSeconds)} across ${context.durationKnownCount} sampled rows.`));
      if(context?.pnlKnownCount)details.append(el('p','',`Recorded realized PnL: ${context.positivePnlCount} positive / ${context.negativePnlCount} negative among ${context.pnlKnownCount} readable rows.`));
      details.append(el('small','','Terminal observations · partial holder sample · explicit currency units only for sales/PnL · no risk-score adjustment'));
    }
  }
  function panel(model,callbacks){
    if(!active){returnFocus=document.activeElement;active=root('rug-lens-panel');active.host.style.cssText='position:relative;z-index:2147483646;';document.body.append(active.host);
      const panelRoot=active;
      panelRoot.host.addEventListener('pointerdown',()=>{panelRoot.pressed=true;});
      for(const type of ['click','pointercancel'])panelRoot.host.addEventListener(type,()=>{panelRoot.pressed=false;flushLater(panelRoot);});
      panelRoot.host.addEventListener('pointerup',()=>{panelRoot.pressed=false;flushLater(panelRoot);});
      panelRoot.host.addEventListener('focusout',()=>flushLater(panelRoot));
    }
    if(active.pressed||active.touching||active.scrollUntil>Date.now()||active.shadow.activeElement?.tagName==='SELECT'){active.pending=[model,callbacks];flushLater(active);return;}
    active.pending=null;
    const renderKey=JSON.stringify([model.mint,model.market,model.name,model.result,model.signals,model.holderChanges,model.traderContext,model.manual,model.loading,model.queued,model.partsPending,model.staleEvidence,model.disagreements,model.error,model.chainLoading,model.chainError,model.chain,model.canScanChain,model.launchCurve,model.curveError,model.holderVerification,model.providerWarnings,...['pageAt','holderAt','providerAt'].map(key=>model[key]?Math.floor((Date.now()-model[key])/5000):null)]);
    if(active.renderKey===renderKey)return;
    active.renderKey=renderKey;
    const prev=active.shadow.querySelector('.drawer'),scroll=prev?.querySelector('.body')?.scrollTop||0,opened=Array.from(prev?.querySelectorAll('details')||[]).filter(d=>d.open).map(d=>d.dataset.key),focusLabel=active.shadow.activeElement?.getAttribute('aria-label');
    const r=model.result,drawer=el('section',`drawer ${r.level}`);drawer.setAttribute('role','dialog');drawer.setAttribute('aria-label','Rug Lens token risk evidence');
    const head=el('div','head'),brand=el('div','brand','RUG LENS');brand.append(el('span','',model.name||'Token analysis'));brand.title='Terminal · v0.6.3';const x=el('button','close','×');x.type='button';x.setAttribute('aria-label','Close risk panel');x.onclick=close;head.append(brand,x);drawer.append(head);
    const body=el('div','body');drawer.append(body);
    const phase=r.lifecycle;
    if(phase){const row=el('div','stage'),title=el('strong');title.append(icon({new:'behaviour',final:'liquidity',migrated:'distribution'}[phase.id]||'unknown'),el('span','',phase.label));row.append(title,el('small','',phase.focus));row.title=phase.source;body.append(row);}
    const hero=el('div','hero'),top=el('div','hero-top');top.append(icon(r.level),el('span','',['limited','unknown'].includes(r.level)?model.loading?'Checking…':model.queued?'Queued for scan':r.label:r.label));const score=el('span','score',r.score===null?'—':String(r.score));score.title='Heuristic risk points, not a probability or expected return';score.append(el('small','',' pts'));top.append(score);hero.append(top,el('div','summary',r.decision?.reason||r.summary));
    if(r.level==='lower')hero.append(el('small','','Observed checks only · not an entry or profit guarantee'));
    if(r.decision?.gaps?.length)hero.append(el('p','',r.decision.gaps.slice(0,2).join(' · ')));
    body.append(hero);
    const cov=el('div','coverage between');cov.append(el('small','',`${r.autoKnown}/${r.autoTotal} checks assessed`),el('small','',r.adequate?'Key evidence available':r.decision?.baselineComplete?'Baseline available · gaps remain':'Partial evidence'));body.append(cov);
    if(model.queued)body.append(el('div','notice','Waiting for an available scanner slot. Basic checks run from Trenches; opening this badge prioritizes the request.'));
    if(model.loading)body.append(el('div','notice',`Checking ${(model.partsPending||['contract','market']).map(p=>p==='contract'?'contract / holders':'market activity').join(' and ')}… Available results are already shown.`));
    if(model.staleEvidence)body.append(el('div','notice warning','Showing previous evidence while refreshing (up to 90s old). Older results cannot produce a green verdict.'));
    if(['limited','unknown'].includes(r.level)&&!model.loading&&!model.queued){const missing=r.decision?.missingBaseline||r.missingCore;const why=missing.slice(0,3).map(id=>RugLensEngine.RULES.find(c=>c.id===id)?.label||({quoteAsset:'Curve quote-token value / controls',exitSize:'Current holder/cohort exit size'}[id]||id));if(why.length)body.append(el('div','notice',`Needed for a baseline: ${why.join(', ')}${missing.length>3?` and ${missing.length-3} other checks`:''}. ${model.error?'A provider failed; see the error below.':'These checks need more evidence; waiting alone may not resolve them.'}`));}

    for(const disagreement of model.disagreements||[])body.append(el('div','notice warning','Source disagreement: '+disagreement));
    if(model.error)body.append(el('div','notice warning',model.error));
    if(model.curveError&&!model.error?.includes(model.curveError))body.append(el('div','notice',`Launch curve: ${model.curveError}`));
    const actions=el('div','actions'),refresh=el('button','action primary','Refresh');refresh.type='button';refresh.setAttribute('aria-label','Refresh analysis');refresh.onclick=callbacks.refresh;actions.append(refresh);
    drawer.append(actions);
    if(callbacks.chain){const scan=el('button','action',model.chainLoading?'Inspecting on-chain history…':'Scan on-chain links');scan.type='button';scan.setAttribute('aria-label','Scan on-chain links');scan.disabled=model.chainLoading||!model.canScanChain;scan.onclick=callbacks.chain;scan.title='Inspect the latest 4 transactions for up to 6 report holders using public Solana RPC';actions.append(scan);}
    if(model.chainLoading)body.append(el('div','notice','Inspecting holder transactions for wrapped-SOL funding and joint signatures. This can take up to a minute.'));
    if(model.chainError)body.append(el('div','notice warning',model.chainError));
    const item=c=>{const row=el('div',`check ${c.status}`),h=el('div','check-head'),title=el('span','check-title');title.append(icon(c.points?c.group:c.status==='clear'?'lower':'unknown'),el('span','',c.label));h.append(title,el('span',c.points?'points':c.status==='clear'?'clear':'unknown-status',c.points?`+${c.points}`:c.status==='clear'?'No flag':c.status==='not-applicable'?'Not applicable':'Unknown'));row.append(h,el('p','',c.detail),el('small','',c.source));return row;};
    body.append(el('div','section','WHAT MATTERS NOW'));
    const flags=r.checks.filter(c=>c.points).sort((a,b)=>b.points-a.points);if(!flags.length)body.append(el('p','',r.rugged?'The external rug report sets this verdict. Missing local evidence does not cancel that report.':model.providerWarnings?.some(w=>w.level==='danger'&&w.scoringEligible!==false)?'An external warning needs supporting evidence; it is not a confirmed rug.':'No material flags detected in available data. Unchecked evidence is listed below.'));flags.slice(0,3).forEach(c=>body.append(item(c)));
    const section=(key,title)=>{const d=el('details');d.dataset.key=key;d.append(el('summary','',title));body.append(d);return d;};
    if(phase){const policy=section('stage-policy',`Stage policy · ${phase.label}`);policy.append(el('p','',`Source: ${phase.source}. ${phase.at?`Observed ${Math.max(0,Math.floor((Date.now()-phase.at)/1000))}s ago.`:''}`),el('p','','Only current reported bundle holdings are scored. Initial launch participation, bundle counts and synchronous buys are not interchangeable with retained supply.'));
      for(const note of phase.notes||[])policy.append(el('p','',note));
      for(const change of phase.adjustments||[])policy.append(el('p','',`${RugLensEngine.RULES.find(c=>c.id===change.id)?.label||change.id}: ${change.from} → ${change.to} points in this stage.`));
      policy.append(el('p','','New: 10–20% current bundle holdings use 4 points rather than 8 unless linked funding or labeled selling is observed. More than 20%, severe current concentration, dangerous controls and actual selling retain their warnings. Final Stretch retains bundle weight and discounts weak launch patterns less. Migrated uses standard weights and current pool evidence. Heuristic policy; not calibrated success odds.'));}
    if(model.providerWarnings?.length){const notes=section('provider-notes',`Provider notes · ${model.providerWarnings.length}`);for(const w of model.providerWarnings){notes.append(el('div',w.scoringEligible===false?'notice':'notice warning',`RugCheck ${w.level||'finding'}: ${w.name}. ${w.description||''}${w.scoringEligible===false?' Not scored: '+(w.reason||'Unscoped provider evidence.') :''}`));}}
    if(flags.length>3){const extra=section('flags',`${flags.length-3} more observed flags`);flags.slice(3).forEach(c=>extra.append(item(c)));}
    const a=r.activity||{};
    const signals=model.signals||{};
    if(signals.momentum){const flow=el('div',`signal ${signals.momentum.tone}`);const title=el('strong');title.append(icon('unknown'),el('span','',signals.momentum.label));flow.append(title,el('p','',signals.momentum.detail));body.append(flow);}
    observationContext(body,section,a,model);
    if(signals.events?.length){const alerts=section('alerts',`Session changes · ${signals.events.length}`);for(const event of signals.events){const row=el('div',`signal ${event.kind}`),title=el('strong');title.append(icon(event.kind==='risk'?'high':'caution'),el('span','',event.label));row.append(title,el('p','',event.detail),el('small','',`${Math.max(0,Math.floor((Date.now()-event.at)/1000))}s ago · observed in this tab`));if(/^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(event.signature||'')){const link=el('a','','Verify trade ↗');link.href=`https://solscan.io/tx/${event.signature}`;link.target='_blank';link.rel='noopener noreferrer';row.append(link);}alerts.append(row);}}
    const sources=section('sources','Verify sources');sources.append(el('code','address',model.mint||model.market));
    const curve=model.launchCurve;
    if(curve?.status==='verified'&&curve.mint===model.mint){
      const row=el('p','',`Pump curve ${curve.complete?'completed':'active'} · confirmed slot ${curve.slot} · ${Math.max(0,Math.floor((Date.now()-curve.at)/1000))}s ago. PDA, program and account layout verified. `),link=el('a','','Verify curve ↗');
      link.href=`https://solscan.io/account/${curve.address}`;link.target='_blank';link.rel='noopener noreferrer';row.append(link);sources.append(row);
      sources.append(el('p','',curve.quoteIsNativeSol?`Real reserve: ${Number(curve.realQuoteSol).toLocaleString('en-US',{maximumFractionDigits:6})} SOL. Synthetic reserves are not cash available to sellers.`:`Quote token: ${curve.quoteMint}. Capacity compares raw units of this asset; no SOL or USD price is inferred.`));
    }
    if(model.mint)for(const [label,url] of [['RugCheck ↗',`https://rugcheck.xyz/tokens/${model.mint}`],['Holders ↗',`https://solscan.io/token/${model.mint}`],['Clusters ↗',`https://app.bubblemaps.io/sol/token/${model.mint}`]]){const link=el('a','',label);link.href=url;link.target='_blank';link.rel='noopener noreferrer';sources.append(link);}
    const verification=model.holderVerification;
    if(verification){sources.append(el('p','',`Large-holder account verification: ${verification.status}. ${verification.scope}.`));
      for(const pool of verification.excludedPools||[]){const row=el('p','',`Excluded verified PumpSwap pool${pool.slot?` at slot ${pool.slot}`:''}: `),link=el('a','','Verify account ↗');link.href=`https://solscan.io/account/${pool.address}`;link.target='_blank';link.rel='noopener noreferrer';row.append(link);sources.append(row);}
      for(const unresolved of verification.unresolved||[])sources.append(el('p','',`${Number(unresolved.pct).toFixed(2)}% reported holding: ${unresolved.reason}. Account classification remains unknown.`));
    }
    const chain=model.chain;
    if(chain){const evidence=section('chain','On-chain links — evidence & coverage');
      evidence.append(el('p','',`${chain.walletsRead}/${chain.sampled} holder histories read · ${chain.parsed}/${chain.requested} successful transactions parsed · ${chain.unavailable} unavailable. ${chain.scope}`));
      for(const error of chain.errors||[])evidence.append(el('p','',error));
      if(!chain.closureGroups.length&&!chain.jointBuys.length)evidence.append(el('p','','No matching links found in this sample. Earlier funding and other wallets remain unchecked; this does not clear mixer or bundle risk.'));
      for(const group of [...chain.closureGroups.map(g=>({...g,title:'Wrapped-SOL closure funding; shared payer '+g.payer})),...chain.jointBuys.map(g=>({...g,title:'Jointly signed token acquisition',signatures:[g.signature]}))]){
        const row=el('div','check');row.append(el('strong','',group.title),el('p','',`${group.wallets.length} sampled holders · ${group.supply.toFixed(2)}% current reported supply. Connection does not establish fraud.`));row.style.overflowWrap='anywhere';
        for(const wallet of group.wallets)row.append(el('p','',wallet));
        for(const sig of group.signatures){if(!/^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(sig))continue;const link=el('a','','Verify transaction ↗');link.href=`https://solscan.io/tx/${sig}`;link.target='_blank';link.rel='noopener noreferrer';row.append(link);}evidence.append(row);
      }
      evidence.append(el('p','',`Fetched ${Math.max(0,Math.floor((Date.now()-chain.at)/1000))}s ago. Missing earlier history, private service attribution and multi-hop paths cannot be inferred. Findings expire after two minutes.`));
    }
    if(a.signatures?.some(sig=>/^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(sig))){const links=section('transactions','Verify labeled sell transactions');for(const sig of a.signatures){if(!/^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(sig))continue;const link=el('a','',sig.slice(0,12)+'… ↗');link.href=`https://solscan.io/tx/${sig}`;link.target='_blank';link.rel='noopener noreferrer';link.style.display='inline-block';links.append(link);}}
    const gaps=r.checks.filter(c=>c.status==='unknown');const unknown=section('gaps',`Missing evidence (${gaps.length}) — what to check next`);
    unknown.append(el('p','','Open Holders → All at the top to sample holders, and Trades for recent transactions. Historical wallet ownership, hidden clusters, exact launch bundles and liquidity-lock expiry require separate verification.'));
    if(r.missingCore.length)unknown.append(el('div','notice warning','Key gaps: '+r.missingCore.map(id=>RugLensEngine.RULES.find(c=>c.id===id).label).join(', ')));
    gaps.forEach(c=>unknown.append(item(c)));
    const all=section('methods',`All ${r.total} checks, thresholds & sources`);for(const c of r.checks){const row=item(c);row.append(el('p','',c.method));all.append(row);}
    const manual=section('manual','Add a manual evidence review');manual.append(el('p','','Your assessment affects this token only and expires after 5 minutes. It cannot establish a confirmed rug.'));
    for(const id of RugLensEngine.manualIds){const rule=RugLensEngine.RULES.find(c=>c.id===id),label=el('label','check',rule.label);label.style.display='block';const select=el('select');select.setAttribute('aria-label',rule.label+' manual assessment');for(const [v,t] of [['unknown','Not reviewed'],['flag','Reviewed — suspicious'],['clear','Reviewed — no flag observed']]){const o=el('option','',t);o.value=v;select.append(o);}select.value=model.manual?.[id]?.status||'unknown';select.onchange=()=>callbacks.manual(id,select.value);label.append(el('p','',rule.method),select);manual.append(label);}
    const age=at=>at?`${Math.max(0,Math.floor((Date.now()-at)/1000))}s ago`:'unavailable';
    const freshness=section('freshness','Data freshness & limits');freshness.append(el('p','',`Page: ${age(model.pageAt)}. Holder sample: ${age(model.holderAt)}. API fetched: ${age(model.providerAt)}. API indexing may lag; fetch time is not blockchain confirmation time.`),el('p','','Activity and changes cover this browsing session, not launch-to-date history. Full maker addresses are required for wallet-volume and loop checks. Watchers/holders is attention context, not a fraud threshold.'));
    body.append(el('div','foot','Red flag = Avoid · Triangle = Caution · Gray shield = Wait for data · Green shield = No major observed flags · Stop = reported rug. Points are not calibrated probabilities or a buy signal. Exact bundles and hidden ownership may remain unknown.'));
    let live=drawer,liveBody=body;
    // Expand while detached, before inserting the content or restoring scroll.
    body.querySelectorAll('details').forEach(d=>{d.open=opened.includes(d.dataset.key);});
    if(prev){
      // Keep the frame, close button and action buttons mounted across data refreshes.
      live=prev;live.className=drawer.className;
      const oldBrand=live.querySelector('.brand');if(oldBrand.textContent!==brand.textContent)oldBrand.replaceChildren(...brand.childNodes);oldBrand.title=brand.title;
      liveBody=live.querySelector('.body');liveBody.replaceChildren(...body.childNodes);
      const oldActions=live.querySelector('.actions');
      for(const fresh of actions.children){
        const label=fresh.getAttribute('aria-label'),existing=Array.from(oldActions.children).find(n=>n.getAttribute('aria-label')===label);
        if(existing){if(existing.textContent!==fresh.textContent)existing.textContent=fresh.textContent;existing.disabled=fresh.disabled;existing.onclick=fresh.onclick;existing.title=fresh.title;}
        else {const added=fresh.cloneNode(true);added.onclick=fresh.onclick;oldActions.append(added);}
      }
      for(const old of [...oldActions.children])if(!Array.from(actions.children).some(n=>n.getAttribute('aria-label')===old.getAttribute('aria-label')))old.remove();
    }else {active.shadow.append(drawer);enableDrag(head,drawer);enableScroll(body,active);place(drawer);}
    liveBody.scrollTop=scroll;
    if(!prev)x.focus();else if(focusLabel)Array.from(live.querySelectorAll('[aria-label]')).find(e=>e.getAttribute('aria-label')===focusLabel)?.focus({preventScroll:true});
  }
  globalThis.RugLensUI={badge,panel,close,isOpen:()=>!!active};
})();
